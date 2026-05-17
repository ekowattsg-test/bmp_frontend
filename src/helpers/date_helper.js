/**
 * Returns a local-time ISO datetime string: "YYYY-MM-DDTHH:mm:ss"
 * without a UTC "Z" suffix, preserving the user's local timezone.
 *
 * Use instead of new Date().toISOString() for all BMP business dates.
 */
export const toLocalISO = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes()) +
    ":" +
    pad(d.getSeconds())
  );
};

/**
 * Returns the local date portion only: "YYYY-MM-DD"
 * Use instead of new Date().toISOString().split("T")[0].
 */
export const toLocalDate = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
};
