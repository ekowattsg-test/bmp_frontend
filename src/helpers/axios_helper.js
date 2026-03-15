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
        window.location.href = "/login";
        return Promise.reject(error);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAuthHeader(null);
        // UX: inform user and redirect to login
        try {
          // Non-blocking notification if available
          window.dispatchEvent(new CustomEvent("auth:expired", { detail: {} }));
        } catch (e) {
          /* ignore */
        }
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Backwards-compatible request helper used across the app
export const request = (method, url, data) => {
  return api({ method, url, data }).catch((error) => {
    // If 401 not handled by interceptor, clear token and redirect
    if (error.response && error.response.status === 401) {
      setAuthHeader(null);
      try {
        window.dispatchEvent(new CustomEvent("auth:expired", { detail: {} }));
      } catch (e) {
        /* ignore */
      }
      window.location.href = "/login";
    }
    throw error;
  });
};
