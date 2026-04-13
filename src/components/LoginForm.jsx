import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import { Alert, Button } from "@mui/material";

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
              </div>

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
