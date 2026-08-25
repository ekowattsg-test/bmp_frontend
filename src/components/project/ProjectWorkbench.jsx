import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
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
  Typography,
} from "@mui/material";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
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
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AllInboxOutlinedIcon from "@mui/icons-material/AllInboxOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { request } from "../../helpers/axios_helper";
import WorkbenchLoadedView from "./workbench/components/WorkbenchLoadedView";
import { buildWorkbenchDialogProps } from "./workbench/utils/buildWorkbenchDialogProps";
import {
  buildInventoryOverviewRows,
  collectInventoryUsageItems,
  getInventoryUsageValueByMode,
} from "./workbench/utils/inventoryOverviewUtils";
import {
  buildManpowerOverviewRows,
  collectManpowerUsageItems,
  getManpowerUsageValueByMode,
} from "./workbench/utils/manpowerOverviewUtils";
import {
  buildManpowerSavePayload,
  buildManpowerDialogData,
  getManpowerRowsForActiveDate,
  getManpowerTaskId,
  hasDuplicateStaffSelection,
  hasInvalidManpowerLoading,
  isManpowerTouched,
  normalizeSavedManpowerRow,
  normalizeManpowerLoading,
} from "./workbench/utils/manpowerPlanningUtils";
import {
  buildSkillOverviewRows,
  collectSkillUsageItems,
  getSkillUsageValueByMode,
} from "./workbench/utils/skillOverviewUtils";
import {
  buildSavedSkillRow,
  buildSkillPlanningRowsFromApi,
  buildSkillSavePayload,
  findDuplicateSkillAssignment,
  getSkillTaskId,
  normalizeSkillUnit,
  removeSkillPlanningRowsBySkillId,
  upsertSkillPlanningRow,
} from "./workbench/utils/skillPlanningUtils";

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

  const taskStartMs = (task) => {
    const d = parseDate(task?.taskStartDate);
    return d ? d.getTime() : Infinity;
  };

  const makeTaskRow = (task, streamId) => {
    const status = String(task?.taskStatus || "").trim();
    const displayStart =
      status === "Not Started"
        ? parseDate(task?.taskStartDate)
        : parseDate(task?.actualStartDate) || parseDate(task?.taskStartDate);
    const displayEnd =
      status === "Completed"
        ? parseDate(task?.actualEndDate) || parseDate(task?.taskEndDate)
        : parseDate(task?.taskEndDate);
    return {
      id: `task-${task?.projectTaskId}`,
      type: "task",
      name: task?.taskName || `Task ${task?.projectTaskId || ""}`,
      startDate: displayStart,
      endDate: displayEnd,
      raw: task,
      streamId,
    };
  };

  sortedStreams.forEach((stream) => {
    const streamId = stream?.projectStreamId;
    const allStreamTasks = tasksByStream.get(String(streamId)) || [];

    // Separate milestones from everything else
    const milestoneTasks = allStreamTasks.filter(
      (t) =>
        String(t?.taskType || "")
          .trim()
          .toUpperCase() === "M",
    );
    const nonMilestoneTasks = allStreamTasks.filter(
      (t) =>
        String(t?.taskType || "")
          .trim()
          .toUpperCase() !== "M",
    );

    // Build id→task map across all non-milestone tasks so children of
    // anchor parents are correctly resolved
    const taskById = new Map();
    nonMilestoneTasks.forEach((t) => {
      taskById.set(String(t?.projectTaskId || "").trim(), t);
    });

    // Build parent→children map from all non-milestone tasks
    const childrenByParent = new Map();
    const rootNonMilestoneTasks = [];
    nonMilestoneTasks.forEach((t) => {
      const parentId = String(t?.parentTaskId || "").trim();
      if (parentId && taskById.has(parentId)) {
        if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
        childrenByParent.get(parentId).push(t);
      } else {
        rootNonMilestoneTasks.push(t);
      }
    });

    // Sort children within each parent by start date
    childrenByParent.forEach((children) => {
      children.sort((a, b) => taskStartMs(a) - taskStartMs(b));
    });

    // Among root tasks: anchors first (by start date), then others (by start date)
    const rootAnchorTasks = rootNonMilestoneTasks
      .filter(
        (t) =>
          String(t?.taskType || "")
            .trim()
            .toUpperCase() === "A",
      )
      .sort((a, b) => taskStartMs(a) - taskStartMs(b));

    const rootOtherTasks = rootNonMilestoneTasks
      .filter(
        (t) =>
          String(t?.taskType || "")
            .trim()
            .toUpperCase() !== "A",
      )
      .sort((a, b) => taskStartMs(a) - taskStartMs(b));

    // Tree-walk: emit parent then its children recursively
    const emitTaskTree = (task) => {
      rows.push(makeTaskRow(task, streamId));
      const id = String(task?.projectTaskId || "").trim();
      const children = childrenByParent.get(id) || [];
      children.forEach((child) => emitTaskTree(child));
    };

    const streamStart = parseDate(stream?.streamStartDate);
    const streamEnd = parseDate(stream?.streamEndDate);

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

    // 1. Root anchor tasks with their dependent subtrees immediately after each
    rootAnchorTasks.forEach((task) => emitTaskTree(task));

    // 2. Other root tasks grouped by parent, sorted by start date within group
    rootOtherTasks.forEach((task) => emitTaskTree(task));

    // 3. Milestones last
    milestoneTasks
      .sort((a, b) => taskStartMs(a) - taskStartMs(b))
      .forEach((task) => rows.push(makeTaskRow(task, streamId)));
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

const toLongId = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  return Math.trunc(numeric);
};

const toLongIdKey = (value) => {
  const normalized = toLongId(value);
  return normalized === null ? "" : String(normalized);
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
  const [skillOverviewOpen, setSkillOverviewOpen] = useState(false);
  const [skillOverviewLoading, setSkillOverviewLoading] = useState(false);
  const [skillOverviewError, setSkillOverviewError] = useState("");
  const [skillOverviewData, setSkillOverviewData] = useState([]);
  const [skillOverviewSkills, setSkillOverviewSkills] = useState([]);
  const [skillOverviewViewMode, setSkillOverviewViewMode] = useState("day");
  const [skillOverviewRowsReady, setSkillOverviewRowsReady] = useState(false);
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
  const [taskStatusUpdateOpen, setTaskStatusUpdateOpen] = useState(false);
  const [taskStatusUpdateTarget, setTaskStatusUpdateTarget] = useState(null);
  const [taskStatusUpdateDate, setTaskStatusUpdateDate] = useState(
    toApiDate(new Date()),
  );
  const [taskStatusUpdateSaving, setTaskStatusUpdateSaving] = useState(false);
  const [taskStatusUpdateError, setTaskStatusUpdateError] = useState("");
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
  const [manpowerPlanningOpen, setManpowerPlanningOpen] = useState(false);
  const [manpowerPlanningTarget, setManpowerPlanningTarget] = useState(null);
  const [manpowerPlanningLoading, setManpowerPlanningLoading] = useState(false);
  const [manpowerPlanningError, setManpowerPlanningError] = useState("");
  const [manpowerPlanningRows, setManpowerPlanningRows] = useState([]);
  const [manpowerPlanningDate, setManpowerPlanningDate] = useState("");
  const [manpowerSkillFilter, setManpowerSkillFilter] = useState("");
  const [manpowerProjectSkills, setManpowerProjectSkills] = useState([]);
  const [manpowerStaffSkillMap, setManpowerStaffSkillMap] = useState({});
  const [manpowerDropdownOptions, setManpowerDropdownOptions] = useState([]);
  const [manpowerStaffOptions, setManpowerStaffOptions] = useState([]);
  const [manpowerDraft, setManpowerDraft] = useState({
    staffId: "",
    role: "worker",
    loading: "1",
  });
  const [skillPlanningOpen, setSkillPlanningOpen] = useState(false);
  const [skillPlanningTarget, setSkillPlanningTarget] = useState(null);
  const [skillPlanningLoading, setSkillPlanningLoading] = useState(false);
  const [skillPlanningError, setSkillPlanningError] = useState("");
  const [skillPlanningRows, setSkillPlanningRows] = useState([]);
  const [skillOptions, setSkillOptions] = useState([]);
  const [skillDraft, setSkillDraft] = useState({
    apiId: null,
    skillId: null,
    unit: "1",
  });
  const [skillCreateOpen, setSkillCreateOpen] = useState(false);
  const [skillCreateLoading, setSkillCreateLoading] = useState(false);
  const [skillCreateError, setSkillCreateError] = useState("");
  const [skillCreateForm, setSkillCreateForm] = useState({
    skillName: "",
    skillDescription: "",
    skillCategory: "",
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

  const manpowerRoleOptions = useMemo(
    () => [
      {
        value: "worker",
        label: t("projectPlanning.manpowerRoleWorker"),
      },
      {
        value: "supervisor",
        label: t("projectPlanning.manpowerRoleSupervisor"),
      },
    ],
    [t],
  );

  const manpowerStaffById = useMemo(
    () =>
      manpowerStaffOptions.reduce((acc, staff) => {
        const id = String(staff?.staffId || "").trim();
        if (!id) return acc;
        acc[id] = staff;
        return acc;
      }, {}),
    [manpowerStaffOptions],
  );

  const skillById = useMemo(
    () =>
      skillOptions.reduce((acc, skill) => {
        const skillId = toLongId(skill?.staffSkillId);
        if (skillId === null) return acc;
        acc[skillId] = skill;
        return acc;
      }, {}),
    [skillOptions],
  );

  const availableSkillOptions = useMemo(
    () =>
      [...skillOptions].sort((a, b) =>
        String(a?.skillName || a?.staffSkillId || "").localeCompare(
          String(b?.skillName || b?.staffSkillId || ""),
          undefined,
          { sensitivity: "base" },
        ),
      ),
    [skillOptions],
  );

  const skillCategoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          skillOptions
            .map((skill) => String(skill?.skillCategory || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) =>
        a.localeCompare(b, undefined, {
          sensitivity: "base",
        }),
      ),
    [skillOptions],
  );

  const fetchStaffSkills = async () => {
    const res = await request("GET", "/api/staffskills").catch(() => ({
      data: [],
    }));
    return Array.isArray(res?.data) ? res.data : [];
  };

  const refreshSkillOptions = async () => {
    const skills = await fetchStaffSkills();
    setSkillOptions(skills);
    return skills;
  };

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
      M: t("projectLeader.roleManager"),
      L: t("projectLeader.roleLeader"),
      C: t("projectLeader.roleCoLeader"),
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

  const getTaskStatusTransition = (task) => {
    const status = String(task?.taskStatus || "").trim();
    if (status === "Not Started") {
      return {
        currentStatus: status,
        nextStatus: "In Progress",
      };
    }

    if (status === "In Progress") {
      return {
        currentStatus: status,
        nextStatus: "Completed",
      };
    }

    return null;
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
    if (!skillOverviewOpen) return;

    let mounted = true;

    const loadSkillOverview = async () => {
      setSkillOverviewLoading(true);
      setSkillOverviewError("");

      try {
        const [projectSkillsRes, skillsRes] = await Promise.all([
          request("GET", "/api/projectskills"),
          request("GET", "/api/staffskills"),
        ]);

        const taskIdSet = new Set(
          tasks.map((task) => String(task?.projectTaskId || "").trim()),
        );

        const allProjectSkills = Array.isArray(projectSkillsRes?.data)
          ? projectSkillsRes.data
          : [];

        const filteredProjectSkills = allProjectSkills.filter((item) =>
          taskIdSet.has(String(item?.projectTaskId || "").trim()),
        );

        const skillRows = Array.isArray(skillsRes?.data) ? skillsRes.data : [];

        if (!mounted) return;
        setSkillOverviewData(filteredProjectSkills);
        setSkillOverviewSkills(skillRows);
      } catch {
        if (!mounted) return;
        setSkillOverviewError(
          t(
            "projectPlanning.skillOverviewLoadFailed",
            "Failed to load skill overview.",
          ),
        );
        setSkillOverviewData([]);
        setSkillOverviewSkills([]);
      } finally {
        if (!mounted) return;
        setSkillOverviewLoading(false);
      }
    };

    loadSkillOverview();

    return () => {
      mounted = false;
    };
  }, [skillOverviewOpen, tasks, t]);

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
    setSkillOverviewRowsReady(false);
    if (!skillOverviewData.length || skillOverviewLoading) return;

    const timer = setTimeout(() => {
      setSkillOverviewRowsReady(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [skillOverviewData, skillOverviewLoading]);

  useEffect(() => {
    setManpowerOverviewRowsReady(false);
    if (manpowerOverviewLoading) return;

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

  const skillOverviewUpperSegments = useMemo(() => {
    if (skillOverviewViewMode === "day") {
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
      skillOverviewViewMode === "week"
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
    skillOverviewViewMode,
    inventoryDayColumns,
    inventoryWeekColumns,
    inventoryMonthColumns,
  ]);

  const skillOverviewActiveCols =
    skillOverviewViewMode === "day"
      ? inventoryDayColumns
      : skillOverviewViewMode === "week"
        ? inventoryWeekColumns
        : inventoryMonthColumns;

  const skillOverviewColWidth = COL_WIDTH[skillOverviewViewMode];
  const skillOverviewTimelineWidth = Math.max(
    680,
    skillOverviewActiveCols.length * skillOverviewColWidth,
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

  const skillOverviewRows = useMemo(
    () =>
      buildSkillOverviewRows({
        skillOverviewRowsReady,
        inventoryOverviewBounds,
        tasks,
        streams,
        skillOverviewSkills,
        skillOverviewData,
        parseDate,
        toLongId,
        toLongIdKey,
      }),
    [
      skillOverviewData,
      skillOverviewSkills,
      tasks,
      streams,
      inventoryOverviewBounds,
      skillOverviewRowsReady,
    ],
  );

  const getSkillUsageValue = (row, col) =>
    getSkillUsageValueByMode(row, col, skillOverviewViewMode);

  const getSkillUsageDetailsTable = (row, col) => {
    const items = collectSkillUsageItems(row, col, skillOverviewViewMode);

    const grouped = new Map();
    items.forEach((entry) => {
      const taskName =
        String(entry?.resourceLabel || entry?.taskName || "-").trim() || "-";
      grouped.set(
        taskName,
        (grouped.get(taskName) || 0) + Number(entry?.unit || 0),
      );
    });

    const entries = Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);

    let periodLabel = "";
    if (skillOverviewViewMode === "day") {
      periodLabel = col.date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } else if (skillOverviewViewMode === "week") {
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
            {t("projectPlanning.noSkillSelected")}
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
              {t("projectPlanning.streamTaskLabel")}
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
              {t("projectPlanning.skillUnit")}
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: "table-row-group" }}>
          {entries.map(([taskName, unit], idx) => (
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
                {Number(unit.toFixed(2))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const manpowerOverviewRows = useMemo(
    () =>
      buildManpowerOverviewRows({
        manpowerOverviewRowsReady,
        manpowerOverviewData,
        manpowerOverviewStaffs,
        manpowerOverviewSkillsByStaffId,
        tasks,
        streams,
        inventoryOverviewBounds,
        parseDate,
      }),
    [
      manpowerOverviewRowsReady,
      manpowerOverviewData,
      manpowerOverviewStaffs,
      manpowerOverviewSkillsByStaffId,
      tasks,
      streams,
      inventoryOverviewBounds,
    ],
  );

  const getManpowerUsageValue = (row, col) =>
    getManpowerUsageValueByMode(row, col, manpowerOverviewViewMode);

  const getManpowerUsageDetailsTable = (row, col) => {
    const items = collectManpowerUsageItems(row, col, manpowerOverviewViewMode);

    const grouped = new Map();
    items.forEach((entry) => {
      const taskName =
        String(entry?.resourceLabel || entry?.taskName || "-").trim() || "-";
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
            {t("projectPlanning.noManpowerSelected")}
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
              {t("projectPlanning.streamTaskLabel")}
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
              {t("projectPlanning.manpowerLoading")}
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

  const inventoryOverviewRows = useMemo(
    () =>
      buildInventoryOverviewRows({
        inventoryOverviewRowsReady,
        inventoryOverviewBounds,
        inventoryOverviewData,
        tasks,
        streams,
        parseDate,
        workingDaySet,
        dayMs: DAY_MS,
      }),
    [
      inventoryOverviewData,
      inventoryOverviewBounds,
      workingDaySet,
      tasks,
      streams,
      inventoryOverviewRowsReady,
    ],
  );

  const getUsageValue = (row, col) =>
    getInventoryUsageValueByMode(row, col, inventoryOverviewViewMode);

  const getUsageDetailsTable = (row, col) => {
    const activities = collectInventoryUsageItems(
      row,
      col,
      inventoryOverviewViewMode,
    );

    const grouped = new Map();
    activities.forEach((act) => {
      const name =
        String(act?.resourceLabel || act?.activityName || "-").trim() || "-";
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
          <Typography sx={{ fontSize: "0.75rem" }}>
            {t("projectPlanning.noInventoryUsage")}
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
              {t("projectPlanning.streamTaskLabel")}
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
              {t("projectPlanning.quantityShort")}
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

  // G��G�� Day view columns G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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

  // G��G�� Week view columns (Mon-aligned) G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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

  // G��G�� Month view columns G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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

  // G��G�� Shared upper-header segments
  // day   G�� group by month  (upper = month label)
  // week  G�� group by year   (upper = year)
  // month G�� group by year   (upper = year)
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

  // G��G�� Bar geometry helpers G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
  const colWidth = COL_WIDTH[viewMode];
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const todayTime = today.getTime();

  const isCurrentPeriodColumn = (mode, col) => {
    if (!col) return false;

    if (mode === "day") {
      if (!(col.date instanceof Date)) return false;
      const date = new Date(col.date);
      date.setHours(0, 0, 0, 0);
      return date.getTime() === todayTime;
    }

    if (mode === "week") {
      if (!(col.weekStart instanceof Date) || !(col.weekEnd instanceof Date)) {
        return false;
      }
      const start = col.weekStart.getTime();
      const end = col.weekEnd.getTime();
      return todayTime >= start && todayTime <= end;
    }

    if (!(col.monthStart instanceof Date) || !(col.monthEnd instanceof Date)) {
      return false;
    }
    const start = col.monthStart.getTime();
    const end = col.monthEnd.getTime();
    return todayTime >= start && todayTime <= end;
  };

  const getCurrentPeriodOverlay = (mode, cols, widthPerCol) => {
    const index = cols.findIndex((col) => isCurrentPeriodColumn(mode, col));
    if (index < 0) return null;
    return {
      left: index * widthPerCol,
      width: widthPerCol,
    };
  };

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
    // month view G�� fractional within each month by day-of-month
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
  const ganttCurrentPeriodOverlay = getCurrentPeriodOverlay(
    viewMode,
    activeCols,
    colWidth,
  );
  const timelineWidth = Math.max(700, activeCols.length * colWidth);

  const statusLabel = {
    PLAN: t("project.statusPlan"),
    ACTIVE: t("project.statusActive"),
    COMPLETE: t("project.statusComplete"),
    CLOSE: t("project.statusClose"),
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

  const openTaskStatusUpdateDialog = (row) => {
    if (row?.type !== "task") return;

    const transition = getTaskStatusTransition(row?.raw);
    if (!transition) return;

    setTaskStatusUpdateTarget(row);
    setTaskStatusUpdateDate(toApiDate(new Date()));
    setTaskStatusUpdateError("");
    setTaskStatusUpdateOpen(true);
  };

  const closeTaskStatusUpdateDialog = () => {
    if (taskStatusUpdateSaving) return;

    setTaskStatusUpdateOpen(false);
    setTaskStatusUpdateTarget(null);
    setTaskStatusUpdateDate(toApiDate(new Date()));
    setTaskStatusUpdateError("");
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

  const defaultProjectStreamNumber = useMemo(() => {
    const found = streams.find(
      (stream) =>
        String(stream?.streamType || "")
          .trim()
          .toUpperCase() === "P",
    );
    return found?.streamNumber != null ? String(found.streamNumber) : "";
  }, [streams]);

  const openStreamEditor = (row) => {
    clearMoveMode();
    setSettingsError("");
    setSettingsTarget(row);
    setDialogMode("edit-stream");
    const isProjectStream =
      String(row?.raw?.streamType || "")
        .trim()
        .toUpperCase() === "P";
    setFormData({
      streamName: row?.raw?.streamName || "",
      streamDescription: row?.raw?.streamDescription || "",
      streamType: row?.raw?.streamType || "P",
      parentStreamNumber:
        row?.raw?.parentStreamNumber != null
          ? String(row.raw.parentStreamNumber)
          : isProjectStream
            ? ""
            : defaultProjectStreamNumber,
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
      parentStreamNumber: defaultProjectStreamNumber,
    });
    setSettingsOpen(true);
  };

  const openReplicateStreamDialog = (row) => {
    clearMoveMode();
    setSettingsError("");
    setSettingsTarget(row);
    setDialogMode("replicate-stream");
    const sourceName = String(row?.raw?.streamName || "").trim();
    setFormData({
      streamName: sourceName ? `${sourceName} (Copy)` : "",
    });
    setSettingsOpen(true);
    closeSettingsMenu();
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
        parentStreamNumber: formData.parentStreamNumber
          ? Number(formData.parentStreamNumber)
          : null,
      };
      await request(
        "PUT",
        `/api/projectstreams/${settingsTarget.raw.projectStreamId}`,
        payload,
      );

      await syncWorkbenchFromServer();
      setSettingsOpen(false);
    } catch (err) {
      setSettingsError(err?.userMessage || t("basic.saveFailed"));
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
        const message = t("basic.validationRequired");
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
        parentStreamNumber: formData.parentStreamNumber
          ? Number(formData.parentStreamNumber)
          : null,
      };
      await request("POST", "/api/projectstreams", payload);
      await syncWorkbenchFromServer();
      setSettingsOpen(false);
    } catch {
      const message = t("basic.saveFailed");
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
      setSettingsError(t("projectPlanning.removeStreamBlocked"));
      return;
    }

    setSaving(true);
    setSettingsError("");
    try {
      await request("DELETE", `/api/projectstreams/${streamId}`);
      await syncWorkbenchFromServer();
      setSettingsOpen(false);
    } catch {
      setSettingsError(t("basic.deleteFailed"));
    } finally {
      setSaving(false);
    }
  };

  const replicateStream = async () => {
    const streamId = settingsTarget?.raw?.projectStreamId;
    if (!streamId) return;

    setSaving(true);
    setSettingsError("");
    setError("");
    try {
      const streamName = String(formData.streamName || "").trim();
      if (!streamName) {
        const message = t("basic.validationRequired");
        setSettingsError(message);
        setSaving(false);
        return;
      }

      await request("POST", `/api/projectstreams/${streamId}/replicate`, {
        streamName,
      });
      await syncWorkbenchFromServer();
      setSettingsOpen(false);
    } catch {
      const message = t("basic.saveFailed");
      setSettingsError(message);
      setError(message);
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
      setSettingsError(t("basic.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const saveTaskStatusUpdate = async ({ nextStatus, statusDate }) => {
    const taskId = taskStatusUpdateTarget?.raw?.projectTaskId;
    if (!taskId) return;

    const transition = getTaskStatusTransition(taskStatusUpdateTarget?.raw);
    if (!transition || transition.nextStatus !== nextStatus) {
      setTaskStatusUpdateError(
        t("projectPlanning.taskStatusUpdateUnavailable"),
      );
      return;
    }

    const selectedDate = String(
      statusDate || taskStatusUpdateDate || toApiDate(new Date()),
    ).trim();
    if (!parseDate(selectedDate)) {
      setTaskStatusUpdateError(
        t("projectPlanning.taskStatusUpdateInvalidDate"),
      );
      return;
    }

    setTaskStatusUpdateSaving(true);
    setTaskStatusUpdateError("");

    try {
      const dateFieldName =
        nextStatus === "Completed" ? "actualEndDate" : "actualStartDate";
      const payload = {
        ...taskStatusUpdateTarget.raw,
        taskStatus: nextStatus,
        [dateFieldName]: selectedDate,
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
      closeTaskStatusUpdateDialog();
    } catch {
      setTaskStatusUpdateError(t("projectPlanning.taskStatusUpdateFailed"));
    } finally {
      setTaskStatusUpdateSaving(false);
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
        setSettingsError(t("projectPlanning.milestoneTaskOnly"));
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
      setSettingsError(t("basic.saveFailed"));
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
      setSettingsError(t("basic.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const createChildTask = async () => {
    const source = settingsTarget?.raw;
    if (!source) return;
    if (!String(childTaskData.taskName || "").trim()) {
      setSettingsError(t("basic.validationRequired"));
      return;
    }
    if (!String(childTaskData.taskType || "").trim()) {
      setSettingsError(t("basic.validationRequired"));
      return;
    }

    const selectedTypeMeta =
      taskTypeMetaByCode[String(childTaskData.taskType || "").trim()];
    if (
      settingsTarget?.type === "stream" &&
      String(selectedTypeMeta?.createByStream ?? "").trim() !== "1"
    ) {
      setSettingsError(t("projectPlanning.streamCreateTypeOnly"));
      return;
    }
    if (
      settingsTarget?.type === "task" &&
      String(selectedTypeMeta?.createByStream ?? "").trim() !== "0"
    ) {
      setSettingsError(t("projectPlanning.taskCreateTypeOnly"));
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
      setSettingsError(t("basic.saveFailed"));
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

  const streamParentCandidates = useMemo(() => {
    if (dialogMode !== "edit-stream" || settingsTarget?.type !== "stream") {
      return streams;
    }
    const currentStreamNumber = String(
      settingsTarget?.raw?.streamNumber ?? "",
    ).trim();
    if (!currentStreamNumber) return streams;

    const childrenByNumber = new Map();
    streams.forEach((stream) => {
      const parent = String(stream?.parentStreamNumber ?? "").trim();
      if (!parent) return;
      if (!childrenByNumber.has(parent)) childrenByNumber.set(parent, []);
      childrenByNumber.get(parent).push(stream);
    });

    const excluded = new Set([currentStreamNumber]);
    const collectDescendants = (number) => {
      const children = childrenByNumber.get(number) || [];
      children.forEach((child) => {
        const childNumber = String(child?.streamNumber ?? "").trim();
        if (excluded.has(childNumber)) return;
        excluded.add(childNumber);
        collectDescendants(childNumber);
      });
    };
    collectDescendants(currentStreamNumber);

    return streams.filter((stream) => {
      const number = String(stream?.streamNumber ?? "").trim();
      return !excluded.has(number);
    });
  }, [streams, dialogMode, settingsTarget]);

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
      t("projecttask.taskType");

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
          label: t("projectPlanning.dependentAfterParentEnd"),
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
        label: t("projectPlanning.inventoryAsset"),
      };
    }

    if (normalized === "stock") {
      return {
        icon: Inventory2OutlinedIcon,
        color: "info.main",
        label: t("projectPlanning.inventoryStock"),
      };
    }

    return {
      icon: AllInboxOutlinedIcon,
      color: "secondary.main",
      label: t("projectPlanning.inventoryAny"),
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

  const getInventoryPlanningKey = (row = inventoryPlanningTarget) => {
    if (!row) return "";
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

  const getInventoryRows = (section, target = inventoryPlanningTarget) => {
    const key = getInventoryPlanningKey(target);
    return inventoryPlanningRows?.[section]?.[key] || [];
  };

  const getAvailableProductOptions = (section, options) => {
    const selectedIds = new Set(
      getInventoryRows(section).map((item) => String(item?.productId || "")),
    );
    return options
      .filter((product) => !selectedIds.has(String(product?.productId || "")))
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
        return !selectedIds.has(bundleId);
      })
      .sort((a, b) =>
        getBundleName(a).localeCompare(getBundleName(b), undefined, {
          sensitivity: "base",
        }),
      );
  };

  const getPlanningTaskId = (target) =>
    target?.type === "task"
      ? Number(target?.raw?.projectTaskId || 0) || null
      : null;

  const getPlanningStreamId = (target) =>
    target?.type === "stream"
      ? Number(target?.raw?.projectStreamId || 0) || null
      : null;

  const getPlanningConfig = (section, target = inventoryPlanningTarget) => {
    const taskId = getPlanningTaskId(target);
    const streamId = getPlanningStreamId(target);

    if (section === "stock") {
      if (!taskId) return null;
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
      if (streamId) {
        return {
          listEndpoint: `/api/projectstreamassets/stream/${streamId}`,
          createEndpoint: "/api/projectstreamassets",
          updateEndpoint: (id) => `/api/projectstreamassets/${id}`,
          deleteEndpoint: (id) => `/api/projectstreamassets/${id}`,
          idField: "projectStreamAssetId",
          toPayload: (row) => ({
            projectStreamAssetId: row?.apiId || undefined,
            projectStreamId: streamId,
            productId: Number(row.productId),
            quantity: Number(row.quantity || 1),
          }),
        };
      }

      if (!taskId) return null;
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

    if (streamId) {
      return {
        listEndpoint: `/api/projectstreambundles/stream/${streamId}`,
        createEndpoint: "/api/projectstreambundles",
        updateEndpoint: (id) => `/api/projectstreambundles/${id}`,
        deleteEndpoint: (id) => `/api/projectstreambundles/${id}`,
        idField: "projectStreamBundleId",
        toPayload: (row) => ({
          projectStreamBundleId: row?.apiId || undefined,
          projectStreamId: streamId,
          bundleId: Number(row.bundleId),
          quantity: Number(row.quantity || 1),
        }),
      };
    }

    if (!taskId) return null;

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

  const upsertInventoryRows = (
    section,
    nextRows,
    target = inventoryPlanningTarget,
  ) => {
    const key = getInventoryPlanningKey(target);
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
          upsertInventoryRows(section, [], target);
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
            target,
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
            target,
          );
        }
      }
    } catch {
      setInventoryPlanningError(t("projectPlanning.inventoryLoadFailed"));
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
    if (existsAt >= 0) {
      setInventoryPlanningError(t("projectPlanning.inventoryDuplicateProduct"));
      return;
    }

    const nextRows = [...currentRows];
    const rowData = {
      apiId: undefined,
      productId,
      productCode: String(picked?.productCode || "").trim(),
      productName: String(picked?.productName || "").trim() || productId,
      quantity,
    };

    const config = getPlanningConfig(section);
    if (!config) {
      setInventoryPlanningError(t("projectPlanning.inventoryTaskMissing"));
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
      setInventoryPlanningError(t("projectPlanning.inventorySaveFailed"));
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
    if (existsAt >= 0) {
      setInventoryPlanningError(t("projectPlanning.inventoryDuplicateBundle"));
      return;
    }

    const nextRows = [...currentRows];
    const rowData = {
      ...(picked || {}),
      apiId: undefined,
      bundleId,
      bundleName: picked ? getBundleName(picked) : bundleId,
      bundleMembersText: picked
        ? getBundleMembersText(picked, inventoryProducts)
        : "",
      quantity,
    };

    const config = getPlanningConfig("bundle");
    if (!config) {
      setInventoryPlanningError(t("projectPlanning.inventoryTaskMissing"));
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
      setInventoryPlanningError(t("projectPlanning.inventorySaveFailed"));
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
        setInventoryPlanningError(t("projectPlanning.inventoryDeleteFailed"));
        return false;
      }
    };

    deleteRemote().then((ok) => {
      if (!ok) return;
      setInventoryPlanningError("");
      upsertInventoryRows(section, nextRows);
    });
  };

  const openManpowerPlanningDialog = async (row) => {
    if (row?.type !== "task") {
      setError(t("projectPlanning.manpowerOnlyForTask"));
      return;
    }

    const taskId = getManpowerTaskId(row);
    if (!taskId) return;

    setManpowerPlanningTarget(row);
    setManpowerPlanningOpen(true);
    setManpowerPlanningError("");
    setManpowerPlanningDate("");
    setManpowerSkillFilter("");
    setManpowerPlanningLoading(true);

    try {
      const [
        staffsRes,
        manpowerRes,
        projectSkillsRes,
        staffSkillsRes,
        staffSkillProfileViewsRes,
      ] = await Promise.all([
        request("GET", "/api/staffs").catch(() => ({ data: [] })),
        request("GET", `/api/projectmanpowers/task/${taskId}`).catch(() => ({
          data: [],
        })),
        request("GET", `/api/projectskills/task/${taskId}`).catch(() => ({
          data: [],
        })),
        request("GET", "/api/staffskills").catch(() => ({ data: [] })),
        request("GET", "/api/staffskillprofileviews").catch(() => ({
          data: [],
        })),
      ]);

      const staffs = Array.isArray(staffsRes?.data) ? staffsRes.data : [];
      const rows = Array.isArray(manpowerRes?.data) ? manpowerRes.data : [];
      const projectSkillRows = Array.isArray(projectSkillsRes?.data)
        ? projectSkillsRes.data
        : [];
      const staffSkillRows = Array.isArray(staffSkillsRes?.data)
        ? staffSkillsRes.data
        : [];
      const staffSkillProfileViewRows = Array.isArray(
        staffSkillProfileViewsRes?.data,
      )
        ? staffSkillProfileViewsRes.data
        : [];

      const {
        manpowerProjectSkillChips,
        normalizedRows,
        availableDates,
        staffSkillMap,
        dropdownOptions,
      } = buildManpowerDialogData({
        taskId,
        staffs,
        rows,
        projectSkillRows,
        staffSkillRows,
        staffSkillProfileViewRows,
        toLongId,
        normalizeManpowerLoading,
        noSkillProfileLabel: t("projectPlanning.noSkillProfile"),
      });

      setManpowerProjectSkills(manpowerProjectSkillChips);
      setManpowerStaffOptions(staffs);
      setManpowerPlanningRows(normalizedRows);
      setManpowerPlanningDate(availableDates[0] || "");
      setManpowerStaffSkillMap(staffSkillMap);
      setManpowerDropdownOptions(dropdownOptions);
    } catch {
      setManpowerPlanningError(t("projectPlanning.manpowerLoadFailed"));
      setManpowerStaffOptions([]);
      setManpowerPlanningRows([]);
      setManpowerPlanningDate("");
      setManpowerSkillFilter("");
      setManpowerProjectSkills([]);
      setManpowerStaffSkillMap({});
      setManpowerDropdownOptions([]);
    } finally {
      setManpowerPlanningLoading(false);
    }
  };

  const updateManpowerRow = (apiId, patch) => {
    setManpowerPlanningRows((prev) =>
      prev.map((row) =>
        String(row?.apiId || "") === String(apiId || "")
          ? { ...row, ...patch }
          : row,
      ),
    );
  };

  const saveManpowerDeploymentPlan = async () => {
    const taskId = getManpowerTaskId(manpowerPlanningTarget);
    if (!taskId) return;

    const targetRows = manpowerRowsForActiveDate;

    if (targetRows.length === 0) {
      setManpowerPlanningError(t("projectPlanning.noManpowerSelected"));
      return;
    }

    if (hasDuplicateStaffSelection(targetRows)) {
      setManpowerPlanningError(t("projectPlanning.manpowerDuplicateStaff"));
      return;
    }

    if (hasInvalidManpowerLoading(targetRows)) {
      setManpowerPlanningError(t("projectPlanning.manpowerLoadingHint"));
      return;
    }

    setManpowerPlanningError("");
    setManpowerPlanningLoading(true);

    try {
      const savedRows = await Promise.all(
        targetRows.map(async (row) => {
          const payload = buildManpowerSavePayload({
            row,
            taskId,
            normalizeManpowerLoading,
          });

          const res = await request(
            "PUT",
            `/api/projectmanpowers/${row.apiId}`,
            payload,
          );
          const saved = res?.data || payload;

          return normalizeSavedManpowerRow({
            saved,
            row,
            payload,
            taskId,
            toLongId,
            normalizeManpowerLoading,
          });
        }),
      );

      const savedRowByApiId = new Map(
        savedRows.map((item) => [String(item?.apiId || ""), item]),
      );

      setManpowerPlanningRows((prev) =>
        prev.map((item) => {
          const apiId = String(item?.apiId || "");
          return savedRowByApiId.get(apiId) || item;
        }),
      );
      await syncWorkbenchFromServer();
      setManpowerPlanningOpen(false);
    } catch {
      setManpowerPlanningError(t("projectPlanning.manpowerSaveFailed"));
    } finally {
      setManpowerPlanningLoading(false);
    }
  };

  const skillPlanningTaskId = getSkillTaskId(skillPlanningTarget);
  const skillPlanningTaskRecord =
    tasks.find(
      (task) =>
        String(task?.projectTaskId || "") === String(skillPlanningTaskId || ""),
    ) || null;

  const manpowerPlanningDates = useMemo(
    () =>
      Array.from(
        new Set(
          manpowerPlanningRows
            .map((item) => String(item?.workDate || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [manpowerPlanningRows],
  );

  const activeManpowerPlanningDate =
    manpowerPlanningDate || manpowerPlanningDates[0] || "";

  const manpowerRowsForActiveDate = useMemo(
    () =>
      getManpowerRowsForActiveDate(
        manpowerPlanningRows,
        activeManpowerPlanningDate,
      ),
    [manpowerPlanningRows, activeManpowerPlanningDate],
  );

  const manpowerProjectSkillFilters = useMemo(() => {
    const seen = new Set();
    const items = manpowerProjectSkills
      .filter((row) => row.label)
      .filter((row) => {
        const key = `${row.id}|${row.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.label.localeCompare(b.label, undefined, {
          sensitivity: "base",
        });
      });

    return items;
  }, [manpowerProjectSkills]);

  const manpowerDropdownOptionsForActiveDate = useMemo(
    () => [...manpowerDropdownOptions],
    [manpowerDropdownOptions],
  );

  const manpowerStaffNameById = useMemo(() => {
    const map = manpowerDropdownOptions.reduce((acc, option) => {
      const value = String(option?.value || "").trim();
      if (!value) return acc;
      acc[value] =
        String(option?.staffName || option?.label || "").trim() || value;
      return acc;
    }, {});
    map[""] = t("basic.none");
    return map;
  }, [manpowerDropdownOptions, t]);

  const manpowerStaffSkillsById = useMemo(() => {
    const map = manpowerDropdownOptions.reduce((acc, option) => {
      const value = String(option?.value || "").trim();
      if (!value) return acc;
      const profiles = Array.isArray(option?.skillProfiles)
        ? option.skillProfiles
        : [];
      acc[value] = profiles;
      return acc;
    }, {});
    return map;
  }, [manpowerDropdownOptions]);

  const skillSaveLockedByManpower = isManpowerTouched(
    skillPlanningTaskRecord || skillPlanningTarget,
  );

  const openSkillPlanningDialog = async (row) => {
    if (row?.type !== "task") {
      setError(t("projectPlanning.skillOnlyForTask"));
      return;
    }

    const taskId = getSkillTaskId(row);
    if (!taskId) return;

    setSkillPlanningTarget(row);
    setSkillPlanningOpen(true);
    setSkillPlanningError("");
    setSkillCreateError("");
    setSkillCreateOpen(false);
    setSkillCreateForm({
      skillName: "",
      skillDescription: "",
      skillCategory: "",
    });
    setSkillDraft({
      apiId: null,
      skillId: null,
      unit: "1",
    });
    setSkillPlanningLoading(true);

    try {
      const [skills, projectSkillsRes] = await Promise.all([
        fetchStaffSkills(),
        request("GET", `/api/projectskills/task/${taskId}`).catch(() => ({
          data: [],
        })),
      ]);

      const rows = Array.isArray(projectSkillsRes?.data)
        ? projectSkillsRes.data
        : [];

      setSkillOptions(skills);
      setSkillPlanningRows(
        buildSkillPlanningRowsFromApi({
          rows,
          taskId,
          skills,
          toLongId,
          toLongIdKey,
          normalizeSkillUnit,
        }),
      );
    } catch {
      setSkillPlanningError(t("projectPlanning.skillLoadFailed"));
      setSkillOptions([]);
      setSkillPlanningRows([]);
    } finally {
      setSkillPlanningLoading(false);
    }
  };

  const openCreateSkillDialog = () => {
    setSkillCreateError("");
    setSkillCreateForm({
      skillName: "",
      skillDescription: "",
      skillCategory: "",
    });
    setSkillCreateOpen(true);
  };

  const saveNewSkillDefinition = async () => {
    const skillName = String(skillCreateForm.skillName || "").trim();
    const skillDescription = String(
      skillCreateForm.skillDescription || "",
    ).trim();
    const skillCategory = String(skillCreateForm.skillCategory || "").trim();

    if (!skillName) {
      setSkillCreateError(t("projectPlanning.skillName") + " is required");
      return;
    }

    setSkillCreateError("");
    setSkillCreateLoading(true);
    try {
      const createRes = await request("POST", "/api/staffskills", {
        skillName,
        skillDescription,
        skillCategory,
      });

      const createdSkill = createRes?.data || null;
      const refreshedSkills = await refreshSkillOptions();

      const createdSkillId = toLongId(createdSkill?.staffSkillId);
      const selectedSkillId = createdSkillId
        ? createdSkillId
        : toLongId(
            refreshedSkills.find(
              (skill) =>
                String(skill?.skillName || "")
                  .trim()
                  .toLowerCase() === skillName.toLowerCase(),
            )?.staffSkillId,
          );

      setSkillDraft((prev) => ({
        ...prev,
        skillId: selectedSkillId || prev.skillId,
      }));
      setSkillCreateOpen(false);
    } catch (err) {
      setSkillCreateError(
        err?.response?.data?.message || t("projectPlanning.skillCreateFailed"),
      );
    } finally {
      setSkillCreateLoading(false);
    }
  };

  const saveSkillAssignment = async () => {
    const taskId = getSkillTaskId(skillPlanningTarget);
    const apiId = skillDraft.apiId;
    const skillId = toLongId(skillDraft.skillId);
    const unit = Number(skillDraft.unit);

    if (!taskId || skillId === null) return;
    if (!Number.isFinite(unit) || unit < 1) {
      setSkillPlanningError(t("projectPlanning.skillUnitHint"));
      return;
    }

    const duplicateRow = findDuplicateSkillAssignment({
      skillPlanningRows,
      skillId,
      apiId,
      toLongId,
    });
    if (duplicateRow) {
      setSkillPlanningError(t("projectPlanning.skillDuplicate"));
      return;
    }

    const payload = buildSkillSavePayload({
      apiId,
      taskId,
      skillId,
      unit,
      normalizeSkillUnit,
    });

    setSkillPlanningError("");
    setSkillPlanningLoading(true);
    try {
      const res = apiId
        ? await request("PUT", `/api/projectskills/${apiId}`, payload)
        : await request("POST", "/api/projectskills", payload);

      const saved = res?.data || payload;
      const nextRow = buildSavedSkillRow({
        saved,
        payload,
        apiId,
        taskId,
        skillId,
        skillById,
        toLongId,
        normalizeSkillUnit,
      });

      setSkillPlanningRows((prev) => {
        return upsertSkillPlanningRow({
          prevRows: prev,
          nextRow,
          apiId,
        });
      });

      setSkillDraft({
        apiId: null,
        skillId: null,
        unit: "1",
      });
    } catch {
      setSkillPlanningError(t("projectPlanning.skillSaveFailed"));
    } finally {
      setSkillPlanningLoading(false);
    }
  };

  const removeSkillAssignment = async (row) => {
    const apiId = row?.apiId;
    const skillId = toLongId(row?.skillId);
    if (skillId === null) return;

    if (!apiId) {
      setSkillPlanningRows((prev) =>
        removeSkillPlanningRowsBySkillId({ prevRows: prev, skillId, toLongId }),
      );
      return;
    }

    setSkillPlanningError("");
    try {
      await request("DELETE", `/api/projectskills/${apiId}`);
      setSkillPlanningRows((prev) =>
        removeSkillPlanningRowsBySkillId({ prevRows: prev, skillId, toLongId }),
      );
    } catch {
      setSkillPlanningError(t("projectPlanning.skillDeleteFailed"));
    }
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
      return t("projectPlanning.removeTaskBlockedType");
    }
    if (hasTaskDependencyReference(taskId)) {
      return t("projectPlanning.removeTaskBlockedDependency");
    }
    if (String(taskTypeCode).toUpperCase() === "B") {
      return t("projectPlanning.removeTaskBlockedBaseline");
    }
    return "";
  };

  const handleDeleteTaskFromMenu = async (taskRow) => {
    const taskId = taskRow?.raw?.projectTaskId;
    if (!taskId) return;
    const blockedReason = taskDeleteBlockedReason(taskRow);
    if (blockedReason) {
      setError(blockedReason);
      closeSettingsMenu();
      return;
    }
    try {
      await request("DELETE", `/api/projecttasks/${taskId}`);
      await syncWorkbenchFromServer();
    } catch {
      setError(t("basic.deleteFailed"));
    } finally {
      closeSettingsMenu();
    }
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
      setError(t("basic.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const projectSummaryProps = {
    project,
    projectCode,
    customerDisplayName,
    formatDate,
    statusLabel,
    toStatusColor,
    onBack: () => navigate("/projectplanning"),
    onHelp: () => setWorkbenchHelpOpen(true),
  };

  const timelinePanelProps = {
    viewMode,
    setViewMode,
    onAddStream: () =>
      openAddStreamDialog({
        type: "stream",
        raw: { streamType: "S" },
      }),
    onOpenInventoryOverview: () => setInventoryOverviewOpen(true),
    onOpenSkillOverview: () => setSkillOverviewOpen(true),
    onOpenManpowerOverview: () => setManpowerOverviewOpen(true),
    moveSourceTaskId,
    moveSourceTask,
    clearMoveMode,
    rows,
    ganttScrollRef,
    timelineWidth,
    upperSegments,
    colWidth,
    activeCols,
    isCurrentPeriodColumn,
    getTaskBarGeometry,
    isValidMoveTarget,
    getTaskTypeIcon,
    getInventoryIconMeta,
    getRowInventoryType,
    getRowManpowerRequired,
    hoveredParentTaskId,
    hoveredLinkedTaskIds,
    moveTaskToTargetParent,
    onTaskIconHoverStart,
    onTaskIconHoverEnd,
    tasks,
    getTaskTypeDisplay,
    getDurationDays,
    openSettingsMenu,
    openInventoryPlanningDialog,
    openSkillPlanningDialog,
    openManpowerPlanningDialog,
    openTaskStatusUpdateDialog,
    formatDate,
    ganttCurrentPeriodOverlay,
  };

  const {
    dialogsHostBaseProps,
    settingsDialogProps,
    inventoryPlanningDialogProps,
    manpowerPlanningDialogProps,
    skillPlanningDialogProps,
    skillCreateDialogProps,
    taskStatusUpdateDialogProps,
    settingsMenuProps,
    inventoryOverviewDialogProps,
    manpowerOverviewDialogProps,
    skillOverviewDialogProps,
  } = buildWorkbenchDialogProps({
    workbenchHelpOpen,
    setWorkbenchHelpOpen,
    formatDate,
    projectCode,
    isCurrentPeriodColumn,
    settingsOpen,
    closeSettings,
    dialogMode,
    settingsTarget,
    settingsError,
    formData,
    setFormData,
    taskTypeMetaByCode,
    taskAssigneeOptions,
    parentCandidates,
    streamParentCandidates,
    milestoneCandidates,
    childTaskData,
    setChildTaskData,
    streamCreatableTaskTypeOptions,
    taskCreatableTaskTypeOptions,
    saving,
    createChildTask,
    addNewStream,
    replicateStream,
    saveStreamInfo,
    saveTaskInfo,
    removeMilestoneLink,
    saveMilestoneLink,
    addDays,
    toApiDate,
    inventoryPlanningOpen,
    setInventoryPlanningOpen,
    inventoryPlanningTarget,
    inventoryPlanningError,
    inventoryPlanningTab,
    setInventoryPlanningTab,
    inventoryPlanningLoading,
    inventoryDraft,
    setInventoryDraft,
    setInventoryPlanningError,
    getAvailableProductOptions,
    stockProductOptions,
    assetProductOptions,
    getInventoryRows,
    addPlanningProduct,
    removePlanningRow,
    getAvailableBundleOptions,
    getBundleId,
    getBundleName,
    addPlanningBundle,
    manpowerPlanningOpen,
    setManpowerPlanningOpen,
    manpowerPlanningTarget,
    manpowerPlanningError,
    manpowerPlanningDates,
    activeManpowerPlanningDate,
    setManpowerPlanningDate,
    manpowerProjectSkillFilters,
    manpowerSkillFilter,
    setManpowerSkillFilter,
    manpowerPlanningLoading,
    manpowerRowsForActiveDate,
    manpowerPlanningRows,
    manpowerDropdownOptionsForActiveDate,
    manpowerStaffNameById,
    manpowerStaffSkillsById,
    manpowerStaffOptions,
    manpowerStaffSkillMap,
    updateManpowerRow,
    saveManpowerDeploymentPlan,
    skillPlanningOpen,
    setSkillPlanningOpen,
    skillPlanningTarget,
    skillPlanningLoading,
    skillPlanningError,
    skillDraft,
    setSkillDraft,
    availableSkillOptions,
    toLongId,
    skillPlanningRows,
    setSkillPlanningError,
    skillSaveLockedByManpower,
    saveSkillAssignment,
    removeSkillAssignment,
    openCreateSkillDialog,
    skillById,
    skillCreateOpen,
    skillCreateLoading,
    skillCreateError,
    skillCreateForm,
    skillCategoryOptions,
    setSkillCreateOpen,
    setSkillCreateError,
    setSkillCreateForm,
    saveNewSkillDefinition,
    taskStatusUpdateOpen,
    taskStatusUpdateTarget,
    taskStatusUpdateDate,
    taskStatusUpdateError,
    taskStatusUpdateSaving,
    setTaskStatusUpdateDate,
    closeTaskStatusUpdateDialog,
    saveTaskStatusUpdate,
    menuAnchorEl,
    menuTarget,
    closeSettingsMenu,
    collapsedStreamIds,
    tasks,
    openAddTaskDialog,
    openStreamEditor,
    openReplicateStreamDialog,
    toggleStreamTasks,
    removeStream,
    openTaskEditor,
    openMilestoneDialog,
    startMoveMode,
    handleDeleteTaskFromMenu,
    taskDeleteBlockedReason,
    inventoryOverviewOpen,
    setInventoryOverviewOpen,
    setInventoryOverviewRowsReady,
    inventoryOverviewViewMode,
    setInventoryOverviewViewMode,
    inventoryOverviewLoading,
    inventoryOverviewRowsReady,
    inventoryOverviewError,
    inventoryOverviewRows,
    inventoryOverviewTimelineWidth,
    inventoryOverviewUpperSegments,
    inventoryOverviewActiveCols,
    inventoryOverviewColWidth,
    getUsageValue,
    getUsageDetailsTable,
    manpowerOverviewOpen,
    setManpowerOverviewOpen,
    setManpowerOverviewRowsReady,
    manpowerOverviewViewMode,
    setManpowerOverviewViewMode,
    manpowerOverviewLoading,
    manpowerOverviewRowsReady,
    manpowerOverviewError,
    manpowerOverviewRows,
    manpowerOverviewTimelineWidth,
    manpowerOverviewUpperSegments,
    manpowerOverviewActiveCols,
    manpowerOverviewColWidth,
    getManpowerUsageValue,
    getManpowerUsageDetailsTable,
    skillOverviewOpen,
    setSkillOverviewOpen,
    setSkillOverviewRowsReady,
    skillOverviewViewMode,
    setSkillOverviewViewMode,
    skillOverviewLoading,
    skillOverviewRowsReady,
    skillOverviewError,
    skillOverviewRows,
    skillOverviewTimelineWidth,
    skillOverviewUpperSegments,
    skillOverviewActiveCols,
    skillOverviewColWidth,
    getSkillUsageValue,
    getSkillUsageDetailsTable,
  });

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
        <WorkbenchLoadedView
          projectSummaryProps={projectSummaryProps}
          timelinePanelProps={timelinePanelProps}
          dialogsHostBaseProps={dialogsHostBaseProps}
          settingsDialogProps={settingsDialogProps}
          inventoryPlanningDialogProps={inventoryPlanningDialogProps}
          manpowerPlanningDialogProps={manpowerPlanningDialogProps}
          skillPlanningDialogProps={skillPlanningDialogProps}
          skillCreateDialogProps={skillCreateDialogProps}
          taskStatusUpdateDialogProps={taskStatusUpdateDialogProps}
          settingsMenuProps={settingsMenuProps}
          inventoryOverviewDialogProps={inventoryOverviewDialogProps}
          manpowerOverviewDialogProps={manpowerOverviewDialogProps}
          skillOverviewDialogProps={skillOverviewDialogProps}
        />
      )}
    </Box>
  );
};

export default ProjectWorkbench;
