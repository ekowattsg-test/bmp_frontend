import React from "react";
import { Box, Paper, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { getProgressColor, getProgressLabel } from "./progressColors";

const naturalCompare = (a, b) =>
  new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare(
    String(a || ""),
    String(b || ""),
  );

const sortByName = (items, key = "name", direction = "asc") => {
  const sorted = [...(items || [])].sort((a, b) =>
    naturalCompare(a[key], b[key]),
  );
  return direction === "desc" ? sorted.reverse() : sorted;
};

const findUnit = (storey, stack) => {
  const stackId = String(stack?.projectStackId || "");
  return sortByName(storey.units, "unitName", "asc").find(
    (unit) => String(unit.projectStackId || "") === stackId && stackId !== "",
  );
};

const BuildingProgress3D = ({ blocks, onUnitClick }) => {
  const { t } = useTranslation();

  if (!blocks || blocks.length === 0) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: "center",
          bgcolor: "var(--color-gray-100)",
          borderRadius: 2,
        }}
      >
        <Typography color="text.secondary">
          {t("buildingProgress.noData", "No building progress data")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        overflowX: "auto",
        p: 2,
        bgcolor: "background.paper",
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          alignItems: "center",
          minWidth: "max-content",
        }}
      >
        {blocks.map((block) => (
          <Box
            key={block.projectBlockId}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 0.5,
              width: "100%",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, mb: 1, pl: 9 }}
            >
              {block.blockName || block.blockNumber || ""}
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                p: 1,
                borderRadius: 1,
                bgcolor: "var(--color-gray-100)",
              }}
            >
              {sortByName(block.storeys, "storeyName", "desc").map((storey) => (
                <Box
                  key={storey.projectStoreyId}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      width: 60,
                      textAlign: "right",
                      color: "text.secondary",
                    }}
                  >
                    {storey.storeyName || storey.storeyNumber || ""}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {sortByName(block.stacks, "stackName", "asc").map(
                      (stack) => {
                        const unit = findUnit(storey, stack);
                        const color = getProgressColor(
                          unit?.progress,
                          unit?.plannedEndDate,
                        );
                        const statusLabel = unit
                          ? getProgressLabel(
                              unit.progress,
                              unit.plannedEndDate,
                              t,
                            )
                          : t(
                              "buildingProgress.statusNotStarted",
                              "Not Started",
                            );
                        const unitKey =
                          unit?.projectUnitId ??
                          `${block.projectBlockId}-${storey.projectStoreyId}-${stack.projectStackId}`;

                        const cell = (
                          <Paper
                            onClick={() =>
                              unit
                                ? onUnitClick?.(unit, storey, block, stack)
                                : null
                            }
                            sx={{
                              width: 56,
                              height: 40,
                              bgcolor: unit ? color : "grey.300",
                              cursor:
                                unit && onUnitClick ? "pointer" : "default",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: 2,
                              border: "1px solid",
                              borderColor: "divider",
                              pointerEvents: "auto",
                              transition:
                                "transform 0.15s ease, box-shadow 0.15s ease",
                              "&:hover":
                                unit && onUnitClick
                                  ? {
                                      transform: "translateY(-4px) scale(1.05)",
                                      boxShadow: 4,
                                    }
                                  : {},
                            }}
                          >
                            {unit && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "common.white",
                                  fontWeight: 600,
                                  fontSize: "0.7rem",
                                  pointerEvents: "none",
                                }}
                              >
                                {unit.progress ?? 0}%
                              </Typography>
                            )}
                          </Paper>
                        );

                        return unit ? (
                          <Tooltip
                            key={unitKey}
                            title={
                              <Box sx={{ maxWidth: 280 }}>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {unit.unitName ||
                                    `${storey.storeyName}/${stack.stackName}`}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  {block.blockName} / {storey.storeyName} /{" "}
                                  {stack.stackName}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  {t("buildingProgress.progress", "Progress")}:{" "}
                                  {unit.progress ?? 0}%
                                </Typography>
                                <Typography variant="caption" display="block">
                                  {statusLabel}
                                </Typography>
                              </Box>
                            }
                            arrow
                            placement="top"
                          >
                            {cell}
                          </Tooltip>
                        ) : (
                          <React.Fragment key={unitKey}>{cell}</React.Fragment>
                        );
                      },
                    )}
                  </Box>
                </Box>
              ))}

              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, pl: 9 }}
              >
                {sortByName(block.stacks, "stackName", "asc").map((stack) => (
                  <Typography
                    key={`stack-label-${stack.projectStackId}`}
                    variant="caption"
                    sx={{
                      width: 56,
                      textAlign: "center",
                      color: "text.secondary",
                    }}
                  >
                    {stack.stackName || ""}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default BuildingProgress3D;
