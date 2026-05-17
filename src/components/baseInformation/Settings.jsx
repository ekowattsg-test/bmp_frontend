import React, { useState, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { toLocalISO } from "../../helpers/date_helper";
import { AuthContext } from "../../context/authContext";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Container,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  Divider,
  Grid,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Accessibility as AccessibilityIcon,
  NotificationsActive as NotificationsIcon,
  Language as LanguageIcon,
  Tune as TuneIcon,
  GetApp as ExportIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  Computer as ComputerIcon,
} from "@mui/icons-material";

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { userInfo, setUserInfo } = useContext(AuthContext);

  // Account Security State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Accessibility State
  const [fontSize, setFontSize] = useState("medium");
  const [highContrast, setHighContrast] = useState(false);
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(true);

  // Mock active sessions data
  const [activeSessions] = useState([
    {
      id: 1,
      device: "Windows PC - Chrome",
      location: "New York, USA",
      lastActive: "Active now",
      current: true,
    },
    {
      id: 2,
      device: "iPhone 15 - Safari",
      location: "New York, USA",
      lastActive: "2 hours ago",
      current: false,
    },
  ]);

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setPasswordError(
        t("settings.passwordRequired", "All password fields are required"),
      );
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(
        t("settings.passwordMismatch", "New passwords do not match"),
      );
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError(
        t("settings.passwordLength", "Password must be at least 8 characters"),
      );
      return;
    }

    setPasswordLoading(true);
    try {
      // Make API call to change password
      await request("PUT", `/api/users/${userInfo.id}/change-password`, {
        oldPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      // Refresh user info to pick up updated lastPasswordChanged if available
      try {
        const userResp = await request("GET", `/api/users/${userInfo.id}`, {});
        if (userResp && userResp.data) {
          setUserInfo(userResp.data);
        } else {
          setUserInfo((prev) => ({
            ...(prev || {}),
            lastPasswordChanged: new Date().toISOString(),
          }));
        }
      } catch (err) {
        // Fallback to optimistic update if fetching user failed
        setUserInfo((prev) => ({
          ...(prev || {}),
          lastPasswordChanged: new Date().toISOString(),
        }));
      }

      setPasswordSuccess(
        t("settings.passwordChanged", "Password changed successfully"),
      );
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess("");
      }, 2000);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        t(
          "settings.passwordChangeFailed",
          "Failed to change password. Please check your current password.",
        );
      setPasswordError(errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem("accessibility-fontSize", size);
    const root = document.documentElement;
    const sizes = {
      small: "14px",
      medium: "16px",
      large: "18px",
      xlarge: "20px",
    };
    root.style.fontSize = sizes[size];
  };

  const handleHighContrastToggle = (enabled) => {
    setHighContrast(enabled);
    localStorage.setItem("accessibility-highContrast", enabled.toString());
    const root = document.documentElement;
    if (enabled) {
      root.setAttribute("data-high-contrast", "true");
    } else {
      root.removeAttribute("data-high-contrast");
    }
  };

  // Load accessibility settings from localStorage on mount
  useEffect(() => {
    const savedFontSize =
      localStorage.getItem("accessibility-fontSize") || "medium";
    const savedHighContrast =
      localStorage.getItem("accessibility-highContrast") === "true";

    setFontSize(savedFontSize);
    setHighContrast(savedHighContrast);

    // Apply saved settings
    handleFontSizeChange(savedFontSize);
    if (savedHighContrast) {
      const root = document.documentElement;
      root.setAttribute("data-high-contrast", "true");
    }
  }, []);

  const formatDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date)) return String(value);
    const locale = i18n?.language || undefined;
    return date.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const SettingSection = ({
    icon: Icon,
    title,
    children,
    implemented = false,
  }) => (
    <Card
      elevation={2}
      sx={{
        mb: 3,
        opacity: implemented ? 1 : 0.6,
        cursor: implemented ? "default" : "not-allowed",
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Icon sx={{ fontSize: 28, color: "primary.main" }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{title}</Typography>
          </Box>
          {!implemented && (
            <Chip
              label={t("common.comingSoon", "Coming Soon")}
              size="small"
              color="warning"
            />
          )}
        </Box>
        {children}
      </CardContent>
    </Card>
  );

  const TodoSection = ({ icon: Icon, title, items }) => (
    <SettingSection icon={Icon} title={title} implemented={false}>
      <Alert severity="info" sx={{ mb: 2, opacity: 0.7 }}>
        {t(
          "settings.plannedFeature",
          "This feature is planned for future release",
        )}
      </Alert>
      <List sx={{ opacity: 0.5 }}>
        {items.map((item, index) => (
          <ListItem key={index}>
            <ListItemText primary={item} sx={{ color: "text.secondary" }} />
          </ListItem>
        ))}
      </List>
    </SettingSection>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <SettingsIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Typography variant="h4" component="h1">
          {t("topbar.settings", "Settings")}
        </Typography>
      </Box>

      {/* Account Security - IMPLEMENTED */}
      <SettingSection
        icon={SecurityIcon}
        title={t("settings.accountSecurity", "Account Security")}
        implemented={true}
      >
        <Grid container spacing={3}>
          {/* Change Password */}
          <Grid item xs={12}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
                gap: 3,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t("settings.changePassword", "Change Password")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(
                    "settings.changePasswordDesc",
                    "Update your password regularly to keep your account secure",
                  )}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={() => setShowChangePassword(true)}
                sx={{ minWidth: "100px", flexShrink: 0 }}
              >
                {t("settings.change", "Change")}
              </Button>
            </Box>
          </Grid>

          {/* Last password changed display */}
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="medium">
                {t("settings.lastPasswordChanged", "Last password changed")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {userInfo?.lastPasswordChanged
                  ? formatDateTime(userInfo.lastPasswordChanged)
                  : t("settings.never", "Never")}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Two-Factor Authentication - Hidden for future implementation */}
          {/* 
          <Grid item xs={12}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t("settings.twoFactor", "Two-Factor Authentication")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(
                    "settings.twoFactorDesc",
                    "Add an extra layer of security to your account",
                  )}
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={twoFactorEnabled}
                    onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  />
                }
                label={
                  twoFactorEnabled
                    ? t("common.enabled", "Enabled")
                    : t("common.disabled", "Disabled")
                }
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>
          */}

          {/* Active Sessions - Hidden for future implementation */}
          {/* 
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              {t("settings.activeSessions", "Active Sessions")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t(
                "settings.activeSessionsDesc",
                "Manage devices that are currently logged into your account",
              )}
            </Typography>
            <List>
              {activeSessions.map((session) => (
                <ListItem
                  key={session.id}
                  sx={{
                    bgcolor: session.current
                      ? "primary.lighter"
                      : "transparent",
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ComputerIcon sx={{ mr: 2, color: "text.secondary" }} />
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {session.device}
                        {session.current && (
                          <Chip
                            label={t("settings.currentSession", "Current")}
                            size="small"
                            color="primary"
                          />
                        )}
                      </Box>
                    }
                    secondary={`${session.location} • ${session.lastActive}`}
                  />
                  {!session.current && (
                    <ListItemSecondaryAction>
                      <IconButton edge="end" size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
          </Grid>
          */}
        </Grid>
      </SettingSection>

      {/* Accessibility - IMPLEMENTED */}
      <SettingSection
        icon={AccessibilityIcon}
        title={t("settings.accessibility", "Accessibility")}
        implemented={true}
      >
        <Grid container spacing={3}>
          {/* Font Size */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              {t("settings.fontSize", "Font Size")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t(
                "settings.fontSizeDesc",
                "Adjust the text size throughout the application",
              )}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {["small", "medium", "large", "xlarge"].map((size) => (
                <Button
                  key={size}
                  variant={fontSize === size ? "contained" : "outlined"}
                  onClick={() => handleFontSizeChange(size)}
                  size="small"
                >
                  {t(
                    `settings.fontSize${size.charAt(0).toUpperCase() + size.slice(1)}`,
                    size === "xlarge"
                      ? "Extra Large"
                      : size.charAt(0).toUpperCase() + size.slice(1),
                  )}
                </Button>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* High Contrast Mode */}
          <Grid item xs={12}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t("settings.highContrast", "High Contrast Mode")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(
                    "settings.highContrastDesc",
                    "Increase color contrast for better visibility",
                  )}
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={highContrast}
                    onChange={(e) => handleHighContrastToggle(e.target.checked)}
                  />
                }
                label={
                  highContrast
                    ? t("common.enabled", "Enabled")
                    : t("common.disabled", "Disabled")
                }
                sx={{ minWidth: "140px", flexShrink: 0, ml: 2 }}
              />
            </Box>
          </Grid>

          {/* Keyboard Shortcuts - Hidden for future implementation */}
          {/* 
          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t("settings.keyboardShortcuts", "Keyboard Shortcuts")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(
                    "settings.keyboardShortcutsDesc",
                    "Enable keyboard shortcuts for faster navigation",
                  )}
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={keyboardShortcuts}
                    onChange={(e) => setKeyboardShortcuts(e.target.checked)}
                  />
                }
                label={
                  keyboardShortcuts
                    ? t("common.enabled", "Enabled")
                    : t("common.disabled", "Disabled")
                }
              />
            </Box>
          </Grid>

          {keyboardShortcuts && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  {t("settings.shortcutReference", "Common Shortcuts:")}
                </Typography>
                <Typography variant="body2" component="div">
                  • <strong>Ctrl+K</strong> -{" "}
                  {t("settings.shortcutSearch", "Quick search")}
                  <br />• <strong>Ctrl+/</strong> -{" "}
                  {t("settings.shortcutHelp", "Show help")}
                  <br />• <strong>Ctrl+B</strong> -{" "}
                  {t("settings.shortcutSidebar", "Toggle sidebar")}
                  <br />• <strong>Esc</strong> -{" "}
                  {t("settings.shortcutClose", "Close dialogs")}
                </Typography>
              </Alert>
            </Grid>
          )}
          */}
        </Grid>
      </SettingSection>

      {/* Notification Preferences - TODO */}
      <TodoSection
        icon={NotificationsIcon}
        title={t("settings.notifications", "Notification Preferences")}
        items={[
          t("settings.todoEmailNotifications", "Email notifications on/off"),
          t("settings.todoInAppNotifications", "In-app notifications settings"),
          t(
            "settings.todoNotificationFrequency",
            "Notification frequency (immediate, digest, none)",
          ),
          t(
            "settings.todoNotificationTypes",
            "Notification types: new users, data updates, system alerts",
          ),
        ]}
      />

      {/* Display & Regional Preferences - TODO */}
      <TodoSection
        icon={LanguageIcon}
        title={t("settings.displayRegional", "Display & Regional Preferences")}
        items={[
          t(
            "settings.todoDateFormat",
            "Date format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)",
          ),
          t("settings.todoTimeFormat", "Time format (12-hour, 24-hour)"),
          t("settings.todoTimezone", "Timezone selection"),
          t(
            "settings.todoNumberFormat",
            "Number format (decimal, thousands separator)",
          ),
          t("settings.todoCurrencyFormat", "Currency display format"),
        ]}
      />

      {/* Application Preferences - TODO */}
      <TodoSection
        icon={TuneIcon}
        title={t("settings.appPreferences", "Application Preferences")}
        items={[
          t("settings.todoDefaultLanding", "Default landing page after login"),
          t("settings.todoItemsPerPage", "Items per page in data tables"),
          t("settings.todoDefaultFilters", "Default data filters"),
          t(
            "settings.todoSidebarDefault",
            "Sidebar collapsed/expanded by default",
          ),
          t("settings.todoAutoLogout", "Auto-logout timeout duration"),
        ]}
      />

      {/* Data Export Preferences - TODO */}
      <TodoSection
        icon={ExportIcon}
        title={t("settings.dataExport", "Data Export Preferences")}
        items={[
          t(
            "settings.todoExportFormat",
            "Default export format (Excel, CSV, PDF)",
          ),
          t("settings.todoExportTemplates", "Export templates"),
          t(
            "settings.todoColumnVisibility",
            "Column visibility defaults for reports",
          ),
        ]}
      />

      {/* Change Password Dialog */}
      <Dialog
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t("settings.changePassword", "Change Password")}
        </DialogTitle>
        <DialogContent>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}
          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {passwordSuccess}
            </Alert>
          )}
          <TextField
            fullWidth
            type="password"
            label={t("settings.currentPassword", "Current Password")}
            value={passwordData.currentPassword}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                currentPassword: e.target.value,
              })
            }
            margin="normal"
          />
          <TextField
            fullWidth
            type="password"
            label={t("settings.newPassword", "New Password")}
            value={passwordData.newPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, newPassword: e.target.value })
            }
            margin="normal"
          />
          <TextField
            fullWidth
            type="password"
            label={t("settings.confirmPassword", "Confirm New Password")}
            value={passwordData.confirmPassword}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                confirmPassword: e.target.value,
              })
            }
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowChangePassword(false)}
            disabled={passwordLoading}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handlePasswordChange}
            variant="contained"
            disabled={passwordLoading}
            startIcon={passwordLoading ? <CircularProgress size={20} /> : null}
          >
            {passwordLoading
              ? t("common.loading", "Loading...")
              : t("settings.changePassword", "Change Password")}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;
