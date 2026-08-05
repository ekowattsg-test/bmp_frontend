import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AuthContext } from "../../context/authContext";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";

const ENABLE_DEPARTMENT_ANALYSIS =
  String(import.meta.env.VITE_ENABLE_DEPARTMENT_ANALYSIS || "false")
    .trim()
    .toLowerCase() === "true";

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isSkillValidAtDate = (row, asOfDate) => {
  if (!row) return false;
  if (Number(row?.noExpiry) === 1) return true;
  const expiryDate = toDate(row?.expiryDate);
  const asOf = toDate(asOfDate);
  if (!expiryDate || !asOf) return false;
  const expiry = new Date(
    expiryDate.getFullYear(),
    expiryDate.getMonth(),
    expiryDate.getDate(),
  );
  const check = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  return expiry >= check;
};

const formatDateInput = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const toTaskReferenceDate = (row) => {
  return toDate(row?.taskStartDate) || toDate(row?.taskEndDate);
};

const normalizeDateOnly = (date) => {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getTaskDateRange = (row) => {
  const startRaw = toDate(row?.taskStartDate) || toDate(row?.taskEndDate);
  const endRaw = toDate(row?.taskEndDate) || startRaw;
  const start = normalizeDateOnly(startRaw);
  const end = normalizeDateOnly(endRaw);
  if (!start || !end) return null;
  return start <= end ? { start, end } : { start: end, end: start };
};

const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart <= bEnd && bStart <= aEnd;
};

const isCompletedTask = (row) => {
  return (
    String(row?.taskStatus || "")
      .trim()
      .toUpperCase() === "COMPLETED"
  );
};

const isWithinDateRange = (date, from, to) => {
  if (!date || !from || !to) return false;
  const normalized = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return normalized >= start && normalized <= end;
};

const getEarliestUncompletedTaskDate = (rows, selectedProjectCode = "") => {
  let earliest = null;
  rows.forEach((row) => {
    if (
      selectedProjectCode &&
      String(row?.projectCode || "") !== selectedProjectCode
    ) {
      return;
    }
    if (isCompletedTask(row)) {
      return;
    }

    const taskDate = toTaskReferenceDate(row);
    if (!taskDate) {
      return;
    }

    if (!earliest || taskDate < earliest) {
      earliest = taskDate;
    }
  });
  return earliest;
};

const eachDayInclusive = (from, to) => {
  const result = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor <= end) {
    result.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
};

const StaffProjectSkillMatchAnalysis = ({ onBack }) => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);

  const userLevel = userInfo?.userLevel || userInfo?.level || 0;
  const isUserLevelNine = userLevel === 9 || userLevel === "9";
  const userCompanyId = userInfo?.companyId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [projectRows, setProjectRows] = useState([]);
  const [staffRows, setStaffRows] = useState([]);
  const [staffSkillRows, setStaffSkillRows] = useState([]);

  const [projectCode, setProjectCode] = useState("");
  const [department, setDepartment] = useState("");
  const [periodFrom, setPeriodFrom] = useState(formatDateInput(new Date()));
  const [periodTo, setPeriodTo] = useState(
    formatDateInput(addMonths(new Date(), 2)),
  );
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [candidateRows, setCandidateRows] = useState([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [showUntaggedStaff, setShowUntaggedStaff] = useState(false);
  const [selectedKpiDrilldown, setSelectedKpiDrilldown] = useState("all");
  const [showZeroRequirementDays, setShowZeroRequirementDays] = useState(false);
  const [selectedMatchDay, setSelectedMatchDay] = useState("");

  useEffect(() => {
    const earliestDate = getEarliestUncompletedTaskDate(
      projectRows,
      projectCode,
    );
    if (!earliestDate) {
      return;
    }

    const earliestDateText = formatDateInput(earliestDate);
    if (periodFrom !== earliestDateText) {
      setPeriodFrom(earliestDateText);
    }
  }, [projectRows, projectCode]);

  useEffect(() => {
    loadData();
  }, [isUserLevelNine, userCompanyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        projectSkillResponse,
        projectTaskResponse,
        projectStreamResponse,
        skillDefinitionResponse,
        staffResponse,
        staffSkillResponse,
      ] = await Promise.all([
        request("GET", "/api/projectskills"),
        request("GET", "/api/projecttasks"),
        request("GET", "/api/projectstreams"),
        request("GET", "/api/staffskills"),
        request("GET", "/api/staffs"),
        request("GET", "/api/staffskillprofileviews"),
      ]);

      const projectSkillRows = Array.isArray(projectSkillResponse?.data)
        ? projectSkillResponse.data
        : [];
      const projectTaskRows = Array.isArray(projectTaskResponse?.data)
        ? projectTaskResponse.data
        : [];
      const projectStreamRows = Array.isArray(projectStreamResponse?.data)
        ? projectStreamResponse.data
        : [];
      const skillDefinitionRows = Array.isArray(skillDefinitionResponse?.data)
        ? skillDefinitionResponse.data
        : [];
      const allStaffRows = Array.isArray(staffResponse?.data)
        ? staffResponse.data
        : [];
      const allStaffSkillRows = Array.isArray(staffSkillResponse?.data)
        ? staffSkillResponse.data
        : [];

      const scopedStaff = allStaffRows.filter((staff) => {
        if (Number(staff?.active) !== 1) return false;
        if (isUserLevelNine) return true;
        return String(staff?.companyId || "") === String(userCompanyId || "");
      });

      const staffSet = new Set(
        scopedStaff.map((staff) => String(staff?.staffId || "").trim()),
      );

      const scopedSkillRows = allStaffSkillRows.filter((row) =>
        staffSet.has(String(row?.staffId || "").trim()),
      );

      const taskById = projectTaskRows.reduce((acc, row) => {
        const key = String(row?.projectTaskId || "").trim();
        if (key) acc[key] = row;
        return acc;
      }, {});

      const streamById = projectStreamRows.reduce((acc, row) => {
        const key = String(row?.projectStreamId || "").trim();
        if (key) acc[key] = row;
        return acc;
      }, {});

      const skillById = skillDefinitionRows.reduce((acc, row) => {
        const key = String(row?.staffSkillId || "").trim();
        if (key) acc[key] = row;
        return acc;
      }, {});

      const normalizedProjectRows = projectSkillRows
        .map((row) => {
          const taskId = String(row?.projectTaskId || "").trim();
          const task = taskById[taskId];
          if (!task) return null;

          const stream =
            streamById[String(task?.projectStreamId || "").trim()] || {};
          const skillId = String(
            row?.skillId || row?.staffSkillId || "",
          ).trim();
          const skill = skillById[skillId] || {};

          return {
            rowId:
              row?.projectSkillId ||
              `${taskId}-${skillId}-${String(row?.unit || "").trim()}`,
            projectTaskId: task?.projectTaskId,
            projectCode: String(stream?.projectCode || "").trim(),
            taskName: String(task?.taskName || "").trim(),
            taskStatus: String(task?.taskStatus || "").trim(),
            taskStartDate: task?.taskStartDate,
            taskEndDate: task?.taskEndDate,
            staffSkillId: skillId,
            skillName: String(skill?.skillName || "").trim(),
            skillCategory: String(skill?.skillCategory || "").trim(),
            unit: Number(row?.unit || 0),
          };
        })
        .filter(Boolean);

      setProjectRows(normalizedProjectRows);
      setStaffRows(scopedStaff);
      setStaffSkillRows(scopedSkillRows);
    } catch {
      setError(t("staffManagement.analysisLoadFailed"));
      setProjectRows([]);
      setStaffRows([]);
      setStaffSkillRows([]);
    } finally {
      setLoading(false);
    }
  };

  const departmentOptions = useMemo(() => {
    const set = new Set();
    staffRows.forEach((staff) => {
      const dept = String(staff?.department || "").trim();
      if (dept) set.add(dept);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [staffRows]);

  const projectOptions = useMemo(() => {
    const set = new Set();
    projectRows.forEach((row) => {
      const code = String(row?.projectCode || "").trim();
      if (code) set.add(code);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projectRows]);

  const scopedStaffSet = useMemo(() => {
    const ids = new Set();
    staffRows.forEach((staff) => {
      if (
        ENABLE_DEPARTMENT_ANALYSIS &&
        department &&
        String(staff?.department || "") !== department
      ) {
        return;
      }
      ids.add(String(staff?.staffId || "").trim());
    });
    return ids;
  }, [staffRows, department]);

  const validStaffSkillSetByDate = useMemo(() => {
    const map = new Map();
    const fromDate = toDate(periodFrom);
    const toDateValue = toDate(periodTo);
    if (!fromDate || !toDateValue) return map;

    eachDayInclusive(fromDate, toDateValue).forEach((day) => {
      const dateKey = formatDateInput(day);
      const bySkill = new Map();
      staffSkillRows.forEach((row) => {
        const staffId = String(row?.staffId || "").trim();
        if (!scopedStaffSet.has(staffId)) return;
        if (!isSkillValidAtDate(row, dateKey)) return;

        const skillId = String(row?.staffSkillId || "").trim();
        if (!skillId) return;

        if (!bySkill.has(skillId)) {
          bySkill.set(skillId, new Set());
        }
        bySkill.get(skillId).add(staffId);
      });
      map.set(dateKey, bySkill);
    });

    return map;
  }, [
    staffSkillRows,
    scopedStaffSet,
    periodFrom,
    periodTo,
    projectRows,
    projectCode,
  ]);

  const filteredRequirements = useMemo(() => {
    const fromDate = toDate(periodFrom);
    const toDateValue = toDate(periodTo);
    const start = normalizeDateOnly(fromDate);
    const end = normalizeDateOnly(toDateValue);

    return projectRows.filter((row) => {
      if (projectCode && String(row?.projectCode || "") !== projectCode) {
        return false;
      }
      if (isCompletedTask(row)) {
        return false;
      }

      if (!start || !end) {
        return false;
      }

      const range = getTaskDateRange(row);
      if (!range) return false;

      return rangesOverlap(range.start, range.end, start, end);
    });
  }, [projectRows, projectCode, periodFrom, periodTo]);

  const matchRows = useMemo(() => {
    const today = new Date();
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const todayKey = formatDateInput(todayDate);

    return filteredRequirements.map((row) => {
      const skillId = String(row?.staffSkillId || "").trim();
      const requiredUnits = Number(row?.unit || 0);

      const taskDate = toTaskReferenceDate(row);
      const isBackdatedUncompleted =
        !isCompletedTask(row) && taskDate && taskDate < todayDate;
      const checkDateKey = isBackdatedUncompleted
        ? todayKey
        : formatDateInput(taskDate || todayDate);

      const bySkillForDate =
        validStaffSkillSetByDate.get(checkDateKey) || new Map();
      const availableSet = bySkillForDate.get(skillId) || new Set();
      const availableQualified = availableSet.size;
      const gap = requiredUnits - availableQualified;
      const status = gap > 0 ? "GAP" : "MATCHED";
      return {
        rowId: row?.rowId,
        projectTaskId: row?.projectTaskId,
        staffSkillId: skillId,
        projectCode: String(row?.projectCode || "").trim(),
        taskName: String(row?.taskName || "").trim(),
        taskStatus: String(row?.taskStatus || "").trim(),
        taskDate: taskDate ? formatDateInput(taskDate) : "",
        checkDate: checkDateKey,
        skillName: String(row?.skillName || "").trim(),
        skillCategory: String(row?.skillCategory || "").trim(),
        requiredUnits,
        availableQualified,
        gap,
        status,
      };
    });
  }, [filteredRequirements, validStaffSkillSetByDate]);

  const staffMap = useMemo(() => {
    return staffRows.reduce((acc, row) => {
      const key = String(row?.staffId || "").trim();
      if (key) acc[key] = row;
      return acc;
    }, {});
  }, [staffRows]);

  const handleOpenDrilldown = async (row) => {
    setSelectedRequirement(row);
    setDrilldownOpen(true);
    setCandidateLoading(true);
    setCandidateError("");

    try {
      const dateKey = String(row?.checkDate || "").trim();
      const bySkillForDate = validStaffSkillSetByDate.get(dateKey) || new Map();
      const qualifiedIds = Array.from(
        bySkillForDate.get(String(row?.staffSkillId || "").trim()) || new Set(),
      );

      let taskAssignments = [];
      if (row?.projectTaskId) {
        const response = await request(
          "GET",
          `/api/projectmanpowerviews/task/${encodeURIComponent(row.projectTaskId)}`,
        );
        taskAssignments = Array.isArray(response?.data) ? response.data : [];
      }

      const assignmentMap = taskAssignments.reduce((acc, assignment) => {
        const key = String(assignment?.staffId || "").trim();
        if (!key) return acc;
        acc[key] = {
          loading: Number(assignment?.loading || 0),
        };
        return acc;
      }, {});

      const rows = qualifiedIds
        .map((staffId) => {
          const staff = staffMap[staffId] || {};
          const profileCount = staffSkillRows.filter(
            (profile) =>
              String(profile?.staffId || "").trim() === staffId &&
              String(profile?.staffSkillId || "").trim() ===
                String(row?.staffSkillId || "").trim() &&
              isSkillValidAtDate(profile, row?.checkDate),
          ).length;

          const assignment = assignmentMap[staffId] || null;
          return {
            staffId,
            staffName: String(staff?.staffName || "").trim() || "-",
            department: String(staff?.department || "").trim() || "-",
            profileCount,
            assignedToTask: Boolean(assignment),
            taskLoading: assignment ? assignment.loading : 0,
          };
        })
        .sort((a, b) => {
          if (a.assignedToTask !== b.assignedToTask) {
            return a.assignedToTask ? -1 : 1;
          }
          return a.staffName.localeCompare(b.staffName);
        });

      setCandidateRows(rows);
    } catch {
      setCandidateRows([]);
      setCandidateError(t("staffManagement.analysisLoadFailed"));
    } finally {
      setCandidateLoading(false);
    }
  };

  const handleCloseDrilldown = () => {
    setDrilldownOpen(false);
    setSelectedRequirement(null);
    setCandidateRows([]);
    setCandidateError("");
  };

  const totalRequirements = matchRows.length;
  const matchedRequirements = matchRows.filter((row) => row.gap <= 0).length;
  const shortageUnits = matchRows.reduce(
    (sum, row) => sum + (row.gap > 0 ? row.gap : 0),
    0,
  );
  const atRiskTasks = new Set(
    matchRows.filter((row) => row.gap > 0).map((row) => row.taskName),
  ).size;

  const validStaffWithAnySkillSet = useMemo(() => {
    const result = new Set();

    const relevantDateKeys = Array.from(validStaffSkillSetByDate.keys());
    if (relevantDateKeys.length === 0) {
      return result;
    }

    staffSkillRows.forEach((row) => {
      const staffId = String(row?.staffId || "").trim();
      if (!scopedStaffSet.has(staffId)) return;

      const isValidInPeriod = relevantDateKeys.some((dateKey) =>
        isSkillValidAtDate(row, dateKey),
      );

      if (isValidInPeriod) {
        result.add(staffId);
      }
    });

    return result;
  }, [staffSkillRows, scopedStaffSet, validStaffSkillSetByDate]);

  const untaggedStaffRows = useMemo(() => {
    return staffRows
      .filter((staff) => {
        const staffId = String(staff?.staffId || "").trim();
        if (!scopedStaffSet.has(staffId)) return false;
        return !validStaffWithAnySkillSet.has(staffId);
      })
      .map((staff) => ({
        staffId: String(staff?.staffId || "").trim(),
        staffName: String(staff?.staffName || "").trim() || "-",
        department: String(staff?.department || "").trim() || "-",
      }))
      .sort((a, b) => a.staffName.localeCompare(b.staffName));
  }, [staffRows, scopedStaffSet, validStaffWithAnySkillSet]);

  const untaggedStaffCount = untaggedStaffRows.length;

  const kpiDrilldownRows = useMemo(() => {
    if (selectedKpiDrilldown === "matched") {
      return matchRows.filter((row) => row.gap <= 0);
    }

    if (
      selectedKpiDrilldown === "shortage" ||
      selectedKpiDrilldown === "atRisk"
    ) {
      return [...matchRows]
        .filter((row) => row.gap > 0)
        .sort((a, b) => b.gap - a.gap);
    }

    return matchRows;
  }, [matchRows, selectedKpiDrilldown]);

  useEffect(() => {
    if (selectedKpiDrilldown === "untagged") {
      setShowUntaggedStaff(true);
    }
  }, [selectedKpiDrilldown]);

  const kpiDrilldownTitle = useMemo(() => {
    if (selectedKpiDrilldown === "matched") {
      return t("staffManagement.matchDrilldownMatched");
    }
    if (selectedKpiDrilldown === "shortage") {
      return t("staffManagement.matchDrilldownShortage");
    }
    if (selectedKpiDrilldown === "atRisk") {
      return t("staffManagement.matchDrilldownAtRisk");
    }
    if (selectedKpiDrilldown === "untagged") {
      return t("staffManagement.matchDrilldownUntagged");
    }
    return t("staffManagement.matchDrilldownAll");
  }, [selectedKpiDrilldown, t]);

  const dailyAnalysisRows = useMemo(() => {
    const fromDate = toDate(periodFrom);
    const toDateValue = toDate(periodTo);
    if (!fromDate || !toDateValue) return [];

    const days = eachDayInclusive(fromDate, toDateValue);

    return days.map((day) => {
      const dayKey = formatDateInput(day);
      const dayOnly = normalizeDateOnly(day);
      const requirementsForDay = filteredRequirements.filter((row) => {
        const range = getTaskDateRange(row);
        if (!range || !dayOnly) return false;
        return dayOnly >= range.start && dayOnly <= range.end;
      });

      let matched = 0;
      let requiredUnitsTotal = 0;
      let matchedUnits = 0;
      let shortageUnits = 0;
      let excessUnits = 0;
      const atRiskTasksSet = new Set();

      const bySkillDemand = new Map();
      requirementsForDay.forEach((row) => {
        const skillId = String(row?.staffSkillId || "").trim();
        if (!skillId) return;

        if (!bySkillDemand.has(skillId)) {
          bySkillDemand.set(skillId, {
            requiredUnits: 0,
            taskNames: new Set(),
          });
        }

        const current = bySkillDemand.get(skillId);
        current.requiredUnits += Number(row?.unit || 0);

        const taskName = String(row?.taskName || "").trim();
        if (taskName) {
          current.taskNames.add(taskName);
        }
      });

      const bySkillForDate = validStaffSkillSetByDate.get(dayKey) || new Map();
      bySkillDemand.forEach((demand, skillId) => {
        const requiredForSkill = Number(demand?.requiredUnits || 0);
        const availableQualified = (bySkillForDate.get(skillId) || new Set())
          .size;
        const matchedForSkill = Math.min(requiredForSkill, availableQualified);
        const shortageForSkill = Math.max(
          requiredForSkill - availableQualified,
          0,
        );
        const excessForSkill = Math.max(
          availableQualified - requiredForSkill,
          0,
        );

        requiredUnitsTotal += requiredForSkill;
        matchedUnits += matchedForSkill;
        shortageUnits += shortageForSkill;
        excessUnits += excessForSkill;

        if (shortageForSkill === 0) {
          matched += 1;
        } else {
          demand.taskNames.forEach((taskName) => atRiskTasksSet.add(taskName));
        }
      });

      return {
        day: dayKey,
        totalRequirements: requirementsForDay.length,
        matchedRequirements: matched,
        requiredUnitsTotal,
        matchedUnits,
        shortageUnits,
        excessUnits,
        atRiskTasks: atRiskTasksSet.size,
      };
    });
  }, [filteredRequirements, validStaffSkillSetByDate, periodFrom, periodTo]);

  const visibleDailyRows = useMemo(() => {
    if (showZeroRequirementDays) {
      return dailyAnalysisRows;
    }

    return dailyAnalysisRows.filter((row) => row.requiredUnitsTotal > 0);
  }, [dailyAnalysisRows, showZeroRequirementDays]);

  const dailyChartRows = visibleDailyRows;

  useEffect(() => {
    if (!dailyChartRows.length) {
      setSelectedMatchDay("");
      return;
    }

    const exists = dailyChartRows.some((row) => row.day === selectedMatchDay);
    if (exists) return;

    const firstActive = dailyChartRows.find(
      (row) =>
        row.requiredUnitsTotal > 0 ||
        row.matchedUnits > 0 ||
        row.shortageUnits > 0 ||
        row.excessUnits > 0,
    );
    setSelectedMatchDay((firstActive || dailyChartRows[0]).day);
  }, [dailyChartRows, selectedMatchDay]);

  const selectedDaySkillBreakdownRows = useMemo(() => {
    if (!selectedMatchDay) return [];

    const selectedDayDate = normalizeDateOnly(toDate(selectedMatchDay));
    if (!selectedDayDate) return [];

    const bySkillForDate =
      validStaffSkillSetByDate.get(selectedMatchDay) || new Map();
    const map = new Map();

    filteredRequirements.forEach((row) => {
      const range = getTaskDateRange(row);
      if (!range) return;
      if (selectedDayDate < range.start || selectedDayDate > range.end) {
        return;
      }

      const skillId = String(row?.staffSkillId || "").trim();
      if (!skillId) return;
      const skillName = String(row?.skillName || "-").trim() || "-";

      if (!map.has(skillId)) {
        map.set(skillId, {
          skillId,
          skillName,
          requiredUnits: 0,
          matchedUnits: 0,
          shortageUnits: 0,
          excessUnits: 0,
          taskNames: new Set(),
        });
      }

      const current = map.get(skillId);
      current.requiredUnits += Number(row?.unit || 0);

      const taskName = String(row?.taskName || "").trim();
      if (taskName) {
        current.taskNames.add(taskName);
      }
    });

    return Array.from(map.values())
      .map((row) => {
        const availableQualified = (
          bySkillForDate.get(String(row.skillId || "").trim()) || new Set()
        ).size;
        const matchedUnits = Math.min(row.requiredUnits, availableQualified);
        const shortageUnits = Math.max(
          row.requiredUnits - availableQualified,
          0,
        );
        const excessUnits = Math.max(availableQualified - row.requiredUnits, 0);

        return {
          ...row,
          matchedUnits,
          shortageUnits,
          excessUnits,
          taskCount: row.taskNames.size,
        };
      })
      .sort((a, b) => {
        if (b.shortageUnits !== a.shortageUnits) {
          return b.shortageUnits - a.shortageUnits;
        }
        if (b.requiredUnits !== a.requiredUnits) {
          return b.requiredUnits - a.requiredUnits;
        }
        return a.skillName.localeCompare(b.skillName);
      });
  }, [selectedMatchDay, filteredRequirements, validStaffSkillSetByDate]);

  return (
    <Box>
      <HeaderBar
        showBackButton={Boolean(onBack)}
        onBack={onBack}
        backLabel={t("common.back")}
        title={t("staffManagement.projectSkillMatchAnalysis")}
        subtitle={t("staffManagement.projectSkillMatchSubtitle")}
      />

      <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          type="date"
          size="small"
          label={t("staffManagement.analysisDateFrom")}
          value={periodFrom}
          onChange={(event) => setPeriodFrom(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          type="date"
          size="small"
          label={t("staffManagement.analysisDateTo")}
          value={periodTo}
          onChange={(event) => setPeriodTo(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>{t("staffManagement.analysisProject")}</InputLabel>
          <Select
            value={projectCode}
            label={t("staffManagement.analysisProject")}
            onChange={(event) => setProjectCode(event.target.value)}
          >
            <MenuItem value="">
              {t("staffManagement.analysisAllProjects")}
            </MenuItem>
            {projectOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {ENABLE_DEPARTMENT_ANALYSIS ? (
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>{t("staffManagement.analysisDepartment")}</InputLabel>
            <Select
              value={department}
              label={t("staffManagement.analysisDepartment")}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <MenuItem value="">
                {t("staffManagement.analysisAllDepartments")}
              </MenuItem>
              {departmentOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => setSelectedKpiDrilldown("all")}
            sx={{
              cursor: "pointer",
              border:
                selectedKpiDrilldown === "all"
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--color-gray-300)",
            }}
          >
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t("staffManagement.matchTotalRequirements")}
              </Typography>
              <Typography variant="h4">{totalRequirements}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => setSelectedKpiDrilldown("matched")}
            sx={{
              cursor: "pointer",
              border:
                selectedKpiDrilldown === "matched"
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--color-gray-300)",
            }}
          >
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t("staffManagement.matchMatchedRequirements")}
              </Typography>
              <Typography variant="h4">{matchedRequirements}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => setSelectedKpiDrilldown("shortage")}
            sx={{
              cursor: "pointer",
              border:
                selectedKpiDrilldown === "shortage"
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--color-gray-300)",
            }}
          >
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t("staffManagement.matchShortageUnits")}
              </Typography>
              <Typography variant="h4">{shortageUnits}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => setSelectedKpiDrilldown("atRisk")}
            sx={{
              cursor: "pointer",
              border:
                selectedKpiDrilldown === "atRisk"
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--color-gray-300)",
            }}
          >
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t("staffManagement.matchAtRiskTasks")}
              </Typography>
              <Typography variant="h4">{atRiskTasks}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => setSelectedKpiDrilldown("untagged")}
            sx={{
              cursor: "pointer",
              border:
                selectedKpiDrilldown === "untagged"
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--color-gray-300)",
            }}
          >
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t("staffManagement.matchUntaggedStaff")}
              </Typography>
              <Typography variant="h4">{untaggedStaffCount}</Typography>
              <Button
                size="small"
                sx={{ mt: 1 }}
                onClick={() => setShowUntaggedStaff((prev) => !prev)}
              >
                {showUntaggedStaff
                  ? t("staffManagement.matchHideUntagged")
                  : t("staffManagement.matchShowUntagged")}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {showUntaggedStaff ? (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              {t("staffManagement.matchUntaggedStaffTitle")}
            </Typography>
            {untaggedStaffRows.length === 0 ? (
              <Alert severity="info">
                {t("staffManagement.matchNoUntaggedStaff")}
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("staffManagement.staff")}</TableCell>
                      <TableCell>
                        {t("staffManagement.analysisDepartment")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {untaggedStaffRows.map((row) => (
                      <TableRow key={row.staffId}>
                        <TableCell>{row.staffName}</TableCell>
                        <TableCell>{row.department}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Box sx={{ py: 4, color: "text.secondary" }}>{t("common.loading")}</Box>
      ) : matchRows.length === 0 ? (
        <Alert severity="info">{t("staffManagement.analysisNoRows")}</Alert>
      ) : (
        <>
          <Card>
            <CardContent>
              <Box
                sx={{
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {t("staffManagement.matchDetailTitle")} - {kpiDrilldownTitle}
                </Typography>
                {selectedKpiDrilldown !== "all" ? (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setSelectedKpiDrilldown("all")}
                  >
                    {t("staffManagement.matchClearDrilldown")}
                  </Button>
                ) : null}
              </Box>
              {kpiDrilldownRows.length === 0 ? (
                <Alert severity="info">
                  {t("staffManagement.analysisNoRows")}
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          {t("staffManagement.analysisProject")}
                        </TableCell>
                        <TableCell>{t("staffManagement.taskName")}</TableCell>
                        <TableCell>{t("staffManagement.taskStatus")}</TableCell>
                        <TableCell>{t("staffManagement.skillName")}</TableCell>
                        <TableCell>
                          {t("staffManagement.skillCategory")}
                        </TableCell>
                        <TableCell align="right">
                          {t("staffManagement.matchRequiredUnits")}
                        </TableCell>
                        <TableCell align="right">
                          {t("staffManagement.matchAvailableQualified")}
                        </TableCell>
                        <TableCell align="right">
                          {t("staffManagement.matchGap")}
                        </TableCell>
                        <TableCell>
                          {t("staffManagement.matchStatus")}
                        </TableCell>
                        <TableCell>{t("staffManagement.actions")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {kpiDrilldownRows.map((row) => (
                        <TableRow key={row.rowId}>
                          <TableCell>{row.projectCode || "-"}</TableCell>
                          <TableCell>{row.taskName || "-"}</TableCell>
                          <TableCell>{row.taskStatus || "-"}</TableCell>
                          <TableCell>{row.skillName || "-"}</TableCell>
                          <TableCell>{row.skillCategory || "-"}</TableCell>
                          <TableCell align="right">
                            {row.requiredUnits}
                          </TableCell>
                          <TableCell align="right">
                            {row.availableQualified}
                          </TableCell>
                          <TableCell align="right">
                            {row.gap > 0 ? row.gap : 0}
                          </TableCell>
                          <TableCell>
                            {row.status === "GAP"
                              ? t("staffManagement.matchGapStatus")
                              : t("staffManagement.matchMatchedStatus")}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenDrilldown(row)}
                            >
                              {t("staffManagement.matchDrilldown")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                {t("staffManagement.matchDailyAnalysisTitle")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("staffManagement.matchDailyAnalysisSubtitle")}
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setShowZeroRequirementDays((prev) => !prev)}
                >
                  {showZeroRequirementDays
                    ? t("staffManagement.matchHideZeroRequirementDays")
                    : t("staffManagement.matchShowZeroRequirementDays")}
                </Button>
              </Box>

              {dailyChartRows.length === 0 ? (
                <Alert severity="info">
                  {t("staffManagement.matchDailyNoActivity")}
                </Alert>
              ) : (
                <>
                  <Box sx={{ width: "100%", height: 280, mb: 2 }}>
                    <ResponsiveContainer>
                      <ComposedChart
                        data={dailyChartRows}
                        barCategoryGap="20%"
                        barGap={4}
                        onClick={(state) => {
                          const day = String(state?.activeLabel || "").trim();
                          if (day) {
                            setSelectedMatchDay(day);
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <ReferenceLine
                          y={0}
                          stroke="var(--color-dark)"
                          strokeWidth={2}
                        />
                        <Tooltip
                          formatter={(value, name) => {
                            const labelMap = {
                              requiredUnitsTotal: t(
                                "staffManagement.matchRequiredUnitsTotal",
                              ),
                              matchedUnits: t(
                                "staffManagement.matchMatchedUnits",
                              ),
                              shortageUnits: t(
                                "staffManagement.matchShortageUnits",
                              ),
                              excessUnits: t(
                                "staffManagement.matchExcessUnits",
                              ),
                            };
                            return [Number(value || 0), labelMap[name] || name];
                          }}
                        />
                        <Legend
                          layout="horizontal"
                          align="center"
                          verticalAlign="bottom"
                          formatter={(value) => {
                            const labelMap = {
                              requiredUnitsTotal: t(
                                "staffManagement.matchRequiredUnitsTotal",
                              ),
                              matchedUnits: t(
                                "staffManagement.matchMatchedUnits",
                              ),
                              shortageUnits: t(
                                "staffManagement.matchShortageUnits",
                              ),
                              excessUnits: t(
                                "staffManagement.matchExcessUnits",
                              ),
                            };
                            return labelMap[value] || value;
                          }}
                        />
                        <Bar
                          dataKey="requiredUnitsTotal"
                          fill="var(--color-warning)"
                          name="requiredUnitsTotal"
                          stackId="required"
                          barSize={12}
                          radius={[3, 3, 0, 0]}
                        />
                        <Bar
                          dataKey="matchedUnits"
                          fill="var(--color-success)"
                          name="matchedUnits"
                          stackId="outcome"
                          barSize={12}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="shortageUnits"
                          fill="var(--color-danger)"
                          name="shortageUnits"
                          stackId="outcome"
                          barSize={12}
                          radius={[0, 0, 4, 4]}
                        />
                        <Bar
                          dataKey="excessUnits"
                          fill="var(--color-secondary-dark)"
                          name="excessUnits"
                          stackId="outcome"
                          barSize={12}
                          radius={[0, 0, 3, 3]}
                        />
                        <Brush
                          dataKey="day"
                          height={20}
                          travellerWidth={8}
                          stroke="var(--color-primary)"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>

                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, fontWeight: 600 }}
                  >
                    {t("staffManagement.matchDailySkillBreakdownTitle")}:{" "}
                    {selectedMatchDay || "-"}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1.5 }}
                  >
                    {t("staffManagement.matchDailySkillBreakdownSubtitle")}
                  </Typography>

                  {selectedDaySkillBreakdownRows.length === 0 ? (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {t("staffManagement.matchDailySkillBreakdownEmpty")}
                    </Alert>
                  ) : (
                    <TableContainer sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              {t("staffManagement.skillName")}
                            </TableCell>
                            <TableCell align="right">
                              {t("staffManagement.matchRequiredUnitsTotal")}
                            </TableCell>
                            <TableCell align="right">
                              {t("staffManagement.matchMatchedUnits")}
                            </TableCell>
                            <TableCell align="right">
                              {t("staffManagement.matchShortageUnits")}
                            </TableCell>
                            <TableCell align="right">
                              {t("staffManagement.matchExcessUnits")}
                            </TableCell>
                            <TableCell align="right">
                              {t("staffManagement.matchTaskCount")}
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedDaySkillBreakdownRows.map((row) => (
                            <TableRow key={row.skillId || row.skillName}>
                              <TableCell>{row.skillName}</TableCell>
                              <TableCell align="right">
                                {row.requiredUnits}
                              </TableCell>
                              <TableCell align="right">
                                {row.matchedUnits}
                              </TableCell>
                              <TableCell align="right">
                                {row.shortageUnits}
                              </TableCell>
                              <TableCell align="right">
                                {row.excessUnits}
                              </TableCell>
                              <TableCell align="right">
                                {row.taskCount}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t("staffManagement.matchDay")}</TableCell>
                          <TableCell align="right">
                            {t("staffManagement.matchRequiredUnitsTotal")}
                          </TableCell>
                          <TableCell align="right">
                            {t("staffManagement.matchMatchedUnits")}
                          </TableCell>
                          <TableCell align="right">
                            {t("staffManagement.matchShortageUnits")}
                          </TableCell>
                          <TableCell align="right">
                            {t("staffManagement.matchExcessUnits")}
                          </TableCell>
                          <TableCell align="right">
                            {t("staffManagement.matchAtRiskTasks")}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dailyChartRows.map((row) => (
                          <TableRow key={row.day}>
                            <TableCell>{row.day}</TableCell>
                            <TableCell align="right">
                              {row.requiredUnitsTotal}
                            </TableCell>
                            <TableCell align="right">
                              {row.matchedUnits}
                            </TableCell>
                            <TableCell align="right">
                              {row.shortageUnits}
                            </TableCell>
                            <TableCell align="right">
                              {row.excessUnits}
                            </TableCell>
                            <TableCell align="right">
                              {row.atRiskTasks}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </CardContent>
          </Card>

          <Dialog
            open={drilldownOpen}
            onClose={handleCloseDrilldown}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {t("staffManagement.matchCandidateTitle")}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t("staffManagement.analysisProject")}:{" "}
                {selectedRequirement?.projectCode || "-"} |{" "}
                {t("staffManagement.taskName")}:{" "}
                {selectedRequirement?.taskName || "-"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("staffManagement.skillName")}:{" "}
                {selectedRequirement?.skillName || "-"} |{" "}
                {t("staffManagement.matchRequiredUnits")}:{" "}
                {selectedRequirement?.requiredUnits || 0} |{" "}
                {t("staffManagement.matchAvailableQualified")}:{" "}
                {selectedRequirement?.availableQualified || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("staffManagement.analysisDateFrom")} -{" "}
                {t("staffManagement.analysisDateTo")}: {periodFrom} - {periodTo}{" "}
                | {t("staffManagement.matchEvaluationDate")}:{" "}
                {selectedRequirement?.checkDate || "-"}
              </Typography>

              {candidateError ? (
                <Alert severity="error">{candidateError}</Alert>
              ) : null}

              {candidateLoading ? (
                <Box sx={{ py: 2, color: "text.secondary" }}>
                  {t("common.loading")}
                </Box>
              ) : candidateRows.length === 0 ? (
                <Alert severity="info">
                  {t("staffManagement.matchNoCandidates")}
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t("staffManagement.staff")}</TableCell>
                        <TableCell>
                          {t("staffManagement.analysisDepartment")}
                        </TableCell>
                        <TableCell align="right">
                          {t("staffManagement.matchProfileCount")}
                        </TableCell>
                        <TableCell>
                          {t("staffManagement.matchAssignedTask")}
                        </TableCell>
                        <TableCell align="right">
                          {t("staffManagement.matchTaskLoading")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {candidateRows.map((candidate) => (
                        <TableRow key={candidate.staffId}>
                          <TableCell>{candidate.staffName}</TableCell>
                          <TableCell>{candidate.department}</TableCell>
                          <TableCell align="right">
                            {candidate.profileCount}
                          </TableCell>
                          <TableCell>
                            {candidate.assignedToTask
                              ? t("basic.true")
                              : t("basic.false")}
                          </TableCell>
                          <TableCell align="right">
                            {candidate.assignedToTask
                              ? candidate.taskLoading.toFixed(2)
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDrilldown}>
                {t("common.close")}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default StaffProjectSkillMatchAnalysis;
