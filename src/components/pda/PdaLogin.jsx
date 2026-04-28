import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { request, setAuthHeader } from "../../helpers/axios_helper";

export default function PdaLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

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
        navigate("/pda/menu", { replace: true });
      })
      .catch((err) => {
        console.error("[PdaLogin] Login failed:", err);
        console.error("[PdaLogin] Response data:", err?.response?.data);
        const msg =
          err?.response?.data?.message || err?.message || t("pda.login.failed");
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
