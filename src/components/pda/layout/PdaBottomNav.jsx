import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonIcon from "@mui/icons-material/Person";

const TAB_ROUTES = ["/pda/orders", "/pda/schedule", "/pda/me"];

/**
 * PdaBottomNav — fixed bottom tab bar (WeChat-style).
 * Three tabs: Orders | Schedule | Me
 */
export default function PdaBottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active tab index from current path.
  // Detail sub-pages (e.g. /pda/orders/123) keep Orders highlighted.
  const activeIndex = TAB_ROUTES.findIndex((route) =>
    location.pathname.startsWith(route),
  );

  return (
    <Paper
      elevation={3}
      sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200 }}
    >
      <BottomNavigation
        value={activeIndex === -1 ? 0 : activeIndex}
        onChange={(_, newIndex) => navigate(TAB_ROUTES[newIndex])}
        showLabels
      >
        <BottomNavigationAction
          label={t("pda.nav.orders")}
          icon={<AssignmentIcon />}
        />
        <BottomNavigationAction
          label={t("pda.nav.schedule")}
          icon={<CalendarMonthIcon />}
        />
        <BottomNavigationAction
          label={t("pda.nav.me")}
          icon={<PersonIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
}
