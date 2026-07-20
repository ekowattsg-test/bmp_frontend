import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { getTaskStatusLabel } from "../utils/workbenchUtils";

const toProgressPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
};

const WorkbenchTimelineBarLayer = ({
  colWidth,
  ganttCurrentPeriodOverlay,
  geo,
  row,
  streamName,
  isMilestoneTaskType,
  rowType,
  isParentHighlight,
  isLinkedHighlight,
  onTaskBarClick,
  formatDate,
}) => {
  const { t } = useTranslation();
  const isTaskRow = rowType === "task";
  const taskName = String(row?.name || row?.raw?.taskName || "").trim() || "-";
  const taskStatus = String(row?.raw?.taskStatus || "").trim() || "-";
  const taskStatusLabel = getTaskStatusLabel(taskStatus, t);
  const taskTitle = streamName ? `${streamName} / ${taskName}` : taskName;
  const taskStartDate = formatDate(row?.startDate || row?.raw?.taskStartDate);
  const taskEndDate = formatDate(row?.endDate || row?.raw?.taskEndDate);
  const taskProgress = toProgressPercent(row?.raw?.progress);
  const canUpdateStatus =
    taskStatus.toLowerCase() === "not started" ||
    taskStatus.toLowerCase() === "in progress";
  const isInProgressTask = taskStatus.toLowerCase() === "in progress";
  const taskBarColor = (() => {
    const normalizedStatus = taskStatus.toLowerCase();
    if (normalizedStatus === "not started") return "success.main";
    if (normalizedStatus === "in progress") return "warning.main";
    if (normalizedStatus === "completed") return "text.disabled";
    return "secondary.main";
  })();
  const taskBarBorderColor = (() => {
    const normalizedStatus = taskStatus.toLowerCase();
    if (normalizedStatus === "not started") return "success.dark";
    if (normalizedStatus === "in progress") return "warning.dark";
    if (normalizedStatus === "completed") return "text.secondary";
    return "transparent";
  })();

  const tooltipContent = isTaskRow ? (
    <Box>
      <Typography variant="caption" sx={{ display: "block", fontWeight: 700 }}>
        {taskTitle}
      </Typography>
      <Typography variant="caption" sx={{ display: "block" }}>
        {t("projecttask.taskStatus")}: {taskStatusLabel}
      </Typography>
      <Typography variant="caption" sx={{ display: "block" }}>
        {t("projecttask.taskStartDate")}: {taskStartDate}
      </Typography>
      <Typography variant="caption" sx={{ display: "block" }}>
        {t("projecttask.taskEndDate")}: {taskEndDate}
      </Typography>
      {isInProgressTask && (
        <Typography variant="caption" sx={{ display: "block" }}>
          {t("pda.progressUpdate.progress", "Progress")}:{" "}
          {Math.round(taskProgress)}%
        </Typography>
      )}
      {canUpdateStatus && (
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}
        >
          {t("projectPlanning.taskStatusUpdateTooltipHint")}
        </Typography>
      )}
    </Box>
  ) : null;

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
        <Tooltip title={tooltipContent} arrow placement="top">
          <Box
            onClick={onTaskBarClick}
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
                    : isInProgressTask
                      ? "success.main"
                      : taskBarColor,
              border: rowType === "stream" || isTaskRow ? "1px solid" : "none",
              borderColor: isParentHighlight
                ? "info.dark"
                : isLinkedHighlight
                  ? "success.dark"
                  : rowType === "stream"
                    ? "primary.main"
                    : taskBarBorderColor,
              opacity: rowType === "stream" ? 1 : 0.65,
              cursor: isTaskRow && onTaskBarClick ? "pointer" : "default",
            }}
          >
            {isTaskRow &&
            isInProgressTask &&
            !isParentHighlight &&
            !isLinkedHighlight ? (
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${taskProgress}%`,
                  bgcolor: "warning.main",
                  borderRadius: "999px 0 0 999px",
                }}
              />
            ) : null}
          </Box>
        </Tooltip>
      )}
      {geo && isMilestoneTaskType && (
        <Box
          onClick={onTaskBarClick}
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
            cursor: onTaskBarClick ? "pointer" : "default",
          }}
        />
      )}
    </Box>
  );
};

export default WorkbenchTimelineBarLayer;
