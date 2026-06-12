import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { useCameraScanner } from "../helpers/camera_scanner_helper";

export default function LoginForm({
  onLogin,
  onRegister,
  onOtpLogin,
  error = "",
  loading = false,
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n?.language || "en").split("-")[0];
  const showCredentialLoginBlock =
    String(import.meta.env.VITE_SHOW_CREDENTIAL_LOGIN_BLOCK || "true")
      .toLowerCase()
      .trim() !== "false";
  const [active, setActive] = useState("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [qrLoginUrl, setQrLoginUrl] = useState("");
  const [qrInputOpen, setQrInputOpen] = useState(false);
  const qrRedirectingRef = useRef(false);

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;

    switch (name) {
      case "firstName":
        setFirstName(value);
        break;
      case "lastName":
        setLastName(value);
        break;
      case "login":
        setLogin(value);
        break;
      case "password":
        setPassword(value);
        break;
      default:
        break;
    }
  };

  const onSubmitLogin = (e) => {
    onLogin(e, login, password);
  };

  const onSubmitRegister = (e) => {
    onRegister(e, firstName, lastName, login, password);
  };

  const onSubmitOtp = (e) => {
    onOtpLogin(e, otp);
  };

  const hasCredentials = login.trim() !== "" || password.trim() !== "";
  const hasOtp = otp.trim() !== "";

  const openScannedLoginUrl = (scannedValue) => {
    if (qrRedirectingRef.current) return;

    const rawValue = String(scannedValue || "").trim();
    if (!rawValue) return;

    let parsedUrl;
    try {
      parsedUrl = new URL(rawValue);
    } catch {
      alert(t("auth.qrLoginInvalidUrl"));
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      alert(t("auth.qrLoginInvalidUrl"));
      return;
    }

    if (parsedUrl.hostname !== window.location.hostname) {
      alert(t("auth.qrLoginDomainMismatch"));
      return;
    }

    // Always use same-tab navigation for QR login to avoid duplicate tab opens.
    qrRedirectingRef.current = true;
    window.location.assign(parsedUrl.toString());
  };

  const { openScanner: openQrUrlScanner, scannerOverlay: qrUrlScannerOverlay } =
    useCameraScanner({
      onScan: (scannedValue) => {
        setQrLoginUrl(scannedValue);
        openScannedLoginUrl(scannedValue);
      },
      containerId: "login-url-scanner",
      normalize: false,
    });

  const showQrInput = () => {
    setQrLoginUrl("");
    setQrInputOpen(true);
  };

  const openPolicyPopup = (event, url, windowName) => {
    event.preventDefault();
    setActive("login");

    const popup = window.open(
      url,
      windowName,
      "popup=yes,width=960,height=720,noopener,noreferrer,resizable=yes,scrollbars=yes",
    );

    if (!popup) {
      return;
    }

    popup.focus();
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12">
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        <div className="tab-content">
          <div
            className={classNames(
              "tab-pane",
              "fade",
              active === "login" ? "show active" : "",
            )}
            id="pills-login"
          >
            {showCredentialLoginBlock && (
              <Box sx={{ mb: 2 }}>
                <form onSubmit={onSubmitLogin}>
                  <TextField
                    label={t("auth.username")}
                    type="text"
                    id="loginName"
                    name="login"
                    fullWidth
                    margin="normal"
                    onChange={onChangeHandler}
                    disabled={hasOtp || loading}
                  />

                  <TextField
                    label={t("auth.password")}
                    type="password"
                    id="loginPassword"
                    name="password"
                    fullWidth
                    margin="normal"
                    onChange={onChangeHandler}
                    disabled={hasOtp || loading}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={loading || hasOtp}
                    sx={{ mb: 2 }}
                  >
                    {loading
                      ? t("auth.signingIn", "Signing in...")
                      : t("auth.signIn")}
                  </Button>
                </form>
                <Divider sx={{ mb: 1.5 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", px: 1 }}
                  >
                    {t("auth.orSignInWithOtp")}
                  </Typography>
                </Divider>
              </Box>
            )}

            <form onSubmit={onSubmitOtp}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <TextField
                  label={t("auth.otpLabel")}
                  type="password"
                  id="otpInput"
                  name="otp"
                  fullWidth
                  margin="none"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={hasCredentials || loading}
                  sx={{ mb: 0 }}
                />
                <Button
                  type="submit"
                  variant={hasOtp ? "contained" : "outlined"}
                  color="primary"
                  disabled={loading || hasCredentials}
                  sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {loading
                    ? t("auth.signingIn", "Signing in...")
                    : t("auth.signInWithOtp")}
                </Button>
              </div>
            </form>

            <Box
              sx={{
                mb: 1,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            />

            {qrInputOpen ? (
              <Box sx={{ mb: 0 }}>
                <TextField
                  value={qrLoginUrl}
                  onChange={(event) => setQrLoginUrl(event.target.value)}
                  autoFocus
                  fullWidth
                  size="small"
                  margin="none"
                  placeholder={t(
                    "auth.qrLoginPlaceholder",
                    "Scan login QR code",
                  )}
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={openQrUrlScanner}
                          aria-label={t("auth.scanQrLogin")}
                          disabled={loading}
                        >
                          <QrCodeScannerIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      openScannedLoginUrl(qrLoginUrl);
                    }
                  }}
                />
              </Box>
            ) : (
              <Box
                role="button"
                tabIndex={loading ? -1 : 0}
                aria-disabled={loading}
                onClick={() => {
                  if (!loading) showQrInput();
                }}
                onKeyDown={(event) => {
                  if (loading) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    showQrInput();
                  }
                }}
                sx={{
                  mb: 0,
                  py: 0.75,
                  px: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "primary.main",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                <Typography variant="body1">{t("auth.scanQrLogin")}</Typography>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    openQrUrlScanner();
                  }}
                  aria-label={t("auth.scanQrLogin")}
                  disabled={loading}
                  sx={{ color: "primary.main" }}
                >
                  <QrCodeScannerIcon />
                </IconButton>
              </Box>
            )}

            <Box
              sx={{
                mt: 1.5,
                fontSize: "0.9rem",
                color: "var(--color-text-secondary)",
              }}
            >
              {t("auth.legalPrefix")}{" "}
              <a
                href={`/eula_${lang}.html`}
                onClick={(event) =>
                  openPolicyPopup(event, `/eula_${lang}.html`, "bmp-eula")
                }
                rel="noopener noreferrer"
              >
                {t("auth.eula")}
              </a>{" "}
              {t("auth.and")}{" "}
              <a
                href={`/privacy_${lang}.html`}
                onClick={(event) =>
                  openPolicyPopup(
                    event,
                    `/privacy_${lang}.html`,
                    "bmp-privacy-policy",
                  )
                }
                rel="noopener noreferrer"
              >
                {t("auth.privacy")}
              </a>
              .
            </Box>
            {qrUrlScannerOverlay}
          </div>
          <div
            className={classNames(
              "tab-pane",
              "fade",
              active === "register" ? "show active" : "",
            )}
            id="pills-register"
          >
            <form onSubmit={onSubmitRegister}>
              <TextField
                label={t("auth.firstName")}
                type="text"
                id="firstName"
                name="firstName"
                fullWidth
                margin="normal"
                onChange={onChangeHandler}
              />

              <TextField
                label={t("auth.lastName")}
                type="text"
                id="lastName"
                name="lastName"
                fullWidth
                margin="normal"
                onChange={onChangeHandler}
              />

              <TextField
                label={t("auth.username")}
                type="text"
                id="login"
                name="login"
                fullWidth
                margin="normal"
                onChange={onChangeHandler}
              />

              <TextField
                label={t("auth.password")}
                type="password"
                id="registerPassword"
                name="password"
                fullWidth
                margin="normal"
                onChange={onChangeHandler}
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading}
                sx={{ mb: 3 }}
              >
                {loading
                  ? t("auth.signingUp", "Signing up...")
                  : t("auth.signUp")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
