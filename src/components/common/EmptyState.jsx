import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { Inbox as InboxIcon } from "@mui/icons-material";

const EmptyState = ({
  icon: Icon = InboxIcon,
  title = "No data available",
  description,
  actionLabel,
  onActionClick,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 2,
        textAlign: "center",
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 2,
        }}
      >
        <Icon sx={{ fontSize: 40, color: "text.secondary" }} />
      </Box>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 400 }}
        >
          {description}
        </Typography>
      )}
      {actionLabel && onActionClick && (
        <Button variant="contained" onClick={onActionClick}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
