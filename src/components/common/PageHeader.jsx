import React from "react";
import { Box, Typography, Button, IconButton } from "@mui/material";
import {
  Add as AddIcon,
  HelpOutline as HelpOutlineIcon,
} from "@mui/icons-material";

const PageHeader = ({
  title,
  subtitle,
  action,
  actionLabel,
  onActionClick,
  icon: Icon,
  breadcrumbs,
  onHelpClick,
}) => {
  return (
    <Box
      sx={{
        mb: 3,
        display: "flex",
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", sm: "center" },
        flexDirection: { xs: "column", sm: "row" },
        gap: 2,
      }}
    >
      {/* Title Section */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {Icon && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            <Icon />
          </Box>
        )}
        <Box>
          {breadcrumbs && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 0.5, display: "block" }}
            >
              {breadcrumbs}
            </Typography>
          )}
          <Typography variant="h5" fontWeight={600} color="text.primary">
            {title}
          </Typography>
          {subtitle && (
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}
            >
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
              {onHelpClick && (
                <IconButton
                  size="small"
                  aria-label="help"
                  onClick={onHelpClick}
                >
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Action Button */}
      {action ||
        (actionLabel && onActionClick && (
          <Box>
            {action || (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onActionClick}
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                  px: 3,
                }}
              >
                {actionLabel}
              </Button>
            )}
          </Box>
        ))}
    </Box>
  );
};

export default PageHeader;
