import i18n from "../i18n";

const languageset = () => {
  const t = i18n.t.bind(i18n);
  return [
    { code: "en", name: t("languages.en", "English") },
    { code: "zh", name: t("languages.zh", "简体中文") },
  ];
};

export default languageset;
