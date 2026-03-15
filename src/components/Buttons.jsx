import React from "react";
import { useTranslation } from "react-i18next";

export default function Buttons(props) {
  const { t } = useTranslation();

  return (
    <div className="row">
      <div className="col-md-12 text-center" style={{ marginTop: "30px" }}>
        {/* <button
          className="btn btn-primary"
          style={{ margin: "10px" }}
          onClick={props.login}
        >
          {t("navigation.login")}
        </button>
        <button
          className="btn btn-dark"
          style={{ margin: "10px" }}
          onClick={props.logout}
        >
          {t('navigation.logout')}
        </button> */}
      </div>
    </div>
  );
}
