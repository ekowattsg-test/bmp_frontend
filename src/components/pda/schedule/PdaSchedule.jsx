import React from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

/**
 * PdaSchedule — placeholder for the Schedules tab.
 * Will show project task schedules and shift assignments in a future iteration.
 */
export default function PdaSchedule() {
  const { t } = useTranslation();

  return (
    <Box sx={{ textAlign: "center", mt: 8, color: "text.secondary" }}>
      <CalendarMonthIcon sx={{ fontSize: 56, opacity: 0.3, mb: 2 }} />
      <Typography variant="body1" gutterBottom>
        {t("pda.schedule.comingSoon")}
      </Typography>
      <Typography variant="caption">
        {t("pda.schedule.comingSoonDesc")}
      </Typography>
    </Box>
  );
}
