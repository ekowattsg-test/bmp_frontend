const normalizeRole = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const hasRole = (role, roleList) => {
  const target = normalizeRole(role);
  return (roleList || []).some((r) => {
    const normalized = normalizeRole(r);
    if (normalized === target) return true;
    return String(r)
      .split(/[,;|]/)
      .map((entry) => normalizeRole(entry))
      .some((entry) => entry === target);
  });
};

export const hasMenu = (menu, menuList) => {
  const target = normalizeRole(menu);
  return (menuList || []).some((m) => {
    const normalized = normalizeRole(m);
    if (normalized === target) return true;
    return String(m)
      .split(/[,;|]/)
      .map((entry) => normalizeRole(entry))
      .some((entry) => entry === target);
  });
};
