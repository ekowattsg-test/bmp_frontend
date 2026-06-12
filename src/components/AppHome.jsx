import React, { useState, useEffect, useContext } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
} from "@mui/material";
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Store as StoreIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/authContext";
import { PageHeader, StatsCard } from "./common";
import { request } from "../helpers/axios_helper";

const AppHome = () => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
  const [stats, setStats] = useState({
    users: 0,
    companies: 0,
    customers: 0,
    vendors: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard stats
    Promise.all([
      request("GET", "/api/users").catch(() => ({ data: [] })),
      request("GET", "/api/companies").catch(() => ({ data: [] })),
      request("GET", "/api/customers").catch(() => ({ data: [] })),
      request("GET", "/api/vendors").catch(() => ({ data: [] })),
    ])
      .then(([usersRes, companiesRes, customersRes, vendorsRes]) => {
        setStats({
          users: usersRes.data?.length || 0,
          companies: companiesRes.data?.length || 0,
          customers: customersRes.data?.length || 0,
          vendors: vendorsRes.data?.length || 0,
        });
      })
      .finally(() => setLoading(false));

    // Mock recent activity
    setRecentActivity([
      {
        id: 1,
        type: "user",
        title: t("dashboard.activity.userAdded", "New user added"),
        time: "5 minutes ago",
        color: "primary",
      },
      {
        id: 2,
        type: "customer",
        title: t("dashboard.activity.customerUpdated", "Customer updated"),
        time: "1 hour ago",
        color: "success",
      },
      {
        id: 3,
        type: "company",
        title: t("dashboard.activity.companyCreated", "Company created"),
        time: "2 hours ago",
        color: "info",
      },
    ]);
  }, [t]);

  return (
    <Box>
      {/* Page Header */}
      <PageHeader
        title={t("dashboard.welcome", "Welcome Back")}
        subtitle={t(
          "dashboard.subtitle",
          `Hello ${userInfo?.firstName || "User"}, here's what's happening today`,
        )}
        icon={AssessmentIcon}
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title={t("dashboard.stats.totalUsers", "Total Users")}
            value={stats.users}
            icon={PeopleIcon}
            color="primary"
            trend="up"
            trendValue="+12%"
            subtitle={t("dashboard.stats.fromLastMonth", "from last month")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title={t("dashboard.stats.companies", "Companies")}
            value={stats.companies}
            icon={BusinessIcon}
            color="success"
            trend="up"
            trendValue="+8%"
            subtitle={t("dashboard.stats.fromLastMonth", "from last month")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title={t("dashboard.stats.customers", "Customers")}
            value={stats.customers}
            icon={PeopleIcon}
            color="info"
            trend="up"
            trendValue="+23%"
            subtitle={t("dashboard.stats.fromLastMonth", "from last month")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title={t("dashboard.stats.vendors", "Vendors")}
            value={stats.vendors}
            icon={StoreIcon}
            color="warning"
            trend="up"
            trendValue="+5%"
            subtitle={t("dashboard.stats.fromLastMonth", "from last month")}
          />
        </Grid>
      </Grid>

      {/* Quick Actions & Recent Activity */}
      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                {t("dashboard.quickActions", "Quick Actions")}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <PeopleIcon
                      sx={{ fontSize: 32, color: "primary.main", mb: 1 }}
                    />
                    <Typography variant="body2" fontWeight={500}>
                      {t("dashboard.actions.addUser", "Add User")}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <BusinessIcon
                      sx={{ fontSize: 32, color: "success.main", mb: 1 }}
                    />
                    <Typography variant="body2" fontWeight={500}>
                      {t("dashboard.actions.addCompany", "Add Company")}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <PeopleIcon
                      sx={{ fontSize: 32, color: "info.main", mb: 1 }}
                    />
                    <Typography variant="body2" fontWeight={500}>
                      {t("dashboard.actions.addCustomer", "Add Customer")}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <StoreIcon
                      sx={{ fontSize: 32, color: "warning.main", mb: 1 }}
                    />
                    <Typography variant="body2" fontWeight={500}>
                      {t("dashboard.actions.addVendor", "Add Vendor")}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                {t("dashboard.recentActivity", "Recent Activity")}
              </Typography>
              <List>
                {recentActivity.map((activity) => (
                  <ListItem key={activity.id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: `${activity.color}.main` }}>
                        <TrendingUpIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={activity.title}
                      secondary={activity.time}
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                    <Chip
                      label={t("basic.new", "New")}
                      size="small"
                      color={activity.color}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AppHome;
