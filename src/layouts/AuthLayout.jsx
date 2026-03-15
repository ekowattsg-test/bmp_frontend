import React from "react";
import { Box, Paper, useTheme, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";

const AuthLayout = ({ children }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        backgroundImage: "linear-gradient(135deg, #9DC639 0%, #8BB833 100%)",
        position: "relative",
        p: 2,
      }}
    >
      {/* Language Switcher - Top Right */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
        }}
      >
        <LanguageSwitcher />
      </Box>

      {/* Top banner removed per request */}

      {/* Auth Content Card */}
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 450,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          bgcolor: "background.paper",
        }}
      >
        {/* Small header / hero inside the card (also removable) */}
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Box sx={{ display: "inline-block", mb: 1 }}>
            {/* simple SVG logo placeholder */}
            <svg
              width="56"
              height="56"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="6"
                y="6"
                width="52"
                height="52"
                rx="10"
                fill="var(--color-primary)"
              />
              <path
                d="M20 36 L28 28 L36 36 L44 28"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t("auth.appTitle")}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("auth.appSubtitle")}
          </Typography>
        </Box>

        {children}
      </Paper>

      {/* Footer */}
      <Box
        sx={{
          position: "absolute",
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.8)",
          fontSize: "0.875rem",
        }}
      >
        {t("auth.footer", { year: new Date().getFullYear() })}
      </Box>
    </Box>
  );
};

export default AuthLayout;
