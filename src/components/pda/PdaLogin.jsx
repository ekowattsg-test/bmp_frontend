import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import { request, setAuthHeader } from "../../helpers/axios_helper";

export default function PdaLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [expiredLinkError, setExpiredLinkError] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const resolveLoginError = (err) => {
    const status = err?.response?.status;
    const backendMessage = String(err?.response?.data?.message || "").trim();
    const axiosMessage = String(err?.message || "").trim();
    const combined = `${backendMessage} ${axiosMessage}`.toLowerCase();

    if (status === 401 || status === 403 || status === 410) {
      return {
        message: t(
          "pda.login.expired",
          "This PDA login link is expired or invalid. Please scan a new QR code.",
        ),
        isExpired: true,
      };
    }

    if (
      combined.includes("expired") ||
      combined.includes("invalid") ||
      combined.includes("unauthorized")
    ) {
      return {
        message: t(
          "pda.login.expired",
          "This PDA login link is expired or invalid. Please scan a new QR code.",
        ),
        isExpired: true,
      };
    }

    return {
      message: backendMessage || axiosMessage || t("pda.login.failed"),
      isExpired: false,
    };
  };

  const clearAccessibleCookies = () => {
    if (typeof document === "undefined") return;
    const raw = document.cookie;
    if (!raw) return;
    raw.split(";").forEach((part) => {
      const name = part.split("=")[0]?.trim();
      if (!name) return;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/pda`;
    });
  };

  const handleDismissExpired = async () => {
    setDismissing(true);
    setAuthHeader(null);
    localStorage.removeItem("pda_user_info");
    localStorage.removeItem("user_info");
    clearAccessibleCookies();

    await Promise.allSettled([
      request("POST", "/auth/logout", null, { skipAuthRedirect: true }),
      request("POST", "/api/mobile-logins/logout", null, {
        skipAuthRedirect: true,
      }),
    ]);

    if (typeof window !== "undefined") {
      window.location.href = window.location.origin;
      return;
    }
    navigate("/", { replace: true });
  };

  useEffect(() => {
    console.log("[PdaLogin] Component mounted");
    const loginkey = searchParams.get("loginkey");
    console.log("[PdaLogin] loginkey from query params:", loginkey);

    if (!loginkey) {
      console.warn("[PdaLogin] No loginkey found in URL — halting");
      setError(t("pda.login.missingKey"));
      return;
    }

    console.log(
      "[PdaLogin] Submitting login request to /api/mobile-logins/login",
    );
    request("POST", "/api/mobile-logins/login", { loginKey: loginkey })
      .then((response) => {
        console.log("[PdaLogin] Login response received:", response.data);
        const token = response.data.token;
        console.log("[PdaLogin] Token present:", !!token);
        setAuthHeader(token);
        const userData = response.data;
        localStorage.setItem("pda_user_info", JSON.stringify(userData));
        console.log(
          "[PdaLogin] User info saved to localStorage, navigating to /pda/menu",
        );
        navigate("/pda/orders", { replace: true });
      })
      .catch((err) => {
        console.error("[PdaLogin] Login failed:", err);
        console.error("[PdaLogin] Response data:", err?.response?.data);
        const { message, isExpired } = resolveLoginError(err);
        setExpiredLinkError(isExpired);
        const msg = message;
        console.error("[PdaLogin] Displaying error to user:", msg);
        setError(msg);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 480, width: "100%" }}>
          <Typography variant="body1">{error}</Typography>
        </Alert>
        {expiredLinkError && (
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={handleDismissExpired}
            disabled={dismissing}
          >
            {dismissing
              ? t("auth.signingIn", "Signing in...")
              : t("pda.session.dismiss", "Dismiss")}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <CircularProgress />
    </Box>
  );
}
