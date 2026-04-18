export function generateProductCode(companyPrefix = "") {
  const prefix = String(companyPrefix || "").trim();
  const idPart = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return prefix ? `${prefix}-${idPart}` : idPart;
}

export default generateProductCode;
