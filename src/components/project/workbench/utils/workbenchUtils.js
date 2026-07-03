const DAY_MS = 24 * 60 * 60 * 1000;

export const parseDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

export const formatDate = (value) => {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "-";
  return date.toLocaleDateString();
};

export const diffDays = (from, to) =>
  Math.round((to.getTime() - from.getTime()) / DAY_MS);

export const toStatusColor = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE" || s === "IN PROGRESS") return "success";
  if (s === "PLAN" || s === "NOT STARTED") return "info";
  if (s === "COMPLETE" || s === "COMPLETED") return "primary";
  if (s === "CLOSE") return "default";
  return "default";
};

export const toApiDate = (value) => {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const addDays = (value, days) => {
  const date = value instanceof Date ? new Date(value) : parseDate(value);
  if (!date) return null;
  const duration = Math.max(1, Number(days || 1));
  return new Date(date.getTime() + (duration - 1) * DAY_MS);
};

export const toLongId = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  return Math.trunc(numeric);
};

export const toLongIdKey = (value) => {
  const normalized = toLongId(value);
  return normalized === null ? "" : String(normalized);
};

export const toRoleCode = (row) => {
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

export const getLeaderStaffId = (row) =>
  row?.projectLeaderStaffId ||
  row?.staffId ||
  row?.leaderId ||
  row?.staffID ||
  "";
