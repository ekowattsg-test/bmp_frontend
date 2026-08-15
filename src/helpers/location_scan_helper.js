import { request } from "./axios_helper";
import { resolveNearbyProjectCode } from "../components/pda/common/nearby_project_helper";
import { resolveScannedValue } from "./camera_scanner_helper";

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const normalizeCode = (code) =>
  String(code || "")
    .trim()
    .toLowerCase();

/**
 * Fetch all project codes from the backend.
 */
export const fetchProjectCodes = async () => {
  const response = await request("GET", "/api/projects", null, {
    skipBackendErrorDialog: true,
  });
  const projects = Array.isArray(response?.data) ? response.data : [];
  return projects.map((p) => safeString(p?.projectCode)).filter(Boolean);
};

/**
 * Fetch all known inventory locations from stock view rows.
 */
export const fetchInventoryLocations = async () => {
  const response = await request("GET", "/api/stockviews", null, {
    skipBackendErrorDialog: true,
  });
  const rows = Array.isArray(response?.data) ? response.data : [];
  const locations = new Set();
  rows.forEach((row) => {
    const loc = safeString(row?.location);
    if (loc) locations.add(loc);
  });
  return Array.from(locations);
};

/**
 * Fetch both project codes and inventory locations.
 */
export const fetchValidLocationCodes = async () => {
  const [projectCodes, inventoryLocations] = await Promise.all([
    fetchProjectCodes(),
    fetchInventoryLocations(),
  ]);
  return {
    projectCodes,
    inventoryLocations,
    all: Array.from(new Set([...projectCodes, ...inventoryLocations])),
  };
};

/**
 * Check whether a location code exists in the project or inventory location lists.
 */
export const isValidLocationCode = (
  code,
  { projectCodes = [], inventoryLocations = [] },
) => {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return { valid: false, isProject: false, isInventory: false };
  }
  const isProject = projectCodes.some((c) => normalizeCode(c) === normalized);
  const isInventory = inventoryLocations.some(
    (c) => normalizeCode(c) === normalized,
  );
  return { valid: isProject || isInventory, isProject, isInventory };
};

/**
 * Try to resolve the current location using GPS and the nearby-project service.
 *
 * @param {string[]} [projectCodes] - Optional list of valid project codes. If omitted, codes are fetched.
 * @returns {Promise<string>} The matched project code, or an empty string if no match is found.
 */
export const resolveLocationByGps = async (projectCodes) => {
  const codes = Array.isArray(projectCodes)
    ? projectCodes
    : await fetchProjectCodes();
  if (codes.length === 0) return "";
  const code = await resolveNearbyProjectCode(
    codes.map((projectCode) => ({ projectCode })),
  );
  return code || "";
};

/**
 * Resolve a scanned location QR code and validate it against the known codes.
 *
 * @param {string} rawValue - Raw scanned input
 * @param {object} validCodes
 * @param {string[]} validCodes.projectCodes
 * @param {string[]} validCodes.inventoryLocations
 * @returns {Promise<string>} The validated location code
 * @throws {Error} If the code is empty or not recognised
 */
export const resolveLocationByScan = async (
  rawValue,
  { projectCodes = [], inventoryLocations = [] },
) => {
  const decoded = await resolveScannedValue(rawValue);
  const code = safeString(decoded || rawValue);
  if (!code) {
    throw new Error("No location code scanned.");
  }

  const { valid } = isValidLocationCode(code, {
    projectCodes,
    inventoryLocations,
  });
  if (!valid) {
    throw new Error(`Invalid location code: ${code}`);
  }
  return code;
};
