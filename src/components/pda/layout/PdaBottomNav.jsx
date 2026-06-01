import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PersonIcon from "@mui/icons-material/Person";

const TAB_ITEMS = [
  {
    route: "/pda/orders",
    navigateTo: "/pda/orders",
    labelKey: "pda.nav.orders",
    icon: <AssignmentIcon />,
  },
  {
    route: "/pda/stockcard",
    navigateTo: "/pda/stockcard?pda=1",
    labelKey: "pda.nav.stockCard",
    icon: <Inventory2Icon />,
  },
  {
    route: "/pda/me",
    navigateTo: "/pda/me",
    labelKey: "pda.nav.me",
    icon: <PersonIcon />,
  },
];

/**
 * PdaBottomNav — fixed bottom tab bar (WeChat-style).
 * Three tabs: Orders | Inventory Card | Me
 */
export default function PdaBottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active tab index from current path.
  // Detail sub-pages (e.g. /pda/orders/123) keep Orders highlighted.
  const activeIndex = TAB_ITEMS.findIndex((tab) =>
    location.pathname.startsWith(tab.route),
  );

  return (
    <Paper
      elevation={3}
      sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200 }}
    >
      <BottomNavigation
        value={activeIndex === -1 ? 0 : activeIndex}
        onChange={(_, newIndex) =>
          navigate(TAB_ITEMS[newIndex].navigateTo, {
            state: { title: t(TAB_ITEMS[newIndex].labelKey) },
          })
        }
        showLabels
      >
        {TAB_ITEMS.map((tab) => (
          <BottomNavigationAction
            key={tab.route}
            label={t(tab.labelKey)}
            icon={tab.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
