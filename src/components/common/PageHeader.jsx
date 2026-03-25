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
        titleVariant="h5"
        titleSx={{
          fontWeight: 600,
          fontSize: { xs: "1.125rem", sm: "1.5rem" },
        }}
        sx={{ mb: 0 }}
      />
    </Box>
  );
};

export default PageHeader;
