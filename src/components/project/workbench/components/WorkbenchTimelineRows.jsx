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
  openTaskStatusUpdateDialog,
  formatDate,
  colWidth,
  ganttCurrentPeriodOverlay,
}) => {
  const streamNameById = rows.reduce((acc, row) => {
    if (row.type !== "stream") return acc;
    const streamId = String(
      row?.streamId || row?.raw?.projectStreamId || "",
    ).trim();
    const streamName = String(row?.raw?.streamName || row?.name || "").trim();
    if (streamId && streamName) {
      acc[streamId] = streamName;
    }
    return acc;
  }, {});

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
    const taskStatus = String(row?.raw?.taskStatus || "").trim();
    const isStatusUpdatableTask =
      row.type === "task" &&
      (taskStatus === "Not Started" || taskStatus === "In Progress");

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
          onTaskBarClick={
            isStatusUpdatableTask ? () => openTaskStatusUpdateDialog(row) : null
          }
          formatDate={formatDate}
        />

        <WorkbenchTimelineBarLayer
          colWidth={colWidth}
          ganttCurrentPeriodOverlay={ganttCurrentPeriodOverlay}
          geo={geo}
          row={row}
          streamName={streamNameById[String(row?.streamId || "").trim()] || ""}
          isMilestoneTaskType={isMilestoneTaskType}
          rowType={row.type}
          isParentHighlight={isParentHighlight}
          isLinkedHighlight={isLinkedHighlight}
          formatDate={formatDate}
          onTaskBarClick={
            isStatusUpdatableTask ? () => openTaskStatusUpdateDialog(row) : null
          }
        />
      </Box>
    );
  });
};

export default WorkbenchTimelineRows;
