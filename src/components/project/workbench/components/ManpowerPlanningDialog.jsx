import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

const ManpowerPlanningDialog = ({
  open,
  onClose,
  target,
  error,
  dates,
  activeDate,
  onDateChange,
  projectSkillFilters,
  skillFilter,
  onSkillFilterChange,
  loading,
  rowsForActiveDate,
  planningRows,
  dropdownOptionsForActiveDate,
  staffNameById,
  staffSkillsById,
  staffOptions,
  staffSkillMap,
  onUpdateRow,
  onSave,
}) => {
  const { t } = useTranslation();

  const activeWorkDateRaw = String(activeDate || "").trim();
  const activeWorkDate = activeWorkDateRaw ? new Date(activeWorkDateRaw) : null;
  const isActiveWorkDateValid =
    activeWorkDate instanceof Date && !Number.isNaN(activeWorkDate.getTime());

  if (isActiveWorkDateValid) {
    activeWorkDate.setHours(0, 0, 0, 0);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hideSaveForPastWorkDate =
    isActiveWorkDateValid && activeWorkDate.getTime() < today.getTime();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h6" component="div">
            {t("projectPlanning.manpowerWorkspace")}
            {" - "}
            {target?.name || target?.raw?.taskName || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("projectPlanning.manpowerWorkspaceHelp")}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          {error && <Alert severity="error">{error}</Alert>}

          {dates.length > 0 && (
            <Tabs
              value={activeDate}
              onChange={(_, value) => onDateChange(value)}
              variant="scrollable"
              allowScrollButtonsMobile
            >
              {dates.map((dateValue) => (
                <Tab key={dateValue} value={dateValue} label={dateValue} />
              ))}
            </Tabs>
          )}

          {projectSkillFilters.length > 0 && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.75,
                alignItems: "center",
              }}
            >
              <Chip
                size="small"
                label={t("basic.all")}
                color={skillFilter ? "default" : "primary"}
                variant={skillFilter ? "outlined" : "filled"}
                onClick={() => onSkillFilterChange("")}
              />
              {projectSkillFilters.map((skillItem) => (
                <Chip
                  key={`${skillItem.id}-${skillItem.label}`}
                  size="small"
                  label={skillItem.label}
                  color={
                    skillFilter === skillItem.label ? "primary" : "default"
                  }
                  variant={
                    skillFilter === skillItem.label ? "filled" : "outlined"
                  }
                  onClick={() => onSkillFilterChange(skillItem.label)}
                />
              ))}
            </Box>
          )}

          {loading ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : rowsForActiveDate.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("projectPlanning.noManpowerSelected")}
            </Typography>
          ) : (
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0, 1.7fr) minmax(0, 3fr) 120px 90px",
                  gap: 1,
                  px: 1.25,
                  py: 0.75,
                  bgcolor: "action.hover",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    letterSpacing: 0.2,
                  }}
                >
                  {t("projectPlanning.skillName")}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    letterSpacing: 0.2,
                  }}
                >
                  {t("projectPlanning.staffName")}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    letterSpacing: 0.2,
                  }}
                >
                  {t("projectPlanning.manpowerLoading")}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    letterSpacing: 0.2,
                  }}
                >
                  {t("basic.action")}
                </Typography>
              </Box>

              {rowsForActiveDate.map((item) => {
                const rowKey = String(item?.apiId || "");
                const occupiedByOtherRows = new Set(
                  planningRows
                    .filter(
                      (row) =>
                        String(row?.apiId || "") !== rowKey &&
                        String(row?.staffId || "").trim(),
                    )
                    .map((row) => String(row?.staffId || "").trim()),
                );

                const rowOptions = dropdownOptionsForActiveDate
                  .filter((option) => {
                    const optionValue = String(option?.value || "").trim();

                    if (optionValue === String(item?.staffId || "").trim()) {
                      return true;
                    }

                    if (!skillFilter) return true;

                    const profiles = Array.isArray(option?.skillProfiles)
                      ? option.skillProfiles
                      : [];
                    return profiles.includes(skillFilter);
                  })
                  .sort((a, b) => {
                    const staffA = String(a?.staffName || "").trim();
                    const staffB = String(b?.staffName || "").trim();
                    const selectedA =
                      staffA &&
                      occupiedByOtherRows.has(String(a?.value || "").trim());
                    const selectedB =
                      staffB &&
                      occupiedByOtherRows.has(String(b?.value || "").trim());

                    if (selectedA !== selectedB) return selectedA ? -1 : 1;

                    return staffA.localeCompare(staffB, undefined, {
                      sensitivity: "base",
                    });
                  });

                return (
                  <Box
                    key={rowKey}
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(0, 1.7fr) minmax(0, 3fr) 120px 90px",
                      gap: 1,
                      px: 1.25,
                      py: 0.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      alignItems: "center",
                      "&:last-child": { borderBottom: "none" },
                    }}
                  >
                    <Typography variant="body2" noWrap>
                      {String(item?.requiredSkill || "").trim() || "-"}
                    </Typography>

                    <FormControl size="small" fullWidth>
                      <InputLabel>{t("projectPlanning.staffName")}</InputLabel>
                      <Select
                        label={t("projectPlanning.staffName")}
                        value={String(item?.staffId || "")}
                        renderValue={(value) => {
                          const selectedValue = String(value || "").trim();
                          const selectedName =
                            staffNameById[selectedValue] ||
                            t("projectPlanning.unassigned");
                          const selectedProfiles =
                            Array.isArray(staffSkillsById[selectedValue]) &&
                            staffSkillsById[selectedValue].length > 0
                              ? staffSkillsById[selectedValue]
                              : selectedValue
                                ? [t("projectPlanning.noSkillProfile")]
                                : [t("projectPlanning.unassigned")];

                          return (
                            <Box
                              sx={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                                minWidth: 0,
                                overflowX: "auto",
                                overflowY: "hidden",
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "1.12rem",
                                  fontWeight: 500,
                                  lineHeight: 1.2,
                                  flexShrink: 0,
                                }}
                              >
                                {selectedName}
                              </Typography>
                              {selectedProfiles.slice(0, 4).map((skillName) => (
                                <Chip
                                  key={`${selectedValue || "none"}-${skillName}`}
                                  size="small"
                                  label={skillName}
                                  sx={{
                                    height: 18,
                                    flexShrink: 0,
                                    "& .MuiChip-label": {
                                      px: 0.75,
                                      fontSize: "0.68rem",
                                    },
                                  }}
                                />
                              ))}
                            </Box>
                          );
                        }}
                        onChange={(event) =>
                          onUpdateRow(item.apiId, {
                            staffId: String(event.target.value || "").trim(),
                            manpowerTouched: String(
                              event.target.value || "",
                            ).trim()
                              ? 1
                              : 0,
                          })
                        }
                      >
                        {rowOptions.length > 0
                          ? rowOptions.map((option) => (
                              <MenuItem
                                key={`${rowKey}-${option.value || "empty"}-${option.label}`}
                                value={option.value}
                                disabled={
                                  Boolean(String(option?.value || "").trim()) &&
                                  String(option?.value || "").trim() !==
                                    String(item?.staffId || "").trim() &&
                                  occupiedByOtherRows.has(
                                    String(option?.value || "").trim(),
                                  )
                                }
                              >
                                <Box
                                  sx={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 1,
                                    flexWrap: "nowrap",
                                  }}
                                >
                                  <Typography
                                    noWrap
                                    sx={{
                                      fontSize: "1.02rem",
                                      fontWeight: 500,
                                      flex: "0 0 auto",
                                      maxWidth: "40%",
                                    }}
                                  >
                                    {option.label}
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      gap: 0.5,
                                      flexWrap: "nowrap",
                                      justifyContent: "flex-start",
                                      alignItems: "center",
                                      flex: 1,
                                      minWidth: 0,
                                      overflowX: "auto",
                                      overflowY: "hidden",
                                    }}
                                  >
                                    {(Array.isArray(option.skillProfiles)
                                      ? option.skillProfiles
                                      : []
                                    )
                                      .slice(0, 4)
                                      .map((skillName) => (
                                        <Chip
                                          key={`${option.value}-${skillName}`}
                                          size="small"
                                          label={skillName}
                                          sx={{
                                            height: 18,
                                            flexShrink: 0,
                                            "& .MuiChip-label": {
                                              px: 0.75,
                                              fontSize: "0.68rem",
                                            },
                                          }}
                                        />
                                      ))}
                                  </Box>
                                </Box>
                              </MenuItem>
                            ))
                          : staffOptions.map((staff) => {
                              const staffId = String(
                                staff?.staffId || "",
                              ).trim();
                              if (!staffId) return null;
                              const staffName =
                                String(staff?.staffName || "").trim() ||
                                [staff?.firstName, staff?.lastName]
                                  .filter(Boolean)
                                  .join(" ")
                                  .trim() ||
                                staffId;
                              const skillProfiles =
                                Array.isArray(staffSkillMap[staffId]) &&
                                staffSkillMap[staffId].length > 0
                                  ? staffSkillMap[staffId]
                                  : [t("projectPlanning.noSkillProfile")];
                              return (
                                <MenuItem key={staffId} value={staffId}>
                                  <Box
                                    sx={{
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: 1,
                                      flexWrap: "nowrap",
                                    }}
                                  >
                                    <Typography
                                      noWrap
                                      sx={{
                                        fontSize: "1.02rem",
                                        fontWeight: 500,
                                        flex: "0 0 auto",
                                        maxWidth: "40%",
                                      }}
                                    >
                                      {staffName}
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        gap: 0.5,
                                        flexWrap: "nowrap",
                                        justifyContent: "flex-start",
                                        alignItems: "center",
                                        flex: 1,
                                        minWidth: 0,
                                        overflowX: "auto",
                                        overflowY: "hidden",
                                      }}
                                    >
                                      {skillProfiles
                                        .slice(0, 4)
                                        .map((skillName) => (
                                          <Chip
                                            key={`${staffId}-${skillName}`}
                                            size="small"
                                            label={skillName}
                                            sx={{
                                              height: 18,
                                              flexShrink: 0,
                                              "& .MuiChip-label": {
                                                px: 0.75,
                                                fontSize: "0.68rem",
                                              },
                                            }}
                                          />
                                        ))}
                                    </Box>
                                  </Box>
                                </MenuItem>
                              );
                            })}
                      </Select>
                    </FormControl>

                    <TextField
                      type="number"
                      size="small"
                      value={item.loading}
                      onChange={(event) =>
                        onUpdateRow(item.apiId, {
                          loading: event.target.value,
                        })
                      }
                      inputProps={{ min: 0, max: 1, step: 0.1 }}
                    />

                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() =>
                        onUpdateRow(item.apiId, {
                          staffId: "",
                          manpowerTouched: 0,
                        })
                      }
                      disabled={!String(item?.staffId || "").trim()}
                    >
                      {t("basic.clear")}
                    </Button>
                  </Box>
                );
              })}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 1,
          flexWrap: "nowrap",
          position: "relative",
        }}
      >
        <Typography
          variant="caption"
          color="warning.main"
          sx={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            width: "max-content",
            maxWidth: "68%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {t("projectPlanning.manpowerLockSkillNotice")}
        </Typography>
        <Button onClick={onClose}>{t("basic.close")}</Button>
        {!hideSaveForPastWorkDate && (
          <Button
            variant="contained"
            onClick={onSave}
            disabled={loading || rowsForActiveDate.length === 0}
          >
            {t("basic.save")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ManpowerPlanningDialog;
