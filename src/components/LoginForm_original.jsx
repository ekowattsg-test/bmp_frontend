import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";

export default function LoginForm({ onLogin, onRegister }) {
  const { t } = useTranslation();
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

  return (
    <div className="row justify-content-center">
      <div className="col-4">
        <ul
          className="nav nav-pills nav-justified mb-3"
          id="ex1"
          role="tablist"
        >
          <li className="nav-item" role="presentation">
            <button
              className={classNames(
                "nav-link",
                active === "login" ? "active" : ""
              )}
              id="tab-login"
              onClick={() => setActive("login")}
            >
              {t("auth.login")}
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={classNames(
                "nav-link",
                active === "register" ? "active" : ""
              )}
              id="tab-register"
              onClick={() => setActive("register")}
            >
              {t("auth.register")}
            </button>
          </li>
        </ul>

        <div className="tab-content">
          <div
            className={classNames(
              "tab-pane",
              "fade",
              active === "login" ? "show active" : ""
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

              <button type="submit" className="btn btn-primary btn-block mb-4">
                {t("auth.signIn")}
              </button>
            </form>
          </div>
          <div
            className={classNames(
              "tab-pane",
              "fade",
              active === "register" ? "show active" : ""
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

              <button type="submit" className="btn btn-primary btn-block mb-3">
                {t("auth.signUp")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
