import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

const WorkbenchHelpDialog = ({ open, onClose }) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t("projectPlanning.workbenchHelp")}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2">
            {t("projectPlanning.helpIntro")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionAtAGlance")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpAtAGlanceBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionNavigation")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpNavigationBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionWorkflow")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpWorkflowBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionTimeline")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpTimelineBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionCurrentPeriod")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpCurrentPeriodBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionActions")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpActionsBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionTaskBarStatus")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpTaskBarStatusBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionStreamActions")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpStreamActionsBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionTaskActions")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpTaskActionsBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionDependencies")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpDependenciesBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionRules")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpRulesBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionPlanningWorkspaces")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpPlanningWorkspacesBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionOverviews")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpOverviewsBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionHowReplicateStream")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpHowReplicateStreamBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionHowManageTasks")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpHowManageTasksBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionHowMoveTask")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpHowMoveTaskBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionHowInventoryPlanning")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpHowInventoryPlanningBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionHowManpowerPlanning")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpHowManpowerPlanningBody")}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionHowReadOverviews")}
          </Typography>
          <Typography variant="body2">
            {t("projectPlanning.helpHowReadOverviewsBody")}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("basic.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkbenchHelpDialog;
