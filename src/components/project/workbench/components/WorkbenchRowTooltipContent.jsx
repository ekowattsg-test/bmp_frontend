import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { getTaskStatusLabel } from "../utils/workbenchUtils";

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
          {t("projectPlanning.moveHere")}
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
            sx={{
              display: "block",
              fontWeight: 700,
            }}
          >
            {row?.raw?.taskName || row.name}
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
