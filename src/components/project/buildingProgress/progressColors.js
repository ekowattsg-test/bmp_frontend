const todayYmd = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

export const isOverdue = (plannedEndDate, progress) => {
  if (progress >= 100) return false;
  const end = parseDate(plannedEndDate);
  if (!end) return false;
  return end.getTime() < new Date(todayYmd()).getTime();
};

export const getProgressColor = (progress, plannedEndDate) => {
  const value = Number(progress ?? 0);
  if (isOverdue(plannedEndDate, value)) return "error.main";
  if (value >= 100) return "success.main";
  if (value >= 50) return "info.main";
  if (value > 0) return "warning.main";
  return "grey.400";
};

export const getProgressLabel = (progress, plannedEndDate, t) => {
  const value = Number(progress ?? 0);
  if (isOverdue(plannedEndDate, value)) {
    return t("buildingProgress.statusOverdue", "Overdue");
  }
  if (value >= 100) return t("buildingProgress.statusCompleted", "Completed");
  if (value >= 50) return t("buildingProgress.statusHalfway", "In Progress");
  if (value > 0) return t("buildingProgress.statusStarted", "Started");
  return t("buildingProgress.statusNotStarted", "Not Started");
};
