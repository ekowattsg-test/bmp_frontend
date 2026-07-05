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
            <ListItemText>{t("projectPlanning.createTask")}</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => onOpenStreamEditor(menuTarget)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("projectPlanning.editStream")}</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => onOpenReplicateStreamDialog(menuTarget)}>
            <ListItemIcon>
              <ContentCopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("projectPlanning.replicateStream")}</ListItemText>
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
                ? t("projectPlanning.showTasks")
                : t("projectPlanning.hideTasks")}
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
            <ListItemText>{t("projectPlanning.removeStream")}</ListItemText>
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
            <ListItemText>{t("projectPlanning.createChildTask")}</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => onOpenTaskEditor(menuTarget)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("projectPlanning.editTask")}</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => onOpenMilestoneDialog(menuTarget)}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("projectPlanning.linkMilestone")}</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => onStartMoveMode(menuTarget)}>
            <ListItemIcon>
              <DriveFileMoveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("projectPlanning.moveTo")}</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => onDeleteTask(menuTarget)}
            disabled={Boolean(taskDeleteBlockedReason(menuTarget))}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t("projectPlanning.removeCurrentTask")}
            </ListItemText>
          </MenuItem>
        </>
      )}
    </Menu>
  );
};

export default WorkbenchSettingsMenu;
