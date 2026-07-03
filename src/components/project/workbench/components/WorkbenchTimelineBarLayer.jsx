import React from "react";
import { Box } from "@mui/material";

const WorkbenchTimelineBarLayer = ({
  colWidth,
  ganttCurrentPeriodOverlay,
  geo,
  isMilestoneTaskType,
  rowType,
  isParentHighlight,
  isLinkedHighlight,
}) => {
  return (
    <Box
      sx={{
        position: "relative",
        backgroundImage: `repeating-linear-gradient(to right, transparent, transparent ${colWidth - 1}px, rgba(0,0,0,0.06) ${colWidth - 1}px, rgba(0,0,0,0.06) ${colWidth}px)`,
      }}
    >
      {ganttCurrentPeriodOverlay && (
        <Box
          sx={{
            position: "absolute",
            left: ganttCurrentPeriodOverlay.left,
            top: 0,
            bottom: 0,
            width: ganttCurrentPeriodOverlay.width,
            bgcolor: "action.selected",
            pointerEvents: "none",
          }}
        />
      )}
      {geo && !isMilestoneTaskType && (
        <Box
          sx={{
            position: "absolute",
            left: geo.left,
            top: "50%",
            transform: "translateY(-50%)",
            height: rowType === "stream" ? 14 : 9,
            width: geo.width,
            borderRadius: rowType === "stream" ? 1 : 999,
            bgcolor: isParentHighlight
              ? "info.main"
              : isLinkedHighlight
                ? "success.main"
                : rowType === "stream"
                  ? "transparent"
                  : "secondary.main",
            border: rowType === "stream" ? "2px solid" : "none",
            borderColor: isParentHighlight
              ? "info.dark"
              : isLinkedHighlight
                ? "success.dark"
                : rowType === "stream"
                  ? "primary.main"
                  : "transparent",
            opacity: rowType === "stream" ? 1 : 0.65,
          }}
        />
      )}
      {geo && isMilestoneTaskType && (
        <Box
          sx={{
            position: "absolute",
            left: geo.left + Math.max(geo.width / 2 - 5, 0),
            top: "50%",
            width: 10,
            height: 10,
            transform: "translateY(-50%) rotate(45deg)",
            bgcolor: "secondary.main",
            border: "1px solid",
            borderColor: "secondary.dark",
          }}
        />
      )}
    </Box>
  );
};

export default WorkbenchTimelineBarLayer;
