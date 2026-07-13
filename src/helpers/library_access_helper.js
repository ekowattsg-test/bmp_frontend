const parseLevel = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const LIBRARY_MANAGE_MIN_LEVEL = parseLevel(
  import.meta.env.VITE_LIBRARY_MANAGE_LEVEL,
  3,
);

export const normalizeUserLevel = (value) => parseLevel(value, 0);

export const canManageLibrary = (userLevel) =>
  normalizeUserLevel(userLevel) >= LIBRARY_MANAGE_MIN_LEVEL;
