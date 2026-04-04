import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import HeaderBar from "./HeaderBar";

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
  const actionNode =
    action ||
    (actionLabel && onActionClick ? (
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
    ) : null);

  const iconNode = Icon ? (
    <Box
      style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      sx={{
        width: { xs: 36, sm: 48 },
        height: { xs: 36, sm: 48 },
        borderRadius: 2,
        bgcolor: "primary.main",
        color: "primary.contrastText",
      }}
    >
      <Icon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
    </Box>
  ) : null;

  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 0.5, display: "block" }}
        >
          {breadcrumbs}
        </Typography>
      )}
      <HeaderBar
        icon={iconNode}
        title={title}
        subtitle={subtitle}
        onHelp={onHelpClick}
        actions={actionNode}
        sx={{ mb: 0 }}
      />
    </Box>
  );
};

export default PageHeader;
