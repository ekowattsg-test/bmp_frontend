import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

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

  return (
    <Box>
      {validMoveTarget && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            fontWeight: 700,
          }}
        >
          {t("projectPlanning.moveHere", "Move here")}
        </Typography>
      )}
      {row.type === "stream" ? (
        <>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              fontWeight: 700,
            }}
          >
            {row?.raw?.streamName || row.name}
          </Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            {t("projectstream.streamType", "Stream Type")}:{" "}
            {row?.raw?.streamType || "-"}
          </Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            {t("projectPlanning.taskCount", "Task Count")}: {streamTaskCount}
          </Typography>
        </>
      ) : (
        <>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              fontWeight: 700,
            }}
          >
            {row?.raw?.taskName || row.name}
          </Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            {t("projecttask.taskType", "Task Type")}:{" "}
            {getTaskTypeDisplay(row?.raw?.taskType)}
          </Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            {t("projecttask.taskStatus", "Task Status")}:{" "}
            {row?.raw?.taskStatus || "-"}
          </Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            {t("projecttask.taskDuration", "Task Duration (days)")}:{" "}
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
