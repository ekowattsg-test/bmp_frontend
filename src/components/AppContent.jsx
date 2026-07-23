import React from "react";
import { useContext, useState } from "react";
import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";

import { request, setAuthHeader } from "../helpers/axios_helper";

import MainPage from "./MainPage.jsx";
import LoginForm from "./LoginForm.jsx";
import LoginFormSimple from "./LoginFormSimple.jsx";
import { AuthContext } from "../context/authContext.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import {
  CircularProgress,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import PdaLogin from "./pda/PdaLogin.jsx";
import PdaLayout from "./pda/layout/PdaLayout.jsx";
import PdaWorkOrderList from "./pda/workorder/PdaWorkOrderList.jsx";
import PdaWorkOrderDetail from "./pda/workorder/PdaWorkOrderDetail.jsx";
import PdaSchedule from "./pda/schedule/PdaSchedule.jsx";
import PdaMe from "./pda/me/PdaMe.jsx";
import PdaBriefingEntry from "./pda/briefing/PdaBriefingEntry.jsx";
import PdaBriefingPresenterScan from "./pda/briefing/PdaBriefingPresenterScan.jsx";
import PdaBriefingListener from "./pda/briefing/PdaBriefingListener.jsx";
import PdaBriefingPresenterPage from "./pda/briefing/PdaBriefingPresenterPage.jsx";
import PdaBriefingWorkerPage from "./pda/briefing/PdaBriefingWorkerPage.jsx";
import PdaAvailableTask from "./pda/site/PdaAvailableTask.jsx";
import PdaProgressUpdate from "./pda/site/PdaProgressUpdate.jsx";
import PdaFieldQrCode from "./pda/site/PdaFieldQrCode.jsx";
import StockCard from "./stock/StockCard.jsx";
import TvBootstrap from "./tv/TvBootstrap.jsx";
import TvProjects from "./tv/TvProjects.jsx";

const TV_AUTOSTART_KEY = "tv_display_autostart";

export default function AppContent() {
  const { isAuthenticated, setIsAuthenticated, setUserInfo, loading } =
    useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [loginError, setLoginError] = useState(""); // Store raw backend error
  const [loginLoading, setLoginLoading] = useState(false);
  const [showEmergencyLogin, setShowEmergencyLogin] = useState(false);
  // Backend error dialog state and refs for acknowledgement
  const [backendDialogOpen, setBackendDialogOpen] = useState(false);
  const [backendDialogMessage, setBackendDialogMessage] = useState("");
  const [backendDialogSecondsLeft, setBackendDialogSecondsLeft] = useState(0);
  const ackResolveRef = React.useRef(null);
  const timeoutRef = React.useRef(null);
  const intervalRef = React.useRef(null);

  // Expose a global function the axios helper can call to show a blocking error
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const tvAutoStartEnabled = localStorage.getItem(TV_AUTOSTART_KEY) === "1";
    if (!tvAutoStartEnabled) return;
    if (isAuthenticated) return;
    if (location.pathname.startsWith("/pda")) return;
    if (location.pathname.startsWith("/tv")) return;
    navigate("/tv/start", { replace: true });
  }, [isAuthenticated, location.pathname, navigate]);

  React.useEffect(() => {
    const showFn = (message, timeoutMs) =>
      new Promise((resolve) => {
        setBackendDialogMessage(message || "");
        setBackendDialogOpen(true);
        ackResolveRef.current = resolve;
        // clear any previous timers
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        if (typeof timeoutMs === "number" && timeoutMs > 0) {
          const seconds = Math.ceil(timeoutMs / 1000);
          setBackendDialogSecondsLeft(seconds);
          intervalRef.current = setInterval(() => {
            setBackendDialogSecondsLeft((s) => {
              if (s <= 1) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                return 0;
              }
              return s - 1;
            });
          }, 1000);

          timeoutRef.current = setTimeout(() => {
            if (ackResolveRef.current) {
              ackResolveRef.current();
              ackResolveRef.current = null;
            }
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setBackendDialogOpen(false);
            timeoutRef.current = null;
            setBackendDialogSecondsLeft(0);
          }, timeoutMs);
        } else {
          setBackendDialogSecondsLeft(0);
        }
      });

    // attach to window for helpers to call
    if (typeof window !== "undefined") {
      window.showBackendError = showFn;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete window.showBackendError;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

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
      {location.pathname.startsWith("/tv") ? (
        <Routes>
          <Route path="/tv/start" element={<TvBootstrap />} />
          <Route path="/tv/projects" element={<TvProjects />} />
          <Route path="/tv" element={<Navigate to="/tv/start" replace />} />
          <Route path="/tv/*" element={<Navigate to="/tv/start" replace />} />
        </Routes>
      ) : location.pathname.startsWith("/pda") ? (
        <Routes>
          <Route path="/pda/login" element={<PdaLogin />} />
          <Route
            path="/pda/menu"
            element={<Navigate to="/pda/orders" replace />}
          />
          <Route path="/pda" element={<Navigate to="/pda/orders" replace />} />
          <Route element={<PdaLayout />}>
            <Route path="/pda/orders" element={<PdaWorkOrderList />} />
            <Route
              path="/pda/orders/:workOrderId"
              element={<PdaWorkOrderDetail />}
            />
            <Route path="/pda/schedule" element={<PdaSchedule />} />
            <Route path="/pda/stockcard" element={<StockCard />} />
            <Route path="/pda/briefing" element={<PdaBriefingEntry />} />
            <Route
              path="/pda/briefing/:sessionId/scan"
              element={<PdaBriefingPresenterScan />}
            />
            <Route
              path="/pda/briefing/:sessionId/listener"
              element={<PdaBriefingListener />}
            />
            <Route
              path="/pda/briefing/:sessionId/presenter"
              element={<PdaBriefingPresenterPage />}
            />
            <Route
              path="/pda/briefing/:sessionId/worker"
              element={<PdaBriefingWorkerPage />}
            />
            <Route path="/pda/me" element={<PdaMe />} />
            <Route path="/pda/available-tasks" element={<PdaAvailableTask />} />
            <Route
              path="/pda/progress-update"
              element={<PdaProgressUpdate />}
            />
            <Route path="/pda/field-qr-code" element={<PdaFieldQrCode />} />
          </Route>
        </Routes>
      ) : !isAuthenticated ? (
        <AuthLayout>
          {showEmergencyLogin ? (
            <LoginFormSimple
              onLogin={onLogin}
              onRegister={onRegister}
              error={getTranslatedError(loginError)}
              loading={loginLoading}
            />
          ) : (
            <LoginForm
              onLogin={onLogin}
              onRegister={onRegister}
              onOtpLogin={onOtpLogin}
              onEmergencyLogin={() => setShowEmergencyLogin(true)}
              error={getTranslatedError(loginError)}
              loading={loginLoading}
            />
          )}
        </AuthLayout>
      ) : (
        <MainPage />
      )}
      <Dialog
        open={backendDialogOpen}
        onClose={() => {
          // treat close as acknowledgement
          if (ackResolveRef.current) {
            ackResolveRef.current();
            ackResolveRef.current = null;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setBackendDialogOpen(false);
        }}
      >
        <DialogTitle>{t("error.serverError")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: "pre-wrap" }}>
            {backendDialogMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {backendDialogSecondsLeft > 0 && (
              <Typography variant="body2" color="text.secondary">
                {t("error.autoClose", { seconds: backendDialogSecondsLeft })}
              </Typography>
            )}
          </Box>
          <Box>
            <Button
              onClick={() => {
                if (ackResolveRef.current) {
                  ackResolveRef.current();
                  ackResolveRef.current = null;
                }
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                }
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                setBackendDialogOpen(false);
              }}
              autoFocus
            >
              {t("basic.ok")}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
}
