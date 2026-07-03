import React from "react";
import { Box } from "@mui/material";
import WorkbenchTimelineRowMeta from "./WorkbenchTimelineRowMeta";
import WorkbenchTimelineBarLayer from "./WorkbenchTimelineBarLayer";

const WorkbenchTimelineRows = ({
  rows,
  timelineWidth,
  getTaskBarGeometry,
  isValidMoveTarget,
  getTaskTypeIcon,
  getInventoryIconMeta,
  getRowInventoryType,
  getRowManpowerRequired,
  hoveredParentTaskId,
  hoveredLinkedTaskIds,
  moveTaskToTargetParent,
  onTaskIconHoverStart,
  onTaskIconHoverEnd,
  tasks,
  getTaskTypeDisplay,
  getDurationDays,
  openSettingsMenu,
  openInventoryPlanningDialog,
  openSkillPlanningDialog,
  openManpowerPlanningDialog,
  formatDate,
  colWidth,
  ganttCurrentPeriodOverlay,
}) => {
  return rows.map((row) => {
    const geo = getTaskBarGeometry(row);
    const validMoveTarget = isValidMoveTarget(row);
    const taskTypeIconMeta =
      row.type === "task" ? getTaskTypeIcon(row.raw) : null;
    const inventoryIconMeta = getInventoryIconMeta(getRowInventoryType(row));
    const manpowerRequired = getRowManpowerRequired(row);
    const rowTaskId = String(row?.raw?.projectTaskId || "").trim();
    const isParentHighlight =
      row.type === "task" && rowTaskId && rowTaskId === hoveredParentTaskId;
    const isLinkedHighlight =
      row.type === "task" && hoveredLinkedTaskIds.has(rowTaskId);
    const taskTypeCode = String(row?.raw?.taskType || "")
      .trim()
      .toUpperCase();
    const isMilestoneTaskType = row.type === "task" && taskTypeCode === "M";

    return (
      <Box
        key={row.id}
        sx={{
          display: "grid",
          gridTemplateColumns: `420px ${timelineWidth}px`,
          borderTop: "1px solid",
          borderColor: "divider",
          minHeight: 36,
        }}
      >
        <WorkbenchTimelineRowMeta
          row={row}
          validMoveTarget={validMoveTarget}
          onMoveToTarget={() => {
            if (validMoveTarget) moveTaskToTargetParent(row);
          }}
          taskTypeIconMeta={taskTypeIconMeta}
          isParentHighlight={isParentHighlight}
          isLinkedHighlight={isLinkedHighlight}
          onTaskIconHoverStart={onTaskIconHoverStart}
          onTaskIconHoverEnd={onTaskIconHoverEnd}
          tasks={tasks}
          getTaskTypeDisplay={getTaskTypeDisplay}
          getDurationDays={getDurationDays}
          inventoryIconMeta={inventoryIconMeta}
          manpowerRequired={manpowerRequired}
          onOpenSettingsMenu={openSettingsMenu}
          onOpenInventoryPlanning={openInventoryPlanningDialog}
          onOpenSkillPlanning={openSkillPlanningDialog}
          onOpenManpowerPlanning={openManpowerPlanningDialog}
          formatDate={formatDate}
        />

        <WorkbenchTimelineBarLayer
          colWidth={colWidth}
          ganttCurrentPeriodOverlay={ganttCurrentPeriodOverlay}
          geo={geo}
          isMilestoneTaskType={isMilestoneTaskType}
          rowType={row.type}
          isParentHighlight={isParentHighlight}
          isLinkedHighlight={isLinkedHighlight}
        />
      </Box>
    );
  });
};

export default WorkbenchTimelineRows;
