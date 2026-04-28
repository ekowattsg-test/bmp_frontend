import React from "react";
import { useContext, useState } from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { request, setAuthHeader } from "../helpers/axios_helper";

import MainPage from "./MainPage.jsx";
import LoginForm from "./LoginForm.jsx";
import { AuthContext } from "../context/authContext.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import { CircularProgress, Box } from "@mui/material";
import PdaLogin from "./pda/PdaLogin.jsx";
import PdaMenu from "./pda/PdaMenu.jsx";

export default function AppContent() {
  const { isAuthenticated, setIsAuthenticated, setUserInfo, loading } =
    useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [loginError, setLoginError] = useState(""); // Store raw backend error
  const [loginLoading, setLoginLoading] = useState(false);

  // Map backend error messages to translation keys
  const getTranslatedError = (errorMessage) => {
    if (!errorMessage) return "";

    // Check if it's already a translation key (starts with "auth.")
    if (errorMessage.startsWith("auth.")) {
      return t(errorMessage);
    }

    // Map backend errors to translation keys
    const errorKeyMap = {
      "Unknown user": "auth.unknownUser",
      "User account is inactive": "auth.userInactive",
      "Invalid password": "auth.invalidPassword",
    };

    const translationKey = errorKeyMap[errorMessage];
    return translationKey ? t(translationKey) : errorMessage;
  };

  const onLogin = (e, username, password) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    request("POST", "/login", {
      login: username,
      password: password,
    })
      .then((response) => {
        setAuthHeader(response.data.token);
        const userData = response.data;
        setUserInfo(userData);
        // Store user info in localStorage for session restoration
        localStorage.setItem("user_info", JSON.stringify(userData));
        setIsAuthenticated(true);
        // Navigate to home or the page they were trying to access
        navigate("/home");
        setLoginLoading(false);
      })
      .catch((error) => {
        setAuthHeader(null);
        const backendMessage =
          error?.response?.data?.message ||
          error?.message ||
          "auth.loginFailed";
        setLoginError(backendMessage);
        setLoginLoading(false);
      });
  };

  const onRegister = (event, firstName, lastName, username, password) => {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    request("POST", "/register", {
      firstName: firstName,
      lastName: lastName,
      login: username,
      password: password,
      active: 1,
    })
      .then((response) => {
        setAuthHeader(response.data.token);
        const userData = response.data;
        setUserInfo(userData);
        localStorage.setItem("user_info", JSON.stringify(userData));
        setIsAuthenticated(true);
        navigate("/home");
        setLoginLoading(false);
      })
      .catch((error) => {
        setAuthHeader(null);
        const backendMessage =
          error?.response?.data?.message ||
          error?.message ||
          "auth.registrationFailed";
        setLoginError(backendMessage);
        setLoginLoading(false);
      });
  };

  const onOtpLogin = (e, otp) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    request("POST", "/api/mobile-logins/verify", { otp })
      .then((response) => {
        setAuthHeader(response.data.token);
        const userData = response.data;
        setUserInfo(userData);
        localStorage.setItem("user_info", JSON.stringify(userData));
        setIsAuthenticated(true);
        navigate("/home");
        setLoginLoading(false);
      })
      .catch((error) => {
        setAuthHeader(null);
        const backendMessage =
          error?.response?.data?.message || error?.message || "auth.otpFailed";
        setLoginError(backendMessage);
        setLoginLoading(false);
      });
  };

  // Don't render anything while checking authentication
  if (loading) {
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

  return (
    <>
      {location.pathname.startsWith("/pda") ? (
        <Routes>
          <Route path="/pda/login" element={<PdaLogin />} />
          <Route path="/pda/menu" element={<PdaMenu />} />
        </Routes>
      ) : !isAuthenticated ? (
        <AuthLayout>
          <LoginForm
            onLogin={onLogin}
            onRegister={onRegister}
            onOtpLogin={onOtpLogin}
            error={getTranslatedError(loginError)}
            loading={loginLoading}
          />
        </AuthLayout>
      ) : (
        <MainPage />
      )}
    </>
  );
}
