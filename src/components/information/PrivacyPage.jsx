import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function PrivacyPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n?.language || "en").split("-")[0];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t("auth.privacy")}
      </Typography>
      <iframe
        title="Privacy Policy"
        src={`/privacy_${lang}.html`}
        style={{ width: "100%", height: "80vh", border: "none" }}
      />
    </Box>
  );
}
