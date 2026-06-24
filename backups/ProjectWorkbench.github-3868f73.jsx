import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
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
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SettingsIcon from "@mui/icons-material/Settings";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove";
import EditIcon from "@mui/icons-material/Edit";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import AnchorIcon from "@mui/icons-material/Anchor";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AllInboxOutlinedIcon from "@mui/icons-material/AllInboxOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { request } from "../../helpers/axios_helper";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const COL_WIDTH = { day: 16, week: 40, month: 52 };

const parseDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDate = (value) => {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "-";
  return date.toLocaleDateString();
};

const diffDays = (from, to) =>
  Math.round((to.getTime() - from.getTime()) / DAY_MS);

const toStatusColor = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE" || s === "IN PROGRESS") return "success";
  if (s === "PLAN" || s === "NOT STARTED") return "info";
  if (s === "COMPLETE" || s === "COMPLETED") return "primary";
  if (s === "CLOSE") return "default";
  return "default";
};

const buildRows = (streams, tasksByStream) => {
  const rows = [];

  const sortedStreams = [...streams].sort(
    (a, b) => Number(a?.streamNumber || 0) - Number(b?.streamNumber || 0),
  );

  sortedStreams.forEach((stream) => {
    const streamId = stream?.projectStreamId;
    const streamTasks = [...(tasksByStream.get(String(streamId)) || [])].sort(
      (a, b) => {
        const aStart = parseDate(a?.taskStartDate);
        const bStart = parseDate(b?.taskStartDate);
        if (!aStart && !bStart) return 0;
        if (!aStart) return 1;
        if (!bStart) return -1;
        return aStart.getTime() - bStart.getTime();
      },
    );

    const streamTaskStarts = streamTasks
      .map((task) => {
        const s = String(task?.taskStatus || "").trim();
        return s === "Not Started"
          ? parseDate(task?.taskStartDate)
          : parseDate(task?.actualStartDate) || parseDate(task?.taskStartDate);
      })
      .filter(Boolean);
    const streamTaskEnds = streamTasks
      .map((task) => {
        const s = String(task?.taskStatus || "").trim();
        return s === "Completed"
          ? parseDate(task?.actualEndDate) || parseDate(task?.taskEndDate)
          : parseDate(task?.taskEndDate);
      })
      .filter(Boolean);

    const streamStart =
      streamTaskStarts.length > 0
        ? new Date(Math.min(...streamTaskStarts.map((date) => date.getTime())))
        : null;
    const streamEnd =
      streamTaskEnds.length > 0
        ? new Date(Math.max(...streamTaskEnds.map((date) => date.getTime())))
        : null;

    rows.push({
      id: `stream-${streamId}`,
      type: "stream",
      name:
        stream?.streamName ||
        `Stream ${stream?.streamNumber != null ? stream.streamNumber : ""}`,
      startDate: streamStart,
      endDate: streamEnd,
      raw: stream,
      streamId,
    });

    streamTasks.forEach((task) => {
      const status = String(task?.taskStatus || "").trim();
      const displayStart =
        status === "Not Started"
          ? parseDate(task?.taskStartDate)
          : parseDate(task?.actualStartDate) || parseDate(task?.taskStartDate);
      const displayEnd =
        status === "Completed"
          ? parseDate(task?.actualEndDate) || parseDate(task?.taskEndDate)
          : parseDate(task?.taskEndDate);
      rows.push({
        id: `task-${task?.projectTaskId}`,
        type: "task",
        name: task?.taskName || `Task ${task?.projectTaskId || ""}`,
        startDate: displayStart,
        endDate: displayEnd,
        raw: task,
        streamId,
      });
    });
  });

  return rows;
};

const toApiDate = (value) => {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addDays = (value, days) => {
  const date = value instanceof Date ? new Date(value) : parseDate(value);
  if (!date) return null;
  const duration = Math.max(1, Number(days || 1));
  return new Date(date.getTime() + (duration - 1) * DAY_MS);
};

const toRoleCode = (row) => {
  const raw = String(
    row?.projectRole || row?.role || row?.roleName || row?.leaderRole || "",
  )
    .trim()
    .toUpperCase();

  if (raw === "M" || raw === "L" || raw === "C") return raw;
  if (raw === "MANAGER") return "M";
  if (raw === "LEADER") return "L";
  if (raw === "CO-LEADER" || raw === "COLEADER") return "C";
  return "";
};

const getLeaderStaffId = (row) =>
  row?.projectLeaderStaffId ||
  row?.staffId ||
  row?.leaderId ||
  row?.staffID ||
  "";

const buildRowsFromData = (streams, tasks, collapsedStreamIds) => {
  const taskMap = new Map();
  tasks.forEach((task) => {
    const key = String(task?.projectStreamId || "").trim();
    if (!taskMap.has(key)) taskMap.set(key, []);
    taskMap.get(key).push(task);
  });

  const allRows = buildRows(streams, taskMap);
  return allRows.filter((row) => {
    if (row.type === "stream") return true;
    return !collapsedStreamIds.has(String(row.streamId || ""));
  });
};

const ProjectWorkbench = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { projectCode } = useParams();

  const [project, setProject] = useState(location?.state?.project || null);
  const [customerNameById, setCustomerNameById] = useState({});
  const [streams, setStreams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [collapsedStreamIds, setCollapsedStreamIds] = useState(new Set());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("week");
  const [workbenchHelpOpen, setWorkbenchHelpOpen] = useState(false);
  const [inventoryOverviewOpen, setInventoryOverviewOpen] = useState(false);
  const [inventoryOverviewLoading, setInventoryOverviewLoading] =
    useState(false);
  const [inventoryOverviewError, setInventoryOverviewError] = useState("");
  const [inventoryOverviewData, setInventoryOverviewData] = useState([]);
  const [inventoryOverviewViewMode, setInventoryOverviewViewMode] =
    useState("day");
  const [inventoryOverviewRowsReady, setInventoryOverviewRowsReady] =
    useState(false);
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState(5);
  const [firstWorkDay, setFirstWorkDay] = useState(1);
  const [lastWorkDay, setLastWorkDay] = useState(5);
  const [manpowerOverviewOpen, setManpowerOverviewOpen] = useState(false);
  const [manpowerOverviewLoading, setManpowerOverviewLoading] = useState(false);
  const [manpowerOverviewError, setManpowerOverviewError] = useState("");
  const [manpowerOverviewData, setManpowerOverviewData] = useState([]);
  const [manpowerOverviewStaffs, setManpowerOverviewStaffs] = useState([]);
  const [manpowerOverviewSkillsByStaffId, setManpowerOverviewSkillsByStaffId] =
    useState({});
  const [manpowerOverviewViewMode, setManpowerOverviewViewMode] =
    useState("day");
  const [manpowerOverviewRowsReady, setManpowerOverviewRowsReady] =
    useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTarget, setSettingsTarget] = useState(null);
  const [dialogMode, setDialogMode] = useState("");
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [menuTarget, setMenuTarget] = useState(null);
  const [moveSourceTaskId, setMoveSourceTaskId] = useState("");
  const [saving, setSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [formData, setFormData] = useState({});
  const [taskTypes, setTaskTypes] = useState([]);
  const [taskAssigneeOptions, setTaskAssigneeOptions] = useState([]);
  const [hoveredParentTaskId, setHoveredParentTaskId] = useState("");
  const [hoveredLinkedTaskIds, setHoveredLinkedTaskIds] = useState(new Set());
  const ganttScrollRef = useRef(null);
  const [childTaskData, setChildTaskData] = useState({
    taskName: "",
    taskType: "",
    taskStartDate: "",
    durationDays: 1,
    attachToParentTaskId: "",
    milestoneTaskId: "",
  });
  const [inventoryPlanningOpen, setInventoryPlanningOpen] = useState(false);
  const [inventoryPlanningTarget, setInventoryPlanningTarget] = useState(null);
  const [inventoryPlanningTab, setInventoryPlanningTab] = useState("stock");
  const [inventoryPlanningLoading, setInventoryPlanningLoading] =
    useState(false);
  const [inventoryPlanningError, setInventoryPlanningError] = useState("");
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [inventoryBundles, setInventoryBundles] = useState([]);
  const [inventoryPlanningRows, setInventoryPlanningRows] = useState({
    stock: {},
    asset: {},
    bundle: {},
  });
  const [inventoryDraft, setInventoryDraft] = useState({
    productId: "",
    quantity: 1,
    bundleId: "",
    bundleQuantity: 1,
  });

  const taskTypeOptions = useMemo(() => {
    const map = new Map();
    taskTypes.forEach((taskType) => {
      const code = String(taskType?.projectTaskCode || "").trim();
      if (!code || map.has(code)) return;
      map.set(code, {
        projectTaskCode: code,
        projectTaskDescription: String(
          taskType?.projectTaskDescription || "",
        ).trim(),
        userTask: taskType?.userTask,
        editStartDate: taskType?.editStartDate,
        createByStream: taskType?.createByStream,
        canDelete: taskType?.canDelete,
        minimumDays: taskType?.minimumDays,
        maximumDays: taskType?.maximumDays,
        alignWith: taskType?.alignWith,
        inventoryType: String(taskType?.inventoryType || "")
          .trim()
          .toLowerCase(),
        manpowerRequired: Number(taskType?.manpowerRequired || 0),
      });
    });
    return Array.from(map.values());
  }, [taskTypes]);

  const taskTypeMetaByCode = useMemo(
    () =>
      taskTypeOptions.reduce((acc, taskType) => {
        acc[taskType.projectTaskCode] = taskType;
        return acc;
      }, {}),
    [taskTypeOptions],
  );

  const buildTaskAssigneeOptions = (leaderRows, staffRows) => {
    const staffNameMap = new Map();
    staffRows.forEach((item) => {
      const staffId = String(item?.staffId || "").trim();
      if (!staffId) return;
      const displayName =
        String(item?.staffName || "").trim() ||
        [item?.firstName, item?.lastName].filter(Boolean).join(" ").trim() ||
        staffId;
      staffNameMap.set(staffId, displayName);
    });

    const roleLabelMap = {
      M: t("projectLeader.roleManager", "Manager"),
      L: t("projectLeader.roleLeader", "Leader"),
      C: t("projectLeader.roleCoLeader", "Co-Leader"),
    };

    const map = new Map();
    leaderRows
      .filter((row) => !row?.roleEndDate && String(row?.active ?? 1) !== "0")
      .forEach((row) => {
        const roleCode = toRoleCode(row);
        if (!["M", "L", "C"].includes(roleCode)) return;

        const staffId = String(getLeaderStaffId(row) || "").trim();
        if (!staffId || map.has(staffId)) return;

        const name =
          String(row?.staffName || row?.leaderName || "").trim() ||
          staffNameMap.get(staffId) ||
          staffId;

        map.set(staffId, {
          staffId,
          name,
          roleCode,
          roleLabel: roleLabelMap[roleCode] || roleCode,
        });
      });

    return Array.from(map.values());
  };

  const creatableTaskTypeOptions = useMemo(
    () =>
      taskTypeOptions.filter(
        (taskType) => String(taskType?.userTask ?? "").trim() === "1",
      ),
    [taskTypeOptions],
  );

  const streamCreatableTaskTypeOptions = useMemo(
    () =>
      creatableTaskTypeOptions.filter(
        (taskType) => String(taskType?.createByStream ?? "").trim() === "1",
      ),
    [creatableTaskTypeOptions],
  );

  const taskCreatableTaskTypeOptions = useMemo(
    () =>
      creatableTaskTypeOptions.filter(
        (taskType) => String(taskType?.createByStream ?? "").trim() === "0",
      ),
    [creatableTaskTypeOptions],
  );

  const getDurationDays = (startValue, endValue) => {
    const start = parseDate(startValue);
    const end = parseDate(endValue);
    if (!start || !end || end < start) return null;
    return diffDays(start, end) + 1;
  };

  const validateTaskDuration = (taskTypeCode, startValue, endValue) => {
    const typeMeta = taskTypeMetaByCode[String(taskTypeCode || "").trim()];
    const durationDays = getDurationDays(startValue, endValue);
    if (!typeMeta || durationDays == null) return "";

    const minDays = Number(typeMeta.minimumDays || 0);
    const maxDays = Number(typeMeta.maximumDays || 0);

    if (minDays > 0 && durationDays < minDays) {
      return t(
        "projectPlanning.durationTooShort",
        `Task duration must be at least ${minDays} day(s).`,
      );
    }

    if (maxDays > 0 && durationDays > maxDays) {
      return t(
        "projectPlanning.durationTooLong",
        `Task duration must be at most ${maxDays} day(s).`,
      );
    }

    return "";
  };

  const refreshRows = (
    nextStreams,
    nextTasks,
    nextCollapsed = collapsedStreamIds,
  ) => {
    setRows(buildRowsFromData(nextStreams, nextTasks, nextCollapsed));
  };

  const syncWorkbenchFromServer = async () => {
    const scrollEl = ganttScrollRef.current;
    const prevScrollLeft = scrollEl?.scrollLeft || 0;

    const streamsRes = await request(
      "GET",
      `/api/projectstreams/project/${projectCode}`,
    ).catch(() => ({ data: [] }));
    const nextStreams = Array.isArray(streamsRes?.data) ? streamsRes.data : [];

    const streamIdSet = new Set(
      nextStreams.map((stream) => String(stream?.projectStreamId || "")),
    );
    const nextCollapsed = new Set(
      [...collapsedStreamIds].filter((id) => streamIdSet.has(String(id))),
    );

    const taskChunks = await Promise.all(
      nextStreams.map((stream) =>
        request("GET", `/api/projecttasks/stream/${stream.projectStreamId}`)
          .then((res) =>
            Array.isArray(res?.data)
              ? res.data.map((task) => ({
                  ...task,
                  projectStreamId:
                    task?.projectStreamId || stream.projectStreamId,
                }))
              : [],
          )
          .catch(() => []),
      ),
    );

    const allTasks = taskChunks.flat();
    setStreams(nextStreams);
    setTasks(allTasks);
    setCollapsedStreamIds(nextCollapsed);
    refreshRows(nextStreams, allTasks, nextCollapsed);

    const [leadersRes, staffRes] = await Promise.all([
      request("GET", `/api/projectleaders/project/${projectCode}`).catch(
        () => ({
          data: [],
        }),
      ),
      request("GET", "/api/staffs").catch(() => ({ data: [] })),
    ]);

    const leaderRows = Array.isArray(leadersRes?.data) ? leadersRes.data : [];
    const staffRows = Array.isArray(staffRes?.data) ? staffRes.data : [];
    setTaskAssigneeOptions(buildTaskAssigneeOptions(leaderRows, staffRows));

    requestAnimationFrame(() => {
      if (ganttScrollRef.current) {
        ganttScrollRef.current.scrollLeft = prevScrollLeft;
      }
    });
  };

  useEffect(() => {
    let mounted = true;

    const loadWorkbench = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          projectsRes,
          streamsRes,
          customersRes,
          taskTypesRes,
          leadersRes,
          staffRes,
        ] = await Promise.all([
          request("GET", "/api/projects"),
          request("GET", `/api/projectstreams/project/${projectCode}`),
          request("GET", "/api/customers").catch(() => ({ data: [] })),
          request("GET", "/api/projecttasktypes").catch(() => ({ data: [] })),
          request("GET", `/api/projectleaders/project/${projectCode}`).catch(
            () => ({ data: [] }),
          ),
          request("GET", "/api/staffs").catch(() => ({ data: [] })),
        ]);

        const projects = Array.isArray(projectsRes?.data)
          ? projectsRes.data
          : [];
        const selectedProject =
          projects.find(
            (item) =>
              String(item?.projectCode || "") === String(projectCode || ""),
          ) || null;

        const streams = Array.isArray(streamsRes?.data) ? streamsRes.data : [];
        const customers = Array.isArray(customersRes?.data)
          ? customersRes.data
          : [];

        const customerMap = customers.reduce((acc, customer) => {
          const key = String(customer?.customerId || "").trim();
          if (!key) return acc;
          acc[key] = String(customer?.customerName || "").trim();
          return acc;
        }, {});

        const taskChunks = await Promise.all(
          streams.map((stream) =>
            request("GET", `/api/projecttasks/stream/${stream.projectStreamId}`)
              .then((res) =>
                Array.isArray(res?.data)
                  ? res.data.map((task) => ({
                      ...task,
                      projectStreamId: stream.projectStreamId,
                    }))
                  : [],
              )
              .catch(() => []),
          ),
        );

        const allTasks = taskChunks.flat();
        const taskTypeRows = Array.isArray(taskTypesRes?.data)
          ? taskTypesRes.data
          : [];
        const leaderRows = Array.isArray(leadersRes?.data)
          ? leadersRes.data
          : [];
        const staffRows = Array.isArray(staffRes?.data) ? staffRes.data : [];

        if (!mounted) return;
        setProject(selectedProject || location?.state?.project || null);
        setCustomerNameById(customerMap);
        setStreams(streams);
        setTasks(allTasks);
        setTaskTypes(taskTypeRows);
        setTaskAssigneeOptions(buildTaskAssigneeOptions(leaderRows, staffRows));
        setRows(buildRowsFromData(streams, allTasks, new Set()));
      } catch {
        if (!mounted) return;
        setError(
          t(
            "projectPlanning.workbenchLoadFailed",
            "Failed to load project workbench.",
          ),
        );
        setCustomerNameById({});
        setStreams([]);
        setTasks([]);
        setRows([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    loadWorkbench();

    return () => {
      mounted = false;
    };
  }, [projectCode, t, location?.state?.project]);

  useEffect(() => {
    if (!inventoryOverviewOpen || !projectCode) return;

    let mounted = true;

    const loadInventoryOverview = async () => {
      setInventoryOverviewLoading(true);
      setInventoryOverviewError("");

      try {
        const res = await request(
          "GET",
          `/api/projectinventoryviews?projectCode=${projectCode}`,
        );

        if (!mounted) return;
        setInventoryOverviewData(Array.isArray(res?.data) ? res.data : []);
      } catch {
        if (!mounted) return;
        setInventoryOverviewError(
          t(
            "projectPlanning.inventoryOverviewLoadFailed",
            "Failed to load inventory overview.",
          ),
        );
        setInventoryOverviewData([]);
      } finally {
        if (!mounted) return;
        setInventoryOverviewLoading(false);
      }
    };

    loadInventoryOverview();

    return () => {
      mounted = false;
    };
  }, [inventoryOverviewOpen, projectCode, t]);

  useEffect(() => {
    let mounted = true;

    const loadWorkingDaysParams = async () => {
      try {
        const [wdRes, firstRes, lastRes] = await Promise.all([
          request("GET", "/api/params/workDaysPerWeek").catch(() => null),
          request("GET", "/api/params/firstWorkDay").catch(() => null),
          request("GET", "/api/params/lastWorkDay").catch(() => null),
        ]);

        if (!mounted) return;

        if (wdRes?.data?.value_string) {
          const wdValue = Number(wdRes.data.value_string);
          if (Number.isFinite(wdValue)) setWorkDaysPerWeek(wdValue);
        }

        if (firstRes?.data?.value_string) {
          const firstValue = Number(firstRes.data.value_string);
          if (Number.isFinite(firstValue)) setFirstWorkDay(firstValue);
        }

        if (lastRes?.data?.value_string) {
          const lastValue = Number(lastRes.data.value_string);
          if (Number.isFinite(lastValue)) setLastWorkDay(lastValue);
        }
      } catch {
        // Use defaults if loading fails
      }
    };

    loadWorkingDaysParams();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!manpowerOverviewOpen) return;

    let mounted = true;

    const loadManpowerOverview = async () => {
      setManpowerOverviewLoading(true);
      setManpowerOverviewError("");

      try {
        const [manpowerRes, staffsRes, skillsRes] = await Promise.all([
          request("GET", "/api/projectmanpowers").catch(() => ({ data: [] })),
          request("GET", "/api/staffs").catch(() => ({ data: [] })),
          request("GET", "/api/staffskills").catch(() => ({ data: [] })),
        ]);

        const taskIdSet = new Set(
          tasks.map((task) => String(task?.projectTaskId || "").trim()),
        );

        const allManpower = Array.isArray(manpowerRes?.data)
          ? manpowerRes.data
          : [];
        const filteredManpower = allManpower.filter((item) =>
          taskIdSet.has(String(item?.projectTaskId || "").trim()),
        );

        const staffs = Array.isArray(staffsRes?.data) ? staffsRes.data : [];
        const staffById = staffs.reduce((acc, staff) => {
          const id = String(staff?.staffId || "").trim();
          if (!id) return acc;
          acc[id] = staff;
          return acc;
        }, {});

        const skillRows = Array.isArray(skillsRes?.data) ? skillsRes.data : [];
        const skillNameById = skillRows.reduce((acc, skill) => {
          const id = String(skill?.staffSkillId || "").trim();
          if (!id) return acc;
          acc[id] = String(skill?.skillName || "").trim() || id;
          return acc;
        }, {});

        const uniqueStaffIds = Array.from(
          new Set(
            filteredManpower
              .map((item) => String(item?.staffId || "").trim())
              .filter(Boolean),
          ),
        );

        const skillsByStaffEntries = await Promise.all(
          uniqueStaffIds.map(async (staffId) => {
            const staffName = String(
              staffById?.[staffId]?.staffName || "",
            ).trim();
            if (!staffName) return [staffId, []];

            const profileRes = await request(
              "GET",
              `/api/staffskillprofiles/staff/${encodeURIComponent(staffName)}`,
            ).catch(() => ({ data: [] }));

            const profileRows = Array.isArray(profileRes?.data)
              ? profileRes.data
              : [];

            const names = Array.from(
              new Set(
                profileRows
                  .map((row) => {
                    const skillId = String(row?.staffSkillId || "").trim();
                    if (skillId && skillNameById[skillId]) {
                      return skillNameById[skillId];
                    }
                    return String(row?.skillName || "").trim();
                  })
                  .filter(Boolean),
              ),
            );

            return [staffId, names];
          }),
        );

        if (!mounted) return;
        setManpowerOverviewData(filteredManpower);
        setManpowerOverviewStaffs(staffs);
        setManpowerOverviewSkillsByStaffId(
          Object.fromEntries(skillsByStaffEntries),
        );
      } catch {
        if (!mounted) return;
        setManpowerOverviewError(
          t(
            "projectPlanning.manpowerLoadFailed",
            "Failed to load project manpower.",
          ),
        );
        setManpowerOverviewData([]);
        setManpowerOverviewStaffs([]);
        setManpowerOverviewSkillsByStaffId({});
      } finally {
        if (!mounted) return;
        setManpowerOverviewLoading(false);
      }
    };

    loadManpowerOverview();

    return () => {
      mounted = false;
    };
  }, [manpowerOverviewOpen, tasks, t]);

  useEffect(() => {
    setInventoryOverviewRowsReady(false);
    if (!inventoryOverviewData.length || inventoryOverviewLoading) return;

    // Defer calculation to let dialog render first
    const timer = setTimeout(() => {
      setInventoryOverviewRowsReady(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [inventoryOverviewData, inventoryOverviewLoading]);

  useEffect(() => {
    setManpowerOverviewRowsReady(false);
    if (!manpowerOverviewData.length || manpowerOverviewLoading) return;

    // Defer calculation to let dialog render first
    const timer = setTimeout(() => {
      setManpowerOverviewRowsReady(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [manpowerOverviewData, manpowerOverviewLoading]);

  const timelineBounds = useMemo(() => {
    const starts = rows.map((row) => row.startDate).filter(Boolean);
    const ends = rows.map((row) => row.endDate).filter(Boolean);

    if (starts.length === 0 || ends.length === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return {
        minDate: today,
        maxDate: new Date(today.getTime() + 6 * DAY_MS),
      };
    }

    const minDate = new Date(Math.min(...starts.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...ends.map((d) => d.getTime())));

    return { minDate, maxDate };
  }, [rows]);

  const inventoryOverviewBounds = useMemo(() => {
    const projectStart = parseDate(project?.startDate);
    const projectEnd = parseDate(project?.endDate);

    if (projectStart && projectEnd && projectEnd >= projectStart) {
      return { minDate: projectStart, maxDate: projectEnd };
    }

    return timelineBounds;
  }, [project?.startDate, project?.endDate, timelineBounds]);

  const inventoryDayColumns = useMemo(() => {
    const { minDate, maxDate } = inventoryOverviewBounds;
    const span = Math.max(1, diffDays(minDate, maxDate) + 1);
    return Array.from({ length: span }, (_, idx) => {
      const date = new Date(minDate.getTime() + idx * DAY_MS);
      return {
        key: date.toISOString(),
        date,
        time: date.getTime(),
        label: String(date.getDate()),
        isMonthStart: date.getDate() === 1 || idx === 0,
      };
    });
  }, [inventoryOverviewBounds]);

  const inventoryWeekColumns = useMemo(() => {
    const { minDate, maxDate } = inventoryOverviewBounds;

    const snapToMonday = (d) => {
      const copy = new Date(d);
      const day = copy.getDay();
      const offset = day === 0 ? -6 : 1 - day;
      copy.setDate(copy.getDate() + offset);
      copy.setHours(0, 0, 0, 0);
      return copy;
    };

    const weekStart = snapToMonday(minDate);
    const cols = [];
    let cur = new Date(weekStart);

    while (cur <= maxDate) {
      const weekEnd = new Date(cur.getTime() + 6 * DAY_MS);
      const tmp = new Date(cur);
      tmp.setHours(0, 0, 0, 0);
      tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
      const jan4 = new Date(tmp.getFullYear(), 0, 4);
      const isoWeek =
        1 +
        Math.round(
          ((tmp - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7,
        );

      cols.push({
        key: cur.toISOString(),
        label: `W${isoWeek}`,
        yearKey: String(cur.getFullYear()),
        weekStart: new Date(cur),
        weekEnd,
      });

      cur = new Date(cur.getTime() + WEEK_MS);
    }

    return cols;
  }, [inventoryOverviewBounds]);

  const inventoryMonthColumns = useMemo(() => {
    const { minDate, maxDate } = inventoryOverviewBounds;
    const cols = [];
    let cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

    while (cur <= maxDate) {
      const year = cur.getFullYear();
      const month = cur.getMonth();
      cols.push({
        key: `${year}-${month + 1}`,
        label: cur.toLocaleDateString(undefined, { month: "short" }),
        yearKey: String(year),
        monthStart: new Date(cur),
        monthEnd: new Date(year, month + 1, 0),
      });
      cur = new Date(year, month + 1, 1);
    }

    return cols;
  }, [inventoryOverviewBounds]);

  const inventoryOverviewUpperSegments = useMemo(() => {
    if (inventoryOverviewViewMode === "day") {
      const segs = [];
      inventoryDayColumns.forEach((col) => {
        const key = `${col.date.getFullYear()}-${col.date.getMonth() + 1}`;
        const label = col.date.toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        });
        const last = segs[segs.length - 1];
        if (last && last.key === key) {
          last.span += 1;
        } else {
          segs.push({ key, label, span: 1 });
        }
      });
      return segs;
    }

    const srcCols =
      inventoryOverviewViewMode === "week"
        ? inventoryWeekColumns
        : inventoryMonthColumns;
    const segs = [];
    srcCols.forEach((col) => {
      const last = segs[segs.length - 1];
      if (last && last.key === col.yearKey) {
        last.span += 1;
      } else {
        segs.push({ key: col.yearKey, label: col.yearKey, span: 1 });
      }
    });
    return segs;
  }, [
    inventoryOverviewViewMode,
    inventoryDayColumns,
    inventoryWeekColumns,
    inventoryMonthColumns,
  ]);

  const inventoryOverviewActiveCols =
    inventoryOverviewViewMode === "day"
      ? inventoryDayColumns
      : inventoryOverviewViewMode === "week"
        ? inventoryWeekColumns
        : inventoryMonthColumns;

  const inventoryOverviewColWidth = COL_WIDTH[inventoryOverviewViewMode];
  const inventoryOverviewTimelineWidth = Math.max(
    680,
    inventoryOverviewActiveCols.length * inventoryOverviewColWidth,
  );

  const manpowerOverviewUpperSegments = useMemo(() => {
    if (manpowerOverviewViewMode === "day") {
      const segs = [];
      inventoryDayColumns.forEach((col) => {
        const key = `${col.date.getFullYear()}-${col.date.getMonth() + 1}`;
        const label = col.date.toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        });
        const last = segs[segs.length - 1];
        if (last && last.key === key) {
          last.span += 1;
        } else {
          segs.push({ key, label, span: 1 });
        }
      });
      return segs;
    }

    const srcCols =
      manpowerOverviewViewMode === "week"
        ? inventoryWeekColumns
        : inventoryMonthColumns;
    const segs = [];
    srcCols.forEach((col) => {
      const last = segs[segs.length - 1];
      if (last && last.key === col.yearKey) {
        last.span += 1;
      } else {
        segs.push({ key: col.yearKey, label: col.yearKey, span: 1 });
      }
    });
    return segs;
  }, [
    manpowerOverviewViewMode,
    inventoryDayColumns,
    inventoryWeekColumns,
    inventoryMonthColumns,
  ]);

  const manpowerOverviewActiveCols =
    manpowerOverviewViewMode === "day"
      ? inventoryDayColumns
      : manpowerOverviewViewMode === "week"
        ? inventoryWeekColumns
        : inventoryMonthColumns;

  const manpowerOverviewColWidth = COL_WIDTH[manpowerOverviewViewMode];
  const manpowerOverviewTimelineWidth = Math.max(
    680,
    manpowerOverviewActiveCols.length * manpowerOverviewColWidth,
  );

  const manpowerOverviewRows = useMemo(() => {
    if (!manpowerOverviewRowsReady) return [];

    const minTime = inventoryOverviewBounds.minDate.getTime();
    const maxTime = inventoryOverviewBounds.maxDate.getTime();
    const taskById = tasks.reduce((acc, task) => {
      const key = String(task?.projectTaskId || "").trim();
      if (!key) return acc;
      acc[key] = task;
      return acc;
    }, {});
    const staffById = manpowerOverviewStaffs.reduce((acc, staff) => {
      const key = String(staff?.staffId || "").trim();
      if (!key) return acc;
      acc[key] = staff;
      return acc;
    }, {});

    const grouped = new Map();

    manpowerOverviewData.forEach((item) => {
      const taskId = String(item?.projectTaskId || "").trim();
      const staffId = String(item?.staffId || "").trim();
      if (!taskId || !staffId) return;

      const task = taskById[taskId];
      if (!task) return;

      const start = parseDate(task?.taskStartDate || task?.actualStartDate);
      const end = parseDate(task?.taskEndDate || task?.actualEndDate) || start;
      if (!start || !end) return;

      const staffName =
        String(staffById?.[staffId]?.staffName || "").trim() || staffId;
      const skills = manpowerOverviewSkillsByStaffId?.[staffId] || [];
      const key = staffId;

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          staffId,
          staffName,
          skills,
          dayMap: new Map(),
        });
      }

      const target = grouped.get(key);
      const loadingValue = Number(item?.loading || 1);
      if (!Number.isFinite(loadingValue) || loadingValue <= 0) return;

      const taskName = String(task?.taskName || `Task ${taskId}`).trim();
      const sTime = Math.max(start.getTime(), minTime);
      const eTime = Math.min(end.getTime(), maxTime);
      if (eTime < sTime) return;

      const cur = new Date(sTime);
      cur.setHours(0, 0, 0, 0);
      while (cur.getTime() <= eTime) {
        const timeKey = cur.getTime();
        const existing = target.dayMap.get(timeKey) || [];
        existing.push({ taskName, loading: loadingValue });
        target.dayMap.set(timeKey, existing);
        cur.setDate(cur.getDate() + 1);
      }
    });

    return Array.from(grouped.values()).sort((a, b) =>
      String(a.staffName || "").localeCompare(
        String(b.staffName || ""),
        undefined,
        {
          sensitivity: "base",
        },
      ),
    );
  }, [
    manpowerOverviewData,
    manpowerOverviewStaffs,
    manpowerOverviewSkillsByStaffId,
    tasks,
    inventoryOverviewBounds,
    manpowerOverviewRowsReady,
  ]);

  const getManpowerUsageValue = (row, col) => {
    if (manpowerOverviewViewMode === "day") {
      const tasksInCell = row.dayMap.get(col.time) || [];
      return tasksInCell.reduce((sum, item) => sum + item.loading, 0);
    }

    if (manpowerOverviewViewMode === "week") {
      let total = 0;
      row.dayMap.forEach((items, time) => {
        if (time >= col.weekStart.getTime() && time <= col.weekEnd.getTime()) {
          total += items.reduce((sum, item) => sum + item.loading, 0);
        }
      });
      return total;
    }

    let total = 0;
    row.dayMap.forEach((items, time) => {
      if (time >= col.monthStart.getTime() && time <= col.monthEnd.getTime()) {
        total += items.reduce((sum, item) => sum + item.loading, 0);
      }
    });
    return total;
  };

  const isManpowerOverloaded = (row, col) => {
    if (manpowerOverviewViewMode === "day") {
      const dayItems = row.dayMap.get(col.time) || [];
      const total = dayItems.reduce((sum, item) => sum + item.loading, 0);
      return total > 1;
    }

    let overloaded = false;
    row.dayMap.forEach((items, time) => {
      if (overloaded) return;
      const inBucket =
        manpowerOverviewViewMode === "week"
          ? time >= col.weekStart.getTime() && time <= col.weekEnd.getTime()
          : time >= col.monthStart.getTime() && time <= col.monthEnd.getTime();
      if (!inBucket) return;
      const total = items.reduce((sum, item) => sum + item.loading, 0);
      if (total > 1) overloaded = true;
    });
    return overloaded;
  };

  const getManpowerUsageDetailsTable = (row, col) => {
    const items = [];

    if (manpowerOverviewViewMode === "day") {
      items.push(...(row.dayMap.get(col.time) || []));
    } else if (manpowerOverviewViewMode === "week") {
      row.dayMap.forEach((dayItems, time) => {
        if (time >= col.weekStart.getTime() && time <= col.weekEnd.getTime()) {
          items.push(...dayItems);
        }
      });
    } else {
      row.dayMap.forEach((dayItems, time) => {
        if (
          time >= col.monthStart.getTime() &&
          time <= col.monthEnd.getTime()
        ) {
          items.push(...dayItems);
        }
      });
    }

    const grouped = new Map();
    items.forEach((entry) => {
      const taskName = String(entry?.taskName || "-").trim() || "-";
      grouped.set(
        taskName,
        (grouped.get(taskName) || 0) + Number(entry?.loading || 0),
      );
    });

    const entries = Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);

    let periodLabel = "";
    if (manpowerOverviewViewMode === "day") {
      periodLabel = col.date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } else if (manpowerOverviewViewMode === "week") {
      const start = col.weekStart.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const end = col.weekEnd.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      periodLabel = `${col.label} (${start} - ${end})`;
    } else {
      periodLabel = `${col.label} ${col.yearKey}`;
    }

    if (entries.length === 0) {
      return (
        <Box sx={{ fontSize: "0.75rem" }}>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, mb: 0.5 }}>
            {periodLabel}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem" }}>
            {t("projectPlanning.noManpowerSelected", "No manpower selected.")}
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: "table",
          fontSize: "0.75rem",
          borderCollapse: "collapse",
        }}
      >
        <Box sx={{ display: "table-header-group" }}>
          <Box
            sx={{
              display: "table-row",
              bgcolor: "rgba(0,0,0,0.2)",
              fontWeight: 600,
            }}
          >
            <Box sx={{ display: "table-cell", px: 1, py: 0.4 }}>
              {periodLabel}
            </Box>
          </Box>
          <Box sx={{ display: "table-row" }}>
            <Box
              sx={{
                display: "table-cell",
                px: 1,
                py: 0.25,
                fontWeight: 600,
                borderRight: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              {t("projecttask.taskName", "Task")}
            </Box>
            <Box
              sx={{
                display: "table-cell",
                px: 1,
                py: 0.25,
                fontWeight: 600,
                textAlign: "right",
              }}
            >
              {t("projectPlanning.manpowerLoading", "Loading")}
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: "table-row-group" }}>
          {entries.map(([taskName, loading], idx) => (
            <Box
              key={`${taskName}-${idx}`}
              sx={{
                display: "table-row",
                "&:nth-of-type(even)": { bgcolor: "rgba(0,0,0,0.1)" },
              }}
            >
              <Box
                sx={{
                  display: "table-cell",
                  px: 1,
                  py: 0.25,
                  borderRight: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {taskName}
              </Box>
              <Box
                sx={{
                  display: "table-cell",
                  px: 1,
                  py: 0.25,
                  textAlign: "right",
                }}
              >
                {Number(loading.toFixed(2))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const workingDaySet = useMemo(() => {
    const normalizeDay = (value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return null;
      if (num === 7) return 0;
      if (num >= 0 && num <= 6) return num;
      if (num >= 1 && num <= 7) return num % 7;
      return null;
    };

    const first = normalizeDay(firstWorkDay);
    const last = normalizeDay(lastWorkDay);
    const count = Math.max(1, Math.min(7, Number(workDaysPerWeek) || 5));

    if (first == null && last == null) {
      return new Set([1, 2, 3, 4, 5]);
    }

    const start = first == null ? 1 : first;
    const end = last == null ? (start + count - 1) % 7 : last;

    const rangeSet = new Set();
    let cur = start;
    rangeSet.add(cur);
    while (cur !== end && rangeSet.size < 7) {
      cur = (cur + 1) % 7;
      rangeSet.add(cur);
    }

    if (rangeSet.size === count) return rangeSet;

    const countSet = new Set();
    for (let idx = 0; idx < count; idx += 1) {
      countSet.add((start + idx) % 7);
    }
    return countSet;
  }, [firstWorkDay, lastWorkDay, workDaysPerWeek]);

  const inventoryOverviewRows = useMemo(() => {
    if (!inventoryOverviewRowsReady) return [];

    const minTime = inventoryOverviewBounds.minDate.getTime();
    const maxTime = inventoryOverviewBounds.maxDate.getTime();
    const grouped = new Map();

    inventoryOverviewData.forEach((item) => {
      const start = parseDate(item?.startDate || item?.actualStartDate);
      const end = parseDate(item?.endDate || item?.actualEndDate) || start;
      if (!start || !end) return;

      const productName = String(item?.productName || "-").trim() || "-";
      const uom = String(item?.productUom || "-").trim() || "-";
      const productId = String(item?.productId || productName || "").trim();
      const key = `${productId}__${uom}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          productName,
          uom,
          dayMap: new Map(),
        });
      }

      const target = grouped.get(key);
      const qty = Number(item?.quantity || 0);
      if (!Number.isFinite(qty) || qty <= 0) return;

      const activityName = String(item?.activityName || "-").trim() || "-";
      const sTime = Math.max(start.getTime(), minTime);
      const eTime = Math.min(end.getTime(), maxTime);
      if (eTime < sTime) return;

      const startDate = new Date(sTime);
      startDate.setHours(0, 0, 0, 0);
      let supplyTime = startDate.getTime();

      if (!workingDaySet.has(startDate.getDay())) {
        const prevTime = supplyTime - DAY_MS;
        const prevDate = new Date(prevTime);
        if (prevTime >= minTime && workingDaySet.has(prevDate.getDay())) {
          supplyTime = prevTime;
        }
      }

      const existing = target.dayMap.get(supplyTime) || [];
      existing.push({ activityName, quantity: qty });
      target.dayMap.set(supplyTime, existing);
    });

    return Array.from(grouped.values()).sort((a, b) => {
      const n = String(a.productName || "").localeCompare(
        String(b.productName || ""),
        undefined,
        { sensitivity: "base" },
      );
      if (n !== 0) return n;
      return String(a.uom || "").localeCompare(String(b.uom || ""));
    });
  }, [
    inventoryOverviewData,
    inventoryOverviewBounds,
    workingDaySet,
    inventoryOverviewRowsReady,
  ]);

  const getUsageValue = (row, col) => {
    if (inventoryOverviewViewMode === "day") {
      const activities = row.dayMap.get(col.time) || [];
      return activities.reduce((sum, a) => sum + a.quantity, 0);
    }

    if (inventoryOverviewViewMode === "week") {
      let total = 0;
      row.dayMap.forEach((activities, time) => {
        if (time >= col.weekStart.getTime() && time <= col.weekEnd.getTime()) {
          total += activities.reduce((sum, a) => sum + a.quantity, 0);
        }
      });
      return total;
    }

    let total = 0;
    row.dayMap.forEach((activities, time) => {
      if (time >= col.monthStart.getTime() && time <= col.monthEnd.getTime()) {
        total += activities.reduce((sum, a) => sum + a.quantity, 0);
      }
    });
    return total;
  };

  const getUsageDetailsTable = (row, col) => {
    const activities = [];

    if (inventoryOverviewViewMode === "day") {
      activities.push(...(row.dayMap.get(col.time) || []));
    } else if (inventoryOverviewViewMode === "week") {
      row.dayMap.forEach((dayActivities, time) => {
        if (time >= col.weekStart.getTime() && time <= col.weekEnd.getTime()) {
          activities.push(...dayActivities);
        }
      });
    } else {
      row.dayMap.forEach((dayActivities, time) => {
        if (
          time >= col.monthStart.getTime() &&
          time <= col.monthEnd.getTime()
        ) {
          activities.push(...dayActivities);
        }
      });
    }

    const grouped = new Map();
    activities.forEach((act) => {
      const name = act.activityName || "-";
      grouped.set(name, (grouped.get(name) || 0) + act.quantity);
    });

    const entries = Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);

    let periodLabel = "";
    if (inventoryOverviewViewMode === "day") {
      periodLabel = col.date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } else if (inventoryOverviewViewMode === "week") {
      const start = col.weekStart.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const end = col.weekEnd.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      periodLabel = `W${col.label} (${start} - ${end})`;
    } else {
      periodLabel = col.label + " " + col.yearKey;
    }

    if (entries.length === 0) {
      return (
        <Box sx={{ fontSize: "0.75rem" }}>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, mb: 0.5 }}>
            {periodLabel}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem" }}>No usage</Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: "table",
          fontSize: "0.75rem",
          borderCollapse: "collapse",
        }}
      >
        <Box sx={{ display: "table-header-group" }}>
          <Box
            sx={{
              display: "table-row",
              bgcolor: "rgba(0,0,0,0.2)",
              fontWeight: 600,
            }}
          >
            <Box
              sx={{
                display: "table-cell",
                px: 1,
                py: 0.4,
                colSpan: 2,
              }}
            >
              {periodLabel}
            </Box>
          </Box>
          <Box sx={{ display: "table-row" }}>
            <Box
              sx={{
                display: "table-cell",
                px: 1,
                py: 0.25,
                fontWeight: 600,
                borderRight: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              Task/Stream
            </Box>
            <Box
              sx={{
                display: "table-cell",
                px: 1,
                py: 0.25,
                fontWeight: 600,
                textAlign: "right",
              }}
            >
              Qty
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: "table-row-group" }}>
          {entries.map(([name, qty], idx) => (
            <Box
              key={idx}
              sx={{
                display: "table-row",
                "&:nth-of-type(even)": { bgcolor: "rgba(0,0,0,0.1)" },
              }}
            >
              <Box
                sx={{
                  display: "table-cell",
                  px: 1,
                  py: 0.25,
                  borderRight: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {name}
              </Box>
              <Box
                sx={{
                  display: "table-cell",
                  px: 1,
                  py: 0.25,
                  textAlign: "right",
                }}
              >
                {Number(qty.toFixed(2))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // GöÇGöÇ Day view columns GöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇ
  const dayColumns = useMemo(() => {
    const { minDate, maxDate } = timelineBounds;
    const span = Math.max(1, diffDays(minDate, maxDate) + 1);
    return Array.from({ length: span }, (_, idx) => {
      const date = new Date(minDate.getTime() + idx * DAY_MS);
      return {
        key: date.toISOString(),
        date,
        label: String(date.getDate()),
        isMonthStart: date.getDate() === 1 || idx === 0,
      };
    });
  }, [timelineBounds]);

  // GöÇGöÇ Week view columns (Mon-aligned) GöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇ
  const weekColumns = useMemo(() => {
    const { minDate, maxDate } = timelineBounds;
    // Snap start back to Monday of first week
    const snapToMonday = (d) => {
      const copy = new Date(d);
      const day = copy.getDay(); // 0=Sun
      const offset = day === 0 ? -6 : 1 - day;
      copy.setDate(copy.getDate() + offset);
      copy.setHours(0, 0, 0, 0);
      return copy;
    };
    const weekStart = snapToMonday(minDate);
    const cols = [];
    let cur = new Date(weekStart);
    while (cur <= maxDate) {
      const weekEnd = new Date(cur.getTime() + 6 * DAY_MS);
      // ISO week number
      const tmp = new Date(cur);
      tmp.setHours(0, 0, 0, 0);
      tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
      const jan4 = new Date(tmp.getFullYear(), 0, 4);
      const isoWeek =
        1 +
        Math.round(
          ((tmp - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7,
        );
      const yearKey = String(cur.getFullYear());
      cols.push({
        key: cur.toISOString(),
        date: new Date(cur),
        label: `W${isoWeek}`,
        yearKey,
        yearLabel: yearKey,
        weekStart: new Date(cur),
        weekEnd,
      });
      cur = new Date(cur.getTime() + WEEK_MS);
    }
    return cols;
  }, [timelineBounds]);

  // GöÇGöÇ Month view columns GöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇ
  const monthColumns = useMemo(() => {
    const { minDate, maxDate } = timelineBounds;
    const cols = [];
    let cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (cur <= maxDate) {
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      cols.push({
        key: `${year}-${month + 1}`,
        date: new Date(cur),
        label: cur.toLocaleDateString(undefined, { month: "short" }),
        yearKey: String(year),
        yearLabel: String(year),
        daysInMonth,
        monthStart: new Date(cur),
        monthEnd: new Date(year, month + 1, 0),
      });
      cur = new Date(year, month + 1, 1);
    }
    return cols;
  }, [timelineBounds]);

  // GöÇGöÇ Shared upper-header segments
  // day   GåÆ group by month  (upper = month label)
  // week  GåÆ group by year   (upper = year)
  // month GåÆ group by year   (upper = year)
  const upperSegments = useMemo(() => {
    if (viewMode === "day") {
      const segs = [];
      dayColumns.forEach((col) => {
        const key = `${col.date.getFullYear()}-${col.date.getMonth() + 1}`;
        const label = col.date.toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        });
        const last = segs[segs.length - 1];
        if (last && last.key === key) {
          last.span += 1;
        } else segs.push({ key, label, span: 1 });
      });
      return segs;
    }
    // week and month: group by year
    const srcCols = viewMode === "week" ? weekColumns : monthColumns;
    const segs = [];
    srcCols.forEach((col) => {
      const last = segs[segs.length - 1];
      if (last && last.key === col.yearKey) {
        last.span += 1;
      } else segs.push({ key: col.yearKey, label: col.yearLabel, span: 1 });
    });
    return segs;
  }, [viewMode, dayColumns, weekColumns, monthColumns]);

  // GöÇGöÇ Bar geometry helpers GöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇ
  const colWidth = COL_WIDTH[viewMode];

  const getBarGeometry = (startDate, endDate) => {
    if (!startDate || !endDate || endDate < startDate) return null;
    const { minDate } = timelineBounds;

    if (viewMode === "day") {
      const left = diffDays(minDate, startDate) * colWidth;
      const width = Math.max(
        colWidth,
        (diffDays(startDate, endDate) + 1) * colWidth,
      );
      return { left, width };
    }
    if (viewMode === "week") {
      const firstWeek = weekColumns[0]?.weekStart;
      if (!firstWeek) return null;
      // Fractional position: days from first-week-start / 7 days per column
      const startFrac = (startDate.getTime() - firstWeek.getTime()) / WEEK_MS;
      const endFrac =
        (endDate.getTime() - firstWeek.getTime()) / WEEK_MS + 1 / 7; // +1/7 = include end day
      const left = Math.max(0, startFrac) * colWidth;
      const right = endFrac * colWidth;
      return { left, width: Math.max(colWidth / 7, right - left) };
    }
    // month view GÇö fractional within each month by day-of-month
    if (weekColumns.length === 0 && monthColumns.length === 0) return null;
    const startMonthIdx = monthColumns.findIndex(
      (col) => startDate >= col.monthStart && startDate <= col.monthEnd,
    );
    const endMonthIdx = monthColumns.findIndex(
      (col) => endDate >= col.monthStart && endDate <= col.monthEnd,
    );
    const si = startMonthIdx < 0 ? 0 : startMonthIdx;
    const ei = endMonthIdx < 0 ? monthColumns.length - 1 : endMonthIdx;

    const startCol = monthColumns[si];
    const endCol = monthColumns[ei];

    // Fractional offset within start month
    const startDayOffset = startCol
      ? (startDate.getDate() - 1) / startCol.daysInMonth
      : 0;
    // Fractional end within end month (include the end day fully)
    const endDayOffset = endCol ? endDate.getDate() / endCol.daysInMonth : 1;

    const left = si * colWidth + startDayOffset * colWidth;
    const right = ei * colWidth + endDayOffset * colWidth;
    return { left, width: Math.max(colWidth / 28, right - left) };
  };

  const getOneDayWidth = (startDate) => {
    if (viewMode === "day") return colWidth;
    if (viewMode === "week") return colWidth / 7;
    const monthCol = monthColumns.find(
      (col) => startDate >= col.monthStart && startDate <= col.monthEnd,
    );
    const daysInMonth = Number(monthCol?.daysInMonth || 30);
    return colWidth / daysInMonth;
  };

  const getTaskBarGeometry = (row) => {
    const startDate = row?.startDate;
    const endDate = row?.endDate;
    const base = getBarGeometry(startDate, endDate);
    if (!base || row?.type !== "task" || !startDate || !endDate) return base;

    const taskTypeCode = String(row?.raw?.taskType || "")
      .trim()
      .toUpperCase();
    const isSameDay = diffDays(startDate, endDate) === 0;
    if (taskTypeCode !== "M" && isSameDay) {
      return {
        ...base,
        width: Math.max(base.width, getOneDayWidth(startDate)),
      };
    }
    return base;
  };

  const activeCols =
    viewMode === "day"
      ? dayColumns
      : viewMode === "week"
        ? weekColumns
        : monthColumns;
  const timelineWidth = Math.max(700, activeCols.length * colWidth);

  const statusLabel = {
    PLAN: t("project.statusPlan", "Planning"),
    ACTIVE: t("project.statusActive", "Active"),
    COMPLETE: t("project.statusComplete", "Complete"),
    CLOSE: t("project.statusClose", "Close"),
  };

  const customerDisplayName =
    customerNameById[String(project?.customerId || "").trim()] || "-";

  const openSettingsMenu = (event, row) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuTarget(row);
  };

  const closeSettingsMenu = () => {
    setMenuAnchorEl(null);
    setMenuTarget(null);
  };

  const openTaskEditor = (row) => {
    clearMoveMode();
    setSettingsError("");
    const taskStartDate = toApiDate(row?.raw?.taskStartDate || row?.startDate);
    const taskEndDate = toApiDate(row?.raw?.taskEndDate || row?.endDate);
    setSettingsTarget(row);
    setDialogMode("edit-task");
    setFormData({
      taskName: row?.raw?.taskName || "",
      taskType: row?.raw?.taskType || taskTypeOptions[0]?.projectTaskCode || "",
      taskStatus: row?.raw?.taskStatus || "Not Started",
      taskStartDate,
      taskDuration:
        row?.raw?.taskDuration ||
        getDurationDays(taskStartDate, taskEndDate) ||
        1,
      taskEndDate,
      remarks: row?.raw?.remarks || "",
      staffId:
        String(row?.raw?.staffId || "").trim() ||
        String(taskAssigneeOptions[0]?.staffId || ""),
      parentTaskId: row?.raw?.parentTaskId || "",
      milestoneTaskId: row?.raw?.milestoneTaskId || "",
    });
    setSettingsOpen(true);
    closeSettingsMenu();
  };

  const openMilestoneDialog = (row) => {
    setSettingsError("");
    setSettingsTarget(row);
    setDialogMode("edit-milestone");
    setFormData({
      milestoneTaskId: row?.raw?.milestoneTaskId || "",
    });
    setSettingsOpen(true);
    closeSettingsMenu();
  };

  const openStreamEditor = (row) => {
    clearMoveMode();
    setSettingsError("");
    setSettingsTarget(row);
    setDialogMode("edit-stream");
    setFormData({
      streamName: row?.raw?.streamName || "",
      streamDescription: row?.raw?.streamDescription || "",
      streamType: row?.raw?.streamType || "P",
    });
    setSettingsOpen(true);
    closeSettingsMenu();
  };

  const openAddTaskDialog = (row) => {
    clearMoveMode();
    setSettingsError("");
    setSettingsTarget(row);
    setDialogMode("add-task");
    const allowedOptions =
      row?.type === "stream"
        ? streamCreatableTaskTypeOptions
        : taskCreatableTaskTypeOptions;
    const defaultStartDate =
      row?.type === "task"
        ? toApiDate(row?.raw?.taskEndDate || row?.endDate)
        : toApiDate(new Date());
    setChildTaskData({
      taskName: "",
      taskType: allowedOptions[0]?.projectTaskCode || "",
      taskStartDate: defaultStartDate,
      durationDays: 1,
      attachToParentTaskId:
        row?.type === "task" ? String(row?.raw?.projectTaskId || "") : "",
      milestoneTaskId: "",
      staffId: String(taskAssigneeOptions[0]?.staffId || ""),
    });
    setSettingsOpen(true);
  };

  const openAddStreamDialog = (row) => {
    clearMoveMode();
    setSettingsError("");
    setSettingsTarget(row);
    setDialogMode("add-stream");
    setFormData({
      streamName: "",
      streamDescription: "",
      streamType: row?.raw?.streamType || "S",
    });
    setSettingsOpen(true);
  };

  const startMoveMode = (row) => {
    setMoveSourceTaskId(String(row?.raw?.projectTaskId || ""));
    closeSettingsMenu();
  };

  const clearMoveMode = () => {
    setMoveSourceTaskId("");
  };

  const closeSettings = () => {
    if (saving) return;
    setSettingsOpen(false);
    setSettingsTarget(null);
    setDialogMode("");
    setSettingsError("");
  };

  const saveStreamInfo = async () => {
    if (!settingsTarget?.raw?.projectStreamId) return;
    setSaving(true);
    setSettingsError("");
    try {
      const payload = {
        ...settingsTarget.raw,
        streamName: String(formData.streamName || "").trim(),
        streamDescription: String(formData.streamDescription || "").trim(),
        streamType: String(
          formData.streamType || settingsTarget.raw.streamType || "P",
        ).trim(),
      };
      await request(
        "PUT",
        `/api/projectstreams/${settingsTarget.raw.projectStreamId}`,
        payload,
      );

      await syncWorkbenchFromServer();
      setSettingsOpen(false);
    } catch (err) {
      setSettingsError(
        err?.userMessage || t("basic.saveFailed", "Save failed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const addNewStream = async () => {
    setSaving(true);
    setSettingsError("");
    setError("");
    try {
      const streamName = String(formData.streamName || "").trim();
      if (!streamName) {
        const message = t(
          "basic.validationRequired",
          "Required fields are missing.",
        );
        setSettingsError(message);
        setSaving(false);
        return;
      }
      const maxNumber = streams.reduce(
        (max, stream) => Math.max(max, Number(stream?.streamNumber || 0)),
        0,
      );
      const payload = {
        projectCode,
        streamType: "S",
        streamNumber: maxNumber + 1,
        streamName,
        streamDescription: String(formData.streamDescription || "").trim(),
      };
      await request("POST", "/api/projectstreams", payload);
      await syncWorkbenchFromServer();
      setSettingsOpen(false);
    } catch {
      const message = t("basic.saveFailed", "Save failed");
      setSettingsError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const removeStream = async (targetRow = settingsTarget) => {
    const streamId = targetRow?.raw?.projectStreamId;
    if (!streamId) return;

    const hasTasks = tasks.some(
      (task) => String(task?.projectStreamId || "") === String(streamId),
    );
    if (hasTasks) {
      setSettingsError(
        t(
          "projectPlanning.removeStreamBlocked",
          "Cannot remove stream with tasks attached.",
        ),
      );
      return;
    }

    setSaving(true);
    setSettingsError("");
    try {
      await request("DELETE", `/api/projectstreams/${streamId}`);
      await syncWorkbenchFromServer();
      setSettingsOpen(false);
    } catch {
      setSettingsError(t("basic.deleteFailed", "Delete failed"));
    } finally {
      setSaving(false);
    }
  };

  const toggleStreamTasks = (targetRow = settingsTarget) => {
    const streamId = String(targetRow?.raw?.projectStreamId || "");
    if (!streamId) return;
    const next = new Set(collapsedStreamIds);
    if (next.has(streamId)) next.delete(streamId);
    else next.add(streamId);
    setCollapsedStreamIds(next);
    refreshRows(streams, tasks, next);
  };

  const saveTaskInfo = async () => {
    const taskId = settingsTarget?.raw?.projectTaskId;
    if (!taskId) return;
    const typeMeta =
      taskTypeMetaByCode[
        String(formData.taskType || settingsTarget?.raw?.taskType || "").trim()
      ];
    const canEditStartDate =
      String(typeMeta?.editStartDate ?? "").trim() === "1";
    const taskDuration = Math.max(1, Number(formData.taskDuration || 1));
    const taskStartDateValue = canEditStartDate
      ? formData.taskStartDate
      : settingsTarget?.raw?.taskStartDate || formData.taskStartDate;
    const taskEndDateValue = toApiDate(
      addDays(taskStartDateValue, taskDuration),
    );
    const durationError = validateTaskDuration(
      formData.taskType || settingsTarget?.raw?.taskType,
      taskStartDateValue,
      taskEndDateValue,
    );
    if (durationError) {
      setSettingsError(durationError);
      return;
    }

    setSaving(true);
    setSettingsError("");
    try {
      const payload = {
        ...settingsTarget.raw,
        taskName: String(formData.taskName || "").trim(),
        taskType: String(
          formData.taskType || settingsTarget.raw.taskType || "",
        ).trim(),
        taskStatus: String(formData.taskStatus || "Not Started").trim(),
        taskStartDate: String(taskStartDateValue || "").trim(),
        taskDuration,
        taskEndDate: taskEndDateValue,
        remarks: String(formData.remarks || "").trim(),
        staffId: String(formData.staffId || "").trim() || null,
        parentTaskId: formData.parentTaskId
          ? Number(formData.parentTaskId)
          : null,
        milestoneTaskId: formData.milestoneTaskId
          ? Number(formData.milestoneTaskId)
          : null,
      };
      const calcRes = await request(
        "POST",
        "/api/projecttasks/calculate",
        payload,
      );
      const calculatedPayload = {
        ...payload,
        ...(calcRes?.data || {}),
      };
      await request("PUT", `/api/projecttasks/${taskId}`, calculatedPayload);
      await syncWorkbenchFromServer();
      setSettingsOpen(false);
    } catch {
      setSettingsError(t("basic.saveFailed", "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const saveMilestoneLink = async () => {
    const taskId = settingsTarget?.raw?.projectTaskId;
    if (!taskId) return;

    const milestoneTaskId = String(formData.milestoneTaskId || "").trim();
    if (milestoneTaskId) {
      const candidate = tasks.find(
        (task) => String(task?.projectTaskId || "") === milestoneTaskId,
      );
      if (!candidate || !isMilestoneTask(candidate)) {
        setSettingsError(
          t(
            "projectPlanning.milestoneTaskOnly",
            "Please select a milestone task.",
          ),
        );
        return;
      }
    }

    setSaving(true);
    setSettingsError("");
    try {
      const payload = {
        ...settingsTarget.raw,
        milestoneTaskId: milestoneTaskId ? Number(milestoneTaskId) : null,
      };
      await request("PUT", `/api/projecttasks/${taskId}`, payload);
      await syncWorkbenchFromServer();
      setSettingsOpen(false);
    } catch {
      setSettingsError(t("basic.saveFailed", "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const removeMilestoneLink = async () => {
    const taskId = settingsTarget?.raw?.projectTaskId;
    if (!taskId) return;

    setSaving(true);
    setSettingsError("");
    try {
      const payload = {
        ...settingsTarget.raw,
        milestoneTaskId: null,
      };
      await request("PUT", `/api/projecttasks/${taskId}`, payload);
      await syncWorkbenchFromServer();
      setSettingsOpen(false);
    } catch {
      setSettingsError(t("basic.saveFailed", "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const createChildTask = async () => {
    const source = settingsTarget?.raw;
    if (!source) return;
    if (!String(childTaskData.taskName || "").trim()) {
      setSettingsError(
        t("basic.validationRequired", "Required fields are missing."),
      );
      return;
    }
    if (!String(childTaskData.taskType || "").trim()) {
      setSettingsError(
        t("basic.validationRequired", "Required fields are missing."),
      );
      return;
    }

    const selectedTypeMeta =
      taskTypeMetaByCode[String(childTaskData.taskType || "").trim()];
    if (
      settingsTarget?.type === "stream" &&
      String(selectedTypeMeta?.createByStream ?? "").trim() !== "1"
    ) {
      setSettingsError(
        t(
          "projectPlanning.streamCreateTypeOnly",
          "This task type can only be created from a task.",
        ),
      );
      return;
    }
    if (
      settingsTarget?.type === "task" &&
      String(selectedTypeMeta?.createByStream ?? "").trim() !== "0"
    ) {
      setSettingsError(
        t(
          "projectPlanning.taskCreateTypeOnly",
          "This task type can only be created from a stream.",
        ),
      );
      return;
    }

    setSaving(true);
    setSettingsError("");
    try {
      const streamId =
        settingsTarget?.type === "stream"
          ? source.projectStreamId
          : source.projectStreamId;

      const chosenParentId =
        settingsTarget?.type === "task"
          ? String(source?.projectTaskId || "").trim()
          : String(childTaskData.attachToParentTaskId || "").trim();
      const parentTask = chosenParentId
        ? tasks.find(
            (task) => String(task?.projectTaskId || "") === chosenParentId,
          )
        : null;
      const baseEnd = parseDate(
        parentTask?.taskEndDate ||
          (settingsTarget?.type === "task" ? source.taskEndDate : ""),
      );
      const duration = Math.max(1, Number(childTaskData.durationDays || 1));
      const canEditStartDate =
        String(selectedTypeMeta?.editStartDate ?? "").trim() === "1";
      const manualStart = parseDate(childTaskData.taskStartDate);
      const start = canEditStartDate
        ? manualStart || (baseEnd ? new Date(baseEnd.getTime()) : new Date())
        : baseEnd
          ? new Date(baseEnd.getTime())
          : new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + (duration - 1) * DAY_MS);

      const durationError = validateTaskDuration(
        childTaskData.taskType,
        toApiDate(start),
        toApiDate(end),
      );
      if (durationError) {
        setSettingsError(durationError);
        setSaving(false);
        return;
      }

      const payload = {
        projectStreamId: streamId,
        taskType: String(childTaskData.taskType || "").trim(),
        taskName: String(childTaskData.taskName || "").trim(),
        parentTaskId: chosenParentId ? Number(chosenParentId) : null,
        milestoneTaskId: childTaskData.milestoneTaskId
          ? Number(childTaskData.milestoneTaskId)
          : null,
        staffId: String(childTaskData.staffId || "").trim() || null,
        taskDuration: duration,
        taskStartDate: toApiDate(start),
        taskEndDate: toApiDate(end),
        taskStatus: "Not Started",
      };

      const calcRes = await request(
        "POST",
        "/api/projecttasks/calculate",
        payload,
      );
      const calculatedPayload = {
        ...payload,
        ...(calcRes?.data || {}),
      };

      await request("POST", "/api/projecttasks", calculatedPayload);
      await syncWorkbenchFromServer();
      setSettingsOpen(false);
    } catch {
      setSettingsError(t("basic.saveFailed", "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const streamTaskCount =
    settingsTarget?.type === "stream"
      ? tasks.filter(
          (task) =>
            String(task?.projectStreamId || "") ===
            String(settingsTarget?.raw?.projectStreamId || ""),
        ).length
      : 0;

  const parentCandidates =
    settingsTarget?.type === "task"
      ? tasks.filter(
          (task) =>
            String(task?.projectTaskId || "") !==
            String(settingsTarget?.raw?.projectTaskId || ""),
        )
      : [];

  const isMilestoneTask = (task) => {
    const taskTypeCode = String(task?.taskType || "")
      .trim()
      .toLowerCase();
    const typeMeta = taskTypeMetaByCode[String(task?.taskType || "").trim()];
    const taskTypeDescription = String(typeMeta?.projectTaskDescription || "")
      .trim()
      .toLowerCase();
    return (
      taskTypeCode.includes("milestone") ||
      taskTypeDescription.includes("milestone")
    );
  };

  const getTaskTypeIcon = (task) => {
    const taskTypeCode = String(task?.taskType || "")
      .trim()
      .toUpperCase();
    const typeMeta = taskTypeMetaByCode[taskTypeCode];
    const description =
      typeMeta?.projectTaskDescription ||
      taskTypeCode ||
      t("projecttask.taskType", "Task Type");

    switch (taskTypeCode) {
      case "B":
        return {
          icon: LockOutlinedIcon,
          color: "text.secondary",
          label: description,
        };
      case "M":
        return {
          icon: FlagOutlinedIcon,
          color: "warning.main",
          label: description,
        };
      case "A":
        return {
          icon: AnchorIcon,
          color: "info.main",
          label: description,
        };
      case "S":
        return {
          icon: VerticalAlignTopIcon,
          color: "success.main",
          label: description,
        };
      case "E":
        return {
          icon: VerticalAlignBottomIcon,
          color: "success.main",
          label: description,
        };
      case "D":
        return {
          icon: ArrowForwardOutlinedIcon,
          color: "secondary.main",
          label: t(
            "projectPlanning.dependentAfterParentEnd",
            "Dependent task (starts after parent task ends)",
          ),
        };
      default:
        return {
          icon: TaskAltOutlinedIcon,
          color: "text.secondary",
          label: description,
        };
    }
  };

  const getTaskTypeDisplay = (taskTypeCode) => {
    const code = String(taskTypeCode || "").trim();
    if (!code) return "-";
    const typeMeta = taskTypeMetaByCode[code];
    if (!typeMeta) return code;
    return String(typeMeta.projectTaskDescription || "").trim() || code;
  };

  const getInventoryIconMeta = (inventoryType) => {
    const normalized = String(inventoryType || "")
      .trim()
      .toLowerCase();
    if (!normalized || normalized === "none") return null;

    if (normalized === "asset") {
      return {
        icon: HandymanOutlinedIcon,
        color: "warning.main",
        label: t("projectPlanning.inventoryAsset", "Asset required"),
      };
    }

    if (normalized === "stock") {
      return {
        icon: Inventory2OutlinedIcon,
        color: "info.main",
        label: t("projectPlanning.inventoryStock", "Stock required"),
      };
    }

    return {
      icon: AllInboxOutlinedIcon,
      color: "secondary.main",
      label: t("projectPlanning.inventoryAny", "Any inventory type"),
    };
  };

  const getRowInventoryType = (row) => {
    if (row?.type === "stream") return "asset";
    const taskTypeCode = String(row?.raw?.taskType || "")
      .trim()
      .toUpperCase();
    const typeMeta = taskTypeMetaByCode[taskTypeCode];
    return String(typeMeta?.inventoryType || "")
      .trim()
      .toLowerCase();
  };

  const getRowManpowerRequired = (row) => {
    if (row?.type === "stream") return 0;
    const taskTypeCode = String(row?.raw?.taskType || "")
      .trim()
      .toUpperCase();
    const typeMeta = taskTypeMetaByCode[taskTypeCode];
    return Number(typeMeta?.manpowerRequired || 0);
  };

  const getInventoryPlanningKey = (row) => {
    if (row?.type === "stream") {
      return `stream-${String(row?.raw?.projectStreamId || "")}`;
    }
    return `task-${String(row?.raw?.projectTaskId || "")}`;
  };

  const stockProductOptions = useMemo(
    () =>
      inventoryProducts.filter(
        (product) =>
          String(product?.category || product?.productCategory || "")
            .trim()
            .toUpperCase() === "C",
      ),
    [inventoryProducts],
  );

  const assetProductOptions = useMemo(
    () =>
      inventoryProducts.filter(
        (product) =>
          String(product?.category || product?.productCategory || "")
            .trim()
            .toUpperCase() === "A",
      ),
    [inventoryProducts],
  );

  const getBundleId = (bundle) =>
    String(
      bundle?.productBundleId ||
        bundle?.bundleId ||
        bundle?.id ||
        bundle?.productbundleId ||
        "",
    ).trim();

  const getBundleName = (bundle) =>
    String(bundle?.bundleName || bundle?.productBundleName || "").trim() ||
    getBundleId(bundle);

  const getBundleMembersText = (
    bundle,
    productsList = inventoryProducts,
    fallbackText = "",
  ) => {
    const members = Array.isArray(bundle?.bundleMembers)
      ? bundle.bundleMembers
      : [];
    if (members.length === 0) return fallbackText;

    return members
      .map((member) => {
        const productId = String(
          member?.productId ?? member?.id ?? member ?? "",
        ).trim();
        if (!productId) return "";
        const quantity = Math.max(1, Number(member?.quantity || 1));
        const product = productsList.find(
          (item) => String(item?.productId || "") === productId,
        );
        const name =
          String(product?.productName || "").trim() ||
          String(product?.productCode || "").trim() ||
          productId;
        return quantity > 1 ? `${name} x${quantity}` : name;
      })
      .filter(Boolean)
      .join(", ");
  };

  const getInventoryRows = (section) => {
    const key = getInventoryPlanningKey(inventoryPlanningTarget);
    return inventoryPlanningRows?.[section]?.[key] || [];
  };

  const getAvailableProductOptions = (section, options) => {
    const selectedIds = new Set(
      getInventoryRows(section).map((item) => String(item?.productId || "")),
    );
    return options
      .filter(
        (product) =>
          !selectedIds.has(String(product?.productId || "")) ||
          String(product?.productId || "") ===
            String(inventoryDraft.productId || ""),
      )
      .sort((a, b) => {
        const labelA = String(
          a?.productName || a?.productCode || a?.productId || "",
        ).trim();
        const labelB = String(
          b?.productName || b?.productCode || b?.productId || "",
        ).trim();
        return labelA.localeCompare(labelB, undefined, { sensitivity: "base" });
      });
  };

  const getAvailableBundleOptions = () => {
    const selectedIds = new Set(
      getInventoryRows("bundle").map((item) => String(item?.bundleId || "")),
    );
    return inventoryBundles
      .filter((bundle) => {
        const bundleId = getBundleId(bundle);
        if (!bundleId) return false;
        return (
          !selectedIds.has(bundleId) ||
          bundleId === String(inventoryDraft.bundleId || "")
        );
      })
      .sort((a, b) =>
        getBundleName(a).localeCompare(getBundleName(b), undefined, {
          sensitivity: "base",
        }),
      );
  };

  const getPlanningTaskId = (target, section) => {
    if (target?.type === "task") {
      return Number(target?.raw?.projectTaskId || 0) || null;
    }
    if (target?.type !== "stream") return null;
    if (section === "stock") return null;

    const streamId = String(target?.raw?.projectStreamId || "").trim();
    const streamTasks = tasks
      .filter((task) => String(task?.projectStreamId || "").trim() === streamId)
      .sort((a, b) => {
        const aStart = parseDate(a?.taskStartDate);
        const bStart = parseDate(b?.taskStartDate);
        if (!aStart && !bStart) return 0;
        if (!aStart) return 1;
        if (!bStart) return -1;
        return aStart.getTime() - bStart.getTime();
      });

    return Number(streamTasks[0]?.projectTaskId || 0) || null;
  };

  const getPlanningConfig = (section, target = inventoryPlanningTarget) => {
    const taskId = getPlanningTaskId(target, section);
    if (!taskId) return null;

    if (section === "stock") {
      return {
        listEndpoint: `/api/projectstocks/task/${taskId}`,
        createEndpoint: "/api/projectstocks",
        updateEndpoint: (id) => `/api/projectstocks/${id}`,
        deleteEndpoint: (id) => `/api/projectstocks/${id}`,
        idField: "projectStockId",
        toPayload: (row) => ({
          projectStockId: row?.apiId || undefined,
          projectTaskId: taskId,
          productId: Number(row.productId),
          quantity: Number(row.quantity || 1),
        }),
      };
    }

    if (section === "asset") {
      return {
        listEndpoint: `/api/projectassets/task/${taskId}`,
        createEndpoint: "/api/projectassets",
        updateEndpoint: (id) => `/api/projectassets/${id}`,
        deleteEndpoint: (id) => `/api/projectassets/${id}`,
        idField: "projectStockId",
        toPayload: (row) => ({
          projectStockId: row?.apiId || undefined,
          projectTaskId: taskId,
          productId: Number(row.productId),
          quantity: Number(row.quantity || 1),
        }),
      };
    }

    return {
      listEndpoint: `/api/projectbundles/task/${taskId}`,
      createEndpoint: "/api/projectbundles",
      updateEndpoint: (id) => `/api/projectbundles/${id}`,
      deleteEndpoint: (id) => `/api/projectbundles/${id}`,
      idField: "projectBundleId",
      toPayload: (row) => ({
        projectBundleId: row?.apiId || undefined,
        projectTaskId: taskId,
        bundleId: Number(row.bundleId),
        quantity: Number(row.quantity || 1),
      }),
    };
  };

  const upsertInventoryRows = (section, nextRows) => {
    const key = getInventoryPlanningKey(inventoryPlanningTarget);
    if (!key) return;
    setInventoryPlanningRows((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: nextRows,
      },
    }));
  };

  const openInventoryPlanningDialog = async (row) => {
    const target = row || null;
    if (!target) return;
    setInventoryPlanningTarget(target);
    setInventoryPlanningError("");
    setInventoryPlanningOpen(true);
    setInventoryPlanningTab(target?.type === "stream" ? "asset" : "stock");
    setInventoryDraft({
      productId: "",
      quantity: 1,
      bundleId: "",
      bundleQuantity: 1,
    });

    setInventoryPlanningLoading(true);
    try {
      const [productsRes, bundlesRes] = await Promise.all([
        request("GET", "/api/products").catch(() => ({ data: [] })),
        request("GET", "/api/productbundles").catch(() => ({ data: [] })),
      ]);
      setInventoryProducts(
        Array.isArray(productsRes?.data) ? productsRes.data : [],
      );
      setInventoryBundles(
        Array.isArray(bundlesRes?.data) ? bundlesRes.data : [],
      );

      const sectionsToLoad =
        target?.type === "stream"
          ? ["asset", "bundle"]
          : ["stock", "asset", "bundle"];

      for (const section of sectionsToLoad) {
        const config = getPlanningConfig(section, target);
        if (!config) {
          upsertInventoryRows(section, []);
          continue;
        }
        const res = await request("GET", config.listEndpoint).catch(() => ({
          data: [],
        }));
        const rows = Array.isArray(res?.data) ? res.data : [];

        if (section === "bundle") {
          const fetchedBundles = Array.isArray(bundlesRes?.data)
            ? bundlesRes.data
            : [];
          const fetchedProducts = Array.isArray(productsRes?.data)
            ? productsRes.data
            : [];
          upsertInventoryRows(
            "bundle",
            rows.map((item) => ({
              ...(item || {}),
              apiId: item?.[config.idField],
              bundleId: String(item?.bundleId || "").trim(),
              bundleName:
                getBundleName(
                  fetchedBundles.find(
                    (bundle) =>
                      getBundleId(bundle) === String(item?.bundleId || ""),
                  ),
                ) || String(item?.bundleId || "").trim(),
              bundleMembersText: getBundleMembersText(
                fetchedBundles.find(
                  (bundle) =>
                    getBundleId(bundle) === String(item?.bundleId || ""),
                ),
                fetchedProducts,
                String(item?.bundleMembersText || "").trim(),
              ),
              quantity: Number(item?.quantity || 1),
            })),
          );
        } else {
          upsertInventoryRows(
            section,
            rows.map((item) => {
              const productId = String(item?.productId || "").trim();
              const matched = (
                Array.isArray(productsRes?.data) ? productsRes.data : []
              ).find(
                (product) => String(product?.productId || "") === productId,
              );
              return {
                apiId: item?.[config.idField],
                productId,
                productCode: String(matched?.productCode || "").trim(),
                productName:
                  String(matched?.productName || "").trim() || productId,
                quantity: Number(item?.quantity || 1),
              };
            }),
          );
        }
      }
    } catch {
      setInventoryPlanningError(
        t("projectPlanning.inventoryLoadFailed", "Failed to load inventory."),
      );
      setInventoryProducts([]);
      setInventoryBundles([]);
    } finally {
      setInventoryPlanningLoading(false);
    }
  };

  const addPlanningProduct = async (section, options) => {
    const productId = String(inventoryDraft.productId || "").trim();
    const quantity = Math.max(1, Number(inventoryDraft.quantity || 1));
    if (!productId) return;

    const picked = options.find(
      (product) => String(product?.productId || "") === productId,
    );
    if (!picked) return;

    const currentRows = getInventoryRows(section);
    const existsAt = currentRows.findIndex(
      (item) => String(item?.productId || "") === productId,
    );

    const nextRows = [...currentRows];
    const rowData = {
      apiId: existsAt >= 0 ? currentRows[existsAt]?.apiId : undefined,
      productId,
      productCode: String(picked?.productCode || "").trim(),
      productName: String(picked?.productName || "").trim() || productId,
      quantity,
    };

    const config = getPlanningConfig(section);
    if (!config) {
      setInventoryPlanningError(
        t(
          "projectPlanning.inventoryTaskMissing",
          "No task is available to save this planning section.",
        ),
      );
      return;
    }

    try {
      const payload = config.toPayload(rowData);
      if (rowData.apiId) {
        await request("PUT", config.updateEndpoint(rowData.apiId), payload);
      } else {
        const createRes = await request("POST", config.createEndpoint, payload);
        rowData.apiId =
          createRes?.data?.[config.idField] ||
          createRes?.data?.id ||
          createRes?.data?.ID ||
          undefined;
      }
      setInventoryPlanningError("");
    } catch {
      setInventoryPlanningError(
        t("projectPlanning.inventorySaveFailed", "Failed to save inventory."),
      );
      return;
    }

    if (existsAt >= 0) nextRows[existsAt] = rowData;
    else nextRows.push(rowData);

    upsertInventoryRows(section, nextRows);
    setInventoryDraft((prev) => ({ ...prev, productId: "", quantity: 1 }));
  };

  const addPlanningBundle = async () => {
    const bundleId = String(inventoryDraft.bundleId || "").trim();
    const quantity = Math.max(1, Number(inventoryDraft.bundleQuantity || 1));
    if (!bundleId) return;

    const picked = inventoryBundles.find(
      (bundle) => getBundleId(bundle) === bundleId,
    );
    const currentRows = getInventoryRows("bundle");
    const existsAt = currentRows.findIndex(
      (item) => String(item?.bundleId || "") === bundleId,
    );

    const nextRows = [...currentRows];
    const rowData = {
      ...(picked || {}),
      apiId: existsAt >= 0 ? currentRows[existsAt]?.apiId : undefined,
      bundleId,
      bundleName: picked ? getBundleName(picked) : bundleId,
      bundleMembersText: picked
        ? getBundleMembersText(picked, inventoryProducts)
        : "",
      quantity,
    };

    const config = getPlanningConfig("bundle");
    if (!config) {
      setInventoryPlanningError(
        t(
          "projectPlanning.inventoryTaskMissing",
          "No task is available to save this planning section.",
        ),
      );
      return;
    }

    try {
      const payload = config.toPayload(rowData);
      if (rowData.apiId) {
        await request("PUT", config.updateEndpoint(rowData.apiId), payload);
      } else {
        const createRes = await request("POST", config.createEndpoint, payload);
        rowData.apiId =
          createRes?.data?.[config.idField] ||
          createRes?.data?.id ||
          createRes?.data?.ID ||
          undefined;
      }
      setInventoryPlanningError("");
    } catch {
      setInventoryPlanningError(
        t("projectPlanning.inventorySaveFailed", "Failed to save inventory."),
      );
      return;
    }

    if (existsAt >= 0) nextRows[existsAt] = rowData;
    else nextRows.push(rowData);

    upsertInventoryRows("bundle", nextRows);
    setInventoryDraft((prev) => ({ ...prev, bundleId: "", bundleQuantity: 1 }));
  };

  const removePlanningRow = (section, keyName, keyValue) => {
    const currentRows = getInventoryRows(section);
    const targetRow = currentRows.find(
      (item) => String(item?.[keyName] || "") === String(keyValue || ""),
    );
    const nextRows = currentRows.filter(
      (item) => String(item?.[keyName] || "") !== String(keyValue || ""),
    );

    const deleteRemote = async () => {
      if (!targetRow?.apiId) return true;
      const config = getPlanningConfig(section);
      if (!config) return false;
      try {
        await request("DELETE", config.deleteEndpoint(targetRow.apiId));
        return true;
      } catch {
        setInventoryPlanningError(
          t(
            "projectPlanning.inventoryDeleteFailed",
            "Failed to delete inventory.",
          ),
        );
        return false;
      }
    };

    deleteRemote().then((ok) => {
      if (!ok) return;
      setInventoryPlanningError("");
      upsertInventoryRows(section, nextRows);
    });
  };

  const onTaskIconHoverStart = (task) => {
    const currentTaskId = String(task?.projectTaskId || "").trim();
    if (!currentTaskId) return;

    const parentTaskId = String(task?.parentTaskId || "").trim();
    const linkedIds = new Set();

    const milestoneTargetId = String(task?.milestoneTaskId || "").trim();
    if (milestoneTargetId) linkedIds.add(milestoneTargetId);

    tasks.forEach((candidate) => {
      const candidateId = String(candidate?.projectTaskId || "").trim();
      if (!candidateId || candidateId === currentTaskId) return;
      if (
        String(candidate?.parentTaskId || "").trim() === currentTaskId ||
        String(candidate?.milestoneTaskId || "").trim() === currentTaskId
      ) {
        linkedIds.add(candidateId);
      }
    });

    setHoveredParentTaskId(parentTaskId);
    setHoveredLinkedTaskIds(linkedIds);
  };

  const onTaskIconHoverEnd = () => {
    setHoveredParentTaskId("");
    setHoveredLinkedTaskIds(new Set());
  };

  const milestoneCandidates =
    settingsTarget?.type === "task"
      ? tasks.filter(
          (task) =>
            String(task?.projectTaskId || "") !==
              String(settingsTarget?.raw?.projectTaskId || "") &&
            isMilestoneTask(task),
        )
      : [];

  const moveSourceTask = moveSourceTaskId
    ? tasks.find(
        (task) =>
          String(task?.projectTaskId || "") === String(moveSourceTaskId),
      )
    : null;

  const hasChildTask = (taskId) =>
    tasks.some(
      (task) => String(task?.parentTaskId || "") === String(taskId || ""),
    );

  const hasTaskDependencyReference = (taskId) =>
    tasks.some(
      (task) =>
        String(task?.parentTaskId || "") === String(taskId || "") ||
        String(task?.milestoneTaskId || "") === String(taskId || ""),
    );

  const taskDeleteBlockedReason = (taskRow) => {
    const taskId = taskRow?.raw?.projectTaskId;
    const taskTypeCode = String(taskRow?.raw?.taskType || "").trim();
    const typeMeta = taskTypeMetaByCode[taskTypeCode];

    if (String(typeMeta?.canDelete ?? "").trim() === "0") {
      return t(
        "projectPlanning.removeTaskBlockedType",
        "This task type cannot be deleted.",
      );
    }
    if (hasTaskDependencyReference(taskId)) {
      return t(
        "projectPlanning.removeTaskBlockedDependency",
        "Cannot remove task with dependent child or milestone links.",
      );
    }
    if (String(taskTypeCode).toUpperCase() === "B") {
      return t(
        "projectPlanning.removeTaskBlockedBaseline",
        "Baseline task cannot be removed.",
      );
    }
    return "";
  };

  const isDescendant = (candidateTaskId, sourceTaskId) => {
    const childMap = new Map();
    tasks.forEach((task) => {
      const parent = String(task?.parentTaskId || "");
      if (!parent) return;
      if (!childMap.has(parent)) childMap.set(parent, []);
      childMap.get(parent).push(String(task?.projectTaskId || ""));
    });

    const stack = [String(sourceTaskId || "")];
    const seen = new Set();
    while (stack.length > 0) {
      const current = stack.pop();
      if (seen.has(current)) continue;
      seen.add(current);
      const children = childMap.get(current) || [];
      if (children.includes(String(candidateTaskId || ""))) return true;
      children.forEach((child) => stack.push(child));
    }
    return false;
  };

  const isValidMoveTarget = (row) => {
    if (!moveSourceTaskId || row?.type !== "task") return false;
    const targetId = String(row?.raw?.projectTaskId || "");
    if (!targetId || targetId === String(moveSourceTaskId)) return false;
    if (isDescendant(targetId, moveSourceTaskId)) return false;
    return true;
  };

  const moveTaskToTargetParent = async (targetRow) => {
    const source = tasks.find(
      (task) =>
        String(task?.projectTaskId || "") === String(moveSourceTaskId || ""),
    );
    if (!source) return;
    const targetParentId = Number(targetRow?.raw?.projectTaskId);

    setSaving(true);
    setError("");
    try {
      const payload = {
        ...source,
        parentTaskId: targetParentId,
      };
      const calcRes = await request(
        "POST",
        "/api/projecttasks/calculate",
        payload,
      );
      const calculatedPayload = {
        ...payload,
        ...(calcRes?.data || {}),
      };
      await request(
        "PUT",
        `/api/projecttasks/${source.projectTaskId}`,
        calculatedPayload,
      );
      await syncWorkbenchFromServer();
      clearMoveMode();
    } catch {
      setError(t("basic.saveFailed", "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "96px 1fr" },
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ArrowBackIcon fontSize="small" />}
                  onClick={() => navigate("/projectplanning")}
                  sx={{ minWidth: 0, px: 1 }}
                >
                  {t("basic.back", "Back")}
                </Button>
              </Box>

              <Box>
                <Box
                  sx={{
                    mb: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography variant="h6">
                    {t("projectPlanning.projectSummary", "Project Planning")}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label={t(
                      "projectPlanning.workbenchHelp",
                      "Project Workbench Help",
                    )}
                    onClick={() => setWorkbenchHelpOpen(true)}
                  >
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  <Typography variant="body2">
                    <strong>{t("project.projectCode", "Project Code")}:</strong>{" "}
                    {project?.projectCode || projectCode}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t("project.projectName", "Project Name")}:</strong>{" "}
                    {project?.projectName || "-"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>
                      {t("project.customerName", "Customer Name")}:
                    </strong>{" "}
                    {customerDisplayName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t("project.startDate", "Start Date")}:</strong>{" "}
                    {formatDate(project?.startDate)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t("project.endDate", "End Date")}:</strong>{" "}
                    {formatDate(project?.endDate)}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <strong>{t("project.status", "Status")}:</strong>
                    <Chip
                      label={
                        statusLabel[
                          String(project?.status || "").toUpperCase()
                        ] ||
                        project?.status ||
                        "-"
                      }
                      color={toStatusColor(project?.status)}
                      size="small"
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              borderRadius: 2,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.25,
                borderBottom: "1px solid",
                borderColor: "divider",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="subtitle1" sx={{ lineHeight: 1.25 }}>
                  {t("projectPlanning.ganttTitle", "Streams & Tasks Timeline")}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={() =>
                    openAddStreamDialog({
                      type: "stream",
                      raw: { streamType: "S" },
                    })
                  }
                  sx={{ minWidth: 140, fontWeight: 600 }}
                >
                  {t("projectPlanning.addStream", "Add Stream")}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setInventoryOverviewOpen(true)}
                  sx={{ minWidth: 170, fontWeight: 600 }}
                >
                  {t("projectPlanning.inventoryOverview", "Inventory Overview")}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setManpowerOverviewOpen(true)}
                  sx={{ minWidth: 170, fontWeight: 600 }}
                >
                  {t("projectPlanning.manpowerOverview", "Manpower Overview")}
                </Button>
              </Box>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, val) => {
                  if (val) setViewMode(val);
                }}
                size="small"
              >
                <ToggleButton value="day">
                  {t("projectPlanning.viewDay", "Day")}
                </ToggleButton>
                <ToggleButton value="week">
                  {t("projectPlanning.viewWeek", "Week")}
                </ToggleButton>
                <ToggleButton value="month">
                  {t("projectPlanning.viewMonth", "Month")}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {moveSourceTaskId && (
              <Alert
                severity="info"
                sx={{ mx: 2, mt: 1.5, mb: 0.5 }}
                action={
                  <Button color="inherit" size="small" onClick={clearMoveMode}>
                    {t("basic.cancel", "Cancel")}
                  </Button>
                }
              >
                {t("projectPlanning.moveModeActive", "Move mode active")}
                {": "}
                <strong>{moveSourceTask?.taskName || moveSourceTaskId}</strong>
                {". "}
                {t(
                  "projectPlanning.selectMoveTarget",
                  "Hover valid tasks for 'Move here' and click to move.",
                )}
              </Alert>
            )}

            {rows.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Alert severity="info">
                  {t(
                    "projectPlanning.noStreamsTasks",
                    "No project streams/tasks found for this project.",
                  )}
                </Alert>
              </Box>
            ) : (
              <Box
                sx={{ overflow: "auto", maxHeight: "58vh" }}
                ref={ganttScrollRef}
              >
                <Box sx={{ minWidth: 420 + timelineWidth }}>
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
                        {t("projectPlanning.timeline", "Timeline")}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", bgcolor: "background.default" }}
                    >
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
                        {t("projectPlanning.leftHeaderName", "Name")}
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        textAlign="center"
                      >
                        {t("basic.settings", "Settings")}
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {t("projectPlanning.leftHeaderStart", "Start")}
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {t("projectPlanning.leftHeaderEnd", "End")}
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
                            borderLeft: "1px solid",
                            borderColor: (
                              viewMode === "day" ? col.isMonthStart : idx === 0
                            )
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

                  {/* Data rows */}
                  {rows.map((row) => {
                    const geo = getTaskBarGeometry(row);
                    const validMoveTarget = isValidMoveTarget(row);
                    const taskTypeIconMeta =
                      row.type === "task" ? getTaskTypeIcon(row.raw) : null;
                    const inventoryIconMeta = getInventoryIconMeta(
                      getRowInventoryType(row),
                    );
                    const manpowerRequired = getRowManpowerRequired(row);
                    const rowTaskId = String(
                      row?.raw?.projectTaskId || "",
                    ).trim();
                    const isParentHighlight =
                      row.type === "task" &&
                      rowTaskId &&
                      rowTaskId === hoveredParentTaskId;
                    const isLinkedHighlight =
                      row.type === "task" &&
                      hoveredLinkedTaskIds.has(rowTaskId);
                    const taskTypeCode = String(row?.raw?.taskType || "")
                      .trim()
                      .toUpperCase();
                    const isMilestoneTaskType =
                      row.type === "task" && taskTypeCode === "M";
                    return (
                      <Box
                        key={row.id}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: `420px ${timelineWidth}px`,
                          borderTop: "1px solid",
                          borderColor: "divider",
                          minHeight: 36,
                        }}
                      >
                        <Box
                          sx={{
                            px: 1,
                            py: 0.6,
                            display: "grid",
                            gridTemplateColumns:
                              "minmax(0, 1fr) 54px 84px 84px",
                            gap: 1,
                            alignItems: "center",
                            bgcolor: isParentHighlight
                              ? "info.light"
                              : isLinkedHighlight
                                ? "success.light"
                                : row.type === "stream"
                                  ? "var(--color-gray-100)"
                                  : "background.paper",
                            cursor: validMoveTarget ? "pointer" : "default",
                            position: "sticky",
                            left: 0,
                            zIndex: 2,
                            borderRight: "1px solid",
                            borderColor: "divider",
                          }}
                          onClick={() => {
                            if (validMoveTarget) moveTaskToTargetParent(row);
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: row.type === "stream" ? 700 : 400,
                                pl: row.type === "task" ? 2 : 0,
                                fontSize: "0.78rem",
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              {taskTypeIconMeta && (
                                <Box
                                  component="span"
                                  onMouseEnter={() =>
                                    onTaskIconHoverStart(row.raw)
                                  }
                                  onMouseLeave={onTaskIconHoverEnd}
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    color: taskTypeIconMeta.color,
                                    flexShrink: 0,
                                  }}
                                >
                                  {(() => {
                                    const TypeIcon = taskTypeIconMeta.icon;
                                    return <TypeIcon fontSize="inherit" />;
                                  })()}
                                </Box>
                              )}
                              <Tooltip
                                title={
                                  <Box>
                                    {validMoveTarget && (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          display: "block",
                                          fontWeight: 700,
                                        }}
                                      >
                                        {t(
                                          "projectPlanning.moveHere",
                                          "Move here",
                                        )}
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
                                        <Typography
                                          variant="caption"
                                          sx={{ display: "block" }}
                                        >
                                          {t(
                                            "projectstream.streamType",
                                            "Stream Type",
                                          )}
                                          : {row?.raw?.streamType || "-"}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{ display: "block" }}
                                        >
                                          {t(
                                            "projectPlanning.taskCount",
                                            "Task Count",
                                          )}
                                          :{" "}
                                          {
                                            tasks.filter(
                                              (task) =>
                                                String(
                                                  task?.projectStreamId || "",
                                                ) ===
                                                String(
                                                  row?.raw?.projectStreamId ||
                                                    "",
                                                ),
                                            ).length
                                          }
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
                                        <Typography
                                          variant="caption"
                                          sx={{ display: "block" }}
                                        >
                                          {t(
                                            "projecttask.taskType",
                                            "Task Type",
                                          )}
                                          :{" "}
                                          {getTaskTypeDisplay(
                                            row?.raw?.taskType,
                                          )}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{ display: "block" }}
                                        >
                                          {t(
                                            "projecttask.taskStatus",
                                            "Task Status",
                                          )}
                                          : {row?.raw?.taskStatus || "-"}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{ display: "block" }}
                                        >
                                          {t(
                                            "projecttask.taskDuration",
                                            "Task Duration (days)",
                                          )}
                                          :{" "}
                                          {row?.raw?.taskDuration ||
                                            getDurationDays(
                                              row?.raw?.taskStartDate,
                                              row?.raw?.taskEndDate,
                                            ) ||
                                            "-"}
                                        </Typography>
                                      </>
                                    )}
                                  </Box>
                                }
                              >
                                <Box component="span">{row.name}</Box>
                              </Tooltip>
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "18px 18px 18px",
                              justifyItems: "center",
                              alignItems: "center",
                              width: 54,
                            }}
                          >
                            <Box
                              sx={{
                                width: 18,
                                height: 18,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={(event) =>
                                  openSettingsMenu(event, row)
                                }
                                aria-label={t("basic.settings", "Settings")}
                                sx={{
                                  width: 16,
                                  height: 16,
                                  color: "text.secondary",
                                  opacity: 0.62,
                                  p: 0,
                                  m: "1px",
                                  "&:hover": {
                                    opacity: 0.85,
                                    bgcolor: "action.hover",
                                  },
                                }}
                              >
                                <SettingsIcon sx={{ fontSize: "0.875rem" }} />
                              </IconButton>
                            </Box>

                            {inventoryIconMeta ? (
                              <Tooltip
                                title={t(
                                  "projectPlanning.openInventoryPlanning",
                                  "Open inventory planning",
                                )}
                              >
                                <IconButton
                                  size="small"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openInventoryPlanningDialog(row);
                                  }}
                                  sx={{
                                    width: 16,
                                    height: 16,
                                    color: inventoryIconMeta.color,
                                    p: 0,
                                    m: "1px",
                                    "&:hover": {
                                      bgcolor: "action.hover",
                                    },
                                  }}
                                >
                                  {(() => {
                                    const InventoryIcon =
                                      inventoryIconMeta.icon;
                                    return (
                                      <InventoryIcon
                                        sx={{ fontSize: "0.875rem" }}
                                      />
                                    );
                                  })()}
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Box
                                component="span"
                                sx={{
                                  width: 18,
                                  height: 18,
                                  display: "inline-flex",
                                  flexShrink: 0,
                                  m: "1px",
                                }}
                              />
                            )}

                            {manpowerRequired > 0 ? (
                              <Box
                                component="span"
                                sx={{
                                  width: 18,
                                  height: 18,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "error.main",
                                  flexShrink: 0,
                                  m: "1px",
                                }}
                              >
                                <Groups2OutlinedIcon
                                  sx={{ fontSize: "0.875rem" }}
                                />
                              </Box>
                            ) : (
                              <Box
                                component="span"
                                sx={{
                                  width: 18,
                                  height: 18,
                                  display: "inline-flex",
                                  flexShrink: 0,
                                  m: "1px",
                                }}
                              />
                            )}
                          </Box>
                          <Typography variant="caption">
                            {formatDate(row.startDate)}
                          </Typography>
                          <Typography variant="caption">
                            {formatDate(row.endDate)}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            position: "relative",
                            backgroundImage: `repeating-linear-gradient(to right, transparent, transparent ${colWidth - 1}px, rgba(0,0,0,0.06) ${colWidth - 1}px, rgba(0,0,0,0.06) ${colWidth}px)`,
                          }}
                        >
                          {geo && !isMilestoneTaskType && (
                            <Box
                              sx={{
                                position: "absolute",
                                left: geo.left,
                                top: "50%",
                                transform: "translateY(-50%)",
                                height: row.type === "stream" ? 14 : 9,
                                width: geo.width,
                                borderRadius: row.type === "stream" ? 1 : 999,
                                bgcolor: isParentHighlight
                                  ? "info.main"
                                  : isLinkedHighlight
                                    ? "success.main"
                                    : row.type === "stream"
                                      ? "transparent"
                                      : "secondary.main",
                                border:
                                  row.type === "stream" ? "2px solid" : "none",
                                borderColor: isParentHighlight
                                  ? "info.dark"
                                  : isLinkedHighlight
                                    ? "success.dark"
                                    : row.type === "stream"
                                      ? "primary.main"
                                      : "transparent",
                                opacity: row.type === "stream" ? 1 : 0.65,
                              }}
                            />
                          )}
                          {geo && isMilestoneTaskType && (
                            <Box
                              sx={{
                                position: "absolute",
                                left: geo.left + Math.max(geo.width / 2 - 5, 0),
                                top: "50%",
                                width: 10,
                                height: 10,
                                transform: "translateY(-50%) rotate(45deg)",
                                bgcolor: "secondary.main",
                                border: "1px solid",
                                borderColor: "secondary.dark",
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>

          <Dialog
            open={workbenchHelpOpen}
            onClose={() => setWorkbenchHelpOpen(false)}
            fullWidth
            maxWidth="md"
          >
            <DialogTitle>
              {t("projectPlanning.workbenchHelp", "Project Workbench Help")}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                <Typography variant="body2">
                  {t(
                    "projectPlanning.helpIntro",
                    "Use Project Workbench to plan streams and tasks, manage dependencies, and review the timeline in Day/Week/Month views.",
                  )}
                </Typography>
                <Typography variant="subtitle2">
                  {t(
                    "projectPlanning.helpSectionNavigation",
                    "Navigation & Layout",
                  )}
                </Typography>
                <Typography variant="body2">
                  {t(
                    "projectPlanning.helpNavigationBody",
                    "Use Back to return to project planning. The left panel stays fixed while the timeline scrolls horizontally.",
                  )}
                </Typography>
                <Typography variant="subtitle2">
                  {t("projectPlanning.helpSectionTimeline", "Timeline Views")}
                </Typography>
                <Typography variant="body2">
                  {t(
                    "projectPlanning.helpTimelineBody",
                    "Switch between Day, Week, and Month. Milestone tasks render as diamonds; other task types render as bars.",
                  )}
                </Typography>
                <Typography variant="subtitle2">
                  {t("projectPlanning.helpSectionActions", "Row Actions")}
                </Typography>
                <Typography variant="body2">
                  {t(
                    "projectPlanning.helpActionsBody",
                    "Open the settings menu on each stream or task row to create tasks, edit details, link milestones, move tasks, or remove items.",
                  )}
                </Typography>
                <Typography variant="subtitle2">
                  {t(
                    "projectPlanning.helpSectionDependencies",
                    "Dependencies & Highlights",
                  )}
                </Typography>
                <Typography variant="body2">
                  {t(
                    "projectPlanning.helpDependenciesBody",
                    "Hover task type icons to highlight parent and linked tasks. Hover task names to view task details.",
                  )}
                </Typography>
                <Typography variant="subtitle2">
                  {t("projectPlanning.helpSectionRules", "Create/Edit Rules")}
                </Typography>
                <Typography variant="body2">
                  {t(
                    "projectPlanning.helpRulesBody",
                    "Task type, duration limits, start-date editability, and delete permissions are controlled by task-type settings.",
                  )}
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setWorkbenchHelpOpen(false)}>
                {t("basic.close", "Close")}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={settingsOpen}
            onClose={closeSettings}
            fullWidth
            maxWidth="md"
          >
            <DialogTitle>
              {dialogMode === "add-stream"
                ? t("projectPlanning.addStream", "Add Stream")
                : dialogMode === "add-task"
                  ? t("projectPlanning.createTask", "Create Task")
                  : settingsTarget?.type === "stream"
                    ? t("projectPlanning.streamSettings", "Stream Settings")
                    : t("projectPlanning.taskSettings", "Task Settings")}
            </DialogTitle>
            <DialogContent dividers>
              {settingsError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {settingsError}
                </Alert>
              )}

              {dialogMode === "add-stream" && (
                <Stack spacing={2}>
                  <TextField
                    label={t("projectstream.streamName", "Stream Name")}
                    value={formData.streamName || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        streamName: e.target.value,
                      }))
                    }
                    size="small"
                    fullWidth
                    autoFocus
                    required
                  />
                  <TextField
                    label={t(
                      "projectstream.streamDescription",
                      "Stream Description",
                    )}
                    value={formData.streamDescription || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        streamDescription: e.target.value,
                      }))
                    }
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                  />
                </Stack>
              )}

              {dialogMode === "edit-stream" &&
                settingsTarget?.type === "stream" && (
                  <Stack spacing={2}>
                    <TextField
                      label={t("projectstream.streamName", "Stream Name")}
                      value={formData.streamName || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          streamName: e.target.value,
                        }))
                      }
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label={t(
                        "projectstream.streamDescription",
                        "Stream Description",
                      )}
                      value={formData.streamDescription || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          streamDescription: e.target.value,
                        }))
                      }
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                    />
                  </Stack>
                )}

              {dialogMode === "edit-task" &&
                settingsTarget?.type === "task" && (
                  <Stack spacing={2}>
                    <TextField
                      label={t("projecttask.taskName", "Task Name")}
                      value={formData.taskName || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          taskName: e.target.value,
                        }))
                      }
                      size="small"
                      fullWidth
                    />

                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.5}
                    >
                      <TextField
                        label={t("projecttask.taskType", "Task Type")}
                        value={(() => {
                          const taskType =
                            taskTypeMetaByCode[
                              String(formData.taskType || "").trim()
                            ];
                          if (!taskType) return formData.taskType || "";
                          return `${taskType.projectTaskCode}${taskType.projectTaskDescription ? ` - ${taskType.projectTaskDescription}` : ""}`;
                        })()}
                        size="small"
                        fullWidth
                        disabled
                      />
                      <FormControl size="small" fullWidth>
                        <InputLabel>
                          {t("projecttask.taskStatus", "Task Status")}
                        </InputLabel>
                        <Select
                          label={t("projecttask.taskStatus", "Task Status")}
                          value={formData.taskStatus || "Not Started"}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              taskStatus: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value="Not Started">Not Started</MenuItem>
                          <MenuItem value="In Progress">In Progress</MenuItem>
                          <MenuItem value="Completed">Completed</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>

                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.5}
                    >
                      <TextField
                        type="date"
                        size="small"
                        label={t("projecttask.taskStartDate", "Start Date")}
                        value={formData.taskStartDate || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            taskStartDate: e.target.value,
                          }))
                        }
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        disabled={
                          String(
                            taskTypeMetaByCode[
                              String(formData.taskType || "").trim()
                            ]?.editStartDate ?? "",
                          ).trim() !== "1"
                        }
                      />
                      <TextField
                        type="number"
                        size="small"
                        label={t(
                          "projecttask.taskDuration",
                          "Task Duration (days)",
                        )}
                        value={formData.taskDuration || 1}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            taskDuration: e.target.value,
                          }))
                        }
                        fullWidth
                        inputProps={{
                          min:
                            Number(
                              taskTypeMetaByCode[
                                String(formData.taskType || "").trim()
                              ]?.minimumDays || 1,
                            ) || 1,
                          max:
                            Number(
                              taskTypeMetaByCode[
                                String(formData.taskType || "").trim()
                              ]?.maximumDays || 0,
                            ) || undefined,
                        }}
                        helperText={(() => {
                          const typeMeta =
                            taskTypeMetaByCode[
                              String(formData.taskType || "").trim()
                            ];
                          const minDays = Number(typeMeta?.minimumDays || 0);
                          const maxDays = Number(typeMeta?.maximumDays || 0);
                          if (minDays > 0 && maxDays > 0)
                            return `${minDays}-${maxDays} days`;
                          if (minDays > 0) return `Min ${minDays} days`;
                          if (maxDays > 0) return `Max ${maxDays} days`;
                          return "";
                        })()}
                      />
                      <TextField
                        type="date"
                        size="small"
                        label={t("projecttask.taskEndDate", "End Date")}
                        value={(() => {
                          const endDate = addDays(
                            formData.taskStartDate ||
                              settingsTarget?.raw?.taskStartDate ||
                              "",
                            formData.taskDuration || 1,
                          );
                          return toApiDate(endDate);
                        })()}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        disabled
                      />
                    </Stack>

                    <FormControl size="small" fullWidth>
                      <InputLabel>
                        {t("projecttask.staffId", "Person In-charge")}
                      </InputLabel>
                      <Select
                        label={t("projecttask.staffId", "Person In-charge")}
                        value={String(
                          formData.staffId ||
                            taskAssigneeOptions[0]?.staffId ||
                            "",
                        )}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            staffId: e.target.value,
                          }))
                        }
                      >
                        {taskAssigneeOptions.map((option) => (
                          <MenuItem key={option.staffId} value={option.staffId}>
                            {option.name} ({option.roleLabel})
                          </MenuItem>
                        ))}
                        {String(formData.staffId || "") &&
                          !taskAssigneeOptions.some(
                            (option) =>
                              String(option.staffId) ===
                              String(formData.staffId || ""),
                          ) && (
                            <MenuItem value={String(formData.staffId || "")}>
                              {String(formData.staffId || "")}
                            </MenuItem>
                          )}
                      </Select>
                    </FormControl>

                    <FormControl size="small" fullWidth>
                      <InputLabel>
                        {t("projecttask.parentTask", "Parent Task")}
                      </InputLabel>
                      <Select
                        label={t("projecttask.parentTask", "Parent Task")}
                        value={String(formData.parentTaskId || "")}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            parentTaskId: e.target.value,
                          }))
                        }
                        disabled={String(formData.taskType || "D") !== "D"}
                      >
                        <MenuItem value="">-</MenuItem>
                        {parentCandidates.map((task) => (
                          <MenuItem
                            key={task.projectTaskId}
                            value={String(task.projectTaskId)}
                          >
                            {task.taskName} ({task.projectStreamId})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      label={t("projecttask.remarks", "Remarks")}
                      value={formData.remarks || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          remarks: e.target.value,
                        }))
                      }
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                    />
                  </Stack>
                )}

              {dialogMode === "edit-milestone" && (
                <Stack spacing={1.5}>
                  <Alert severity="info">
                    {t(
                      "projectPlanning.milestoneDialogHelp",
                      "Select a milestone task for this task and save.",
                    )}
                  </Alert>
                  {milestoneCandidates.length === 0 ? (
                    <Alert severity="warning">
                      {t(
                        "projectPlanning.noMilestoneTaskAvailable",
                        "No milestone task is available for selection.",
                      )}
                    </Alert>
                  ) : (
                    <FormControl size="small" fullWidth>
                      <InputLabel>
                        {t("projecttask.milestoneTask", "Milestone Task")}
                      </InputLabel>
                      <Select
                        label={t("projecttask.milestoneTask", "Milestone Task")}
                        value={String(formData.milestoneTaskId || "")}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            milestoneTaskId: e.target.value,
                          }))
                        }
                      >
                        {milestoneCandidates.map((task) => (
                          <MenuItem
                            key={task.projectTaskId}
                            value={String(task.projectTaskId)}
                          >
                            {task.taskName} ({task.projectStreamId})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Stack>
              )}

              {dialogMode === "add-task" && (
                <Box
                  sx={{
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 1.5,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {settingsTarget?.type === "task"
                      ? t(
                          "projectPlanning.createChildTask",
                          "Create Child Task",
                        )
                      : t("projectPlanning.createTask", "Create Task")}
                  </Typography>
                  <Stack spacing={1.25}>
                    <TextField
                      label={t("projecttask.childTaskName", "Child Task Name")}
                      size="small"
                      value={childTaskData.taskName}
                      onChange={(e) =>
                        setChildTaskData((prev) => ({
                          ...prev,
                          taskName: e.target.value,
                        }))
                      }
                      fullWidth
                    />

                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.25}
                    >
                      <FormControl size="small" fullWidth>
                        <InputLabel>
                          {t("projecttask.taskType", "Task Type")}
                        </InputLabel>
                        <Select
                          label={t("projecttask.taskType", "Task Type")}
                          value={childTaskData.taskType}
                          onChange={(e) =>
                            setChildTaskData((prev) => ({
                              ...prev,
                              taskType: e.target.value,
                            }))
                          }
                        >
                          {(settingsTarget?.type === "stream"
                            ? streamCreatableTaskTypeOptions
                            : taskCreatableTaskTypeOptions
                          ).map((taskType) => (
                            <MenuItem
                              key={taskType.projectTaskCode}
                              value={taskType.projectTaskCode}
                            >
                              {taskType.projectTaskCode}
                              {taskType.projectTaskDescription
                                ? ` - ${taskType.projectTaskDescription}`
                                : ""}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        type="date"
                        size="small"
                        label={t("projecttask.taskStartDate", "Start Date")}
                        value={childTaskData.taskStartDate || ""}
                        onChange={(e) =>
                          setChildTaskData((prev) => ({
                            ...prev,
                            taskStartDate: e.target.value,
                          }))
                        }
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        disabled={
                          String(
                            taskTypeMetaByCode[
                              String(childTaskData.taskType || "").trim()
                            ]?.editStartDate ?? "",
                          ).trim() !== "1"
                        }
                      />
                      <TextField
                        type="number"
                        label={t(
                          "projecttask.taskDuration",
                          "Task Duration (days)",
                        )}
                        size="small"
                        value={childTaskData.durationDays}
                        onChange={(e) =>
                          setChildTaskData((prev) => ({
                            ...prev,
                            durationDays: e.target.value,
                          }))
                        }
                        inputProps={{
                          min:
                            Number(
                              taskTypeMetaByCode[
                                String(childTaskData.taskType || "").trim()
                              ]?.minimumDays || 1,
                            ) || 1,
                          max:
                            Number(
                              taskTypeMetaByCode[
                                String(childTaskData.taskType || "").trim()
                              ]?.maximumDays || 0,
                            ) || undefined,
                        }}
                        helperText={(() => {
                          const typeMeta =
                            taskTypeMetaByCode[
                              String(childTaskData.taskType || "").trim()
                            ];
                          const minDays = Number(typeMeta?.minimumDays || 0);
                          const maxDays = Number(typeMeta?.maximumDays || 0);
                          if (minDays > 0 && maxDays > 0)
                            return `${minDays}-${maxDays} days`;
                          if (minDays > 0) return `Min ${minDays} days`;
                          if (maxDays > 0) return `Max ${maxDays} days`;
                          return "";
                        })()}
                        fullWidth
                      />
                    </Stack>

                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.25}
                    >
                      <FormControl size="small" fullWidth>
                        <InputLabel>
                          {t("projecttask.staffId", "Person In-charge")}
                        </InputLabel>
                        <Select
                          label={t("projecttask.staffId", "Person In-charge")}
                          value={String(
                            childTaskData.staffId ||
                              taskAssigneeOptions[0]?.staffId ||
                              "",
                          )}
                          onChange={(e) =>
                            setChildTaskData((prev) => ({
                              ...prev,
                              staffId: e.target.value,
                            }))
                          }
                        >
                          {taskAssigneeOptions.map((option) => (
                            <MenuItem
                              key={option.staffId}
                              value={option.staffId}
                            >
                              {option.name} ({option.roleLabel})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {settingsTarget?.type === "task" ? (
                        <TextField
                          size="small"
                          fullWidth
                          label={t(
                            "projectPlanning.attachNewParent",
                            "Parent Task",
                          )}
                          value={
                            settingsTarget?.raw?.taskName ||
                            t(
                              "projectPlanning.currentTaskAsParent",
                              "Current task as parent",
                            )
                          }
                          InputLabelProps={{ shrink: true }}
                          disabled
                        />
                      ) : (
                        <FormControl size="small" fullWidth>
                          <InputLabel>
                            {t(
                              "projectPlanning.attachNewParent",
                              "Parent Task",
                            )}
                          </InputLabel>
                          <Select
                            label={t(
                              "projectPlanning.attachNewParent",
                              "Parent Task",
                            )}
                            value={String(
                              childTaskData.attachToParentTaskId || "",
                            )}
                            onChange={(e) =>
                              setChildTaskData((prev) => ({
                                ...prev,
                                attachToParentTaskId: e.target.value,
                              }))
                            }
                          >
                            <MenuItem value="">
                              {t(
                                "projectPlanning.currentTaskAsParent",
                                "Current task as parent",
                              )}
                            </MenuItem>
                            {parentCandidates.map((task) => (
                              <MenuItem
                                key={task.projectTaskId}
                                value={String(task.projectTaskId)}
                              >
                                {task.taskName} ({task.projectStreamId})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </Stack>

                    <Button
                      variant="contained"
                      color="primary"
                      size="medium"
                      startIcon={<AddIcon fontSize="small" />}
                      onClick={createChildTask}
                      disabled={saving}
                      sx={{
                        alignSelf: "flex-end",
                        minWidth: 180,
                        fontWeight: 600,
                      }}
                    >
                      {settingsTarget?.type === "task"
                        ? t(
                            "projectPlanning.createChildTask",
                            "Create Child Task",
                          )
                        : t("projectPlanning.createTask", "Create Task")}
                    </Button>
                  </Stack>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={closeSettings}
                disabled={saving}
                variant="outlined"
                sx={{
                  color: "text.primary",
                  borderColor: "divider",
                  backgroundColor: "background.default",
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                {t("basic.cancel", "Cancel")}
              </Button>
              {dialogMode === "add-stream" ? (
                <Button
                  variant="contained"
                  onClick={addNewStream}
                  disabled={saving}
                  sx={{ minWidth: 120, fontWeight: 600 }}
                >
                  {t("basic.save", "Save")}
                </Button>
              ) : dialogMode === "edit-stream" ? (
                <Button
                  variant="contained"
                  onClick={saveStreamInfo}
                  disabled={saving}
                  sx={{ minWidth: 120, fontWeight: 600 }}
                >
                  {t("basic.save", "Save")}
                </Button>
              ) : dialogMode === "edit-task" ? (
                <Button
                  variant="contained"
                  onClick={saveTaskInfo}
                  disabled={saving}
                  sx={{ minWidth: 120, fontWeight: 600 }}
                >
                  {t("basic.save", "Save")}
                </Button>
              ) : dialogMode === "edit-milestone" ? (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={removeMilestoneLink}
                    disabled={
                      saving || !String(formData.milestoneTaskId || "").trim()
                    }
                  >
                    {t("basic.remove", "Remove")}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={saveMilestoneLink}
                    disabled={saving || milestoneCandidates.length === 0}
                    sx={{ minWidth: 120, fontWeight: 600 }}
                  >
                    {t("basic.save", "Save")}
                  </Button>
                </>
              ) : null}
            </DialogActions>
          </Dialog>

          <Dialog
            open={inventoryPlanningOpen}
            onClose={() => setInventoryPlanningOpen(false)}
            fullWidth
            maxWidth="md"
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
                  {t("projectPlanning.inventoryPlanning", "Inventory Planning")}{" "}
                  -{" "}
                  {inventoryPlanningTarget?.name ||
                    inventoryPlanningTarget?.raw?.taskName ||
                    inventoryPlanningTarget?.raw?.streamName ||
                    "-"}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ ml: "auto" }}
                >
                  <strong>
                    {t("projectPlanning.leftHeaderStart", "Start")}:
                  </strong>{" "}
                  {formatDate(inventoryPlanningTarget?.startDate)}
                  {"  "}
                  <strong>
                    {t("projectPlanning.leftHeaderEnd", "End")}:
                  </strong>{" "}
                  {formatDate(inventoryPlanningTarget?.endDate)}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                {inventoryPlanningError && (
                  <Alert severity="error">{inventoryPlanningError}</Alert>
                )}

                <Tabs
                  value={inventoryPlanningTab}
                  onChange={(_, value) => setInventoryPlanningTab(value)}
                  variant="scrollable"
                  allowScrollButtonsMobile
                >
                  <Tab
                    value="stock"
                    label={t("projectPlanning.stockPlanning", "Stock")}
                    disabled={inventoryPlanningTarget?.type !== "task"}
                  />
                  <Tab
                    value="asset"
                    label={t("projectPlanning.assetPlanning", "Asset")}
                    disabled={inventoryPlanningTarget?.type !== "stream"}
                  />
                  <Tab
                    value="bundle"
                    label={t("projectPlanning.bundlePlanning", "Bundle")}
                  />
                </Tabs>

                {inventoryPlanningLoading ? (
                  <Box
                    sx={{ py: 4, display: "flex", justifyContent: "center" }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                ) : inventoryPlanningTab === "stock" ? (
                  inventoryPlanningTarget?.type !== "task" ? (
                    <Alert severity="warning">
                      {t(
                        "projectPlanning.stockOnlyForTask",
                        "Stock planning is only available for tasks.",
                      )}
                    </Alert>
                  ) : (
                    <Stack spacing={1.25}>
                      <Typography variant="body2">
                        {t(
                          "projectPlanning.stockWorkspaceHelp",
                          "Include stock inventory required for the entire task duration.",
                        )}
                      </Typography>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                      >
                        <Autocomplete
                          options={getAvailableProductOptions(
                            "stock",
                            stockProductOptions,
                          )}
                          fullWidth
                          size="small"
                          value={
                            getAvailableProductOptions(
                              "stock",
                              stockProductOptions,
                            ).find(
                              (product) =>
                                String(product?.productId || "") ===
                                String(inventoryDraft.productId || ""),
                            ) || null
                          }
                          onChange={(_, value) =>
                            setInventoryDraft((prev) => ({
                              ...prev,
                              productId: String(value?.productId || ""),
                            }))
                          }
                          getOptionLabel={(option) =>
                            String(
                              option?.productName ||
                                option?.productCode ||
                                option?.productId ||
                                "",
                            ).trim()
                          }
                          isOptionEqualToValue={(option, value) =>
                            String(option?.productId || "") ===
                            String(value?.productId || "")
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={t("product.productName", "Product")}
                            />
                          )}
                        />
                        <TextField
                          type="number"
                          size="small"
                          label={t("basic.quantity", "Quantity")}
                          value={inventoryDraft.quantity}
                          onChange={(e) =>
                            setInventoryDraft((prev) => ({
                              ...prev,
                              quantity: e.target.value,
                            }))
                          }
                          inputProps={{ min: 1 }}
                          sx={{ width: { xs: "100%", md: 160 } }}
                        />
                        <Button
                          variant="contained"
                          disabled={
                            !String(inventoryDraft.productId || "").trim()
                          }
                          onClick={() =>
                            addPlanningProduct(
                              "stock",
                              getAvailableProductOptions(
                                "stock",
                                stockProductOptions,
                              ),
                            )
                          }
                        >
                          {t("basic.add", "Add")}
                        </Button>
                      </Stack>
                      {getInventoryRows("stock").length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {t(
                            "projectPlanning.noStockSelected",
                            "No stock selected.",
                          )}
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
                                "minmax(0, 1.6fr) minmax(0, 1fr) 90px 56px",
                              gap: 1,
                              px: 1.25,
                              py: 0.75,
                              bgcolor: "background.default",
                              borderBottom: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Typography variant="caption" fontWeight={700}>
                              {t("product.productName", "Product")}
                            </Typography>
                            <Typography variant="caption" fontWeight={700}>
                              {t("product.productCode", "Code")}
                            </Typography>
                            <Typography variant="caption" fontWeight={700}>
                              {t("basic.quantity", "Quantity")}
                            </Typography>
                            <Typography variant="caption" fontWeight={700}>
                              {t("basic.remove", "Remove")}
                            </Typography>
                          </Box>
                          {getInventoryRows("stock").map((item) => (
                            <Box
                              key={String(item.productId)}
                              sx={{
                                display: "grid",
                                gridTemplateColumns:
                                  "minmax(0, 1.6fr) minmax(0, 1fr) 90px 56px",
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
                                {item.productName}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                noWrap
                              >
                                {item.productCode || item.productId}
                              </Typography>
                              <Typography variant="body2">
                                {item.quantity}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  removePlanningRow(
                                    "stock",
                                    "productId",
                                    item.productId,
                                  )
                                }
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Stack>
                  )
                ) : inventoryPlanningTab === "asset" ? (
                  inventoryPlanningTarget?.type !== "stream" ? (
                    <Alert severity="warning">
                      {t(
                        "projectPlanning.assetOnlyForStream",
                        "Asset planning is only available for streams.",
                      )}
                    </Alert>
                  ) : (
                    <Stack spacing={1.25}>
                      <Typography variant="body2">
                        {t(
                          "projectPlanning.assetWorkspaceHelp",
                          "Include asset requirements for the entire stream duration.",
                        )}
                      </Typography>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                      >
                        <Autocomplete
                          options={getAvailableProductOptions(
                            "asset",
                            assetProductOptions,
                          )}
                          fullWidth
                          size="small"
                          value={
                            getAvailableProductOptions(
                              "asset",
                              assetProductOptions,
                            ).find(
                              (product) =>
                                String(product?.productId || "") ===
                                String(inventoryDraft.productId || ""),
                            ) || null
                          }
                          onChange={(_, value) =>
                            setInventoryDraft((prev) => ({
                              ...prev,
                              productId: String(value?.productId || ""),
                            }))
                          }
                          getOptionLabel={(option) =>
                            String(
                              option?.productName ||
                                option?.productCode ||
                                option?.productId ||
                                "",
                            ).trim()
                          }
                          isOptionEqualToValue={(option, value) =>
                            String(option?.productId || "") ===
                            String(value?.productId || "")
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={t("product.productName", "Product")}
                            />
                          )}
                        />
                        <TextField
                          type="number"
                          size="small"
                          label={t("basic.quantity", "Quantity")}
                          value={inventoryDraft.quantity}
                          onChange={(e) =>
                            setInventoryDraft((prev) => ({
                              ...prev,
                              quantity: e.target.value,
                            }))
                          }
                          inputProps={{ min: 1 }}
                          sx={{ width: { xs: "100%", md: 160 } }}
                        />
                        <Button
                          variant="contained"
                          disabled={
                            !String(inventoryDraft.productId || "").trim()
                          }
                          onClick={() =>
                            addPlanningProduct(
                              "asset",
                              getAvailableProductOptions(
                                "asset",
                                assetProductOptions,
                              ),
                            )
                          }
                        >
                          {t("basic.add", "Add")}
                        </Button>
                      </Stack>
                      {getInventoryRows("asset").length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {t(
                            "projectPlanning.noAssetSelected",
                            "No asset selected.",
                          )}
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
                                "minmax(0, 1.6fr) minmax(0, 1fr) 90px 56px",
                              gap: 1,
                              px: 1.25,
                              py: 0.75,
                              bgcolor: "background.default",
                              borderBottom: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Typography variant="caption" fontWeight={700}>
                              {t("product.productName", "Product")}
                            </Typography>
                            <Typography variant="caption" fontWeight={700}>
                              {t("product.productCode", "Code")}
                            </Typography>
                            <Typography variant="caption" fontWeight={700}>
                              {t("basic.quantity", "Quantity")}
                            </Typography>
                            <Typography variant="caption" fontWeight={700}>
                              {t("basic.remove", "Remove")}
                            </Typography>
                          </Box>
                          {getInventoryRows("asset").map((item) => (
                            <Box
                              key={String(item.productId)}
                              sx={{
                                display: "grid",
                                gridTemplateColumns:
                                  "minmax(0, 1.6fr) minmax(0, 1fr) 90px 56px",
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
                                {item.productName}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                noWrap
                              >
                                {item.productCode || item.productId}
                              </Typography>
                              <Typography variant="body2">
                                {item.quantity}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  removePlanningRow(
                                    "asset",
                                    "productId",
                                    item.productId,
                                  )
                                }
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Stack>
                  )
                ) : (
                  <Stack spacing={1.25}>
                    <Typography variant="body2">
                      {t(
                        "projectPlanning.bundleWorkspaceHelp",
                        "Include fixed bundles required for the entire stream/task duration.",
                      )}
                    </Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                      <Autocomplete
                        options={getAvailableBundleOptions()}
                        fullWidth
                        size="small"
                        value={
                          getAvailableBundleOptions().find(
                            (bundle) =>
                              getBundleId(bundle) ===
                              String(inventoryDraft.bundleId || ""),
                          ) || null
                        }
                        onChange={(_, value) =>
                          setInventoryDraft((prev) => ({
                            ...prev,
                            bundleId: getBundleId(value),
                          }))
                        }
                        getOptionLabel={(option) => getBundleName(option)}
                        isOptionEqualToValue={(option, value) =>
                          getBundleId(option) === getBundleId(value)
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t("productBundle.title", "Bundle")}
                          />
                        )}
                      />
                      <TextField
                        type="number"
                        size="small"
                        label={t("basic.quantity", "Quantity")}
                        value={inventoryDraft.bundleQuantity}
                        onChange={(e) =>
                          setInventoryDraft((prev) => ({
                            ...prev,
                            bundleQuantity: e.target.value,
                          }))
                        }
                        inputProps={{ min: 1 }}
                        sx={{ width: { xs: "100%", md: 160 } }}
                      />
                      <Button
                        variant="contained"
                        disabled={!String(inventoryDraft.bundleId || "").trim()}
                        onClick={addPlanningBundle}
                      >
                        {t("basic.add", "Add")}
                      </Button>
                    </Stack>
                    {getInventoryRows("bundle").length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {t(
                          "projectPlanning.noBundleSelected",
                          "No bundle selected.",
                        )}
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
                              "minmax(0, 1.2fr) minmax(0, 1.8fr) 90px 56px",
                            gap: 1,
                            px: 1.25,
                            py: 0.75,
                            bgcolor: "background.default",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Typography variant="caption" fontWeight={700}>
                            {t("productBundle.title", "Bundle")}
                          </Typography>
                          <Typography variant="caption" fontWeight={700}>
                            {t("productBundle.members", "Members")}
                          </Typography>
                          <Typography variant="caption" fontWeight={700}>
                            {t("basic.quantity", "Quantity")}
                          </Typography>
                          <Typography variant="caption" fontWeight={700}>
                            {t("basic.remove", "Remove")}
                          </Typography>
                        </Box>
                        {getInventoryRows("bundle").map((item) => (
                          <Box
                            key={String(item.bundleId)}
                            sx={{
                              display: "grid",
                              gridTemplateColumns:
                                "minmax(0, 1.2fr) minmax(0, 1.8fr) 90px 56px",
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
                              {item.bundleName}
                            </Typography>
                            <Box sx={{ minWidth: 0 }}>
                              {String(item.bundleMembersText || "").trim() ? (
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  flexWrap="wrap"
                                  useFlexGap
                                >
                                  {String(item.bundleMembersText || "")
                                    .split(",")
                                    .map((name) => name.trim())
                                    .filter(Boolean)
                                    .map((name, idx) => (
                                      <Chip
                                        key={`${item.bundleId}-${idx}`}
                                        label={name}
                                        size="small"
                                      />
                                    ))}
                                </Stack>
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  -
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="body2">
                              {item.quantity}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() =>
                                removePlanningRow(
                                  "bundle",
                                  "bundleId",
                                  item.bundleId,
                                )
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Stack>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setInventoryPlanningOpen(false)}>
                {t("basic.close", "Close")}
              </Button>
            </DialogActions>
          </Dialog>

          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={closeSettingsMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
          >
            {menuTarget?.type === "stream" && (
              <>
                <MenuItem
                  onClick={() => {
                    openAddTaskDialog(menuTarget);
                    closeSettingsMenu();
                  }}
                >
                  <ListItemIcon>
                    <AddIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {t("projectPlanning.createTask", "Create Task")}
                  </ListItemText>
                </MenuItem>
                <MenuItem onClick={() => openStreamEditor(menuTarget)}>
                  <ListItemIcon>
                    <EditIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {t("projectPlanning.editStream", "Edit Stream Information")}
                  </ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    toggleStreamTasks(menuTarget);
                    closeSettingsMenu();
                  }}
                >
                  <ListItemIcon>
                    {collapsedStreamIds.has(
                      String(menuTarget?.raw?.projectStreamId || ""),
                    ) ? (
                      <VisibilityIcon fontSize="small" />
                    ) : (
                      <VisibilityOffIcon fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText>
                    {collapsedStreamIds.has(
                      String(menuTarget?.raw?.projectStreamId || ""),
                    )
                      ? t("projectPlanning.showTasks", "Show Tasks")
                      : t("projectPlanning.hideTasks", "Hide Tasks")}
                  </ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    removeStream(menuTarget);
                    closeSettingsMenu();
                  }}
                  disabled={tasks.some(
                    (task) =>
                      String(task?.projectStreamId || "") ===
                      String(menuTarget?.raw?.projectStreamId || ""),
                  )}
                >
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {t("projectPlanning.removeStream", "Remove Stream")}
                  </ListItemText>
                </MenuItem>
              </>
            )}

            {menuTarget?.type === "task" && (
              <>
                <MenuItem
                  onClick={() => {
                    openAddTaskDialog(menuTarget);
                    closeSettingsMenu();
                  }}
                >
                  <ListItemIcon>
                    <AddIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {t("projectPlanning.createChildTask", "Create Child Task")}
                  </ListItemText>
                </MenuItem>
                <MenuItem onClick={() => openTaskEditor(menuTarget)}>
                  <ListItemIcon>
                    <EditIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {t("projectPlanning.editTask", "Edit Task Information")}
                  </ListItemText>
                </MenuItem>
                <MenuItem onClick={() => openMilestoneDialog(menuTarget)}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {t("projectPlanning.linkMilestone", "Link Milestone Task")}
                  </ListItemText>
                </MenuItem>
                <MenuItem onClick={() => startMoveMode(menuTarget)}>
                  <ListItemIcon>
                    <DriveFileMoveIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {t("projectPlanning.moveTo", "Move To")}
                  </ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={async () => {
                    const taskId = menuTarget?.raw?.projectTaskId;
                    if (!taskId) return;
                    const blockedReason = taskDeleteBlockedReason(menuTarget);
                    if (blockedReason) {
                      setError(blockedReason);
                      closeSettingsMenu();
                      return;
                    }
                    try {
                      await request("DELETE", `/api/projecttasks/${taskId}`);
                      await syncWorkbenchFromServer();
                    } catch {
                      setError(t("basic.deleteFailed", "Delete failed"));
                    } finally {
                      closeSettingsMenu();
                    }
                  }}
                  disabled={Boolean(taskDeleteBlockedReason(menuTarget))}
                >
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {t(
                      "projectPlanning.removeCurrentTask",
                      "Remove Current Task",
                    )}
                  </ListItemText>
                </MenuItem>
              </>
            )}
          </Menu>

          <Dialog
            open={inventoryOverviewOpen}
            onClose={() => {
              setInventoryOverviewOpen(false);
              setInventoryOverviewRowsReady(false);
            }}
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
              {t("projectPlanning.inventoryOverview", "Inventory Overview")} -{" "}
              {projectCode}
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
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flex: 1 }}
              >
                {t(
                  "projectPlanning.inventoryOverviewDesc",
                  "View planned inventory needs across all tasks. Quantity is allocated on the task supply date based on task duration.",
                )}
              </Typography>
              <ToggleButtonGroup
                value={inventoryOverviewViewMode}
                exclusive
                onChange={(_, value) => {
                  if (value) setInventoryOverviewViewMode(value);
                }}
                size="small"
              >
                <ToggleButton value="day">
                  {t("projectPlanning.viewDay", "Day")}
                </ToggleButton>
                <ToggleButton value="week">
                  {t("projectPlanning.viewWeek", "Week")}
                </ToggleButton>
                <ToggleButton value="month">
                  {t("projectPlanning.viewMonth", "Month")}
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
              {inventoryOverviewLoading || !inventoryOverviewRowsReady ? (
                <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
                  <CircularProgress size={26} />
                </Box>
              ) : inventoryOverviewError ? (
                <Alert severity="error">{inventoryOverviewError}</Alert>
              ) : inventoryOverviewRows.length === 0 ? (
                <Alert severity="info">
                  {t(
                    "projectPlanning.noInventoryData",
                    "No inventory data available for this project.",
                  )}
                </Alert>
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
                  <Box sx={{ minWidth: 320 + inventoryOverviewTimelineWidth }}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: `320px ${inventoryOverviewTimelineWidth}px`,
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
                          {t("projectPlanning.timeline", "Timeline")}
                        </Typography>
                      </Box>

                      <Box
                        sx={{ bgcolor: "background.default", display: "flex" }}
                      >
                        {inventoryOverviewUpperSegments.map((seg) => (
                          <Box
                            key={seg.key}
                            sx={{
                              width: seg.span * inventoryOverviewColWidth,
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
                        gridTemplateColumns: `320px ${inventoryOverviewTimelineWidth}px`,
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
                            {t("projectPlanning.productName", "Product Name")}
                          </Typography>
                        </Box>
                        <Box sx={{ px: 1, py: 0.6 }}>
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            sx={{ fontSize: "0.68rem" }}
                          >
                            {t("basic.uom", "UOM")}
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
                          {inventoryOverviewActiveCols.map((col, idx) => (
                            <Box
                              key={col.key}
                              sx={{
                                width: inventoryOverviewColWidth,
                                px: 0,
                                py: 0.4,
                                borderLeft: "1px solid",
                                borderColor:
                                  inventoryOverviewViewMode === "day"
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

                    {inventoryOverviewRows.map((row, rowIndex) => (
                      <Box
                        key={row.key}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: `320px ${inventoryOverviewTimelineWidth}px`,
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
                              rowIndex % 2 === 0
                                ? "background.paper"
                                : "grey.50",
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
                              rowIndex % 2 === 0
                                ? "background.paper"
                                : "grey.50",
                          }}
                        >
                          {inventoryOverviewActiveCols.map((col) => {
                            const value = getUsageValue(row, col);
                            const hasValue = value > 0;
                            const cellSx = {
                              width: inventoryOverviewColWidth,
                              borderLeft: "1px solid",
                              borderColor:
                                inventoryOverviewViewMode === "day"
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
              <Button
                onClick={() => {
                  setInventoryOverviewOpen(false);
                  setInventoryOverviewRowsReady(false);
                }}
              >
                {t("basic.close", "Close")}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={manpowerOverviewOpen}
            onClose={() => {
              setManpowerOverviewOpen(false);
              setManpowerOverviewRowsReady(false);
            }}
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
              {t("projectPlanning.manpowerOverview", "Manpower Overview")} -{" "}
              {projectCode}
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
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flex: 1 }}
              >
                {t(
                  "projectPlanning.manpowerOverviewDesc",
                  "Track staff utilization across tasks. Red indicates overloading (total loading > 1.0 for a day). Staff contributions span the full task duration.",
                )}
              </Typography>
              <ToggleButtonGroup
                value={manpowerOverviewViewMode}
                exclusive
                onChange={(_, value) => {
                  if (value) setManpowerOverviewViewMode(value);
                }}
                size="small"
              >
                <ToggleButton value="day">
                  {t("projectPlanning.viewDay", "Day")}
                </ToggleButton>
                <ToggleButton value="week">
                  {t("projectPlanning.viewWeek", "Week")}
                </ToggleButton>
                <ToggleButton value="month">
                  {t("projectPlanning.viewMonth", "Month")}
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
              {manpowerOverviewLoading || !manpowerOverviewRowsReady ? (
                <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
                  <CircularProgress size={26} />
                </Box>
              ) : manpowerOverviewError ? (
                <Alert severity="error">{manpowerOverviewError}</Alert>
              ) : manpowerOverviewRows.length === 0 ? (
                <Alert severity="info">
                  {t(
                    "projectPlanning.noManpowerSelected",
                    "No manpower selected.",
                  )}
                </Alert>
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
                  <Box sx={{ minWidth: 420 + manpowerOverviewTimelineWidth }}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: `420px ${manpowerOverviewTimelineWidth}px`,
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
                          {t("projectPlanning.timeline", "Timeline")}
                        </Typography>
                      </Box>

                      <Box
                        sx={{ bgcolor: "background.default", display: "flex" }}
                      >
                        {manpowerOverviewUpperSegments.map((seg) => (
                          <Box
                            key={seg.key}
                            sx={{
                              width: seg.span * manpowerOverviewColWidth,
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
                        gridTemplateColumns: `420px ${manpowerOverviewTimelineWidth}px`,
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
                          gridTemplateColumns: "1fr 180px",
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
                            {t("projectleader.staffName", "Staff Name")}
                          </Typography>
                        </Box>
                        <Box sx={{ px: 1, py: 0.6 }}>
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            sx={{ fontSize: "0.68rem" }}
                          >
                            {t(
                              "projectPlanning.manpowerSkillProfileFilter",
                              "Skill Profile",
                            )}
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
                          {manpowerOverviewActiveCols.map((col, idx) => (
                            <Box
                              key={col.key}
                              sx={{
                                width: manpowerOverviewColWidth,
                                px: 0,
                                py: 0.4,
                                borderLeft: "1px solid",
                                borderColor:
                                  manpowerOverviewViewMode === "day"
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

                    {manpowerOverviewRows.map((row, rowIndex) => (
                      <Box
                        key={row.key}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: `420px ${manpowerOverviewTimelineWidth}px`,
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
                              rowIndex % 2 === 0
                                ? "background.paper"
                                : "grey.50",
                            display: "grid",
                            gridTemplateColumns: "1fr 180px",
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
                              {row.staffName}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              px: 0.75,
                              py: 0.35,
                              display: "flex",
                              alignItems: "center",
                              gap: 0.35,
                              flexWrap: "wrap",
                            }}
                          >
                            {row.skills.length === 0 ? (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: "0.63rem",
                                  color: "text.secondary",
                                }}
                              >
                                {t(
                                  "projectPlanning.manpowerNoSkillProfiles",
                                  "No skill profiles",
                                )}
                              </Typography>
                            ) : (
                              row.skills.slice(0, 2).map((skill) => (
                                <Chip
                                  key={`${row.staffId}-${skill}`}
                                  size="small"
                                  label={skill}
                                  sx={{
                                    height: 18,
                                    "& .MuiChip-label": {
                                      px: 0.6,
                                      fontSize: "0.62rem",
                                    },
                                  }}
                                />
                              ))
                            )}
                            {row.skills.length > 2 && (
                              <Chip
                                size="small"
                                label={`+${row.skills.length - 2}`}
                                sx={{
                                  height: 18,
                                  "& .MuiChip-label": {
                                    px: 0.6,
                                    fontSize: "0.62rem",
                                  },
                                }}
                              />
                            )}
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            bgcolor:
                              rowIndex % 2 === 0
                                ? "background.paper"
                                : "grey.50",
                          }}
                        >
                          {manpowerOverviewActiveCols.map((col) => {
                            const value = getManpowerUsageValue(row, col);
                            const hasValue = value > 0;
                            const overloaded = hasValue
                              ? isManpowerOverloaded(row, col)
                              : false;
                            const cellSx = {
                              width: manpowerOverviewColWidth,
                              borderLeft: "1px solid",
                              borderColor:
                                manpowerOverviewViewMode === "day"
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

                            const detailsTable = getManpowerUsageDetailsTable(
                              row,
                              col,
                            );
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
                                      color: overloaded
                                        ? "error.main"
                                        : "text.primary",
                                      fontWeight: overloaded ? 700 : 400,
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
              <Button
                onClick={() => {
                  setManpowerOverviewOpen(false);
                  setManpowerOverviewRowsReady(false);
                }}
              >
                {t("basic.close", "Close")}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default ProjectWorkbench;
