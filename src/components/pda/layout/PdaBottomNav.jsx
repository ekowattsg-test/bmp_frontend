import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CampaignIcon from "@mui/icons-material/Campaign";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PersonIcon from "@mui/icons-material/Person";
import EngineeringIcon from "@mui/icons-material/Engineering";
import PublishedWithChangesIcon from "@mui/icons-material/PublishedWithChanges";

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
];

import WorklistIcon from "@mui/icons-material/PlaylistAddCheck";

const SITE_MENU_ITEMS = [
  {
    route: "/pda/briefing",
    navigateTo: "/pda/briefing",
    labelKey: "pda.nav.briefing",
    icon: <CampaignIcon />,
  },
  {
    route: "/pda/available-tasks",
    navigateTo: "/pda/available-tasks",
    labelKey: "pda.nav.availableTasks",
    icon: <WorklistIcon />,
  },
  {
    route: "/pda/progress-update",
    navigateTo: "/pda/progress-update",
    labelKey: "pda.nav.progressUpdate",
    icon: <PublishedWithChangesIcon />,
  },
];

/**
 * PdaBottomNav — fixed bottom tab bar.
 * Tabs: Orders | Inventory Card | Me | Site
 * "Site" opens a bottom drawer with additional navigation items (e.g. Briefing).
 */
export default function PdaBottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [siteOpen, setSiteOpen] = useState(false);

  // Derive active tab index from current path.
  const activeIndex = TAB_ITEMS.findIndex((tab) =>
    location.pathname.startsWith(tab.route),
  );

  // Check if current path is within a site-menu route (for Site tab highlight)
  const isSiteActive = SITE_MENU_ITEMS.some((item) =>
    location.pathname.startsWith(item.route),
  );

  const handleTabChange = (_, newIndex) => {
    if (newIndex === TAB_ITEMS.length) {
      // "Site" tab
      setSiteOpen(true);
      return;
    }
    if (newIndex === TAB_ITEMS.length + 1) {
      // "Me" tab — always last
      navigate("/pda/me", { state: { title: t("pda.nav.me") } });
      return;
    }
    navigate(TAB_ITEMS[newIndex].navigateTo, {
      state: { title: t(TAB_ITEMS[newIndex].labelKey) },
    });
  };

  const handleSiteItem = (item) => {
    setSiteOpen(false);
    navigate(item.navigateTo, {
      state: { title: t(item.labelKey) },
    });
  };

  const meTabIndex = TAB_ITEMS.length + 1; // always last
  const siteTabIndex = TAB_ITEMS.length;

  const isMeActive = location.pathname.startsWith("/pda/me");

  const activeValue = isMeActive
    ? meTabIndex
    : isSiteActive || siteOpen
      ? siteTabIndex
      : activeIndex === -1
        ? 0
        : activeIndex;

  return (
    <>
      <Paper
        elevation={3}
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200 }}
      >
        <BottomNavigation
          value={activeValue}
          onChange={handleTabChange}
          showLabels
        >
          {TAB_ITEMS.map((tab) => (
            <BottomNavigationAction
              key={tab.route}
              label={t(tab.labelKey)}
              icon={tab.icon}
            />
          ))}
          <BottomNavigationAction
            label={t("pda.nav.site", "Site")}
            icon={<EngineeringIcon />}
          />
          <BottomNavigationAction
            label={t("pda.nav.me")}
            icon={<PersonIcon />}
          />
        </BottomNavigation>
      </Paper>

      <Drawer
        anchor="bottom"
        open={siteOpen}
        onClose={() => setSiteOpen(false)}
        PaperProps={{
          sx: { borderRadius: "16px 16px 0 0", pb: 2 },
        }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            fontWeight={700}
            textTransform="uppercase"
          >
            {t("pda.nav.siteMenu", "Site")}
          </Typography>
        </Box>
        <List disablePadding>
          {SITE_MENU_ITEMS.map((item) => (
            <ListItemButton
              key={item.route}
              onClick={() => handleSiteItem(item)}
              selected={location.pathname.startsWith(item.route)}
              sx={{ px: 3, py: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={t(item.labelKey)} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </>
  );
}
