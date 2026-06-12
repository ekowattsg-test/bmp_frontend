import React from "react";
import { useTranslation } from "react-i18next";

const Rightbar = () => {
  const { t } = useTranslation();
  return <div>{t("legacy.rightbar", "Rightbar")}</div>;
};

export default Rightbar;
