import { buildOverviewResourceLabel } from "./overviewLabelUtils";

export const buildManpowerOverviewRows = ({
  manpowerOverviewRowsReady,
  manpowerOverviewData,
  manpowerOverviewStaffs,
  manpowerOverviewSkillsByStaffId,
  tasks,
  streams,
  inventoryOverviewBounds,
  parseDate,
}) => {
  if (!manpowerOverviewRowsReady) return [];

  const minTime = inventoryOverviewBounds.minDate.getTime();
  const maxTime = inventoryOverviewBounds.maxDate.getTime();

  const taskNameById = tasks.reduce((acc, task) => {
    const key = String(task?.projectTaskId || "").trim();
    if (!key) return acc;
    acc[key] = String(task?.taskName || `Task ${key}`).trim() || `Task ${key}`;
    return acc;
  }, {});

  const taskById = tasks.reduce((acc, task) => {
    const key = String(task?.projectTaskId || "").trim();
    if (!key) return acc;
    acc[key] = task;
    return acc;
  }, {});

  const streamNameById = (streams || []).reduce((acc, stream) => {
    const key = String(stream?.projectStreamId || "").trim();
    if (!key) return acc;
    acc[key] = String(stream?.streamName || "").trim() || key;
    return acc;
  }, {});

  const staffNameById = manpowerOverviewStaffs.reduce((acc, staff) => {
    const id = String(staff?.staffId || "").trim();
    if (!id) return acc;
    acc[id] =
      String(staff?.staffName || "").trim() ||
      [staff?.firstName, staff?.lastName].filter(Boolean).join(" ").trim() ||
      id;
    return acc;
  }, {});

  const grouped = new Map();

  manpowerOverviewData.forEach((item) => {
    const staffId = String(item?.staffId || "").trim();
    if (!staffId) return;

    const workDate = parseDate(item?.workDate);
    if (!workDate) return;

    const time = workDate.getTime();
    if (time < minTime || time > maxTime) return;

    const loading = Number(item?.loading ?? 0);
    if (!Number.isFinite(loading) || loading <= 0) return;

    if (!grouped.has(staffId)) {
      grouped.set(staffId, {
        key: staffId,
        staffId,
        staffName: staffNameById[staffId] || staffId,
        skillProfiles: Array.isArray(manpowerOverviewSkillsByStaffId?.[staffId])
          ? manpowerOverviewSkillsByStaffId[staffId]
          : [],
        dayMap: new Map(),
      });
    }

    const target = grouped.get(staffId);
    const taskId = String(item?.projectTaskId || "").trim();
    const taskName = taskNameById[taskId] || `Task ${taskId || "-"}`;
    const resourceLabel = buildOverviewResourceLabel({
      item: {
        ...item,
        taskName,
      },
      taskById,
      streamNameById,
      fallbackLabel: taskName,
    });
    const existing = target.dayMap.get(time) || [];
    existing.push({ taskName, resourceLabel, loading });
    target.dayMap.set(time, existing);
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
};

export const collectManpowerUsageItems = (
  row,
  col,
  manpowerOverviewViewMode,
) => {
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
      if (time >= col.monthStart.getTime() && time <= col.monthEnd.getTime()) {
        items.push(...dayItems);
      }
    });
  }

  return items;
};

export const getManpowerUsageValueByMode = (
  row,
  col,
  manpowerOverviewViewMode,
) =>
  collectManpowerUsageItems(row, col, manpowerOverviewViewMode).reduce(
    (sum, item) => sum + Number(item?.loading || 0),
    0,
  );
