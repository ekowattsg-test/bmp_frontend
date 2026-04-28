import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AppBar, Box, Toolbar, Typography } from "@mui/material";

export default function PdaMenu() {
  const { t } = useTranslation();

  const userName = useMemo(() => {
    try {
      const stored = localStorage.getItem("pda_user_info");
      if (!stored) return "";
      const user = JSON.parse(stored);
      const parts = [user.firstName, user.lastName].filter(Boolean);
      return parts.length > 0 ? parts.join(" ") : user.login || "";
    } catch {
      return "";
    }
  }, []);

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t("pda.menu.title")}
          </Typography>
          {userName && <Typography variant="body1">{userName}</Typography>}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
