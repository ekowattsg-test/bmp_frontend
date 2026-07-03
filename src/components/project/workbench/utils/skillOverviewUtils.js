import { buildOverviewResourceLabel } from "./overviewLabelUtils";

export const buildSkillOverviewRows = ({
  skillOverviewRowsReady,
  inventoryOverviewBounds,
  tasks,
  streams,
  skillOverviewSkills,
  skillOverviewData,
  parseDate,
  toLongId,
  toLongIdKey,
}) => {
  if (!skillOverviewRowsReady) return [];

  const minTime = inventoryOverviewBounds.minDate.getTime();
  const maxTime = inventoryOverviewBounds.maxDate.getTime();

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

  const skillNameById = skillOverviewSkills.reduce((acc, skill) => {
    const key = toLongIdKey(skill?.staffSkillId);
    if (!key) return acc;
    acc[key] = String(skill?.skillName || "").trim() || key;
    return acc;
  }, {});

  const grouped = new Map();

  skillOverviewData.forEach((item) => {
    const taskId = String(item?.projectTaskId || "").trim();
    const skillId = toLongId(item?.skillId);
    if (!taskId || skillId === null) return;

    const task = taskById[taskId];
    if (!task) return;

    const start = parseDate(task?.taskStartDate || task?.actualStartDate);
    const end = parseDate(task?.taskEndDate || task?.actualEndDate) || start;
    if (!start || !end) return;

    const unitValue = Number(item?.unit || 0);
    if (!Number.isFinite(unitValue) || unitValue <= 0) return;

    if (!grouped.has(skillId)) {
      grouped.set(skillId, {
        key: String(skillId),
        skillId,
        skillName: skillNameById[String(skillId)] || String(skillId),
        dayMap: new Map(),
      });
    }

    const target = grouped.get(skillId);
    const taskName = String(task?.taskName || `Task ${taskId}`).trim();
    const resourceLabel = buildOverviewResourceLabel({
      item: {
        ...item,
        taskName,
        projectStreamId: task?.projectStreamId,
      },
      taskById,
      streamNameById,
      fallbackLabel: taskName,
    });
    const sTime = Math.max(start.getTime(), minTime);
    const eTime = Math.min(end.getTime(), maxTime);
    if (eTime < sTime) return;

    const cur = new Date(sTime);
    cur.setHours(0, 0, 0, 0);
    while (cur.getTime() <= eTime) {
      const timeKey = cur.getTime();
      const existing = target.dayMap.get(timeKey) || [];
      existing.push({ taskName, resourceLabel, unit: unitValue });
      target.dayMap.set(timeKey, existing);
      cur.setDate(cur.getDate() + 1);
    }
  });

  return Array.from(grouped.values()).sort((a, b) =>
    String(a.skillName || "").localeCompare(
      String(b.skillName || ""),
      undefined,
      {
        sensitivity: "base",
      },
    ),
  );
};

export const collectSkillUsageItems = (row, col, skillOverviewViewMode) => {
  const items = [];

  if (skillOverviewViewMode === "day") {
    items.push(...(row.dayMap.get(col.time) || []));
  } else if (skillOverviewViewMode === "week") {
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

export const getSkillUsageValueByMode = (row, col, skillOverviewViewMode) =>
  collectSkillUsageItems(row, col, skillOverviewViewMode).reduce(
    (sum, item) => sum + Number(item?.unit || 0),
    0,
  );
