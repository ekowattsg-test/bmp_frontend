import React from "react";
import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove";
import EditIcon from "@mui/icons-material/Edit";
import SettingsIcon from "@mui/icons-material/Settings";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useTranslation } from "react-i18next";

const WorkbenchSettingsMenu = ({
  anchorEl,
  menuTarget,
  onClose,
  collapsedStreamIds,
  tasks,
  onOpenAddTaskDialog,
  onOpenStreamEditor,
  onOpenReplicateStreamDialog,
  onToggleStreamTasks,
  onRemoveStream,
  onOpenTaskEditor,
  onOpenMilestoneDialog,
  onStartMoveMode,
  onDeleteTask,
  taskDeleteBlockedReason,
}) => {
  const { t } = useTranslation();

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
    >
      {menuTarget?.type === "stream" && (
        <>
          <MenuItem
            onClick={() => {
              onOpenAddTaskDialog(menuTarget);
              onClose();
            }}
          >
            <ListItemIcon>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t("projectPlanning.createTask", "Create Task")}
            </ListItemText>
          </MenuItem>
          <MenuItem onClick={() => onOpenStreamEditor(menuTarget)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t("projectPlanning.editStream", "Edit Stream Information")}
            </ListItemText>
          </MenuItem>
          <MenuItem onClick={() => onOpenReplicateStreamDialog(menuTarget)}>
            <ListItemIcon>
              <ContentCopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t("projectPlanning.replicateStream", "Replicate Stream")}
            </ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              onToggleStreamTasks(menuTarget);
              onClose();
            }}
          >
            <ListItemIcon>
              {collapsedStreamIds.has(
                String(menuTarget?.raw?.projectStreamId || ""),
              ) ? (
                <VisibilityIcon fontSize="small" />
              ) : (
                <VisibilityOffIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText>
              {collapsedStreamIds.has(
                String(menuTarget?.raw?.projectStreamId || ""),
              )
                ? t("projectPlanning.showTasks", "Show Tasks")
                : t("projectPlanning.hideTasks", "Hide Tasks")}
            </ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              onRemoveStream(menuTarget);
              onClose();
            }}
            disabled={tasks.some(
              (task) =>
                String(task?.projectStreamId || "") ===
                String(menuTarget?.raw?.projectStreamId || ""),
            )}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t("projectPlanning.removeStream", "Remove Stream")}
            </ListItemText>
          </MenuItem>
        </>
      )}

      {menuTarget?.type === "task" && (
        <>
          <MenuItem
            onClick={() => {
              onOpenAddTaskDialog(menuTarget);
              onClose();
            }}
          >
            <ListItemIcon>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t("projectPlanning.createChildTask", "Create Child Task")}
            </ListItemText>
          </MenuItem>
          <MenuItem onClick={() => onOpenTaskEditor(menuTarget)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t("projectPlanning.editTask", "Edit Task Information")}
            </ListItemText>
          </MenuItem>
          <MenuItem onClick={() => onOpenMilestoneDialog(menuTarget)}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t("projectPlanning.linkMilestone", "Link Milestone Task")}
            </ListItemText>
          </MenuItem>
          <MenuItem onClick={() => onStartMoveMode(menuTarget)}>
            <ListItemIcon>
              <DriveFileMoveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t("projectPlanning.moveTo", "Move To")}
            </ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => onDeleteTask(menuTarget)}
            disabled={Boolean(taskDeleteBlockedReason(menuTarget))}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t("projectPlanning.removeCurrentTask", "Remove Current Task")}
            </ListItemText>
          </MenuItem>
        </>
      )}
    </Menu>
  );
};

export default WorkbenchSettingsMenu;
