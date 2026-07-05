import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const WorkbenchTimelineHeaders = ({
  timelineWidth,
  upperSegments,
  colWidth,
  activeCols,
  viewMode,
  isCurrentPeriodColumn,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Upper header: month (day/week) or year (month) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `420px ${timelineWidth}px`,
          borderBottom: "1px solid",
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 6,
        }}
      >
        <Box
          sx={{
            px: 1,
            py: 0.75,
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "sticky",
            left: 0,
            zIndex: 7,
          }}
        >
          <Typography variant="caption" fontWeight={700}>
            {t("projectPlanning.timeline")}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", bgcolor: "background.default" }}>
          {upperSegments.map((seg) => (
            <Box
              key={seg.key}
              sx={{
                width: seg.span * colWidth,
                px: 0.5,
                py: 0.5,
                borderLeft: "1px solid",
                borderColor: "divider",
                textAlign: "center",
                overflow: "hidden",
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontSize: "0.64rem", whiteSpace: "nowrap" }}
              >
                {seg.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Lower header: day number / week range / month name */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `420px ${timelineWidth}px`,
          borderBottom: "1px solid",
          borderColor: "divider",
          position: "sticky",
          top: 30,
          zIndex: 5,
        }}
      >
        <Box
          sx={{
            px: 1,
            py: 0.75,
            bgcolor: "background.default",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 54px 84px 84px",
            gap: 1,
            position: "sticky",
            left: 0,
            zIndex: 6,
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" fontWeight={700}>
            {t("projectPlanning.leftHeaderName")}
          </Typography>
          <Typography variant="caption" fontWeight={700} textAlign="center">
            {t("basic.settings")}
          </Typography>
          <Typography variant="caption" fontWeight={700} textAlign="right">
            {t("projectPlanning.leftHeaderStart")}
          </Typography>
          <Typography variant="caption" fontWeight={700} textAlign="right">
            {t("projectPlanning.leftHeaderEnd")}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${activeCols.length}, ${colWidth}px)`,
            bgcolor: "background.default",
          }}
        >
          {activeCols.map((col, idx) => (
            <Box
              key={col.key}
              sx={{
                px: 0,
                py: 0.5,
                bgcolor: isCurrentPeriodColumn(viewMode, col)
                  ? "action.selected"
                  : "transparent",
                borderLeft: "1px solid",
                borderColor: (viewMode === "day" ? col.isMonthStart : idx === 0)
                  ? "divider"
                  : "transparent",
                textAlign: "center",
                overflow: "hidden",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.58rem",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {col.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );
};

export default WorkbenchTimelineHeaders;
