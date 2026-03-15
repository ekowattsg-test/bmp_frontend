import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import enTranslation from "./locales/en/translation.json";
import zhTranslation from "./locales/zh/translation.json";
// import zhTWTranslation from "./locales/zh-TW/translation.json";

const resources = {
  en: {
    translation: enTranslation,
  },
  zh: {
    translation: zhTranslation,
  },
  // "zh-TW": {
  //   translation: zhTWTranslation,
  // },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",

    // Configure language detector
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Namespace configuration
    defaultNS: "translation",
    ns: ["translation"],
  });

export default i18n;
