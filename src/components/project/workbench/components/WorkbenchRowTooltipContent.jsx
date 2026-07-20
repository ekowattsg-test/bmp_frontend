import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { getTaskStatusLabel } from "../utils/workbenchUtils";

const toProgressPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const WorkbenchRowTooltipContent = ({
  validMoveTarget,
  row,
  tasks,
  getTaskTypeDisplay,
  getDurationDays,
}) => {
  const { t } = useTranslation();
  const streamTaskCount = tasks.filter(
    (task) =>
      String(task?.projectStreamId || "") ===
      String(row?.raw?.projectStreamId || ""),
  ).length;

  const taskStatus = String(row?.raw?.taskStatus || "").trim();
  const progressPercent = toProgressPercent(row?.raw?.progress);
  const showProgress = taskStatus === "In Progress";

  return (
    <Box>
      {validMoveTarget && (
        <Typography
          variant="caption"
          sx={{ display: "block", fontWeight: 700 }}
        >
          {t("projectPlanning.moveHere")}
        </Typography>
      )}

      {row.type === "stream" ? (
        <>
          <Typography
            variant="caption"
            sx={{ display: "block", fontWeight: 700 }}
          >
            {row?.raw?.streamName || row.name}
          </Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            {t("projectstream.streamType")}: {row?.raw?.streamType || "-"}
          </Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            {t("projectPlanning.taskCount")}: {streamTaskCount}
          </Typography>
        </>
      ) : (
        <>
          <Typography
            variant="caption"
            sx={{ display: "block", fontWeight: 700 }}
          >
            {row?.raw?.taskName || row.name}
            {showProgress ? ` ${progressPercent}%` : ""}
          </Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            {t("projecttask.taskType")}:{" "}
            {getTaskTypeDisplay(row?.raw?.taskType)}
          </Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            {t("projecttask.taskStatus")}:{" "}
            {getTaskStatusLabel(row?.raw?.taskStatus, t)}
          </Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            {t("projecttask.taskDuration")}:{" "}
            {row?.raw?.taskDuration ||
              getDurationDays(row?.raw?.taskStartDate, row?.raw?.taskEndDate) ||
              "-"}
          </Typography>
        </>
      )}
    </Box>
  );
};

export default WorkbenchRowTooltipContent;
