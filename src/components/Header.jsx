import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { useContext } from "react";
import { AuthContext } from "../context/authContext.jsx";

export default function Header(props) {
  const { t } = useTranslation();
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <header
      className="App-header"
      style={{
        display: !isAuthenticated ? "block" : "none",
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          flexWrap: "wrap",
          gap: "8px",
          rowGap: "12px",
          justifyContent: "space-between",
        }}
      >
        <div className="App-header-img" style={{ minWidth: 48 }}>
          <Box
            sx={{
              width: "100%",
              minWidth: 32,
              maxWidth: { xs: 40, sm: 48 },
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ml: 1,
            }}
          >
            <img
              src={props.logoSrc}
              className="App-logo"
              alt="logo"
              style={{
                width: "100%",
                maxWidth: 48,
                height: "auto",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
              }}
            />
          </Box>
        </div>
        <div className="App-title" style={{ flex: 1, minWidth: 120 }}>
          <h1
            style={{
              fontSize: "clamp(1.2rem, 4vw, 2.2rem)",
              margin: 0,
              wordBreak: "break-word",
              fontWeight: 600,
            }}
          >
            {t("header.title")}
          </h1>
        </div>
        <div
          className="App-header-language"
          style={{ marginLeft: "auto", minWidth: 100 }}
        >
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
