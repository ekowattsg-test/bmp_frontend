import React from "react";
import { Box } from "@mui/material";
import WorkbenchMoveModeAlert from "./WorkbenchMoveModeAlert";
import WorkbenchTimelineEmptyState from "./WorkbenchTimelineEmptyState";
import WorkbenchTimelineHeaders from "./WorkbenchTimelineHeaders";
import WorkbenchTimelineRows from "./WorkbenchTimelineRows";
import WorkbenchTimelineToolbar from "./WorkbenchTimelineToolbar";

const WorkbenchTimelinePanel = ({
  viewMode,
  setViewMode,
  onAddStream,
  onOpenInventoryOverview,
  onOpenSkillOverview,
  onOpenManpowerOverview,
  moveSourceTaskId,
  moveSourceTask,
  clearMoveMode,
  rows,
  ganttScrollRef,
  timelineWidth,
  upperSegments,
  colWidth,
  activeCols,
  isCurrentPeriodColumn,
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
  ganttCurrentPeriodOverlay,
}) => {
  return (
    <Box
      sx={{
        borderRadius: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <WorkbenchTimelineToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddStream={onAddStream}
        onOpenInventoryOverview={onOpenInventoryOverview}
        onOpenSkillOverview={onOpenSkillOverview}
        onOpenManpowerOverview={onOpenManpowerOverview}
      />

      <WorkbenchMoveModeAlert
        moveSourceTaskId={moveSourceTaskId}
        moveSourceTask={moveSourceTask}
        onCancel={clearMoveMode}
      />

      {rows.length === 0 ? (
        <WorkbenchTimelineEmptyState />
      ) : (
        <Box sx={{ overflow: "auto", maxHeight: "58vh" }} ref={ganttScrollRef}>
          <Box sx={{ minWidth: 420 + timelineWidth }}>
            <WorkbenchTimelineHeaders
              timelineWidth={timelineWidth}
              upperSegments={upperSegments}
              colWidth={colWidth}
              activeCols={activeCols}
              viewMode={viewMode}
              isCurrentPeriodColumn={isCurrentPeriodColumn}
            />

            <WorkbenchTimelineRows
              rows={rows}
              timelineWidth={timelineWidth}
              getTaskBarGeometry={getTaskBarGeometry}
              isValidMoveTarget={isValidMoveTarget}
              getTaskTypeIcon={getTaskTypeIcon}
              getInventoryIconMeta={getInventoryIconMeta}
              getRowInventoryType={getRowInventoryType}
              getRowManpowerRequired={getRowManpowerRequired}
              hoveredParentTaskId={hoveredParentTaskId}
              hoveredLinkedTaskIds={hoveredLinkedTaskIds}
              moveTaskToTargetParent={moveTaskToTargetParent}
              onTaskIconHoverStart={onTaskIconHoverStart}
              onTaskIconHoverEnd={onTaskIconHoverEnd}
              tasks={tasks}
              getTaskTypeDisplay={getTaskTypeDisplay}
              getDurationDays={getDurationDays}
              openSettingsMenu={openSettingsMenu}
              openInventoryPlanningDialog={openInventoryPlanningDialog}
              openSkillPlanningDialog={openSkillPlanningDialog}
              openManpowerPlanningDialog={openManpowerPlanningDialog}
              formatDate={formatDate}
              colWidth={colWidth}
              ganttCurrentPeriodOverlay={ganttCurrentPeriodOverlay}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default WorkbenchTimelinePanel;
