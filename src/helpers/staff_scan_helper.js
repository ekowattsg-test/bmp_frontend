import { request } from "./axios_helper";
import { resolveScannedValue } from "./camera_scanner_helper";

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const isActive = (staff) => {
  if (!staff) return false;
  if (staff.active === 1 || staff.active === true) return true;
  return String(staff.active).toLowerCase() === "true";
};

/**
 * Fetch the full staff list and return only active staff.
 */
export const fetchActiveStaffList = async () => {
  const response = await request("GET", "/api/staffs", null, {
    skipBackendErrorDialog: true,
  });
  const staff = Array.isArray(response?.data) ? response.data : [];
  return staff.filter(isActive);
};

/**
 * Resolve a scanned staff QR code against the active staff list.
 *
 * The decoded value is matched against staffId or mobileNumber.
 *
 * @param {string} rawValue - Raw scanned input
 * @param {object[]} activeStaff - List of active staff records
 * @returns {Promise<{staffId: string, staffName: string}>}
 * @throws {Error} If the code is empty or the staff is not found/inactive
 */
export const resolveStaffByScan = async (rawValue, activeStaff = []) => {
  const decoded = await resolveScannedValue(rawValue, {
    requireEncoded: true,
  });
  const scannedId = safeString(decoded);
  if (!scannedId) {
    throw new Error("No staff code scanned.");
  }

  const normalizedScanned = scannedId.toLowerCase();
  const staff = activeStaff.find((s) => {
    const id = safeString(s?.staffId);
    const mobile = safeString(s?.mobileNumber);
    return (
      id.toLowerCase() === normalizedScanned ||
      mobile.toLowerCase() === normalizedScanned
    );
  });

  if (!staff) {
    throw new Error(`Staff not found or inactive: ${scannedId}`);
  }

  return {
    staffId: safeString(staff?.staffId) || scannedId,
    staffName: safeString(staff?.staffName) || scannedId,
  };
};
