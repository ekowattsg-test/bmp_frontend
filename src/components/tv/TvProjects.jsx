import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import axios from "axios";
import {
  getTvAuthState,
  setTvAuthState,
  clearTvAuthState,
} from "./tvAuthStore";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const STREAMS_PER_PROJECT_SCREEN = 6;
const TASKS_PER_STREAM_CARD = 1;
const PAGE_ROTATE_MS = 30000;
const PAGE_TRANSITION_MS = 5000;
const TV_AUTOSTART_KEY = "tv_display_autostart";

const toApiDate = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const buildDateRangeSet = (startDate, daysForward) => {
  const base = startDate instanceof Date ? startDate : new Date(startDate);
  if (Number.isNaN(base.getTime())) return new Set();
  const total = Math.max(0, Number(daysForward || 0));
  const dates = [];
  for (let offset = 0; offset <= total; offset += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    dates.push(toApiDate(d));
  }
  return new Set(dates.filter(Boolean));
};

const formatDateLabel = (value) => {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || "-";
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString();
};

const chunk = (items, size) => {
  const pages = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
};

const getTaskStatusColor = (status) => {
  switch (String(status || "").trim()) {
    case "Completed":
      return "success";
    case "In Progress":
      return "warning";
    case "Not Started":
      return "default";
    default:
      return "default";
  }
};

const getMarkerColor = (marker) => {
  switch (String(marker || "").trim()) {
    case "C":
      return "success";
    case "U":
      return "info";
    case "M":
      return "warning";
    default:
      return "default";
  }
};

const getMarkerLabel = (marker) => {
  switch (String(marker || "").trim()) {
    case "C":
      return "WIP";
    case "U":
      return "Reported";
    default:
      return String(marker || "").trim() || "-";
  }
};

const authGet = async (token, path) => {
  return axios.get(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const buildProjectCards = ({
  projects,
  streams,
  tasks,
  progresses,
  manpowers,
  staffs,
  allowedProjectCodes,
  visibleDateSet,
  today,
}) => {
  const allowedSet = new Set(
    (Array.isArray(allowedProjectCodes) ? allowedProjectCodes : [])
      .map((code) => String(code || "").trim())
      .filter(Boolean),
  );

  const activeProjects = projects
    .filter((project) => String(project?.status || "").trim() === "ACTIVE")
    .filter((project) => {
      if (allowedSet.size === 0) return true;
      return allowedSet.has(String(project?.projectCode || "").trim());
    })
    .sort((a, b) =>
      String(a?.projectCode || "").localeCompare(String(b?.projectCode || "")),
    );

  const projectByCode = activeProjects.reduce((acc, project) => {
    const code = String(project?.projectCode || "").trim();
    if (!code) return acc;
    acc[code] = project;
    return acc;
  }, {});

  const streamById = streams.reduce((acc, stream) => {
    const streamId = String(stream?.projectStreamId || "").trim();
    if (!streamId) return acc;
    acc[streamId] = stream;
    return acc;
  }, {});

  const taskById = tasks.reduce((acc, task) => {
    const taskId = String(task?.projectTaskId || "").trim();
    if (!taskId) return acc;
    acc[taskId] = task;
    return acc;
  }, {});

  const staffNameById = staffs.reduce((acc, staff) => {
    const staffId = String(staff?.staffId || "").trim();
    if (!staffId) return acc;
    acc[staffId] = String(staff?.staffName || "").trim();
    return acc;
  }, {});

  const progressByTaskDate = progresses.reduce((acc, row) => {
    const taskId = String(row?.projectTaskId || "").trim();
    const progressDate = String(row?.progressDate || "").trim();
    if (!taskId || !progressDate) return acc;
    const key = `${taskId}__${progressDate}`;
    const previous = acc[key];
    const previousId = Number(previous?.projectTaskProgressId || 0);
    const nextId = Number(row?.projectTaskProgressId || 0);
    if (!previous || nextId >= previousId) {
      acc[key] = row;
    }
    return acc;
  }, {});

  const groupedByProject = activeProjects.reduce((acc, project) => {
    const projectCode = String(project?.projectCode || "").trim();
    acc[projectCode] = new Map();
    return acc;
  }, {});

  const manpowerByTaskDate = manpowers.reduce((acc, row) => {
    const taskId = String(row?.projectTaskId || "").trim();
    const workDate = String(row?.workDate || "").trim();
    const staffId = String(row?.staffId || "").trim();
    if (!taskId || !workDate || !visibleDateSet.has(workDate) || !staffId) {
      return acc;
    }
    const key = `${taskId}__${workDate}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push({
      staffId,
      staffName: staffNameById[staffId],
    });
    return acc;
  }, {});

  Object.values(progressByTaskDate).forEach((progress) => {
    const taskId = String(progress?.projectTaskId || "").trim();
    const progressDate = String(progress?.progressDate || "").trim();
    if (!taskId || !progressDate || !visibleDateSet.has(progressDate)) return;

    const marker = String(progress?.marker || "").trim();
    if (marker === "M") return;

    const task = taskById[taskId];
    if (!task) return;

    const streamId = String(task?.projectStreamId || "").trim();
    const stream = streamById[streamId];
    if (!stream) return;

    const projectCode = String(stream?.projectCode || "").trim();
    const project = projectByCode[projectCode];
    if (!project) return;

    const projectDates = groupedByProject[projectCode];
    if (!projectDates.has(progressDate)) {
      projectDates.set(progressDate, new Map());
    }
    const dateStreams = projectDates.get(progressDate);
    if (!dateStreams.has(streamId)) {
      dateStreams.set(streamId, new Map());
    }
    const streamTasks = dateStreams.get(streamId);

    if (!streamTasks.has(taskId)) {
      const assignedStaff =
        manpowerByTaskDate[`${taskId}__${progressDate}`] || [];
      streamTasks.set(taskId, {
        projectTaskId: taskId,
        taskName: String(task?.taskName || "").trim(),
        taskStatus: String(task?.taskStatus || "").trim(),
        progress: Number.isFinite(Number(progress?.progress))
          ? Number(progress?.progress)
          : Number(task?.progress || 0),
        marker,
        assignedStaff,
      });
    }
  });

  return activeProjects.map((project) => {
    const projectCode = String(project?.projectCode || "").trim();
    const dateMap = groupedByProject[projectCode];
    const dates = Array.from(dateMap.entries())
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([progressDate, streamMap]) => ({
        progressDate,
        isBackdated: progressDate < today,
        streams: Array.from(streamMap.entries())
          .map(([streamId, taskMap]) => {
            const stream = streamById[streamId];
            return {
              streamId,
              streamName: String(stream?.streamName || "").trim(),
              tasks: Array.from(taskMap.values()).sort((a, b) =>
                String(a?.taskName || "").localeCompare(
                  String(b?.taskName || ""),
                ),
              ),
            };
          })
          .sort((a, b) =>
            String(a?.streamName || "").localeCompare(
              String(b?.streamName || ""),
            ),
          ),
      }));

    return {
      projectCode,
      projectName: String(project?.projectName || "").trim(),
      dates,
    };
  });
};

export default function TvProjects() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(
    Number(state.refreshIntervalSeconds || 30),
  );
  const [lastRefreshAt, setLastRefreshAt] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [projectCards, setProjectCards] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [skipTransition, setSkipTransition] = useState(false);
  const currentPageRef = useRef(0);

  const tvAuth = getTvAuthState();
  const token = String(tvAuth.token || "").trim();
  const allowedProjectCodes = useMemo(() => {
    if (Array.isArray(state.projectCodes) && state.projectCodes.length > 0) {
      return state.projectCodes;
    }
    return Array.isArray(tvAuth.projectCodes) ? tvAuth.projectCodes : [];
  }, [state.projectCodes, tvAuth.projectCodes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(TV_AUTOSTART_KEY, "1");
  }, []);

  useEffect(() => {
    if (!token) {
      navigate("/tv/start", { replace: true });
      return;
    }

    if (!state.refreshIntervalSeconds && tvAuth.refreshIntervalSeconds) {
      setRefreshIntervalSeconds(Number(tvAuth.refreshIntervalSeconds || 30));
    }
  }, [
    navigate,
    state.refreshIntervalSeconds,
    token,
    tvAuth.refreshIntervalSeconds,
  ]);

  const refreshProjectBoard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const [
        projectsRes,
        streamsRes,
        tasksRes,
        progressesRes,
        manpowersRes,
        staffsRes,
      ] = await Promise.all([
        authGet(token, "/api/projects"),
        authGet(token, "/api/projectstreams"),
        authGet(token, "/api/projecttasks"),
        authGet(token, "/api/projecttaskprogresses"),
        authGet(token, "/api/projectmanpowers"),
        authGet(token, "/api/staffs"),
      ]);

      const cards = buildProjectCards({
        projects: Array.isArray(projectsRes?.data) ? projectsRes.data : [],
        streams: Array.isArray(streamsRes?.data) ? streamsRes.data : [],
        tasks: Array.isArray(tasksRes?.data) ? tasksRes.data : [],
        progresses: Array.isArray(progressesRes?.data)
          ? progressesRes.data
          : [],
        manpowers: Array.isArray(manpowersRes?.data) ? manpowersRes.data : [],
        staffs: Array.isArray(staffsRes?.data) ? staffsRes.data : [],
        allowedProjectCodes,
        visibleDateSet: buildDateRangeSet(new Date(), 3),
        today: toApiDate(new Date()),
      });

      setProjectCards(cards);
      setLastRefreshAt(new Date());
      setTvAuthState({
        projectCodes: cards.map((card) => card.projectCode),
      });
    } catch (error) {
      if (error?.response?.status === 401) {
        clearTvAuthState();
        navigate("/tv/start", { replace: true });
        return;
      }
      setErrorMsg(t("tv.projects.refreshFailed", "Broken data stream"));
    } finally {
      setLoading(false);
    }
  }, [allowedProjectCodes, navigate, t, token]);

  useEffect(() => {
    if (!token) return;
    refreshProjectBoard();
  }, [refreshProjectBoard, token]);

  const projectScreens = useMemo(() => {
    return projectCards.flatMap((project) => {
      const streamCards = (project?.dates || []).flatMap((dateGroup) =>
        (dateGroup?.streams || []).flatMap((stream) => {
          const streamTasks = Array.isArray(stream?.tasks) ? stream.tasks : [];
          const taskSegments =
            streamTasks.length > 0
              ? chunk(streamTasks, TASKS_PER_STREAM_CARD)
              : [[]];

          return taskSegments.map((taskSegment, segmentIndex) => ({
            progressDate: dateGroup.progressDate,
            isBackdated: Boolean(dateGroup.isBackdated),
            stream: {
              ...stream,
              tasks: taskSegment,
            },
            streamSegmentIndex: segmentIndex,
            streamSegmentCount: taskSegments.length,
          }));
        }),
      );

      const streamPages =
        streamCards.length > 0
          ? chunk(streamCards, STREAMS_PER_PROJECT_SCREEN)
          : [[]];

      return streamPages.map((streamPage, streamPageIndex) => ({
        project,
        streamPage,
        streamPageIndex,
        streamPageCount: streamPages.length,
      }));
    });
  }, [projectCards]);

  useEffect(() => {
    if (!token) return;
    if (projectScreens.length > 1) return undefined;

    const intervalSec = Math.max(5, Number(refreshIntervalSeconds || 30));
    const id = setInterval(() => {
      refreshProjectBoard();
    }, intervalSec * 1000);
    return () => clearInterval(id);
  }, [
    projectScreens.length,
    refreshIntervalSeconds,
    refreshProjectBoard,
    token,
  ]);

  useEffect(() => {
    if (projectScreens.length === 0) {
      setCurrentPage(0);
      currentPageRef.current = 0;
      return;
    }
    setCurrentPage((prev) => {
      const next = Math.min(prev, projectScreens.length - 1);
      currentPageRef.current = next;
      return next;
    });
  }, [projectScreens.length]);

  useEffect(() => {
    if (projectScreens.length <= 1) {
      setCurrentPage(0);
      setSkipTransition(false);
      return undefined;
    }

    const id = setInterval(() => {
      const lastIndex = projectScreens.length - 1;
      const prev = currentPageRef.current;

      if (prev >= lastIndex) {
        refreshProjectBoard();
        setSkipTransition(true);
        currentPageRef.current = 0;
        setCurrentPage(0);
        return;
      }

      const next = prev + 1;
      currentPageRef.current = next;
      setCurrentPage(next);
    }, PAGE_ROTATE_MS);
    return () => clearInterval(id);
  }, [projectScreens.length, refreshProjectBoard]);

  useEffect(() => {
    if (!skipTransition) return undefined;
    const id = setTimeout(() => {
      setSkipTransition(false);
    }, 0);
    return () => clearTimeout(id);
  }, [skipTransition]);

  const todayDateKey = toApiDate(new Date());

  useEffect(() => {
    const docEl = document?.documentElement;
    if (!docEl || document.fullscreenElement) return;
    if (typeof docEl.requestFullscreen !== "function") return;

    docEl.requestFullscreen().catch(() => {
      // Ignore browser restrictions requiring explicit user gesture.
    });
  }, []);

  const handleAbortDisplay = useCallback(() => {
    clearTvAuthState();
    navigate("/tv/start", { replace: true });
  }, [navigate]);

  return (
    <Box
      sx={{
        height: "100dvh",
        width: "100vw",
        p: 0,
        backgroundColor: "background.default",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {errorMsg ? (
        <Alert
          severity="error"
          sx={{
            position: "absolute",
            bottom: 8,
            left: 12,
            zIndex: 2,
            width: "auto",
            maxWidth: "min(40vw, 520px)",
            alignItems: "center",
            boxShadow: 1,
            "& .MuiAlert-message": {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          }}
        >
          {errorMsg}
        </Alert>
      ) : null}

      <Box
        role="button"
        tabIndex={0}
        onClick={handleAbortDisplay}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleAbortDisplay();
          }
        }}
        sx={{
          position: "absolute",
          bottom: 8,
          right: 12,
          zIndex: 2,
          bgcolor: "transparent",
          color: "text.secondary",
          px: 0.75,
          py: 0.25,
          minWidth: 0,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          lineHeight: 1.2,
          cursor: "default",
          font: "inherit",
          textAlign: "left",
          "&:hover": {
            backgroundColor: "transparent",
          },
          "&:focus": {
            outline: "none",
          },
          "&:focus-visible": {
            outline: "none",
          },
        }}
      >
        {loading ? <CircularProgress size={12} /> : null}
        {t("tv.projects.lastRefresh", {
          time: lastRefreshAt.toLocaleString(),
        })}
      </Box>

      <Stack spacing={0} sx={{ height: "100%", pt: 0 }}>
        <Box
          sx={{
            position: "relative",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {loading && projectCards.length === 0 ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={48} />
            </Box>
          ) : projectScreens.length === 0 ? (
            <Alert severity="info">
              {t("tv.projects.noData", "No active project tasks available.")}
            </Alert>
          ) : (
            <Box
              sx={{
                height: "100%",
                width: "100%",
                transform: `translateY(-${currentPage * 100}%)`,
                transition: skipTransition
                  ? "none"
                  : `transform ${PAGE_TRANSITION_MS}ms ease`,
              }}
            >
              {projectScreens.map((screen, pageIndex) => (
                <Box
                  key={`tv-page-${pageIndex}`}
                  sx={{
                    height: "100%",
                    display: "flex",
                    pb: 0,
                  }}
                >
                  <Box
                    key={`${screen.project.projectCode}-${screen.streamPageIndex}`}
                    sx={{
                      height: "100%",
                      width: "100%",
                      border: "0 solid",
                      borderRadius: 0,
                      bgcolor: "background.paper",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Box
                      sx={{
                        px: 2.5,
                        py: 1.75,
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography variant="h5" fontWeight={800}>
                        {`${screen.project.projectCode} - ${screen.project.projectName}`}
                      </Typography>
                      {screen.streamPageCount > 1 ? (
                        <Typography variant="body2" fontWeight={700}>
                          {`${screen.streamPageIndex + 1}/${screen.streamPageCount}`}
                        </Typography>
                      ) : null}
                    </Box>

                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: "hidden",
                        p: 2,
                        backgroundColor: "background.default",
                      }}
                    >
                      {screen.streamPage.length === 0 ? (
                        <Alert severity="info">
                          {t(
                            "tv.projects.noProjectTasks",
                            "No assignments for this project.",
                          )}
                        </Alert>
                      ) : (
                        <Box
                          sx={{
                            height: "100%",
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                            gridTemplateRows: "repeat(2, minmax(0, 1fr))",
                            gap: 1.5,
                          }}
                        >
                          {screen.streamPage.map((streamCard) => (
                            <Box
                              key={`${screen.project.projectCode}-${streamCard.progressDate}-${streamCard.stream.streamId}-${streamCard.streamSegmentIndex}`}
                              sx={{
                                border: "1px solid",
                                borderColor: streamCard.isBackdated
                                  ? "warning.main"
                                  : streamCard.progressDate === todayDateKey
                                    ? "info.main"
                                    : "success.main",
                                borderRadius: 2,
                                overflow: "hidden",
                                bgcolor: "background.paper",
                                minHeight: 0,
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <Box
                                sx={{
                                  px: 2,
                                  py: 0.75,
                                  bgcolor: streamCard.isBackdated
                                    ? "warning.light"
                                    : streamCard.progressDate === todayDateKey
                                      ? "info.light"
                                      : "success.light",
                                  color: streamCard.isBackdated
                                    ? "warning.dark"
                                    : streamCard.progressDate === todayDateKey
                                      ? "info.dark"
                                      : "success.dark",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 1,
                                  flexWrap: "wrap",
                                }}
                              >
                                <Typography variant="h6" fontWeight={800}>
                                  {formatDateLabel(streamCard.progressDate)}
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>
                                  {streamCard.isBackdated
                                    ? t("tv.projects.backdated", "Backdated")
                                    : ""}
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  p: 1,
                                  minHeight: 0,
                                  overflow: "hidden",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 1,
                                }}
                              >
                                <Box
                                  sx={{
                                    borderLeft: "5px solid",
                                    borderColor: "primary.main",
                                    borderRadius: "0 10px 10px 0",
                                    bgcolor: "background.default",
                                    p: 1,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: 1,
                                      mb: 0.75,
                                    }}
                                  >
                                    <Typography
                                      variant="h6"
                                      fontWeight={800}
                                      color="primary.main"
                                    >
                                      {streamCard.stream.streamName}
                                    </Typography>

                                    {streamCard.streamSegmentCount > 1 ? (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        fontWeight={700}
                                      >
                                        {`${streamCard.streamSegmentIndex + 1}/${streamCard.streamSegmentCount}`}
                                      </Typography>
                                    ) : null}
                                  </Box>

                                  <Stack spacing={1}>
                                    {streamCard.stream.tasks.map((task) => (
                                      <Box
                                        key={`${task.projectTaskId}-${streamCard.progressDate}`}
                                        sx={{
                                          border: "1px solid",
                                          borderColor: "divider",
                                          borderRadius: 2,
                                          p: 1,
                                          bgcolor: "background.paper",
                                        }}
                                      >
                                        <Typography
                                          variant="subtitle1"
                                          fontWeight={800}
                                          noWrap
                                          title={task.taskName || ""}
                                          sx={{
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                          }}
                                        >
                                          {task.taskName}
                                        </Typography>

                                        <Box
                                          sx={{
                                            mt: 0.75,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.75,
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          <Chip
                                            size="small"
                                            color={getTaskStatusColor(
                                              task.taskStatus,
                                            )}
                                            label={task.taskStatus || "-"}
                                          />
                                          <Chip
                                            size="small"
                                            variant="outlined"
                                            label={`${Number.isFinite(Number(task.progress)) ? Number(task.progress) : 0}%`}
                                          />
                                          <Chip
                                            size="small"
                                            color={getMarkerColor(task.marker)}
                                            variant="outlined"
                                            label={getMarkerLabel(task.marker)}
                                          />
                                        </Box>

                                        <Divider sx={{ my: 0.75 }} />

                                        <Typography
                                          variant="body2"
                                          fontWeight={700}
                                          sx={{ mb: 0.5 }}
                                        >
                                          {t(
                                            "tv.projects.assignedStaff",
                                            "Assigned Staff",
                                          )}
                                        </Typography>
                                        {task.assignedStaff.length === 0 ? (
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                          >
                                            {t(
                                              "tv.projects.noAssignedStaff",
                                              "No staff assigned.",
                                            )}
                                          </Typography>
                                        ) : (
                                          <Box
                                            sx={{
                                              display: "flex",
                                              flexWrap: "wrap",
                                              gap: 0.75,
                                            }}
                                          >
                                            {Array.from(
                                              new Map(
                                                task.assignedStaff.map(
                                                  (staff) => [
                                                    String(
                                                      staff?.staffId || "",
                                                    ),
                                                    staff,
                                                  ],
                                                ),
                                              ).values(),
                                            ).map((staff) => (
                                              <Chip
                                                key={`${task.projectTaskId}-${staff.staffId}`}
                                                size="small"
                                                variant="outlined"
                                                label={
                                                  staff.staffName ||
                                                  staff.staffId
                                                }
                                              />
                                            ))}
                                          </Box>
                                        )}
                                      </Box>
                                    ))}
                                  </Stack>
                                </Box>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
