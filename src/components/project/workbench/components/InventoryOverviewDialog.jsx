import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

const InventoryOverviewDialog = ({
  open,
  onClose,
  projectCode,
  viewMode,
  onViewModeChange,
  loading,
  rowsReady,
  error,
  rows,
  timelineWidth,
  upperSegments,
  activeCols,
  colWidth,
  isCurrentPeriodColumn,
  getUsageValue,
  getUsageDetailsTable,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          width: "94vw",
          maxWidth: "94vw",
          height: "86vh",
        },
      }}
    >
      <DialogTitle sx={{ pb: 0.25, pt: 1 }}>
        {t("projectPlanning.inventoryOverview")} - {projectCode}
      </DialogTitle>
      <Box
        sx={{
          px: 3,
          py: 0.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {t("projectPlanning.inventoryOverviewDesc")}
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => {
            if (value) onViewModeChange(value);
          }}
          size="small"
        >
          <ToggleButton value="day">
            {t("projectPlanning.viewDay")}
          </ToggleButton>
          <ToggleButton value="week">
            {t("projectPlanning.viewWeek")}
          </ToggleButton>
          <ToggleButton value="month">
            {t("projectPlanning.viewMonth")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          overflow: "hidden",
        }}
      >
        {loading || !rowsReady ? (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={26} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : rows.length === 0 ? (
          <Alert severity="info">{t("projectPlanning.noInventoryData")}</Alert>
        ) : (
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              overflow: "auto",
              flex: 1,
            }}
          >
            <Box sx={{ minWidth: 320 + timelineWidth }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `320px ${timelineWidth}px`,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  position: "sticky",
                  top: 0,
                  zIndex: 6,
                }}
              >
                <Box
                  sx={{
                    borderRight: "1px solid",
                    borderColor: "divider",
                    position: "sticky",
                    left: 0,
                    zIndex: 7,
                    bgcolor: "background.default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: 1,
                    py: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ fontSize: "0.64rem" }}
                  >
                    {t("projectPlanning.timeline")}
                  </Typography>
                </Box>

                <Box sx={{ bgcolor: "background.default", display: "flex" }}>
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

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `320px ${timelineWidth}px`,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  position: "sticky",
                  top: 27,
                  zIndex: 5,
                }}
              >
                <Box
                  sx={{
                    borderRight: "1px solid",
                    borderColor: "divider",
                    position: "sticky",
                    left: 0,
                    zIndex: 6,
                    bgcolor: "background.default",
                    display: "grid",
                    gridTemplateColumns: "1fr 88px",
                  }}
                >
                  <Box
                    sx={{
                      px: 1,
                      py: 0.6,
                      borderRight: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ fontSize: "0.68rem" }}
                    >
                      {t("projectPlanning.productName")}
                    </Typography>
                  </Box>
                  <Box sx={{ px: 1, py: 0.6 }}>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ fontSize: "0.68rem" }}
                    >
                      {t("basic.uom")}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ bgcolor: "background.default" }}>
                  <Box
                    sx={{
                      display: "flex",
                      borderTop: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {activeCols.map((col, idx) => (
                      <Box
                        key={col.key}
                        sx={{
                          width: colWidth,
                          px: 0,
                          py: 0.4,
                          bgcolor: isCurrentPeriodColumn(viewMode, col)
                            ? "action.selected"
                            : "transparent",
                          borderLeft: "1px solid",
                          borderColor:
                            viewMode === "day"
                              ? col.isMonthStart
                                ? "divider"
                                : "transparent"
                              : idx === 0
                                ? "divider"
                                : "transparent",
                          textAlign: "center",
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
              </Box>

              {rows.map((row, rowIndex) => (
                <Box
                  key={row.key}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: `320px ${timelineWidth}px`,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    minHeight: 28,
                  }}
                >
                  <Box
                    sx={{
                      borderRight: "1px solid",
                      borderColor: "divider",
                      position: "sticky",
                      left: 0,
                      zIndex: 5,
                      bgcolor:
                        rowIndex % 2 === 0 ? "background.paper" : "grey.50",
                      display: "grid",
                      gridTemplateColumns: "1fr 88px",
                    }}
                  >
                    <Box
                      sx={{
                        px: 1,
                        py: 0.55,
                        borderRight: "1px solid",
                        borderColor: "divider",
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.69rem" }}
                        noWrap
                      >
                        {row.productName}
                      </Typography>
                    </Box>
                    <Box sx={{ px: 1, py: 0.55 }}>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.69rem" }}
                      >
                        {row.uom}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      bgcolor:
                        rowIndex % 2 === 0 ? "background.paper" : "grey.50",
                    }}
                  >
                    {activeCols.map((col) => {
                      const value = getUsageValue(row, col);
                      const hasValue = value > 0;
                      const isCurrentPeriod = isCurrentPeriodColumn(
                        viewMode,
                        col,
                      );
                      const cellSx = {
                        width: colWidth,
                        bgcolor: isCurrentPeriod
                          ? "action.selected"
                          : "transparent",
                        borderLeft: "1px solid",
                        borderColor:
                          viewMode === "day"
                            ? col.isMonthStart
                              ? "divider"
                              : "transparent"
                            : "divider",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        py: 0.3,
                        cursor: hasValue ? "pointer" : "default",
                      };

                      if (!hasValue) {
                        return (
                          <Box key={`${row.key}-${col.key}`} sx={cellSx}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.62rem",
                                color: "text.disabled",
                              }}
                            >
                              -
                            </Typography>
                          </Box>
                        );
                      }

                      const detailsTable = getUsageDetailsTable(row, col);
                      return (
                        <Tooltip
                          key={`${row.key}-${col.key}`}
                          title={detailsTable}
                          arrow
                          placement="top"
                          disableInteractive={false}
                        >
                          <Box sx={cellSx}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.62rem",
                                color: "text.primary",
                              }}
                            >
                              {Number(value.toFixed(2))}
                            </Typography>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("basic.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryOverviewDialog;
