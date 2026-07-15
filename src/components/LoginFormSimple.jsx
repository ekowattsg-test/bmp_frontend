import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import { Alert, Box, Button, TextField } from "@mui/material";

export default function LoginFormSimple({
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
    if (popup) popup.focus();
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
            {
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
                    disabled={loading}
                  />
                  <TextField
                    label={t("auth.password")}
                    type="password"
                    id="loginPassword"
                    name="password"
                    fullWidth
                    margin="normal"
                    onChange={onChangeHandler}
                    disabled={loading}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={loading}
                    sx={{ mb: 2 }}
                  >
                    {loading
                      ? t("auth.signingIn", "Signing in...")
                      : t("auth.signIn")}
                  </Button>
                </form>
              </Box>
            }

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
