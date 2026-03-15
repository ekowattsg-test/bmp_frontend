import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import languageset from "../helpers/language_helper";

function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsOpen(false); // Close dropdown after selection
  };

  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Define languages with fallback names in case translations aren't loaded yet
  // const languages = [
  //   { code: "en", name: t("languages.en", "English") },
  //   { code: "zh", name: t("languages.zh", "简体中文") },
  // ];
  const languages = languageset();

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      style={{
        margin: "10px",
        position: "relative",
        display: "inline-block",
      }}
    >
      <button
        onClick={toggleDropdown}
        className="btn btn-outline-light btn-sm"
        style={{
          fontSize: "12px",
          padding: "4px 12px",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          backgroundColor: "var(--color-white)",
          color: "var(--color-dark)",
          border: "1px solid var(--color-dark)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <span>
          {t("navigation.language", "Language")}: {currentLanguage.name}
        </span>
        <span style={{ fontSize: "10px" }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: "0",
            backgroundColor: "var(--color-white)",
            border: "1px solid var(--color-gray-300)",
            borderRadius: "4px",
            boxShadow: "var(--shadow-md)",
            zIndex: 1000,
            minWidth: "140px",
            marginTop: "2px",
          }}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px",
                border: "none",
                backgroundColor:
                  i18n.language === lang.code
                    ? "var(--color-primary)"
                    : "transparent",
                color:
                  i18n.language === lang.code
                    ? "var(--color-white)"
                    : "var(--color-dark)",
                textAlign: "left",
                fontSize: "12px",
                cursor: "pointer",
                borderBottom: "1px solid var(--color-gray-200)",
              }}
              onMouseOver={(e) => {
                if (i18n.language !== lang.code) {
                  e.target.style.backgroundColor = "var(--color-gray-100)";
                }
              }}
              onMouseOut={(e) => {
                if (i18n.language !== lang.code) {
                  e.target.style.backgroundColor = "transparent";
                }
              }}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
