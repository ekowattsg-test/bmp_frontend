import React from "react";
import { Card, CardContent, Box, Typography, useTheme } from "@mui/material";
import { TrendingUp, TrendingDown } from "@mui/icons-material";

const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "primary",
  subtitle,
}) => {
  const theme = useTheme();

  const colorMap = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  };

  const bgColor = colorMap[color] || theme.palette.primary.main;

  return (
    <Card
      sx={{
        height: "100%",
        position: "relative",
        overflow: "visible",
        "&:hover": {
          boxShadow: theme.shadows[4],
          transform: "translateY(-2px)",
          transition: "all 0.3s ease",
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              fontWeight={500}
              sx={{ mb: 1 }}
            >
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && trendValue && (
              <Box
                sx={{ display: "flex", alignItems: "center", mt: 1, gap: 0.5 }}
              >
                {trend === "up" ? (
                  <TrendingUp fontSize="small" sx={{ color: "success.main" }} />
                ) : (
                  <TrendingDown fontSize="small" sx={{ color: "error.main" }} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color: trend === "up" ? "success.main" : "error.main",
                    fontWeight: 600,
                  }}
                >
                  {trendValue}
                </Typography>
              </Box>
            )}
          </Box>
          {Icon && (
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: bgColor,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.9,
              }}
            >
              <Icon sx={{ fontSize: 28 }} />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
