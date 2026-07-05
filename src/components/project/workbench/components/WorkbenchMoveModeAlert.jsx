import React from "react";
import { Alert, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

const WorkbenchMoveModeAlert = ({
  moveSourceTaskId,
  moveSourceTask,
  onCancel,
}) => {
  const { t } = useTranslation();

  if (!moveSourceTaskId) return null;

  return (
    <Alert
      severity="info"
      sx={{ mx: 2, mt: 1.5, mb: 0.5 }}
      action={
        <Button color="inherit" size="small" onClick={onCancel}>
          {t("basic.cancel")}
        </Button>
      }
    >
      {t("projectPlanning.moveModeActive")}
      {": "}
      <strong>{moveSourceTask?.taskName || moveSourceTaskId}</strong>
      {". "}
      {t("projectPlanning.selectMoveTarget")}
    </Alert>
  );
};

export default WorkbenchMoveModeAlert;
