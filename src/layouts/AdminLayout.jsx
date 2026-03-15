import React, { useState } from "react";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 64;

const AdminLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapseToggle = () => {
    setCollapsed(!collapsed);
  };

  const drawerWidth =
    collapsed && !isMobile ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* Sidebar */}
      <Sidebar
        open={mobileOpen}
        onClose={handleDrawerToggle}
        collapsed={collapsed}
        onToggleCollapse={handleCollapseToggle}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: isMobile ? "100%" : `calc(100% - ${drawerWidth}px)`,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* Top Navigation Bar */}
        <TopBar onMenuClick={handleDrawerToggle} collapsed={collapsed} />

        {/* Page Content */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            mt: 8, // Account for AppBar height
            width: "100%",
            maxWidth: "100%",
            mx: "auto",
          }}
        >
          {children}
        </Box>

        {/* Footer (Optional) */}
        <Box
          component="footer"
          sx={{
            py: 2,
            px: { xs: 2, sm: 3 },
            mt: "auto",
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Box sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
              © {new Date().getFullYear()} BMP System. All rights reserved.
            </Box>
            <Box sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
              Version 1.0.0
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
