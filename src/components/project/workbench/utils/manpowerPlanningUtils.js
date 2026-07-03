const normalizeText = (value) => String(value || "").trim();

export const normalizeManpowerLoading = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(0, Math.min(1, numeric));
};

export const getManpowerTaskId = (target) =>
  Number(target?.raw?.projectTaskId || target?.projectTaskId || 0) || null;

export const isManpowerTouched = (task) => {
  const raw = task?.raw ?? task;
  if (!raw) return false;

  const value = raw?.manpowerTouched;
  if (typeof value === "boolean") return value;

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "y" ||
    normalized === "yes"
  );
};

export const hasDuplicateStaffSelection = (rows) => {
  const selectedStaffIds = rows
    .map((row) => normalizeText(row?.staffId).toLowerCase())
    .filter(Boolean);

  return new Set(selectedStaffIds).size !== selectedStaffIds.length;
};

export const hasInvalidManpowerLoading = (rows) =>
  rows.some((row) => {
    const loading = Number(row?.loading);
    return !Number.isFinite(loading) || loading < 0 || loading > 1;
  });

export const hasEmptyStaffSelection = (rows) =>
  rows.some((row) => !normalizeText(row?.staffId));

export const getManpowerRowsForActiveDate = (
  manpowerPlanningRows,
  activeManpowerPlanningDate,
) => {
  const rowsForDate = !activeManpowerPlanningDate
    ? manpowerPlanningRows
    : manpowerPlanningRows.filter(
        (item) =>
          normalizeText(item?.workDate) ===
          normalizeText(activeManpowerPlanningDate),
      );

  return [...rowsForDate].sort((a, b) => {
    const orderA = Number(a?.projectSkillOrder);
    const orderB = Number(b?.projectSkillOrder);
    if (orderA !== orderB) return orderA - orderB;

    const deployedA = Boolean(normalizeText(a?.staffId));
    const deployedB = Boolean(normalizeText(b?.staffId));
    if (deployedA !== deployedB) return deployedA ? -1 : 1;

    return normalizeText(a?.apiId).localeCompare(normalizeText(b?.apiId));
  });
};

export const buildManpowerDialogData = ({
  taskId,
  staffs,
  rows,
  projectSkillRows,
  staffSkillRows,
  staffSkillProfileViewRows,
  toLongId,
  normalizeManpowerLoading,
  noSkillProfileLabel,
  noneLabel,
}) => {
  const skillNameById = staffSkillRows.reduce((acc, skill) => {
    const skillId = toLongId(skill?.staffSkillId);
    if (skillId === null) return acc;
    const skillName = normalizeText(skill?.skillName);
    if (!skillName) return acc;
    acc[String(skillId)] = skillName;
    return acc;
  }, {});

  const requiredSkillByProjectSkillId = projectSkillRows.reduce(
    (acc, projectSkill) => {
      const projectSkillId = toLongId(projectSkill?.projectSkillId);
      if (projectSkillId === null) return acc;
      const skillId = toLongId(projectSkill?.skillId);
      if (skillId === null) return acc;
      const skillName = skillNameById[String(skillId)] || "";
      acc[String(projectSkillId)] = skillName;
      return acc;
    },
    {},
  );

  const manpowerProjectSkillChips = projectSkillRows
    .map((projectSkill, index) => {
      const projectSkillId = toLongId(projectSkill?.projectSkillId);
      const skillId = toLongId(projectSkill?.skillId);
      const label =
        skillId !== null ? String(skillNameById[String(skillId)] || "") : "";

      return {
        id: String(projectSkillId ?? ""),
        label: normalizeText(label),
        order: index,
      };
    })
    .filter((item) => item.id && item.label);

  const projectSkillOrderById = projectSkillRows.reduce(
    (acc, projectSkill, index) => {
      const projectSkillId = toLongId(projectSkill?.projectSkillId);
      if (projectSkillId === null) return acc;
      acc[String(projectSkillId)] = index;
      return acc;
    },
    {},
  );

  const normalizedRows = rows
    .map((item) => ({
      apiId: item?.projectManpowerId,
      projectTaskId: Number(item?.projectTaskId || taskId) || taskId,
      projectSkillId: toLongId(item?.projectSkillId),
      workDate: normalizeText(item?.workDate),
      requiredSkill:
        requiredSkillByProjectSkillId[
          String(toLongId(item?.projectSkillId) ?? "")
        ] || "-",
      projectSkillOrder:
        projectSkillOrderById[String(toLongId(item?.projectSkillId) ?? "")] ??
        Number.MAX_SAFE_INTEGER,
      staffId: normalizeText(item?.staffId),
      role: "worker",
      loading: String(normalizeManpowerLoading(item?.loading ?? 1)),
    }))
    .filter((item) => item.apiId);

  const availableDates = Array.from(
    new Set(
      normalizedRows
        .map((item) => normalizeText(item?.workDate))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const staffNameById = staffs.reduce((acc, staff) => {
    const staffId = normalizeText(staff?.staffId);
    if (!staffId) return acc;
    acc[staffId] =
      normalizeText(staff?.staffName) ||
      [staff?.firstName, staff?.lastName].filter(Boolean).join(" ").trim() ||
      staffId;
    return acc;
  }, {});

  const staffSkillMap = staffSkillProfileViewRows.reduce((acc, profile) => {
    const staffId = normalizeText(profile?.staffId);
    if (!staffId) return acc;

    const skillName = normalizeText(profile?.skillName);
    if (!skillName) return acc;

    if (!Array.isArray(acc[staffId])) acc[staffId] = [];
    if (!acc[staffId].includes(skillName)) acc[staffId].push(skillName);
    return acc;
  }, {});

  const dropdownOptions = staffs
    .map((staff) => {
      const staffId = normalizeText(staff?.staffId);
      if (!staffId) return null;
      const staffName = staffNameById[staffId] || staffId;
      const skillProfiles =
        Array.isArray(staffSkillMap[staffId]) &&
        staffSkillMap[staffId].length > 0
          ? staffSkillMap[staffId]
          : [noSkillProfileLabel];
      return {
        value: staffId,
        workDate: "",
        requiredSkill: "",
        staffName,
        skillProfiles,
        deployed: false,
        label: staffName,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      normalizeText(a?.staffName).localeCompare(
        normalizeText(b?.staffName),
        undefined,
        {
          sensitivity: "base",
        },
      ),
    );

  dropdownOptions.push({
    value: "",
    workDate: "",
    requiredSkill: "",
    staffName: noneLabel,
    skillProfiles: [],
    deployed: false,
    label: noneLabel,
  });

  return {
    manpowerProjectSkillChips,
    normalizedRows,
    availableDates,
    staffSkillMap,
    dropdownOptions,
  };
};

export const buildManpowerSavePayload = ({
  row,
  taskId,
  normalizeManpowerLoading,
}) => ({
  projectManpowerId: row.apiId,
  projectTaskId: taskId,
  projectSkillId: row.projectSkillId,
  workDate: normalizeText(row.workDate),
  staffId: normalizeText(row.staffId),
  role: "worker",
  loading: normalizeManpowerLoading(row.loading),
});

export const normalizeSavedManpowerRow = ({
  saved,
  row,
  payload,
  taskId,
  toLongId,
  normalizeManpowerLoading,
}) => ({
  apiId: saved?.projectManpowerId || row.apiId,
  projectTaskId: taskId,
  projectSkillId: toLongId(saved?.projectSkillId ?? row.projectSkillId),
  workDate: normalizeText(saved?.workDate || row.workDate),
  requiredSkill: row.requiredSkill,
  projectSkillOrder: row.projectSkillOrder,
  staffId: normalizeText(saved?.staffId || payload.staffId),
  role: "worker",
  loading: String(normalizeManpowerLoading(saved?.loading ?? payload.loading)),
});
