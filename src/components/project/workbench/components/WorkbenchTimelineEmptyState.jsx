import React from "react";
import { Alert, Box } from "@mui/material";
import { useTranslation } from "react-i18next";

const WorkbenchTimelineEmptyState = () => {
  const { t } = useTranslation();

  return (
    <Box sx={{ p: 2 }}>
      <Alert severity="info">
        {t(
          "projectPlanning.noStreamsTasks",
          "No project streams/tasks found for this project.",
        )}
      </Alert>
    </Box>
  );
};

export default WorkbenchTimelineEmptyState;
