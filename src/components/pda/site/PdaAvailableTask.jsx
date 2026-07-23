/**
 * PdaAvailableTask
 *
 * Allows a SiteLeader to:
 *   1. Select a work date (next working day by default) and a project
 *   2. View tasks for that project (ongoing first, then by start date)
 *   3. Mark a task for the selected date → upsert projecttaskprogress with marker="M"
 *   4. Manage manpower for that task / date → save manpower → update marker to "C"
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import GroupsIcon from "@mui/icons-material/Groups";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { request } from "../../../helpers/axios_helper";

// ─── Helpers ────────────────────────────────────────────────────────────────

const toApiDate = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const buildWorkingDaySet = (firstWorkDay, lastWorkDay, workDaysPerWeek) => {
  const normalize = (v) => {
    const n = Number(v);
    if (n >= 0 && n <= 6) return n;
    if (n >= 1 && n <= 7) return n % 7;
    return null;
  };
  const first = normalize(firstWorkDay) ?? 1;
  const last = normalize(lastWorkDay) ?? 5;
  const count = Math.max(1, Math.min(7, Number(workDaysPerWeek) || 5));
  const set = new Set();
  let cur = first;
  set.add(cur);
  while (cur !== last && set.size < 7) {
    cur = (cur + 1) % 7;
    set.add(cur);
  }
  if (set.size === count) return set;
  const countSet = new Set();
  for (let i = 0; i < count; i++) countSet.add((first + i) % 7);
  return countSet;
};

const isWorkday = (date, workingDaySet) =>
  workingDaySet.has(
    date instanceof Date ? date.getDay() : new Date(date).getDay(),
  );

const nextWorkDate = (from, workingDaySet) => {
  let d = addDays(from, 1);
  for (let i = 0; i < 14; i++) {
    if (isWorkday(d, workingDaySet)) return d;
    d = addDays(d, 1);
  }
  return d;
};

const taskSortKey = (task) => {
  const status = String(task?.taskStatus || "").trim();
  if (status === "In Progress") return 0;
  return 1;
};

const STATUS_COLOR = (status) => {
  switch (String(status || "").trim()) {
    case "In Progress":
      return "warning";
    case "Completed":
      return "success";
    case "Not Started":
      return "default";
    default:
      return "default";
  }
};

const getStatusSensitiveTaskDates = (task) => {
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

const isDateOutsideStatusSensitiveRange = (targetDate, startDate, endDate) => {
  const target = parseDate(targetDate);
  if (!target) return false;
  target.setHours(0, 0, 0, 0);

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(0, 0, 0, 0);

  if (start && target < start) return true;
  if (end && target > end) return true;
  return false;
};

// ─── TaskSections sub-component ─────────────────────────────────────────────

const SECTION_DEFS = [
  {
    key: "inProgress",
    filter: (task) => String(task?.taskStatus || "").trim() === "In Progress",
    labelKey: "pdaAvailableTask.sectionInProgress",
    labelDefault: "In Progress",
    color: "warning", // softer than red
  },
  {
    key: "backDated",
    filter: (task, today) => {
      const status = String(task?.taskStatus || "").trim();
      if (status === "In Progress" || status === "Completed") return false;
      const start = parseDate(task?.taskStartDate);
      return start !== null && start < today;
    },
    labelKey: "pdaAvailableTask.sectionBackDated",
    labelDefault: "Back Dated",
    color: "info",
  },
  {
    key: "future",
    filter: (task, today) => {
      const status = String(task?.taskStatus || "").trim();
      if (status === "In Progress" || status === "Completed") return false;
      const start = parseDate(task?.taskStartDate);
      return start !== null && start >= today;
    },
    labelKey: "pdaAvailableTask.sectionFuture",
    labelDefault: "Future",
    color: "primary", // theme primary
  },
];

const SECTION_BG = {
  warning: "warning.light",
  error: "error.light",
  info: "info.light",
  primary: "primary.light",
};
const SECTION_HEADER = {
  warning: "warning.main",
  error: "error.main",
  info: "info.main",
  primary: "primary.main",
};
const SECTION_TEXT = {
  warning: "warning.dark",
  error: "error.dark",
  info: "info.dark",
  primary: "primary.dark",
};
const STREAM_BG = {
  warning: "warning.light",
  error: "error.lighter",
  info: "info.lighter",
  primary: "primary.lighter",
};

function TaskCard({ task, progress, onMark, onManpower, onConfirm }) {
  const marker = progress?.marker;
  const isMarked = marker === "M";
  const isConfirmed = marker === "C";
  const { startDate: displayStartDate, endDate: displayEndDate } =
    getStatusSensitiveTaskDates(task);

  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: "background.paper",
        borderRadius: 1,
        mb: 0.75,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        px: 1.25,
        py: 1,
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, textAlign: "left", mr: 1 }}>
        <Typography variant="body2" fontWeight={600} sx={{ textAlign: "left" }}>
          {task.taskName}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ textAlign: "left" }}
        >
          {displayStartDate || "?"} – {displayEndDate || "?"}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {(isMarked || isConfirmed) && (
          <IconButton
            size="small"
            color={isConfirmed ? "default" : "primary"}
            onClick={(e) => {
              e.stopPropagation();
              onManpower(task);
            }}
          >
            <GroupsIcon fontSize="small" />
          </IconButton>
        )}
        {isMarked && (
          <IconButton
            size="small"
            color="success"
            onClick={(e) => {
              e.stopPropagation();
              onConfirm(task);
            }}
            title={"Confirm task"}
          >
            <PlayCircleOutlineIcon fontSize="small" />
          </IconButton>
        )}
        {!isConfirmed ? (
          <IconButton
            size="small"
            onClick={() =>
              isMarked ? onMark(task, true) : onMark(task, false)
            }
            title={isMarked ? "Unmark" : "Mark"}
          >
            {isMarked ? (
              <ReplayIcon fontSize="small" color="warning" />
            ) : (
              <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
            )}
          </IconButton>
        ) : (
          <CheckCircleOutlineIcon
            fontSize="small"
            color="success"
            sx={{ mx: 1 }}
          />
        )}
      </Box>
    </Box>
  );
}

function TaskSections({
  tasks,
  streams,
  progressByTask,
  handleMarkTask,
  handleUnmarkTask,
  openManpower,
  handleConfirmTask,
  t,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streamMap = {};
  streams.forEach((s) => {
    streamMap[String(s.projectStreamId)] = s;
  });

  const byStreamStartDate = (a, b) => {
    const sa =
      parseDate(
        streamMap[String(a)]?.streamStartDate ||
          streamMap[String(a)]?.startDate,
      )?.getTime() ?? 0;
    const sb =
      parseDate(
        streamMap[String(b)]?.streamStartDate ||
          streamMap[String(b)]?.startDate,
      )?.getTime() ?? 0;
    return sa - sb;
  };

  return (
    <Box>
      {SECTION_DEFS.map((section) => {
        const sectionTasks = tasks.filter((task) =>
          section.filter(task, today),
        );
        if (sectionTasks.length === 0) return null;

        // Group by stream, order streams by start date
        const streamGroups = {};
        sectionTasks.forEach((task) => {
          const sid = String(task._streamId || "");
          if (!streamGroups[sid]) streamGroups[sid] = [];
          streamGroups[sid].push(task);
        });
        const streamIds = Object.keys(streamGroups).sort(byStreamStartDate);
        streamIds.forEach((sid) => {
          streamGroups[sid].sort((a, b) => {
            const sa = parseDate(a.taskStartDate)?.getTime() ?? 0;
            const sb = parseDate(b.taskStartDate)?.getTime() ?? 0;
            return sa - sb;
          });
        });

        return (
          <Box key={section.key} sx={{ mb: 2 }}>
            {/* Section header */}
            <Box
              sx={{
                bgcolor: SECTION_HEADER[section.color],
                color: "common.white",
                px: 2,
                py: 1.25,
                borderRadius: "8px 8px 0 0",
                fontWeight: 700,
                fontSize: "1rem",
                letterSpacing: "0.3px",
              }}
            >
              {t(section.labelKey, section.labelDefault)}
            </Box>

            {/* Streams */}
            <Box
              sx={{
                bgcolor: `${SECTION_BG[section.color]}`,
                borderRadius: "0 0 8px 8px",
                px: 1.5,
                pb: 1.5,
                pt: 0.75,
                opacity: 0.97,
              }}
            >
              {streamIds.map((sid) => {
                const stream = streamMap[sid];
                const streamName = stream?.streamName || `Stream ${sid}`;
                const streamProjectCode = String(
                  stream?.projectCode ||
                    streamGroups[sid]?.[0]?.projectCode ||
                    "",
                ).trim();
                const displayStreamLabel = streamProjectCode
                  ? `${streamProjectCode} - ${streamName}`
                  : streamName;
                return (
                  <Box
                    key={sid}
                    sx={{
                      display: "block",
                      bgcolor: "rgba(255,255,255,0.55)",
                      borderLeft: "4px solid",
                      borderColor: SECTION_HEADER[section.color],
                      borderRadius: "0 6px 6px 0",
                      px: 1.5,
                      pt: 0.75,
                      pb: 0.5,
                      mb: 1.25,
                    }}
                  >
                    <Box
                      sx={{
                        display: "block",
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: SECTION_HEADER[section.color],
                        mb: 0.75,
                        lineHeight: 1.5,
                      }}
                    >
                      {displayStreamLabel}
                    </Box>
                    {streamGroups[sid].map((task) => (
                      <TaskCard
                        key={task.projectTaskId}
                        task={task}
                        progress={progressByTask[task.projectTaskId]}
                        onMark={(t, unmark) =>
                          unmark ? handleUnmarkTask(t) : handleMarkTask(t)
                        }
                        onManpower={openManpower}
                        onConfirm={handleConfirmTask}
                      />
                    ))}
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PdaAvailableTask() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Work date config from params
  const [workingDaySet, setWorkingDaySet] = useState(new Set([1, 2, 3, 4, 5]));
  const [selectedDate, setSelectedDate] = useState("");
  const [dateOptions, setDateOptions] = useState([]);

  // Project & task state
  const [projects, setProjects] = useState([]);
  const [selectedProjectCode, setSelectedProjectCode] = useState("");
  const [tasks, setTasks] = useState([]);
  const [streams, setStreams] = useState([]);
  const [progressByTask, setProgressByTask] = useState({});
  const [tasksLoading, setTasksLoading] = useState(false);

  // Global loading / error
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Manpower panel
  const [manpowerOpen, setManpowerOpen] = useState(false);
  const [manpowerViewOnly, setManpowerViewOnly] = useState(false);
  const [manpowerTask, setManpowerTask] = useState(null);
  const [manpowerRows, setManpowerRows] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [manpowerLoading, setManpowerLoading] = useState(false);
  const [manpowerError, setManpowerError] = useState("");
  const [manpowerDraft, setManpowerDraft] = useState({
    staffId: "",
    role: "worker",
    loading: "1",
  });
  const [manpowerSaving, setManpowerSaving] = useState(false);

  // Get current staff from pda_user_info
  const currentStaffId = useMemo(() => {
    try {
      const info = JSON.parse(localStorage.getItem("pda_user_info") || "{}");
      return String(info.staffId || info.mobileNumber || "");
    } catch {
      return "";
    }
  }, []);

  // ── Check SiteLeader role ──────────────────────────────────────────────────
  const [hasRole, setHasRole] = useState(null); // null = loading

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

  // ── Load work day params + projects ───────────────────────────────────────
  useEffect(() => {
    if (hasRole !== true) return;
    setLoading(true);
    Promise.all([
      request("GET", "/api/params/workDaysPerWeek").catch(() => null),
      request("GET", "/api/params/firstWorkDay").catch(() => null),
      request("GET", "/api/params/lastWorkDay").catch(() => null),
      request("GET", "/api/projects").catch(() => ({ data: [] })),
    ])
      .then(([wdRes, fdRes, ldRes, projRes]) => {
        const wds = buildWorkingDaySet(
          fdRes?.data?.value ?? 1,
          ldRes?.data?.value ?? 5,
          wdRes?.data?.value ?? 5,
        );
        setWorkingDaySet(wds);

        // Build date options: next workday first (default), then non-workdays
        // that fall between today and the next workday
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nwd = nextWorkDate(today, wds);
        const options = [{ date: nwd, label: toApiDate(nwd), isWorkday: true }];
        // Add any non-workdays strictly between today and next workday
        let d = addDays(today, 1);
        while (d.getTime() < nwd.getTime()) {
          if (!isWorkday(d, wds)) {
            options.push({
              date: new Date(d),
              label: toApiDate(d),
              isWorkday: false,
            });
          }
          d = addDays(d, 1);
        }
        setDateOptions(options);
        setSelectedDate(toApiDate(nwd));

        const allProjects = Array.isArray(projRes?.data) ? projRes.data : [];
        setProjects(allProjects);
        if (allProjects.length > 0) {
          setSelectedProjectCode(String(allProjects[0].projectCode || ""));
        }
      })
      .catch(() =>
        setErrorMsg(
          t("pdaAvailableTask.loadFailed", "Failed to load configuration."),
        ),
      )
      .finally(() => setLoading(false));
  }, [hasRole, t]);

  // ── Load tasks for selected project ───────────────────────────────────────
  const loadTasksForProject = useCallback(
    async (projectCode, workDate) => {
      if (!projectCode || !workDate) {
        setTasks([]);
        setStreams([]);
        return;
      }
      setTasksLoading(true);
      setTasks([]);
      setStreams([]);
      setProgressByTask({});
      try {
        const streamsRes = await request(
          "GET",
          `/api/projectstreams/project/${encodeURIComponent(projectCode)}`,
        );
        const loadedStreams = Array.isArray(streamsRes?.data)
          ? streamsRes.data
          : [];
        setStreams(loadedStreams);

        const taskChunks = await Promise.all(
          loadedStreams.map((s) =>
            request("GET", `/api/projecttasks/stream/${s.projectStreamId}`)
              .then((r) =>
                (Array.isArray(r?.data) ? r.data : []).map((t) => ({
                  ...t,
                  _streamId: s.projectStreamId,
                })),
              )
              .catch(() => []),
          ),
        );
        const allTasks = taskChunks.flat();

        // Keep In Progress + backdated (overdue not-started) + future (starts within 7 days)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const horizon = addDays(today, 7);
        const relevant = allTasks.filter((task) => {
          const status = String(task?.taskStatus || "").trim();
          if (status === "Completed" || status === "Cancelled") return false;
          if (status === "In Progress") return true;
          const start = parseDate(task?.taskStartDate);
          if (!start) return false;
          return start <= horizon; // covers backdated + future within 7 days
        });

        setTasks(relevant);

        const progressResults = await Promise.all(
          relevant.map((task) =>
            request(
              "GET",
              `/api/projecttaskprogresses?projectTaskId=${task.projectTaskId}&progressDate=${encodeURIComponent(workDate)}`,
            )
              .then((r) => {
                const rows = Array.isArray(r?.data) ? r.data : [];
                return { id: task.projectTaskId, row: rows[0] || null };
              })
              .catch(() => ({ id: task.projectTaskId, row: null })),
          ),
        );
        const progressMap = {};
        progressResults.forEach(({ id, row }) => {
          progressMap[id] = row;
        });
        setProgressByTask(progressMap);
      } catch {
        setErrorMsg(
          t("pdaAvailableTask.taskLoadFailed", "Failed to load tasks."),
        );
      } finally {
        setTasksLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (selectedProjectCode && selectedDate) {
      loadTasksForProject(selectedProjectCode, selectedDate);
    }
  }, [selectedProjectCode, selectedDate, loadTasksForProject]);

  // ── Mark task (marker = "M") ───────────────────────────────────────────────
  const handleMarkTask = async (task) => {
    const existing = progressByTask[task.projectTaskId];
    const taskProgress = Number(task?.progress);
    const syncedProgress = Number.isFinite(taskProgress) ? taskProgress : 0;
    try {
      const allProgressRes = await request(
        "GET",
        `/api/projecttaskprogresses?projectTaskId=${task.projectTaskId}`,
      );
      const allProgressRows = Array.isArray(allProgressRes?.data)
        ? allProgressRes.data
        : [];
      const hasPriorUnreported = allProgressRows.some((row) => {
        const marker = String(row?.marker || "").trim();
        return marker !== "U";
      });
      if (hasPriorUnreported) {
        setErrorMsg("Prior progress not reported, cannot assign this task");
        return;
      }

      let saved;
      if (existing?.projectTaskProgressId) {
        const res = await request(
          "PUT",
          `/api/projecttaskprogresses/${existing.projectTaskProgressId}`,
          {
            ...existing,
            marker: "M",
            progressDate: selectedDate,
            executedBy: currentStaffId,
            progress: syncedProgress,
          },
        );
        const payload = res?.data || {};
        saved = payload?.projectTaskProgress || payload;
      } else {
        const res = await request("POST", "/api/projecttaskprogresses", {
          projectTaskId: task.projectTaskId,
          progressDate: selectedDate,
          executedBy: currentStaffId,
          marker: "M",
          progress: syncedProgress,
        });
        const payload = res?.data || {};
        saved = payload?.projectTaskProgress || payload;
      }
      setProgressByTask((prev) => ({ ...prev, [task.projectTaskId]: saved }));
      // Open manpower panel
      openManpower(task);
    } catch {
      setErrorMsg(t("pdaAvailableTask.markFailed", "Failed to mark task."));
    }
  };

  // ── Confirm task (marker → "C") ─────────────────────────────────────────────
  const handleConfirmTask = async (task) => {
    const existing = progressByTask[task.projectTaskId];
    if (!existing?.projectTaskProgressId) return;
    try {
      const res = await request(
        "PUT",
        `/api/projecttaskprogresses/${existing.projectTaskProgressId}`,
        {
          ...existing,
          marker: "C",
        },
      );
      const payload = res?.data || {};
      const updatedProgress = payload?.projectTaskProgress || payload;
      const updatedTask = payload?.projectTask || null;

      setProgressByTask((prev) => ({
        ...prev,
        [task.projectTaskId]: updatedProgress || { ...existing, marker: "C" },
      }));
      if (updatedTask?.projectTaskId) {
        setTasks((prev) =>
          prev.map((t) =>
            String(t.projectTaskId) === String(updatedTask.projectTaskId)
              ? { ...t, ...updatedTask }
              : t,
          ),
        );
      }
    } catch {
      setErrorMsg(t("pdaAvailableTask.markFailed", "Failed to confirm task."));
    }
  };

  // ── Unmark task ─────────────────────────────────────────────────────────────
  const handleUnmarkTask = async (task) => {
    const existing = progressByTask[task.projectTaskId];
    if (!existing?.projectTaskProgressId) return;
    try {
      await request(
        "DELETE",
        `/api/projecttaskprogresses/${existing.projectTaskProgressId}`,
      );

      const { startDate, endDate } = getStatusSensitiveTaskDates(task);
      const shouldRemoveManpowerBlock = isDateOutsideStatusSensitiveRange(
        selectedDate,
        startDate,
        endDate,
      );

      if (shouldRemoveManpowerBlock) {
        const manpowerRes = await request(
          "GET",
          `/api/projectmanpowers/task/${task.projectTaskId}`,
        );
        const rows = Array.isArray(manpowerRes?.data) ? manpowerRes.data : [];
        const rowsForDate = rows.filter(
          (row) =>
            row?.manpowerDate === selectedDate ||
            row?.workDate === selectedDate,
        );

        await Promise.all(
          rowsForDate
            .filter((row) => row?.projectManpowerId)
            .map((row) =>
              request(
                "DELETE",
                `/api/projectmanpowers/${row.projectManpowerId}`,
              ),
            ),
        );
      }

      setProgressByTask((prev) => ({
        ...prev,
        [task.projectTaskId]: null,
      }));
    } catch {
      setErrorMsg(t("pdaAvailableTask.markFailed", "Failed to update task."));
    }
  };

  // ── Manpower panel ─────────────────────────────────────────────────────────
  const openManpower = async (task) => {
    const progress = progressByTask[task.projectTaskId];
    setManpowerViewOnly(progress?.marker === "C");
    setManpowerTask(task);
    setManpowerOpen(true);
    setManpowerError("");
    setManpowerRows([]);
    setManpowerLoading(true);
    try {
      const [staffRes, manpowerRes, staffSkillsRes, projectSkillsRes] =
        await Promise.all([
          request("GET", "/api/staffs").catch(() => ({ data: [] })),
          request(
            "GET",
            `/api/projectmanpowers/task/${task.projectTaskId}`,
          ).catch(() => ({ data: [] })),
          request("GET", "/api/staffskills").catch(() => ({ data: [] })),
          request("GET", `/api/projectskills/task/${task.projectTaskId}`).catch(
            () => ({ data: [] }),
          ),
        ]);
      setStaffOptions(Array.isArray(staffRes?.data) ? staffRes.data : []);
      const manpowers = Array.isArray(manpowerRes?.data)
        ? manpowerRes.data
        : [];
      const staffSkills = Array.isArray(staffSkillsRes?.data)
        ? staffSkillsRes.data
        : [];
      const projectSkills = Array.isArray(projectSkillsRes?.data)
        ? projectSkillsRes.data
        : [];

      // staffSkillId → skillName
      const staffSkillNameById = {};
      staffSkills.forEach((ss) => {
        if (ss?.staffSkillId && ss?.skillName)
          staffSkillNameById[String(ss.staffSkillId)] = ss.skillName;
      });
      // projectSkillId → skillName  (via projectSkill.skillId → staffSkill.skillName)
      const skillNameById = {};
      projectSkills.forEach((ps) => {
        if (ps?.projectSkillId && ps?.skillId)
          skillNameById[String(ps.projectSkillId)] =
            staffSkillNameById[String(ps.skillId)] || String(ps.skillId);
      });

      // Backend cron pre-creates slots for each work date. Use exact date match.
      let slots = manpowers
        .filter(
          (m) => m.manpowerDate === selectedDate || m.workDate === selectedDate,
        )
        .map((m) => ({
          _tempId: String(m.projectManpowerId), // PUT — cron created these
          projectTaskId: task.projectTaskId,
          projectSkillId: m.projectSkillId || null,
          skillName:
            skillNameById[String(m.projectSkillId || "")] ||
            String(m.projectSkillId || "-"),
          staffId: m.staffId || "",
          role: m.role || "worker",
          loading: m.loading ?? 1,
          manpowerDate: selectedDate,
        }));

      // No slots for this date — auto-copy from nearest planned date (early start)
      if (slots.length === 0 && manpowers.length > 0) {
        // Find the nearest date with planned slots (closest to selectedDate)
        const dateSet = new Set(
          manpowers.map((m) => m.manpowerDate || m.workDate).filter(Boolean),
        );
        const selectedMs = new Date(selectedDate).getTime();
        const nearestDate = [...dateSet].reduce((best, d) => {
          const diff = Math.abs(new Date(d).getTime() - selectedMs);
          const bestDiff = best
            ? Math.abs(new Date(best).getTime() - selectedMs)
            : Infinity;
          return diff < bestDiff ? d : best;
        }, null);

        if (nearestDate) {
          const template = manpowers.filter(
            (m) => m.manpowerDate === nearestDate || m.workDate === nearestDate,
          );
          // POST copies for selectedDate
          const posted = await Promise.all(
            template.map((m) =>
              request("POST", "/api/projectmanpowers", {
                projectTaskId: task.projectTaskId,
                projectSkillId: m.projectSkillId || null,
                staffId: m.staffId || null,
                role: m.role || "worker",
                loading: m.loading ?? 1,
                manpowerDate: selectedDate,
                workDate: selectedDate,
                manpowerTouched: 0,
              }),
            ),
          );
          // Use the newly created records as PUT targets
          slots = posted.map((res, idx) => {
            const created = res?.data || {};
            const src = template[idx];
            return {
              _tempId: String(
                created.projectManpowerId || `new-fallback-${idx}`,
              ),
              projectTaskId: task.projectTaskId,
              projectSkillId: src.projectSkillId || null,
              skillName:
                skillNameById[String(src.projectSkillId || "")] ||
                String(src.projectSkillId || "-"),
              staffId: src.staffId || "",
              role: src.role || "worker",
              loading: src.loading ?? 1,
              manpowerDate: selectedDate,
            };
          });
        }
      }

      setManpowerRows(slots);
    } catch {
      setManpowerError(
        t("pdaAvailableTask.manpowerLoadFailed", "Failed to load manpower."),
      );
    } finally {
      setManpowerLoading(false);
    }
  };

  // Inline update of a slot's staffId
  const handleUpdateSlotStaff = (tempId, staffId) => {
    setManpowerRows((prev) =>
      prev.map((r) => (r._tempId === tempId ? { ...r, staffId } : r)),
    );
  };

  // Inline update of a slot's loading
  const handleUpdateSlotLoading = (tempId, value) => {
    const clamped = Math.min(1, Math.max(0.1, parseFloat(value) || 0.1));
    setManpowerRows((prev) =>
      prev.map((r) => (r._tempId === tempId ? { ...r, loading: clamped } : r)),
    );
  };

  const allSlotsFilled =
    manpowerRows.length > 0 &&
    manpowerRows.every((r) => String(r.staffId || "").trim());

  const handleAddManpower = () => {
    if (!manpowerDraft.staffId || allSlotsFilled) return;
    setManpowerRows((prev) => [
      ...prev,
      {
        _tempId: `new-${Date.now()}`,
        projectTaskId: manpowerTask?.projectTaskId,
        staffId: manpowerDraft.staffId,
        role: manpowerDraft.role,
        loading: manpowerDraft.loading,
        manpowerDate: selectedDate,
      },
    ]);
    setManpowerDraft({ staffId: "", role: "worker", loading: "1" });
  };

  const handleRemoveManpower = (tempId) => {
    setManpowerRows((prev) => prev.filter((r) => r._tempId !== tempId));
  };

  const handleSaveManpower = async () => {
    if (!manpowerTask) return;
    setManpowerSaving(true);
    setManpowerError("");
    try {
      // PUT all rows (all have real projectManpowerId from cron or auto-copy)
      const putRows = manpowerRows.filter(
        (r) => !String(r._tempId).startsWith("new-"),
      );
      await Promise.all(
        putRows.map((r) =>
          request("PUT", `/api/projectmanpowers/${r._tempId}`, {
            ...r,
            staffId: r.staffId || null,
            loading: Number(r.loading) || 1,
            manpowerDate: selectedDate,
            workDate: selectedDate,
            manpowerTouched: String(r.staffId || "").trim() ? 1 : 0,
            _tempId: undefined,
            _usedBy: undefined,
          }),
        ),
      );

      setManpowerOpen(false);
      setManpowerTask(null);
    } catch {
      setManpowerError(
        t("pdaAvailableTask.manpowerSaveFailed", "Failed to save manpower."),
      );
    } finally {
      setManpowerSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

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
          "pdaAvailableTask.noAccess",
          "This function is only available to Site Leaders.",
        )}
      </Alert>
    );
  }

  return (
    <Box>
      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg("")}>
          {errorMsg}
        </Alert>
      ) : null}

      {/* Date selector */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>{t("pdaAvailableTask.workDate", "Work Date")}</InputLabel>
        <Select
          value={selectedDate}
          label={t("pdaAvailableTask.workDate", "Work Date")}
          onChange={(e) => setSelectedDate(e.target.value)}
        >
          {dateOptions.map((opt) => (
            <MenuItem key={opt.label} value={opt.label}>
              {opt.label}
              {!opt.isWorkday ? (
                <Chip
                  size="small"
                  label={t("pdaAvailableTask.nonWorkday", "Non-workday")}
                  sx={{ ml: 1 }}
                />
              ) : null}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Project selector */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>
          {t("pdaAvailableTask.selectProject", "Project")}
        </InputLabel>
        <Select
          value={selectedProjectCode}
          label={t("pdaAvailableTask.selectProject", "Project")}
          onChange={(e) => setSelectedProjectCode(e.target.value)}
        >
          {projects.map((p) => (
            <MenuItem key={p.projectCode} value={p.projectCode}>
              {p.projectName || p.projectCode}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Task list */}
      {tasksLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : selectedProjectCode && tasks.length === 0 ? (
        <Alert severity="info">
          {t(
            "pdaAvailableTask.noTasks",
            "No active tasks found for this project.",
          )}
        </Alert>
      ) : (
        <TaskSections
          tasks={tasks}
          streams={streams}
          progressByTask={progressByTask}
          handleMarkTask={handleMarkTask}
          handleUnmarkTask={handleUnmarkTask}
          openManpower={openManpower}
          handleConfirmTask={handleConfirmTask}
          t={t}
        />
      )}

      {/* Manpower dialog — styled to match workbench ManpowerPlanningDialog */}
      <Dialog
        open={manpowerOpen}
        onClose={() => setManpowerOpen(false)}
        fullWidth
        maxWidth="sm"
      >
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
              {t("projectPlanning.manpowerWorkspace", "Manpower Workspace")}
              {" — "}
              {manpowerTask?.taskName || "-"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedDate}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {manpowerError ? (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {manpowerError}
            </Alert>
          ) : null}
          {manpowerLoading ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              {/* One card per assignment slot */}
              {manpowerRows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t(
                    "projectPlanning.noManpowerSelected",
                    "No staff assigned yet.",
                  )}
                </Typography>
              ) : (
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                >
                  {manpowerRows.map((row, idx) => (
                    <Box
                      key={row._tempId}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        p: 1.5,
                        bgcolor: "background.paper",
                        boxShadow: 1,
                      }}
                    >
                      {/* Slot number + skill name */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            borderRadius: "50%",
                            width: 22,
                            height: 22,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </Typography>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {row.skillName || "-"}
                        </Typography>
                      </Box>

                      {/* Staff field */}
                      {manpowerViewOnly ? (
                        <Tooltip
                          title={row.role || "worker"}
                          arrow
                          placement="top"
                        >
                          <TextField
                            label={t("pdaAvailableTask.staff", "Staff")}
                            value={
                              staffOptions.find(
                                (s) =>
                                  String(s.staffId) === String(row.staffId),
                              )?.staffName || "—"
                            }
                            size="small"
                            fullWidth
                            InputProps={{ readOnly: true }}
                            sx={{ mb: 1.5 }}
                          />
                        </Tooltip>
                      ) : (
                        <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
                          <InputLabel>
                            {t("pdaAvailableTask.staff", "Staff")}
                          </InputLabel>
                          <Select
                            value={String(row.staffId || "")}
                            label={t("pdaAvailableTask.staff", "Staff")}
                            onChange={(e) =>
                              handleUpdateSlotStaff(row._tempId, e.target.value)
                            }
                          >
                            <MenuItem value="">
                              <em>—</em>
                            </MenuItem>
                            {staffOptions
                              .filter((s) => {
                                const sid = String(s.staffId);
                                // Always show the currently selected value; hide staff picked in other slots
                                if (sid === String(row.staffId || ""))
                                  return true;
                                return !manpowerRows.some(
                                  (other) =>
                                    other._tempId !== row._tempId &&
                                    String(other.staffId || "") === sid,
                                );
                              })
                              .map((s) => (
                                <MenuItem
                                  key={s.staffId}
                                  value={String(s.staffId)}
                                >
                                  {s.staffName}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                      )}

                      {/* Loading field */}
                      <TextField
                        label={t("pdaAvailableTask.loading", "Loading")}
                        type="number"
                        size="small"
                        fullWidth
                        value={row.loading}
                        onChange={(e) =>
                          handleUpdateSlotLoading(row._tempId, e.target.value)
                        }
                        inputProps={{ min: 0.1, max: 1, step: 0.1 }}
                        InputProps={{ readOnly: manpowerViewOnly }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setManpowerOpen(false)}
            disabled={manpowerSaving}
          >
            {t("basic.cancel", "Cancel")}
          </Button>
          {!manpowerViewOnly && (
            <Button
              variant="contained"
              onClick={handleSaveManpower}
              disabled={manpowerSaving || manpowerLoading}
              startIcon={
                manpowerSaving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : null
              }
            >
              {t("basic.save", "Save")}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
