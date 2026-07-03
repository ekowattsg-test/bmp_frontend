import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import WorkbenchRowActionIcons from "./WorkbenchRowActionIcons";
import WorkbenchRowTooltipContent from "./WorkbenchRowTooltipContent";

const WorkbenchTimelineRowMeta = ({
  row,
  validMoveTarget,
  onMoveToTarget,
  taskTypeIconMeta,
  isParentHighlight,
  isLinkedHighlight,
  onTaskIconHoverStart,
  onTaskIconHoverEnd,
  tasks,
  getTaskTypeDisplay,
  getDurationDays,
  inventoryIconMeta,
  manpowerRequired,
  onOpenSettingsMenu,
  onOpenInventoryPlanning,
  onOpenSkillPlanning,
  onOpenManpowerPlanning,
  formatDate,
}) => {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.6,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 54px 84px 84px",
        gap: 1,
        alignItems: "center",
        bgcolor: isParentHighlight
          ? "info.light"
          : isLinkedHighlight
            ? "success.light"
            : row.type === "stream"
              ? "var(--color-gray-100)"
              : "background.paper",
        cursor: validMoveTarget ? "pointer" : "default",
        position: "sticky",
        left: 0,
        zIndex: 2,
        borderRight: "1px solid",
        borderColor: "divider",
      }}
      onClick={onMoveToTarget}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: row.type === "stream" ? 700 : 400,
            pl: row.type === "task" ? 2 : 0,
            fontSize: "0.78rem",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {taskTypeIconMeta && (
            <Box
              component="span"
              onMouseEnter={() => onTaskIconHoverStart(row.raw)}
              onMouseLeave={onTaskIconHoverEnd}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                color: taskTypeIconMeta.color,
                flexShrink: 0,
              }}
            >
              {(() => {
                const TypeIcon = taskTypeIconMeta.icon;
                return <TypeIcon fontSize="inherit" />;
              })()}
            </Box>
          )}
          <Tooltip
            title={
              <WorkbenchRowTooltipContent
                validMoveTarget={validMoveTarget}
                row={row}
                tasks={tasks}
                getTaskTypeDisplay={getTaskTypeDisplay}
                getDurationDays={getDurationDays}
              />
            }
          >
            <Box component="span">{row.name}</Box>
          </Tooltip>
        </Typography>
      </Box>

      <WorkbenchRowActionIcons
        row={row}
        inventoryIconMeta={inventoryIconMeta}
        manpowerRequired={manpowerRequired}
        onOpenSettingsMenu={onOpenSettingsMenu}
        onOpenInventoryPlanning={onOpenInventoryPlanning}
        onOpenSkillPlanning={onOpenSkillPlanning}
        onOpenManpowerPlanning={onOpenManpowerPlanning}
      />

      <Typography variant="caption" sx={{ textAlign: "right" }}>
        {formatDate(row.startDate)}
      </Typography>
      <Typography variant="caption" sx={{ textAlign: "right" }}>
        {formatDate(row.endDate)}
      </Typography>
    </Box>
  );
};

export default WorkbenchTimelineRowMeta;
