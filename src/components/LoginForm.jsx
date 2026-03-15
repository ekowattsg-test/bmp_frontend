import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import {
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

export default function LoginForm({
  onLogin,
  onRegister,
  error = "",
  loading = false,
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n?.language || "en").split("-")[0];
  const [active, setActive] = useState("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

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

  const [eulaOpen, setEulaOpen] = useState(false);
  const eulaRef = useRef(null);
  const scrollListenerRef = useRef(null);
  const [eulaScrolled, setEulaScrolled] = useState(false);
  const privacyRef = useRef(null);
  const privacyScrollRef = useRef(null);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);

  const openEula = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setEulaScrolled(false);
    setEulaOpen(true);
  };
  const openPrivacy = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setPrivacyScrolled(false);
    setPrivacyOpen(true);
  };

  const closeEula = () => {
    // clear any attached polling interval
    try {
      if (scrollListenerRef.current) {
        clearInterval(scrollListenerRef.current);
        scrollListenerRef.current = null;
      }
    } catch (err) {
      // ignore
    }
    setEulaOpen(false);
    setEulaScrolled(false);
  };

  const closePrivacy = () => {
    try {
      if (privacyScrollRef.current) {
        clearInterval(privacyScrollRef.current);
        privacyScrollRef.current = null;
      }
    } catch (err) {
      // ignore
    }
    setPrivacyOpen(false);
    setPrivacyScrolled(false);
  };

  const onIframeLoad = () => {
    try {
      const iframe = eulaRef.current;
      const doc =
        iframe && (iframe.contentDocument || iframe.contentWindow.document);
      if (!doc) {
        setEulaScrolled(true);
        return;
      }
      const el = doc.documentElement || doc.body;

      const checkScrolledToEnd = () => {
        const scrollTop =
          (el && el.scrollTop) ||
          (doc.documentElement && doc.documentElement.scrollTop) ||
          (doc.body && doc.body.scrollTop) ||
          0;
        const scrollHeight =
          (el && el.scrollHeight) ||
          (doc.documentElement && doc.documentElement.scrollHeight) ||
          (doc.body && doc.body.scrollHeight) ||
          0;
        const clientHeight =
          (el && el.clientHeight) ||
          (doc.documentElement && doc.documentElement.clientHeight) ||
          (doc.body && doc.body.clientHeight) ||
          0;
        if (scrollHeight - scrollTop - clientHeight <= 2) {
          setEulaScrolled(true);
          if (scrollListenerRef.current) {
            clearInterval(scrollListenerRef.current);
            scrollListenerRef.current = null;
          }
        }
      };

      // initial check
      checkScrolledToEnd();

      if (!eulaScrolled) {
        // use polling to reliably detect scrolling end inside iframe
        const id = setInterval(checkScrolledToEnd, 250);
        scrollListenerRef.current = id;
      }
    } catch (err) {
      // if any error (e.g., cross-origin), enable the button so user isn't blocked
      setEulaScrolled(true);
    }
  };

  const onPrivacyIframeLoad = () => {
    try {
      const iframe = privacyRef.current;
      const doc =
        iframe && (iframe.contentDocument || iframe.contentWindow.document);
      if (!doc) {
        setPrivacyScrolled(true);
        return;
      }
      const el = doc.documentElement || doc.body;

      const checkScrolledToEnd = () => {
        const scrollTop =
          (el && el.scrollTop) ||
          (doc.documentElement && doc.documentElement.scrollTop) ||
          (doc.body && doc.body.scrollTop) ||
          0;
        const scrollHeight =
          (el && el.scrollHeight) ||
          (doc.documentElement && doc.documentElement.scrollHeight) ||
          (doc.body && doc.body.scrollHeight) ||
          0;
        const clientHeight =
          (el && el.clientHeight) ||
          (doc.documentElement && doc.documentElement.clientHeight) ||
          (doc.body && doc.body.clientHeight) ||
          0;
        if (scrollHeight - scrollTop - clientHeight <= 2) {
          setPrivacyScrolled(true);
          if (privacyScrollRef.current) {
            clearInterval(privacyScrollRef.current);
            privacyScrollRef.current = null;
          }
        }
      };

      // initial check
      checkScrolledToEnd();
      if (!privacyScrolled) {
        const id = setInterval(checkScrolledToEnd, 250);
        privacyScrollRef.current = id;
      }
    } catch (err) {
      setPrivacyScrolled(true);
    }
  };

  const [privacyOpen, setPrivacyOpen] = useState(false);

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
            <form onSubmit={onSubmitLogin}>
              <div className="form-outline mb-4">
                <input
                  type="login"
                  id="loginName"
                  name="login"
                  className="form-control"
                  onChange={onChangeHandler}
                />
                <label className="form-label" htmlFor="loginName">
                  {t("auth.username")}
                </label>
              </div>

              <div className="form-outline mb-4">
                <input
                  type="password"
                  id="loginPassword"
                  name="password"
                  className="form-control"
                  onChange={onChangeHandler}
                />
                <label className="form-label" htmlFor="loginPassword">
                  {t("auth.password")}
                </label>
              </div>

              <div
                style={{ marginBottom: 12, fontSize: "0.9rem", color: "#555" }}
              >
                {t("auth.legalPrefix")}{" "}
                <a
                  href={`/eula_${lang}.html`}
                  onClick={openEula}
                  rel="noopener noreferrer"
                >
                  {t("auth.eula")}
                </a>{" "}
                {t("auth.and")}{" "}
                <a
                  href={`/privacy_${lang}.html`}
                  onClick={openPrivacy}
                  rel="noopener noreferrer"
                >
                  {t("auth.privacy")}
                </a>
                .
              </div>

              <Dialog
                open={eulaOpen}
                onClose={closeEula}
                fullWidth
                maxWidth="md"
              >
                <DialogTitle>{t("auth.eula")}</DialogTitle>
                <DialogContent dividers>
                  <iframe
                    ref={eulaRef}
                    onLoad={onIframeLoad}
                    src={`/eula_${lang}.html`}
                    title="EULA"
                    style={{ width: "100%", height: "60vh", border: "none" }}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={closeEula} disabled={!eulaScrolled}>
                    {eulaScrolled
                      ? t("common.close", "Close")
                      : t("eula.scrollToEnd", "Scroll to end to enable")}
                  </Button>
                </DialogActions>
              </Dialog>

              <Dialog
                open={privacyOpen}
                onClose={closePrivacy}
                fullWidth
                maxWidth="md"
              >
                <DialogTitle>{t("auth.privacy")}</DialogTitle>
                <DialogContent dividers>
                  <iframe
                    ref={privacyRef}
                    onLoad={onPrivacyIframeLoad}
                    src={`/privacy_${lang}.html`}
                    title="Privacy Policy"
                    style={{ width: "100%", height: "60vh", border: "none" }}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={closePrivacy} disabled={!privacyScrolled}>
                    {privacyScrolled
                      ? t("common.close", "Close")
                      : t("privacy.scrollToEnd", "Scroll to end to enable")}
                  </Button>
                </DialogActions>
              </Dialog>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading}
                sx={{ mb: 4 }}
              >
                {loading
                  ? t("auth.signingIn", "Signing in...")
                  : t("auth.signIn")}
              </Button>
            </form>
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
              <div className="form-outline mb-4">
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  className="form-control"
                  onChange={onChangeHandler}
                />
                <label className="form-label" htmlFor="firstName">
                  {t("auth.firstName")}
                </label>
              </div>

              <div className="form-outline mb-4">
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  className="form-control"
                  onChange={onChangeHandler}
                />
                <label className="form-label" htmlFor="lastName">
                  {t("auth.lastName")}
                </label>
              </div>

              <div className="form-outline mb-4">
                <input
                  type="text"
                  id="login"
                  name="login"
                  className="form-control"
                  onChange={onChangeHandler}
                />
                <label className="form-label" htmlFor="login">
                  {t("auth.username")}
                </label>
              </div>

              <div className="form-outline mb-4">
                <input
                  type="password"
                  id="registerPassword"
                  name="password"
                  className="form-control"
                  onChange={onChangeHandler}
                />
                <label className="form-label" htmlFor="registerPassword">
                  {t("auth.password")}
                </label>
              </div>

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
