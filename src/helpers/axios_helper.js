import axios from "axios";

// Simple token storage helpers (persisted in localStorage)
export const getAuthToken = () => {
  const token = window.localStorage.getItem("auth_token");
  if (token && token !== "null") return token;
  try {
    const userInfo = window.localStorage.getItem("user_info");
    if (userInfo) {
      const userObj = JSON.parse(userInfo);
      return userObj?.token || null;
    }
  } catch {
    // ignore
  }
  return null;
};

const isPdaPath = () =>
  typeof window !== "undefined" && window.location.pathname.startsWith("/pda/");

const isPdaRefreshEnabled = () =>
  String(import.meta.env.VITE_PDA_USE_REFRESH || "false").toLowerCase() ===
  "true";

const redirectToLogin = () => {
  if (isPdaPath()) {
    window.dispatchEvent(new CustomEvent("pda:auth:expired"));
  } else {
    try {
      window.dispatchEvent(new CustomEvent("auth:expired", { detail: {} }));
    } catch (e) {
      /* ignore */
    }
    window.location.href = "/login";
  }
};

export const setAuthHeader = (token) => {
  if (token !== null && token !== undefined) {
    window.localStorage.setItem("auth_token", token);
  } else {
    window.localStorage.removeItem("auth_token");
  }
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (err) {
    return true;
  }
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// Create an axios instance we control
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // allow sending cookies for refresh token flows
});

// Refresh flow state
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  refreshQueue = [];
};

// Request interceptor: attach access token if present
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401 by attempting refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Show blocking error prompt (if available in the app) and wait.
    // Skipped for PDA paths — PDA has its own error handling.
    const tryShowBlockingError = async (msg) => {
      if (isPdaPath()) return;
      try {
        const timeoutMs = parseInt(
          import.meta.env.VITE_ERROR_ACK_TIMEOUT_MS || "0",
          10,
        );
        if (typeof window !== "undefined" && window.showBackendError) {
          // window.showBackendError resolves when user acknowledges or timeout
          await window.showBackendError(msg, timeoutMs);
        } else if (timeoutMs > 0) {
          // Fallback: wait for the timeout
          await new Promise((res) => setTimeout(res, timeoutMs));
        }
      } catch (e) {
        // ignore any errors from the UI handshake
      }
    };

    // Try to extract meaningful message for the user
    const backendMessage =
      error?.response?.data?.message || error?.message || "Server error";
    // Fire and wait for UI acknowledgement before proceeding with recovery
    await tryShowBlockingError(backendMessage);

    // PDA default behavior: no refresh cycle unless explicitly enabled.
    // When enabled, PDA follows the same refresh flow as web users.
    if (
      error.response?.status === 401 &&
      isPdaPath() &&
      !originalRequest.skipAuthRedirect &&
      !isPdaRefreshEnabled()
    ) {
      setAuthHeader(null);
      window.dispatchEvent(new CustomEvent("pda:auth:expired"));
      return Promise.reject(error);
    }

    // Some endpoints use 401 for business validation (e.g. invalid admin password).
    // Allow callers to opt out of global auth refresh/redirect handling.
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest.skipAuthRedirect
    ) {
      return Promise.reject(error);
    }

    // If we already tried a retry, avoid infinite loops
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // If a refresh is already running, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      try {
        // Try refresh endpoint (server should use HttpOnly refresh cookie)
        const refreshRes = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          null,
          { withCredentials: true },
        );
        const newToken = refreshRes.data && refreshRes.data.accessToken;
        if (newToken) {
          setAuthHeader(newToken);
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
        // No new token returned — force logout
        processQueue(new Error("No token"), null);
        setAuthHeader(null);
        redirectToLogin();
        return Promise.reject(error);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAuthHeader(null);
        // UX: inform user and redirect to login
        redirectToLogin();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Backwards-compatible request helper used across the app
export const request = (method, url, data, config = {}) => {
  return api({ method, url, data, ...config }).catch((error) => {
    if (config.skipAuthRedirect || error?.config?.skipAuthRedirect) {
      throw error;
    }

    // If 401 not handled by interceptor, clear token and redirect
    if (error.response && error.response.status === 401) {
      setAuthHeader(null);
      redirectToLogin();
    }
    throw error;
  });
};
