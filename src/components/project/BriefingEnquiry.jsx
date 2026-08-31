import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Description as DescriptionIcon,
  Search as SearchIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import { request } from "../../helpers/axios_helper";
import { PageHeader, EmptyState, LoadingState } from "../common";
import HelpDialog from "../common/HelpDialog";

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const toYmd = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeYmd = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return toYmd(parsed);
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
  for (let i = 0; i < count; i += 1) countSet.add((first + i) % 7);
  return countSet;
};

const subtractWorkingDays = (date, days, workingDaySet) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  let count = 0;
  while (count < days) {
    d.setDate(d.getDate() - 1);
    if (workingDaySet.has(d.getDay())) count += 1;
  }
  return d;
};

const isDateInRange = (value, start, end) => {
  const d = normalizeYmd(value);
  if (!d) return false;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
};

const toSessionDateTime = (briefingDate, time) => {
  if (!briefingDate) return null;
  const t = safeString(time);
  const iso = t ? `${briefingDate}T${t}` : `${briefingDate}T00:00:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeRoleName = (value) =>
  safeString(value)
    .toLowerCase()
    .replace(/[_\s-]+/g, "");

const getBriefingState = (session, t) => {
  const start = safeString(session?.startTime);
  const end = safeString(session?.endTime);
  if (end) return t("briefingEnquiry.stateEnded", "Ended");
  if (start) return t("briefingEnquiry.stateInProgress", "In Progress");
  return t("briefingEnquiry.stateNotStarted", "Not Started");
};

const getBriefingStateColor = (session) => {
  const end = safeString(session?.endTime);
  const start = safeString(session?.startTime);
  if (end) return "success";
  if (start) return "warning";
  return "default";
};

export default function BriefingEnquiry() {
  const { t } = useTranslation();

  const [helpOpen, setHelpOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [workingDaySet, setWorkingDaySet] = useState(new Set([1, 2, 3, 4, 5]));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  const [sessions, setSessions] = useState([]);
  const [sessionMembers, setSessionMembers] = useState({});
  const [briefings, setBriefings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [manpowers, setManpowers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [streams, setStreams] = useState([]);
  const [operationStaffs, setOperationStaffs] = useState([]);

  // Load working-day parameters.
  useEffect(() => {
    Promise.all([
      request("GET", "/api/params/workDaysPerWeek", null, {
        skipBackendErrorDialog: true,
      }).catch(() => null),
      request("GET", "/api/params/firstWorkDay", null, {
        skipBackendErrorDialog: true,
      }).catch(() => null),
      request("GET", "/api/params/lastWorkDay", null, {
        skipBackendErrorDialog: true,
      }).catch(() => null),
    ]).then(([wdRes, firstRes, lastRes]) => {
      const wdValue = Number(wdRes?.data?.paramValue ?? wdRes?.data ?? 5);
      const firstValue = Number(
        firstRes?.data?.paramValue ?? firstRes?.data ?? 1,
      );
      const lastValue = Number(lastRes?.data?.paramValue ?? lastRes?.data ?? 5);
      setWorkingDaySet(buildWorkingDaySet(firstValue, lastValue, wdValue));
    });
  }, []);

  // Set default date range to the last 3 working days (today + prior 2).
  useEffect(() => {
    if (!workingDaySet.size) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = subtractWorkingDays(today, 2, workingDaySet);
    setEndDate(toYmd(today));
    setStartDate(toYmd(start));
  }, [workingDaySet]);

  const loadData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const [
        sessionsRes,
        briefingsRes,
        projectsRes,
        staffsRes,
        manpowersRes,
        tasksRes,
        streamsRes,
        operationStaffsRes,
      ] = await Promise.all([
        request("GET", "/api/briefingsessions", null, {
          skipBackendErrorDialog: true,
        }),
        request("GET", "/api/briefings", null, {
          skipBackendErrorDialog: true,
        }),
        request("GET", "/api/projects", null, {
          skipBackendErrorDialog: true,
        }),
        request("GET", "/api/staffs", null, {
          skipBackendErrorDialog: true,
        }),
        request("GET", "/api/projectmanpowers", null, {
          skipBackendErrorDialog: true,
        }),
        request("GET", "/api/projecttasks", null, {
          skipBackendErrorDialog: true,
        }),
        request("GET", "/api/projectstreams", null, {
          skipBackendErrorDialog: true,
        }),
        request("GET", "/api/operationstaffs", null, {
          skipBackendErrorDialog: true,
        }),
      ]);

      const sessionRows = Array.isArray(sessionsRes?.data)
        ? sessionsRes.data
        : [];
      const briefingRows = Array.isArray(briefingsRes?.data)
        ? briefingsRes.data
        : [];
      const projectRows = Array.isArray(projectsRes?.data)
        ? projectsRes.data
        : [];
      const staffRows = Array.isArray(staffsRes?.data) ? staffsRes.data : [];
      const manpowerRows = Array.isArray(manpowersRes?.data)
        ? manpowersRes.data
        : [];
      const taskRows = Array.isArray(tasksRes?.data) ? tasksRes.data : [];
      const streamRows = Array.isArray(streamsRes?.data) ? streamsRes.data : [];
      const operationStaffRows = Array.isArray(operationStaffsRes?.data)
        ? operationStaffsRes.data
        : [];

      setSessions(sessionRows);
      setBriefings(briefingRows);
      setProjects(projectRows);
      setStaffs(staffRows);
      setManpowers(manpowerRows);
      setTasks(taskRows);
      setStreams(streamRows);
      setOperationStaffs(operationStaffRows);

      const inRangeSessions = sessionRows.filter((session) =>
        isDateInRange(session?.briefingDate, startDate, endDate),
      );

      const memberResults = await Promise.all(
        inRangeSessions.map((session) => {
          const sessionId = session?.briefingSessionId ?? session?.id ?? "";
          if (!sessionId) {
            return Promise.resolve({ id: sessionId, members: [] });
          }
          return request(
            "GET",
            `/api/briefingmembers/session/${encodeURIComponent(sessionId)}`,
            null,
            { skipBackendErrorDialog: true },
          )
            .then((res) => ({
              id: sessionId,
              members: Array.isArray(res?.data) ? res.data : [],
            }))
            .catch(() => ({ id: sessionId, members: [] }));
        }),
      );

      const memberMap = {};
      memberResults.forEach((item) => {
        memberMap[item.id] = item.members;
      });
      setSessionMembers(memberMap);
    } catch (error) {
      setErrorMsg(
        error?.message || t("briefingEnquiry.loadFailed", "Load failed."),
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const staffNameMap = useMemo(() => {
    const map = {};
    staffs.forEach((s) => {
      const id = safeString(s?.staffId);
      if (!id) return;
      const name = safeString(
        s?.staffName ||
          [s?.firstName, s?.lastName].filter(Boolean).join(" ") ||
          id,
      );
      map[id] = name;
    });
    return map;
  }, [staffs]);

  const projectMap = useMemo(() => {
    const map = {};
    projects.forEach((p) => {
      const code = safeString(p?.projectCode);
      if (!code) return;
      map[code] = p;
    });
    return map;
  }, [projects]);

  const briefingTitleMap = useMemo(() => {
    const map = {};
    briefings.forEach((b) => {
      const id = safeString(b?.briefingId);
      if (!id) return;
      map[id] = safeString(b?.briefingTitle || b?.title || "");
    });
    return map;
  }, [briefings]);

  const siteLeaderIds = useMemo(() => {
    const set = new Set();
    operationStaffs.forEach((row) => {
      const role = normalizeRoleName(row?.roleName || row?.operationRoleName);
      if (role === "siteleader") {
        const staffId = safeString(row?.staffId);
        if (staffId) set.add(staffId);
      }
    });
    return set;
  }, [operationStaffs]);

  const projectManpowerMap = useMemo(() => {
    const taskById = {};
    tasks.forEach((task) => {
      const id = safeString(task?.projectTaskId);
      if (id) taskById[id] = task;
    });

    const streamById = {};
    streams.forEach((stream) => {
      const id = safeString(stream?.projectStreamId);
      if (id) streamById[id] = stream;
    });

    const resolveProjectCode = (taskId) => {
      const task = taskById[taskId];
      if (!task) return "";
      return (
        safeString(task?.projectCode) ||
        safeString(
          streamById[safeString(task?.projectStreamId)]?.projectCode,
        ) ||
        ""
      );
    };

    const map = {};
    manpowers.forEach((row) => {
      const taskId = safeString(row?.projectTaskId);
      const projectCode =
        safeString(row?.projectCode) || resolveProjectCode(taskId);
      const staffId = safeString(row?.staffId);
      const date = normalizeYmd(row?.manpowerDate || row?.workDate);
      if (!projectCode || !staffId || !date) return;

      if (!map[projectCode]) map[projectCode] = {};
      if (!map[projectCode][date]) map[projectCode][date] = new Set();
      map[projectCode][date].add(staffId);
    });
    return map;
  }, [manpowers, tasks, streams]);

  const sortedSessions = useMemo(() => {
    return sessions
      .filter((session) =>
        isDateInRange(session?.briefingDate, startDate, endDate),
      )
      .map((session) => {
        const dateTime = toSessionDateTime(
          session?.briefingDate,
          session?.startTime,
        );
        return { ...session, _dateTime: dateTime };
      })
      .sort((a, b) => {
        const aTime = a._dateTime ? a._dateTime.getTime() : 0;
        const bTime = b._dateTime ? b._dateTime.getTime() : 0;
        return bTime - aTime;
      });
  }, [sessions, startDate, endDate]);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedSessions;

    return sortedSessions.filter((session) => {
      const projectCode = safeString(session?.projectCode);
      const project = projectMap[projectCode];
      const projectName = safeString(project?.projectName);
      const briefingTitle = safeString(briefingTitleMap[session?.briefingId]);
      const presenterName = safeString(
        staffNameMap[safeString(session?.presenter)],
      );
      const haystack = [
        projectCode,
        projectName,
        briefingTitle,
        presenterName,
        session?.briefingDate,
        session?.startTime,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sortedSessions, search, projectMap, briefingTitleMap, staffNameMap]);

  const buildListeners = useCallback(
    (session) => {
      const presenterId = safeString(session?.presenter);
      const projectCode = safeString(session?.projectCode);
      const briefingDate = normalizeYmd(session?.briefingDate);
      const assignedSet =
        projectCode && briefingDate
          ? projectManpowerMap[projectCode]?.[briefingDate] || new Set()
          : new Set();

      const listenerMap = new Map();

      // Site leaders are included as listeners regardless of attendance.
      siteLeaderIds.forEach((staffId) => {
        if (staffId === presenterId) return;
        listenerMap.set(staffId, {
          staffId,
          isSiteLeader: true,
          isAssignedProject: false,
          attended: false,
          completed: false,
        });
      });

      // Project staff assigned on the briefing date.
      assignedSet.forEach((staffId) => {
        if (staffId === presenterId) return;
        const existing = listenerMap.get(staffId);
        if (existing) {
          existing.isAssignedProject = true;
        } else {
          listenerMap.set(staffId, {
            staffId,
            isSiteLeader: siteLeaderIds.has(staffId),
            isAssignedProject: true,
            attended: false,
            completed: false,
          });
        }
      });

      // People who actually attended the briefing.
      const members =
        sessionMembers[session?.briefingSessionId ?? session?.id] || [];
      members.forEach((member) => {
        const staffId = safeString(
          member?.staffId ?? member?.staffID ?? member?.briefingMemberStaffId,
        );
        if (!staffId || staffId === presenterId) return;
        const existing = listenerMap.get(staffId);
        if (existing) {
          existing.attended = true;
          if (Number(member?.completed) === 1) {
            existing.completed = true;
          }
        } else {
          listenerMap.set(staffId, {
            staffId,
            isSiteLeader: siteLeaderIds.has(staffId),
            isAssignedProject: assignedSet.has(staffId),
            attended: true,
            completed: Number(member?.completed) === 1,
          });
        }
      });

      return Array.from(listenerMap.values()).sort((a, b) => {
        const nameA = staffNameMap[a.staffId] || a.staffId;
        const nameB = staffNameMap[b.staffId] || b.staffId;
        return nameA.localeCompare(nameB);
      });
    },
    [siteLeaderIds, projectManpowerMap, sessionMembers, staffNameMap],
  );

  const formatSessionDateTime = (session) => {
    const dateTime = toSessionDateTime(
      session?.briefingDate,
      session?.startTime,
    );
    if (!dateTime) return `${session?.briefingDate || "-"}`;
    return dateTime.toLocaleString();
  };

  const renderFilters = () => (
    <Box
      sx={{
        mb: 3,
        display: "flex",
        gap: 2,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <TextField
        type="date"
        label={t("briefingEnquiry.startDate", "Start date")}
        value={startDate}
        onChange={(event) => setStartDate(event.target.value)}
        size="small"
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        type="date"
        label={t("briefingEnquiry.endDate", "End date")}
        value={endDate}
        onChange={(event) => setEndDate(event.target.value)}
        size="small"
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t(
          "briefingEnquiry.searchPlaceholder",
          "Search project, briefing, presenter...",
        )}
        size="small"
        sx={{ minWidth: 300 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      {loading && <CircularProgress size={20} />}
    </Box>
  );

  const renderListenerTable = (listeners) => {
    if (listeners.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {t("briefingEnquiry.noListeners", "No listeners to display.")}
        </Typography>
      );
    }

    return (
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderColor: "var(--color-gray-300)" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "background.default" }}>
              <TableCell>
                {t("briefingEnquiry.listenerStaffName", "Staff Name")}
              </TableCell>
              <TableCell align="center">
                {t(
                  "briefingEnquiry.assignedOnDate",
                  "Assigned to Project on Briefing Date",
                )}
              </TableCell>
              <TableCell align="center">
                {t("briefingEnquiry.atBriefing", "At Briefing")}
              </TableCell>
              <TableCell align="center">
                {t("briefingEnquiry.completed", "Completed")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listeners.map((listener) => {
              const assignedText = listener.isAssignedProject
                ? t("briefingEnquiry.yes", "Yes")
                : listener.isSiteLeader
                  ? t("briefingEnquiry.siteLeader", "Site Leader")
                  : "";
              return (
                <TableRow
                  key={listener.staffId}
                  sx={{ "&:hover": { backgroundColor: "action.hover" } }}
                >
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {listener.isSiteLeader && (
                        <StarIcon
                          fontSize="small"
                          sx={{ color: "warning.main" }}
                          titleAccess={t(
                            "briefingEnquiry.siteLeader",
                            "Site Leader",
                          )}
                        />
                      )}
                      <span>
                        {staffNameMap[listener.staffId] ||
                          listener.staffId ||
                          "-"}
                      </span>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    {listener.isAssignedProject ? (
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: "text.primary",
                          mx: "auto",
                        }}
                      />
                    ) : (
                      assignedText
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {listener.attended ? (
                      <CheckIcon
                        sx={{ color: "success.main" }}
                        fontSize="small"
                      />
                    ) : (
                      <CloseIcon
                        sx={{ color: "error.main" }}
                        fontSize="small"
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {listener.completed ? (
                      <CheckIcon
                        sx={{ color: "success.main" }}
                        fontSize="small"
                      />
                    ) : (
                      <CloseIcon
                        sx={{ color: "error.main" }}
                        fontSize="small"
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderSessions = () => {
    if (loading && sessions.length === 0) {
      return (
        <LoadingState message={t("briefingEnquiry.loading", "Loading...")} />
      );
    }

    if (errorMsg) {
      return (
        <Typography color="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Typography>
      );
    }

    if (filteredSessions.length === 0) {
      return (
        <EmptyState
          title={
            search
              ? t(
                  "briefingEnquiry.noSearchResults",
                  "No matching briefing sessions",
                )
              : t("briefingEnquiry.noData", "No briefing sessions")
          }
          description={
            search
              ? t(
                  "briefingEnquiry.noSearchResultsDescription",
                  "Try a different keyword or date range.",
                )
              : t(
                  "briefingEnquiry.noDataDescription",
                  "No briefing sessions were found for the selected period.",
                )
          }
        />
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {filteredSessions.map((session) => {
          const projectCode = safeString(session?.projectCode);
          const project = projectMap[projectCode];
          const listeners = buildListeners(session);
          const stateLabel = getBriefingState(session, t);
          const stateColor = getBriefingStateColor(session);

          return (
            <Card
              key={session?.briefingSessionId ?? session?.id}
              variant="outlined"
              sx={{
                bgcolor: "background.paper",
                boxShadow: 2,
                border: "2px solid var(--color-gray-300)",
                borderRadius: 2,
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: 2,
                    pb: 1.5,
                    borderBottom: "1px solid var(--color-gray-300)",
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {t("briefingEnquiry.reportTitle", "Briefing Report")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("briefingEnquiry.sessionId", "Session ID")}:{" "}
                      {session?.briefingSessionId ?? session?.id ?? "-"}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={stateLabel}
                    color={stateColor}
                    variant="filled"
                  />
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, 1fr)",
                    },
                    mb: 3,
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: "background.default",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {t("briefingEnquiry.project", "Project")}
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {project?.projectName || projectCode || "-"}
                    </Typography>
                    {project?.projectName && (
                      <Typography variant="caption" color="text.secondary">
                        {projectCode}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: "background.default",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {t("briefingEnquiry.briefingContent", "Briefing Content")}
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {briefingTitleMap[session?.briefingId] || "-"}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: "background.default",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {t("briefingEnquiry.presenter", "Presenter")}
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {staffNameMap[safeString(session?.presenter)] ||
                        session?.presenter ||
                        "-"}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: "background.default",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {t("briefingEnquiry.sessionDateTime", "Date / Time")}
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatSessionDateTime(session)}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t("briefingEnquiry.listenerList", "Listener List")}
                  </Typography>
                  <Chip
                    size="small"
                    label={t(
                      "briefingEnquiry.listeners",
                      "Listeners: {{count}}",
                      { count: listeners.length },
                    )}
                    color="primary"
                    variant="outlined"
                  />
                </Box>

                {renderListenerTable(listeners)}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  };

  return (
    <Box>
      <PageHeader
        title={t("briefingEnquiry.title", "Briefing Enquiry")}
        subtitle={t(
          "briefingEnquiry.subtitle",
          "Review briefing sessions and listener attendance",
        )}
        icon={DescriptionIcon}
        onHelpClick={() => setHelpOpen(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("briefingEnquiry.helpTitle", "Briefing Enquiry Help")}
        content={t(
          "briefingEnquiry.helpBody",
          "Select a date range to list briefing sessions. Each session shows the project, briefing content, presenter, date and time, and the listener list. Listeners include site leaders and project staff assigned on the briefing date, plus anyone who attended. The presenter is excluded from the listener list.",
        )}
      />

      {renderFilters()}
      {renderSessions()}
    </Box>
  );
}
