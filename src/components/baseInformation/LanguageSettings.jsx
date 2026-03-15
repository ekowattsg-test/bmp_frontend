import React from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Container,
} from "@mui/material";
import { Language as LanguageIcon } from "@mui/icons-material";
import languageset from "../../helpers/language_helper";

const LanguageSettings = () => {
  const { t, i18n } = useTranslation();
  const languages = languageset();

  const handleLanguageChange = (event) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <LanguageIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Typography variant="h4" component="h1">
          {t("menu.languageSettings", "Language Settings")}
        </Typography>
      </Box>

      <Card elevation={2}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            {t("navigation.language", "Language")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t(
              "languageSettings.description",
              "Select your preferred language for the application interface.",
            )}
          </Typography>

          <RadioGroup
            value={i18n.language}
            onChange={handleLanguageChange}
            sx={{ gap: 2 }}
          >
            {languages.map((lang) => (
              <Card
                key={lang.code}
                variant="outlined"
                sx={{
                  borderColor:
                    i18n.language === lang.code ? "primary.main" : "grey.300",
                  borderWidth: i18n.language === lang.code ? 2 : 1,
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "action.hover",
                  },
                }}
              >
                <FormControlLabel
                  value={lang.code}
                  control={<Radio />}
                  label={
                    <Box sx={{ py: 1 }}>
                      <Typography variant="body1" fontWeight="medium">
                        {lang.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {lang.code.toUpperCase()}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    m: 0,
                    p: 2,
                    width: "100%",
                    "& .MuiFormControlLabel-label": {
                      flex: 1,
                    },
                  }}
                />
              </Card>
            ))}
          </RadioGroup>

          <Box sx={{ mt: 4, p: 2, bgcolor: "info.lighter", borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>{t("common.note", "Note")}:</strong>{" "}
              {t(
                "languageSettings.note",
                "Language changes will be applied immediately and will persist across sessions.",
              )}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default LanguageSettings;
