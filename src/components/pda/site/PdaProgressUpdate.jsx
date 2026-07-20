import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ReplayIcon from "@mui/icons-material/Replay";
import { useTranslation } from "react-i18next";
import { request } from "../../../helpers/axios_helper";

const toApiDate = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const toProgressValue = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const SECTION_BG = {
  C_BACKDATED: "warning.light",
  C_TODAY: "primary.light",
  U: "secondary.light",
  OTHERS: "secondary.light",
};

const SECTION_HEADER = {
  C_BACKDATED: "warning.main",
  C_TODAY: "primary.main",
  U: "secondary.main",
  OTHERS: "secondary.main",
};

const GROUP_ORDER = {
  C_BACKDATED: 0,
  C_TODAY: 1,
  U: 2,
  OTHERS: 3,
};

export default function PdaProgressUpdate() {
  const { t } = useTranslation();

  const [hasRole, setHasRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState([]);
  const [streamsById, setStreamsById] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [draftById, setDraftById] = useState({});
  const [savingId, setSavingId] = useState("");

  const currentStaffId = useMemo(() => {
    try {
      const info = JSON.parse(localStorage.getItem("pda_user_info") || "{}");
      return String(info.staffId || "");
    } catch {
      return "";
    }
  }, []);

  const today = useMemo(() => toApiDate(new Date()), []);

  useEffect(() => {
    if (!currentStaffId) {
      setHasRole(false);
      setLoading(false);
      return;
    }

    request(
      "GET",
      `/api/operationroles?staffId=${encodeURIComponent(currentStaffId)}`,
    )
      .then((res) => {
        const roles = Array.isArray(res?.data) ? res.data : [];
        const isSiteLeader = roles.some(
          (r) => String(r.roleName || "").toLowerCase() === "siteleader",
        );
        setHasRole(isSiteLeader);
      })
      .catch(() => setHasRole(false));
  }, [currentStaffId]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [progressRes, tasksRes, streamsRes] = await Promise.all([
        request("GET", "/api/projecttaskprogresses"),
        request("GET", "/api/projecttasks"),
        request("GET", "/api/projectstreams").catch(() => ({ data: [] })),
      ]);

      const progresses = Array.isArray(progressRes?.data)
        ? progressRes.data
        : [];
      const tasks = Array.isArray(tasksRes?.data) ? tasksRes.data : [];

      const taskById = tasks.reduce((acc, task) => {
        acc[String(task.projectTaskId)] = task;
        return acc;
      }, {});

      const streamMap = (
        Array.isArray(streamsRes?.data) ? streamsRes.data : []
      ).reduce((acc, stream) => {
        const streamId = String(stream?.projectStreamId || "").trim();
        if (!streamId) return acc;
        acc[streamId] = String(stream?.streamName || "").trim();
        return acc;
      }, {});

      const filtered = progresses.filter((p) => {
        const progressDate = String(p.progressDate || "");
        if (!progressDate) return false;
        if (progressDate === today) return true;
        return progressDate < today && String(p.marker || "") !== "U";
      });

      filtered.sort((a, b) => {
        const markerA = String(a.marker || "").trim();
        const markerB = String(b.marker || "").trim();
        const groupA =
          markerA === "C"
            ? String(a.progressDate || "") < today
              ? "C_BACKDATED"
              : "C_TODAY"
            : markerA === "U"
              ? "U"
              : "OTHERS";
        const groupB =
          markerB === "C"
            ? String(b.progressDate || "") < today
              ? "C_BACKDATED"
              : "C_TODAY"
            : markerB === "U"
              ? "U"
              : "OTHERS";
        const byMarker =
          (GROUP_ORDER[groupA] ?? 99) - (GROUP_ORDER[groupB] ?? 99);
        if (byMarker !== 0) return byMarker;

        const ta = taskById[String(a.projectTaskId)];
        const tb = taskById[String(b.projectTaskId)];
        const byStream = String(ta?.projectStreamId || "").localeCompare(
          String(tb?.projectStreamId || ""),
          undefined,
          { numeric: true },
        );
        if (byStream !== 0) return byStream;

        const byDate = String(a.progressDate || "").localeCompare(
          String(b.progressDate || ""),
        );
        if (byDate !== 0) return byDate;

        const byTaskStart = String(ta?.actualStartDate || "").localeCompare(
          String(tb?.actualStartDate || ""),
        );
        if (byTaskStart !== 0) return byTaskStart;

        return String(ta?.taskName || "").localeCompare(
          String(tb?.taskName || ""),
        );
      });

      setRows(
        filtered.map((progress) => ({
          progress,
          task: taskById[String(progress.projectTaskId)] || null,
        })),
      );
      setStreamsById(streamMap);
      setDraftById({});
      setExpandedId(null);
    } catch {
      setErrorMsg(
        t(
          "pda.progressUpdate.loadFailed",
          "Failed to load task progress records.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [t, today]);

  useEffect(() => {
    if (hasRole === true) {
      loadRows();
    }
  }, [hasRole, loadRows]);

  const groupedRows = useMemo(() => {
    const markerMap = new Map();

    const toGroupKey = (row) => {
      const marker = String(row?.progress?.marker || "").trim();
      const progressDate = String(row?.progress?.progressDate || "");
      if (marker === "C") {
        return progressDate < today ? "C_BACKDATED" : "C_TODAY";
      }
      if (marker === "U") return "U";
      return "OTHERS";
    };

    rows.forEach((row) => {
      const groupKey = toGroupKey(row);
      if (!markerMap.has(groupKey)) markerMap.set(groupKey, new Map());

      const streamId = String(row?.task?.projectStreamId || "").trim();
      if (!markerMap.get(groupKey).has(streamId)) {
        markerMap.get(groupKey).set(streamId, []);
      }
      markerMap.get(groupKey).get(streamId).push(row);
    });

    return Array.from(markerMap.entries())
      .sort((a, b) => (GROUP_ORDER[a[0]] ?? 99) - (GROUP_ORDER[b[0]] ?? 99))
      .map(([groupKey, streamMap]) => {
        const streams = Array.from(streamMap.entries())
          .sort((a, b) =>
            String(a[0]).localeCompare(String(b[0]), undefined, {
              numeric: true,
            }),
          )
          .map(([streamId, items]) => ({
            streamId,
            streamName: streamsById[streamId] || "",
            items: [...items].sort((a, b) => {
              const byProgressDate = String(
                a?.progress?.progressDate || "",
              ).localeCompare(String(b?.progress?.progressDate || ""));
              if (byProgressDate !== 0) return byProgressDate;
              return String(a?.task?.actualStartDate || "").localeCompare(
                String(b?.task?.actualStartDate || ""),
              );
            }),
          }));

        return { groupKey, streams };
      });
  }, [rows, streamsById, today]);

  const getGroupHeaderText = (groupKey) => {
    if (groupKey === "C_BACKDATED") {
      return t(
        "pda.progressUpdate.group.cBackdated",
        "Prior tasks progress not reported",
      );
    }
    if (groupKey === "C_TODAY") {
      return t("pda.progressUpdate.group.cToday", "Tasks executed today");
    }
    if (groupKey === "U") {
      return t("pda.progressUpdate.group.u", "Progress reported");
    }
    return t("pda.progressUpdate.group.other", "Other");
  };

  const getBaselineProgress = (row) => toProgressValue(row?.task?.progress);

  const getDisplayTaskDates = (task) => {
    const status = String(task?.taskStatus || "").trim();
    const startDate =
      status === "Not Started"
        ? task?.taskStartDate
        : task?.actualStartDate || task?.taskStartDate;
    const endDate =
      status === "Completed"
        ? task?.actualEndDate || task?.taskEndDate
        : task?.taskEndDate;
    return { startDate, endDate };
  };

  const handleExpand = (row) => {
    const progressId = String(row.progress.projectTaskProgressId);
    const baseline = getBaselineProgress(row);
    setExpandedId((prev) => {
      if (prev === progressId) return null;
      // Always initialize with current task progress when selecting a task.
      setDraftById((draftPrev) => ({
        ...draftPrev,
        [progressId]: {
          progress: baseline,
          completed: baseline >= 100,
        },
      }));
      return progressId;
    });
  };

  const handleDraftProgress = (progressId, baseline, value) => {
    const parsed = toProgressValue(value);
    const clamped = Math.max(baseline, Math.min(100, parsed));
    setDraftById((prev) => ({
      ...prev,
      [progressId]: {
        ...(prev[progressId] || {
          progress: baseline,
          completed: baseline >= 100,
        }),
        progress: clamped,
        completed: clamped >= 100,
      },
    }));
  };

  const handleDraftCompleted = (progressId, baseline, checked) => {
    setDraftById((prev) => ({
      ...prev,
      [progressId]: {
        ...(prev[progressId] || {
          progress: baseline,
          completed: baseline >= 100,
        }),
        completed: checked,
        progress: checked ? 100 : baseline,
      },
    }));
  };

  const handleConfirmProgress = async (row) => {
    const progressId = String(row.progress.projectTaskProgressId || "");
    if (!progressId) return;

    const baseline = getBaselineProgress(row);
    const draft = draftById[progressId] || {
      progress: baseline,
      completed: baseline >= 100,
    };
    if (draft.progress <= baseline) return;

    setSavingId(progressId);
    setErrorMsg("");
    try {
      await request("PUT", `/api/projecttaskprogresses/${progressId}`, {
        ...row.progress,
        progress: draft.completed ? 100 : draft.progress,
        completed: draft.completed ? 1 : 0,
        marker: "U",
        reportedBy: currentStaffId,
      });
      await loadRows();
    } catch {
      setErrorMsg(
        t(
          "pda.progressUpdate.confirmFailed",
          "Failed to confirm task progress.",
        ),
      );
    } finally {
      setSavingId("");
    }
  };

  if (hasRole === null || loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hasRole) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {t(
          "pda.progressUpdate.noAccess",
          "This function is only available to Site Leaders.",
        )}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        {t("pda.progressUpdate.title", "Task Progress Update")}
      </Typography>

      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg("")}>
          {errorMsg}
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <Alert severity="info">
          {t(
            "pda.progressUpdate.noItems",
            "No task progress records require update.",
          )}
        </Alert>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {groupedRows.map((group, groupIndex) => (
            <Box
              key={`marker-${group.groupKey || "blank"}-${groupIndex}`}
              sx={{
                borderRadius: 1,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 0.8,
                  bgcolor:
                    SECTION_HEADER[group.groupKey] || SECTION_HEADER.OTHERS,
                  color: "common.white",
                }}
              >
                <Typography variant="body2" fontWeight={700}>
                  {getGroupHeaderText(group.groupKey)}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1,
                  bgcolor: SECTION_BG[group.groupKey] || SECTION_BG.OTHERS,
                }}
              >
                {group.streams.map((stream) => (
                  <Box
                    key={`stream-${group.groupKey}-${stream.streamId || "blank"}`}
                    sx={{
                      display: "block",
                      bgcolor: "rgba(255,255,255,0.55)",
                      borderLeft: "4px solid",
                      borderColor:
                        SECTION_HEADER[group.groupKey] || SECTION_HEADER.OTHERS,
                      borderRadius: "0 6px 6px 0",
                      px: 1.5,
                      pt: 0.75,
                      pb: 0.5,
                      mb: 1.25,
                      "&:last-child": { mb: 0 },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: 0.75,
                      }}
                    >
                      <Box
                        sx={{
                          display: "block",
                          fontWeight: 700,
                          fontSize: "1rem",
                          color:
                            SECTION_HEADER[group.groupKey] ||
                            SECTION_HEADER.OTHERS,
                          lineHeight: 1.5,
                        }}
                      >
                        {stream.streamName}
                      </Box>
                    </Box>

                    {stream.items.map((row) => {
                      const progressId = String(
                        row.progress.projectTaskProgressId || "",
                      );
                      const isUpdated =
                        String(row?.progress?.marker || "").trim() === "U";
                      const updatedProgress = toProgressValue(
                        row?.progress?.progress,
                      );
                      const displayProgress = isUpdated
                        ? updatedProgress
                        : toProgressValue(row?.task?.progress);
                      const { startDate, endDate } = getDisplayTaskDates(
                        row.task,
                      );
                      const expanded = expandedId === progressId && !isUpdated;
                      const baseline = getBaselineProgress(row);
                      const draft = draftById[progressId] || {
                        progress: baseline,
                        completed: baseline >= 100,
                      };
                      const canConfirm = draft.progress > baseline;

                      return (
                        <Box
                          key={progressId}
                          sx={{
                            bgcolor: "background.paper",
                            borderRadius: 1,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                            display: "flex",
                            flexDirection: "column",
                            border: "1px solid",
                            borderColor: expanded ? "primary.main" : "divider",
                            overflow: "hidden",
                            mb: 0.75,
                            "&:last-child": { mb: 0 },
                          }}
                        >
                          <Box
                            role="button"
                            tabIndex={isUpdated ? -1 : 0}
                            onClick={() => {
                              if (!isUpdated) handleExpand(row);
                            }}
                            onKeyDown={(e) => {
                              if (
                                !isUpdated &&
                                (e.key === "Enter" || e.key === " ")
                              ) {
                                e.preventDefault();
                                handleExpand(row);
                              }
                            }}
                            sx={{
                              px: 1.25,
                              py: 1,
                              display: "grid",
                              gridTemplateColumns: "minmax(0,1fr) auto",
                              gridTemplateRows: "auto auto",
                              columnGap: 1,
                              alignItems: "center",
                              cursor: isUpdated ? "default" : "pointer",
                            }}
                          >
                            <Box
                              sx={{
                                gridColumn: "2 / 3",
                                gridRow: "1 / 3",
                                display: "flex",
                                justifyContent: "flex-end",
                                alignItems: "center",
                                minWidth: 24,
                              }}
                            >
                              {!isUpdated ? (
                                <IconButton
                                  size="small"
                                  sx={{ p: 0.25 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExpand(row);
                                  }}
                                  aria-label={t(
                                    "pda.progressUpdate.expandRow",
                                    "Expand task progress",
                                  )}
                                >
                                  {expanded ? (
                                    <ReplayIcon
                                      fontSize="small"
                                      color="warning"
                                    />
                                  ) : (
                                    <RadioButtonUncheckedIcon
                                      fontSize="small"
                                      color="disabled"
                                    />
                                  )}
                                </IconButton>
                              ) : (
                                <CheckCircleOutlineIcon
                                  fontSize="small"
                                  color="success"
                                  sx={{ mr: 0.5 }}
                                />
                              )}
                            </Box>

                            <Box
                              sx={{
                                gridColumn: "1 / 2",
                                gridRow: "1 / 2",
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                minWidth: 0,
                                mb: 0.25,
                              }}
                            >
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ textAlign: "left", minWidth: 0 }}
                              >
                                {row.task?.taskName || ""}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="success.main"
                                fontWeight={700}
                                sx={{ flexShrink: 0 }}
                              >
                                {`${displayProgress}%`}
                              </Typography>
                            </Box>

                            <Box
                              sx={{
                                gridColumn: "1 / 2",
                                gridRow: "2 / 3",
                                minWidth: 0,
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                sx={{ textAlign: "left" }}
                              >
                                {startDate || ""} - {endDate || ""}
                              </Typography>
                            </Box>
                          </Box>

                          {expanded ? (
                            <Box
                              sx={{
                                px: 1.25,
                                pb: 1.25,
                                display: "grid",
                                gridTemplateColumns:
                                  "minmax(120px,1fr) auto auto",
                                gap: 1,
                                alignItems: "center",
                                borderTop: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <TextField
                                size="small"
                                label={t(
                                  "pda.progressUpdate.progress",
                                  "Progress",
                                )}
                                type="number"
                                value={draft.progress}
                                onChange={(e) =>
                                  handleDraftProgress(
                                    progressId,
                                    baseline,
                                    e.target.value,
                                  )
                                }
                                inputProps={{
                                  min: baseline,
                                  max: 100,
                                  step: 1,
                                }}
                                disabled={
                                  draft.completed || savingId === progressId
                                }
                                fullWidth
                              />

                              <FormControlLabel
                                sx={{ m: 0 }}
                                control={
                                  <Checkbox
                                    checked={draft.completed}
                                    onChange={(e) =>
                                      handleDraftCompleted(
                                        progressId,
                                        baseline,
                                        e.target.checked,
                                      )
                                    }
                                    disabled={savingId === progressId}
                                  />
                                }
                                label={t(
                                  "pda.progressUpdate.complete",
                                  "Complete",
                                )}
                              />

                              {canConfirm ? (
                                <Tooltip
                                  title={t(
                                    "pda.progressUpdate.confirm",
                                    "Confirm progress",
                                  )}
                                >
                                  <span>
                                    <IconButton
                                      color="success"
                                      onClick={() => handleConfirmProgress(row)}
                                      disabled={savingId === progressId}
                                    >
                                      {savingId === progressId ? (
                                        <CircularProgress
                                          size={18}
                                          color="inherit"
                                        />
                                      ) : (
                                        <PlayCircleOutlineIcon fontSize="small" />
                                      )}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              ) : (
                                <Box sx={{ width: 40, height: 40 }} />
                              )}
                            </Box>
                          ) : null}
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
