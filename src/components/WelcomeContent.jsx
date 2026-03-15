import React from "react";
import { useTranslation } from "react-i18next";

export default function WelcomeContent() {
  const { t } = useTranslation();

  return (
    <div className="row justify-content-md-center">
      <div className="jumbotron jumbotron-fluid">
        <div className="container">
          <h1 className="display-4">{t("welcome.title")}</h1>
          <p className="lead">{t("welcome.subtitle")}</p>
        </div>
      </div>
    </div>
  );
}
