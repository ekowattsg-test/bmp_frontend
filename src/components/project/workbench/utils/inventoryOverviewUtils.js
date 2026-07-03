import { buildOverviewResourceLabel } from "./overviewLabelUtils";

export const buildInventoryOverviewRows = ({
  inventoryOverviewRowsReady,
  inventoryOverviewBounds,
  inventoryOverviewData,
  tasks,
  streams,
  parseDate,
  workingDaySet,
  dayMs,
}) => {
  if (!inventoryOverviewRowsReady) return [];

  const minTime = inventoryOverviewBounds.minDate.getTime();
  const maxTime = inventoryOverviewBounds.maxDate.getTime();
  const taskById = (tasks || []).reduce((acc, task) => {
    const id = String(task?.projectTaskId || "").trim();
    if (!id) return acc;
    acc[id] = task;
    return acc;
  }, {});
  const streamNameById = (streams || []).reduce((acc, stream) => {
    const id = String(stream?.projectStreamId || "").trim();
    if (!id) return acc;
    acc[id] = String(stream?.streamName || "").trim() || id;
    return acc;
  }, {});
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
    const resourceLabel = buildOverviewResourceLabel({
      item,
      taskById,
      streamNameById,
      fallbackLabel: activityName,
    });
    const sTime = Math.max(start.getTime(), minTime);
    const eTime = Math.min(end.getTime(), maxTime);
    if (eTime < sTime) return;

    const startDate = new Date(sTime);
    startDate.setHours(0, 0, 0, 0);
    let supplyTime = startDate.getTime();

    if (!workingDaySet.has(startDate.getDay())) {
      const prevTime = supplyTime - dayMs;
      const prevDate = new Date(prevTime);
      if (prevTime >= minTime && workingDaySet.has(prevDate.getDay())) {
        supplyTime = prevTime;
      }
    }

    const existing = target.dayMap.get(supplyTime) || [];
    existing.push({ activityName, resourceLabel, quantity: qty });
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
};

export const collectInventoryUsageItems = (
  row,
  col,
  inventoryOverviewViewMode,
) => {
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
      if (time >= col.monthStart.getTime() && time <= col.monthEnd.getTime()) {
        activities.push(...dayActivities);
      }
    });
  }

  return activities;
};

export const getInventoryUsageValueByMode = (
  row,
  col,
  inventoryOverviewViewMode,
) =>
  collectInventoryUsageItems(row, col, inventoryOverviewViewMode).reduce(
    (sum, activity) => sum + Number(activity?.quantity || 0),
    0,
  );
