export const normalizeSkillUnit = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.round(numeric));
};

export const getSkillTaskId = (target) =>
  Number(target?.raw?.projectTaskId || 0) || null;

export const buildSkillPlanningRowsFromApi = ({
  rows,
  taskId,
  skills,
  toLongId,
  toLongIdKey,
  normalizeSkillUnit,
}) => {
  const skillNameById = skills.reduce((acc, skill) => {
    const id = toLongIdKey(skill?.staffSkillId);
    if (!id) return acc;
    acc[id] = String(skill?.skillName || "").trim() || id;
    return acc;
  }, {});

  return rows
    .map((item) => {
      const skillId = toLongId(item?.skillId);
      if (skillId === null) return null;
      return {
        apiId: item?.projectSkillId,
        projectTaskId: Number(item?.projectTaskId || taskId) || taskId,
        skillId,
        skillName: skillNameById[String(skillId)] || String(skillId),
        unit: String(normalizeSkillUnit(item?.unit || 1)),
      };
    })
    .filter(Boolean);
};

export const findDuplicateSkillAssignment = ({
  skillPlanningRows,
  skillId,
  apiId,
  toLongId,
}) =>
  skillPlanningRows.find(
    (item) =>
      toLongId(item?.skillId) === skillId &&
      String(item?.apiId || "") !== String(apiId || ""),
  );

export const buildSkillSavePayload = ({
  apiId,
  taskId,
  skillId,
  unit,
  normalizeSkillUnit,
}) => ({
  ...(apiId ? { projectSkillId: apiId } : {}),
  projectTaskId: taskId,
  skillId,
  unit: normalizeSkillUnit(unit),
});

export const buildSavedSkillRow = ({
  saved,
  payload,
  apiId,
  taskId,
  skillId,
  skillById,
  toLongId,
  normalizeSkillUnit,
}) => {
  const resolvedSkillId = toLongId(saved?.skillId ?? skillId) ?? skillId;
  return {
    apiId: saved?.projectSkillId || apiId,
    projectTaskId: taskId,
    skillId: resolvedSkillId,
    skillName:
      String(skillById?.[resolvedSkillId]?.skillName || "").trim() ||
      String(resolvedSkillId),
    unit: String(normalizeSkillUnit(saved?.unit ?? payload.unit)),
  };
};

export const upsertSkillPlanningRow = ({ prevRows, nextRow, apiId }) => {
  const idx = prevRows.findIndex(
    (item) => String(item?.apiId || "") === String(apiId || ""),
  );
  if (idx < 0) {
    return [...prevRows, nextRow];
  }
  const next = [...prevRows];
  next[idx] = nextRow;
  return next;
};

export const removeSkillPlanningRowsBySkillId = ({
  prevRows,
  skillId,
  toLongId,
}) => prevRows.filter((item) => toLongId(item?.skillId) !== skillId);
