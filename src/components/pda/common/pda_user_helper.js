/**
 * pda_user_helper.js
 *
 * Helpers for reading the PDA user session stored in localStorage.
 *
 * The pda_user_info object is written by PdaLogin and enriched by PdaLayout:
 *
 *   mobileNumber  — used by WorkOrder.workBy (assignment matching)
 *   staffId       — used by WorkOrderData.staffId (data recording)
 *   staffName     — display name from Staff record
 *   token         — JWT for API calls
 *
 * WorkOrder.workBy stores staffId (the assigned worker's staff ID).
 * WorkOrderData.staffId stores staffId.
 * PdaLayout.useEffect resolves staffId from mobileNumber via GET /api/staffs/mobile/{mobileNumber}.
 */

const KEY = "pda_user_info";

/**
 * Returns the raw pda_user_info object, or null if unavailable.
 */
export function getPdaUser() {
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Mobile number of the logged-in PDA user.
 */
export function getPdaMobileNumber() {
  return getPdaUser()?.mobileNumber || "";
}

/**
 * Staff ID of the logged-in PDA user.
 * Matches WorkOrderData.staffId for recording work done.
 * Populated by PdaLayout after resolving via /api/staffs/mobile/{mobileNumber}.
 */
export function getPdaStaffId() {
  return getPdaUser()?.staffId || "";
}

/**
 * Display name: uses staffName if available, otherwise firstName + lastName.
 */
export function getPdaDisplayName() {
  const user = getPdaUser();
  if (!user) return "";
  if (user.staffName) return user.staffName;
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.login || "";
}
