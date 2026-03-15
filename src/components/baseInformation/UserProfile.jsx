import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Container,
  Avatar,
  Grid,
  Divider,
  Chip,
} from "@mui/material";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import { AuthContext } from "../../context/authContext";

const UserProfile = () => {
  const { t } = useTranslation();
  const { userInfo, roles } = useContext(AuthContext);

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase();
  };

  const InfoRow = ({ icon: Icon, label, value }) => (
    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
      <Icon sx={{ color: "primary.main", mr: 2 }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1" fontWeight="medium">
          {value || t("common.noData", "N/A")}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <PersonIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Typography variant="h4" component="h1">
          {t("topbar.profile", "Profile")}
        </Typography>
      </Box>

      {/* Profile Header Card */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              gap: 3,
              mb: 3,
            }}
          >
            <Avatar
              sx={{
                width: 100,
                height: 100,
                bgcolor: "primary.main",
                fontSize: 36,
                fontWeight: 600,
              }}
            >
              {getInitials(userInfo?.firstName, userInfo?.lastName)}
            </Avatar>
            <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                {userInfo?.firstName} {userInfo?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                @{userInfo?.login}
              </Typography>
              {userInfo?.level && (
                <Chip
                  label={`Level ${userInfo.level}`}
                  color="primary"
                  size="small"
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* User Information Card */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            {t("profile.personalInfo", "Personal Information")}
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <InfoRow
                icon={PersonIcon}
                label={t("auth.firstName", "First Name")}
                value={userInfo?.firstName}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <InfoRow
                icon={PersonIcon}
                label={t("auth.lastName", "Last Name")}
                value={userInfo?.lastName}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <InfoRow
                icon={EmailIcon}
                label={t("auth.username", "Username")}
                value={userInfo?.login}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <InfoRow
                icon={BusinessIcon}
                label={t("profile.company", "Company")}
                value={userInfo?.companyId}
              />
            </Grid>
            {userInfo?.level && (
              <Grid item xs={12} md={6}>
                <InfoRow
                  icon={BadgeIcon}
                  label={t("profile.level", "Level")}
                  value={userInfo.level}
                />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Roles & Permissions Card */}
      {roles && roles.length > 0 && (
        <Card elevation={2}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
              <SecurityIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6">
                {t("profile.rolesPermissions", "Roles & Permissions")}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {roles.map((role, index) => (
                <Chip
                  key={index}
                  label={role}
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Additional Info Note */}
      <Box sx={{ mt: 3, p: 2, bgcolor: "info.lighter", borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>{t("common.note", "Note")}:</strong>{" "}
          {t(
            "profile.note",
            "To update your profile information, please contact your system administrator.",
          )}
        </Typography>
      </Box>
    </Container>
  );
};

export default UserProfile;
