import React, { useEffect, useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Chat as ChatIcon,
  AccountCircle,
  Logout,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Info,
  Policy,
} from "@mui/icons-material";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { request } from "../../helpers/axios_helper";
import LanguageSwitcher from "../../components/LanguageSwitcher";

const TopBar = ({ onMenuClick, collapsed }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = (i18n?.language || "en").split("-")[0];
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { userInfo, logout } = useContext(AuthContext);

  const [anchorElUser, setAnchorElUser] = useState(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState(null);
  const [anchorElAbout, setAnchorElAbout] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenNotifications = (event) => {
    setAnchorElNotifications(event.currentTarget);
  };

  const handleCloseNotifications = () => {
    setAnchorElNotifications(null);
  };

  const handleOpenAbout = (event) => {
    // don't close the user menu here; open a separate about submenu
    setAnchorElAbout(event.currentTarget);
  };

  const handleCloseAbout = () => {
    setAnchorElAbout(null);
  };

  const currentUserMobile = encodeURIComponent(
    userInfo?.mobileNumber || userInfo?.mobile || userInfo?.phoneNumber || "",
  );

  const fetchUnreadCount = async () => {
    if (!currentUserMobile) return;
    try {
      const res = await request(
        "GET",
        `/api/messages/unread-count?mobileNumber=${currentUserMobile}`,
      );
      setUnreadCount(Number(res.data?.count ?? 0));
    } catch (err) {
      // silently ignore; badge will show 0
    }
  };

  useEffect(() => {
    if (!currentUserMobile) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    const onFocus = () => fetchUnreadCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [currentUserMobile]);

  const handleLogout = () => {
    handleCloseUserMenu();
    logout();
    navigate("/");
  };

  const handleProfile = () => {
    handleCloseUserMenu();
    navigate("/profile");
  };

  const handleSettings = () => {
    handleCloseUserMenu();
    navigate("/settings");
  };

  const handleOpenEula = () => {
    handleCloseUserMenu();
    handleCloseAbout();
    navigate("/about/eula");
  };

  const handleOpenPrivacy = () => {
    handleCloseUserMenu();
    handleCloseAbout();
    navigate("/about/privacy");
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase();
  };

  const DRAWER_WIDTH_COLLAPSED = 64;
  const DRAWER_WIDTH = 260;
  const drawerWidth =
    collapsed && !isMobile ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: "1px solid",
        borderColor: "divider",
        width: isMobile ? "100%" : `calc(100% - ${drawerWidth}px)`,
        ml: isMobile ? 0 : `${drawerWidth}px`,
        transition: theme.transitions.create(["width", "margin"], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", px: { xs: 1, sm: 2 } }}>
        {/* Left Section */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label={t("navigation.openDrawer", "Open drawer")}
              onClick={onMenuClick}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          {/* Breadcrumb or page title can go here */}
        </Box>

        {/* Right Section */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Language Switcher */}
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <LanguageSwitcher />
          </Box>

          {/* Notifications - Hidden for future implementation */}
          {/* 
          <Tooltip title={t("topbar.notifications", "Notifications")}>
            <IconButton
              color="inherit"
              onClick={handleOpenNotifications}
              sx={{
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          */}

          {/* Messages */}
          <Tooltip title={t("topbar.messages", "Messages")}>
            <IconButton
              color="inherit"
              onClick={() => navigate("/messages")}
              sx={{
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <Badge badgeContent={unreadCount} color="error">
                <ChatIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <Tooltip title={t("topbar.account", "Account")}>
            <IconButton
              onClick={handleOpenUserMenu}
              sx={{
                p: 0.5,
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "primary.main",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
              >
                {userInfo?.firstName && userInfo?.lastName ? (
                  getInitials(userInfo.firstName, userInfo.lastName)
                ) : (
                  <AccountCircle />
                )}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* User Menu Dropdown */}
      <Menu
        anchorEl={anchorElUser}
        open={Boolean(anchorElUser)}
        onClose={handleCloseUserMenu}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1.5,
            minWidth: 220,
            borderRadius: 2,
            "& .MuiMenuItem-root": {
              px: 2,
              py: 1,
              borderRadius: 1,
              mx: 0.5,
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 1.5, pb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {userInfo?.firstName} {userInfo?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {userInfo?.login}
          </Typography>
        </Box>
        <Divider sx={{ my: 0.5 }} />

        <MenuItem onClick={handleProfile}>
          <PersonIcon fontSize="small" sx={{ mr: 1.5 }} />
          {t("topbar.profile", "Profile")}
        </MenuItem>
        <MenuItem onClick={handleSettings}>
          <SettingsIcon fontSize="small" sx={{ mr: 1.5 }} />
          {t("topbar.settings", "Settings")}
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleOpenAbout}>
          <Info fontSize="small" sx={{ mr: 1.5 }} />
          {t("topbar.about", "About")}
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleLogout}>
          <Logout fontSize="small" sx={{ mr: 1.5 }} />
          {t("topbar.logout", "Logout")}
        </MenuItem>
      </Menu>

      {/* About submenu for EULA / Privacy */}
      <Menu
        anchorEl={anchorElAbout}
        open={Boolean(anchorElAbout)}
        onClose={handleCloseAbout}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1.5,
            minWidth: 220,
            borderRadius: 2,
            "& .MuiMenuItem-root": {
              px: 2,
              py: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem
          onClick={() => {
            handleCloseAbout();
            handleOpenEula();
          }}
        >
          <Info fontSize="small" sx={{ mr: 1.5 }} />
          {t("topbar.eula", "End User License Agreement")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleCloseAbout();
            handleOpenPrivacy();
          }}
        >
          <Policy fontSize="small" sx={{ mr: 1.5 }} />
          {t("topbar.privacy", "Privacy Policy")}
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={anchorElNotifications}
        open={Boolean(anchorElNotifications)}
        onClose={handleCloseNotifications}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1.5,
            width: 320,
            maxHeight: 400,
            borderRadius: 2,
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {t("topbar.notifications", "Notifications")}
          </Typography>
        </Box>
        <Divider />
        {/* Placeholder notifications */}
        <MenuItem onClick={handleCloseNotifications}>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {t("notifications.sample1", "New user registered")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("notifications.sample1Time", "5 minutes ago")}
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={handleCloseNotifications}>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {t("notifications.sample2", "System update available")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("notifications.sample2Time", "1 hour ago")}
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={handleCloseNotifications}>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {t("notifications.sample3", "New customer added")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("notifications.sample3Time", "2 hours ago")}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <Box sx={{ px: 2, py: 1, textAlign: "center" }}>
          <Typography
            variant="caption"
            color="primary"
            sx={{
              cursor: "pointer",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {t("notifications.viewAll", "View all notifications")}
          </Typography>
        </Box>
      </Menu>
    </AppBar>
  );
};

export default TopBar;
