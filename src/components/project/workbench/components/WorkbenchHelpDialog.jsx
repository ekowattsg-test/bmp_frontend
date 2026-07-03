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
      <DialogTitle>
        {t("projectPlanning.workbenchHelp", "Project Workbench Help")}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpIntro",
              "Use Project Workbench to plan streams and tasks, manage dependencies, and review the timeline in Day/Week/Month views.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionNavigation", "Navigation & Layout")}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpNavigationBody",
              "Use Back to return to project planning. The left panel stays fixed while the timeline scrolls horizontally.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionWorkflow", "Quick Workflow")}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpWorkflowBody",
              "Start by adding streams, then create tasks inside each stream, assign person in-charge, set duration/status, and use timeline bars to validate overlaps before execution.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionTimeline", "Timeline Views")}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpTimelineBody",
              "Switch between Day, Week, and Month. Milestone tasks render as diamonds; other task types render as bars.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t(
              "projectPlanning.helpSectionCurrentPeriod",
              "Current Period Highlight",
            )}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpCurrentPeriodBody",
              "The current period is highlighted automatically: today in Day view, the current week in Week view, and the current month in Month view. The same highlight appears in Gantt, Inventory Overview, and Skill Overview.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionActions", "Row Actions")}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpActionsBody",
              "Open the settings menu on each stream or task row to create tasks, edit details, link milestones, move tasks, or remove items.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionStreamActions", "Stream Actions")}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpStreamActionsBody",
              "For each stream you can create task, edit stream info, replicate stream (copy stream by entering a new stream name), show/hide tasks, and remove stream when it has no tasks.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionTaskActions", "Task Actions")}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpTaskActionsBody",
              "For each task you can create child task, edit task, link milestone task, move to another parent task, and remove current task when task-type and dependency rules allow.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t(
              "projectPlanning.helpSectionDependencies",
              "Dependencies & Highlights",
            )}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpDependenciesBody",
              "Hover task type icons to highlight parent and linked tasks. Hover task names to view task details.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionRules", "Create/Edit Rules")}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpRulesBody",
              "Task type, duration limits, start-date editability, and delete permissions are controlled by task-type settings.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t(
              "projectPlanning.helpSectionPlanningWorkspaces",
              "Planning Workspaces",
            )}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpPlanningWorkspacesBody",
              "Inventory Planning lets you add stock/asset/bundle requirements on a selected task or stream. Skill Workspace lets you assign required skills and units for a task.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t(
              "projectPlanning.helpSectionOverviews",
              "Inventory & Skill Overviews",
            )}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpOverviewsBody",
              "Inventory Overview summarizes planned quantities by period and shows details on hover. Skill Overview aggregates required units by skill across each period.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t(
              "projectPlanning.helpSectionHowReplicateStream",
              "How To: Replicate A Stream",
            )}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpHowReplicateStreamBody",
              "1. Open the stream row settings menu. 2. Click Replicate Stream. 3. Enter the new stream name in the dialog. 4. Click Save to copy the selected stream.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t(
              "projectPlanning.helpSectionHowManageTasks",
              "How To: Create And Manage Tasks",
            )}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpHowManageTasksBody",
              "1. Open stream settings and click Create Task (or open a task and click Create Child Task). 2. Fill task name/type/start/duration/person in-charge. 3. Save the task. 4. Use task settings to edit, link milestone, move, or remove when allowed.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t("projectPlanning.helpSectionHowMoveTask", "How To: Move A Task")}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpHowMoveTaskBody",
              "1. Open task settings and click Move To. 2. Move mode activates. 3. Click a valid target parent task in the grid. 4. The system recalculates and updates the task hierarchy.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t(
              "projectPlanning.helpSectionHowInventoryPlanning",
              "How To: Plan Inventory",
            )}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpHowInventoryPlanningBody",
              "1. Click the inventory icon on a stream/task row. 2. Select Stock, Asset, or Bundle tab as needed. 3. Add required items and quantities. 4. Remove or adjust entries before closing.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t(
              "projectPlanning.helpSectionHowManpowerPlanning",
              "How To: Plan Skills",
            )}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpHowManpowerPlanningBody",
              "1. Click the skill icon on a task row. 2. Select required skill(s). 3. Set unit values. 4. Save or remove entries as needed.",
            )}
          </Typography>
          <Typography variant="subtitle2">
            {t(
              "projectPlanning.helpSectionHowReadOverviews",
              "How To: Read Overview Grids",
            )}
          </Typography>
          <Typography variant="body2">
            {t(
              "projectPlanning.helpHowReadOverviewsBody",
              "1. Open Inventory Overview or Skill Overview from the header actions. 2. Switch Day/Week/Month to change granularity. 3. Follow the highlighted current period column for present-time tracking. 4. Hover populated cells to view detail breakdown.",
            )}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("basic.close", "Close")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkbenchHelpDialog;
