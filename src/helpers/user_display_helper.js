/**
 * User display helpers.
 *
 * Centralizes how a user's name is formatted for UI labels and backend
 * payloads, so stock flows and other modules do not fall back to the login id.
 */

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

/**
 * Return a display name for the given user info object.
 * Prefers staffName, then "<lastName> <firstName>", then login/userName.
 */
export const getOperatorName = (info) => {
  if (!info) return "";
  return (
    safeString(info.staffName) ||
    `${safeString(info.lastName)} ${safeString(info.firstName)}`.trim() ||
    safeString(info.login || info.userName)
  );
};

/**
 * Return the login id for the given user info object.
 */
export const getUserLogin = (info) => {
  if (!info) return "";
  return safeString(info.login || info.userName);
};
