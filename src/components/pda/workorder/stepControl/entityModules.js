export const ENTITY_MODULE_KEYS = {
  DEFAULT: "default",
  NO_ACT: "noact",
};

export const ENTITY_MODULES = {
  [ENTITY_MODULE_KEYS.DEFAULT]: {
    key: ENTITY_MODULE_KEYS.DEFAULT,
    renderEntityUi: true,
    autoExecute: false,
  },
  [ENTITY_MODULE_KEYS.NO_ACT]: {
    // Dummy no-op entity module: control proceeds without UI/action payload.
    key: ENTITY_MODULE_KEYS.NO_ACT,
    renderEntityUi: false,
    autoExecute: true,
  },
};

export function normalizeEntityKey(entity) {
  return String(entity || "")
    .trim()
    .toLowerCase();
}

export function resolveEntityModule(entity) {
  const key = normalizeEntityKey(entity);
  return ENTITY_MODULES[key] || ENTITY_MODULES[ENTITY_MODULE_KEYS.DEFAULT];
}
