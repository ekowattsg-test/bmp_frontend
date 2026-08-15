/**
 * Adjustment PDF Helper
 *
 * Generates a Stock Adjustment Note after a stock adjustment movement and
 * stores it in the document library.
 */

import { jsPDF } from "jspdf";
import { request } from "./axios_helper";
import {
  abort,
  commit,
  deleteFileFromDrive,
  getActiveStorageProviderConfig,
  normalizeFileMetadata,
  uploadFileToDrive,
} from "./file_helper";

const ADJUSTMENT_LIBRARY_PROJECT_CODE = "__STOCK_ADJUSTMENT";
const ADJUSTMENT_LIBRARY_CATALOG_NAME = "Stock Adjustments";

const sanitizeFileNamePart = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "NA";
  const cleaned = raw
    .replace(/[<>":"/\\|?*]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.-]+|[_.-]+$/g, "");
  return cleaned || "NA";
};

const formatDateForFileName = (value) => {
  if (!value) return "NA";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "NA";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateTimeForPdf = (value) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const parseDocumentMeta = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    return normalizeFileMetadata(value);
  }
  try {
    const parsed = JSON.parse(String(value));
    return normalizeFileMetadata(parsed);
  } catch {
    return null;
  }
};

const buildFileName = (movementId) => {
  const mvNumber = sanitizeFileNamePart(movementId);
  const date = sanitizeFileNamePart(formatDateForFileName(new Date()));
  return `ADJ_${mvNumber}_${date}.pdf`;
};

const buildQuickSearchKey = (
  movementId,
  stockCode,
  location,
  reason,
  fileName,
) => {
  return [movementId, stockCode, location, reason, fileName]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
};

const ensureAdjustmentCatalog = async () => {
  try {
    const response = await request(
      "GET",
      `/api/librarycatelogs/project/${encodeURIComponent(ADJUSTMENT_LIBRARY_PROJECT_CODE)}`,
    );
    const payload = response?.data || null;
    const catalog = Array.isArray(payload) ? payload[0] : payload;
    if (catalog?.libraryCatelogId) {
      return catalog;
    }
  } catch {
    // create the catalog below if it does not already exist
  }

  const createPayload = {
    libraryCatelogName: ADJUSTMENT_LIBRARY_CATALOG_NAME,
    active: 1,
    visibleLevel: 0,
    description: "Generated stock adjustment documents",
    projectCode: ADJUSTMENT_LIBRARY_PROJECT_CODE,
    quicSearchKey: "stock adjustment, in adjustment, out adjustment",
  };

  const createResponse = await request(
    "POST",
    "/api/librarycatelogs",
    createPayload,
  );
  const created = createResponse?.data || null;
  return Array.isArray(created) ? created[0] : created;
};

const renderAdjustmentPdf = ({
  company,
  movementId,
  direction,
  stockCode,
  location,
  reason,
  quantity,
  productName,
  operator,
  previousQuantity,
  newQuantity,
}) => {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "p" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  const ensureSpace = (neededHeight) => {
    if (currentY + neededHeight <= pageHeight - margin) return;
    pdf.addPage();
    currentY = margin;
  };

  const addLabelValue = (label, value, x = margin, maxWidth = contentWidth) => {
    const text = String(value || "-").trim() || "-";
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(`${label}:`, x, currentY);
    pdf.setFont("helvetica", "normal");
    const wrapped = pdf.splitTextToSize(text, maxWidth - 35);
    pdf.text(wrapped, x + 32, currentY);
    currentY += Math.max(6, wrapped.length * 4.5);
  };

  const companyName = String(company?.companyName || "Company").trim();
  const title =
    direction === "in"
      ? "Stock Adjustment In Note"
      : "Stock Adjustment Out Note";

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(companyName, margin, currentY);

  pdf.setFontSize(16);
  pdf.text(title, pageWidth - margin, currentY, { align: "right" });
  currentY += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  addLabelValue("Movement ID", movementId);
  addLabelValue("Stock Code", stockCode);
  addLabelValue("Product", productName);
  addLabelValue("Location", location);
  addLabelValue(
    "Adjustment",
    direction === "in" ? `+${quantity}` : `-${quantity}`,
  );
  addLabelValue("Previous Qty", previousQuantity);
  addLabelValue("New Qty", newQuantity);
  addLabelValue("Reason", reason);
  addLabelValue("Recorded", formatDateTimeForPdf(new Date()));
  addLabelValue("Action By", operator || "-");

  currentY += 4;
  pdf.setLineWidth(0.2);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  ensureSpace(30);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(
    "This adjustment was recorded directly as a stock movement (no work order).",
    margin,
    currentY,
  );

  return pdf.output("blob");
};

/**
 * Generate a stock adjustment PDF and store it in the document library.
 */
export const generateAndStoreAdjustmentPdf = async ({
  companyId,
  movementId,
  direction,
  stockCode,
  location,
  reason,
  quantity,
  productName,
  operator,
  previousQuantity,
  newQuantity,
}) => {
  if (!companyId) {
    throw new Error("companyId is required to generate the adjustment PDF.");
  }
  if (!movementId) {
    throw new Error("movementId is required to generate the adjustment PDF.");
  }

  const companiesResponse = await request("GET", "/api/companies");
  const companies = Array.isArray(companiesResponse?.data)
    ? companiesResponse.data
    : [];
  const company = companies.find(
    (item) =>
      String(item?.companyId || "").trim() === String(companyId || "").trim(),
  );
  if (!company) {
    throw new Error("Unable to resolve company details for adjustment PDF.");
  }

  const fileName = buildFileName(movementId);
  const pdfBlob = await renderAdjustmentPdf({
    company,
    movementId,
    direction,
    stockCode,
    location,
    reason,
    quantity,
    productName,
    operator,
    previousQuantity,
    newQuantity,
  });
  const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

  const activeCfg = getActiveStorageProviderConfig();
  const uploaded = await uploadFileToDrive(pdfFile, null, activeCfg.folderId);
  const normalized = normalizeFileMetadata(uploaded, {
    name: fileName,
    mimeType: "application/pdf",
    provider: activeCfg.provider,
  });

  try {
    const catalog = await ensureAdjustmentCatalog();
    const catalogId = Number(catalog?.libraryCatelogId);
    if (!Number.isFinite(catalogId) || catalogId <= 0) {
      throw new Error("Stock adjustment document catalog is not available.");
    }

    const entryPayload = {
      libraryCatelogId: catalogId,
      libraryEntryName: fileName,
      libraryEntryType: "doc",
      libraryEntryKey: JSON.stringify(normalized),
      entryQuickSearchKey: buildQuickSearchKey(
        movementId,
        stockCode,
        location,
        reason,
        fileName,
      ),
    };

    const existingEntriesResponse = await request(
      "GET",
      `/api/libraryentries?libraryCatelogId=${encodeURIComponent(catalogId)}`,
    );
    const existingEntries = Array.isArray(existingEntriesResponse?.data)
      ? existingEntriesResponse.data
      : [];

    const existingEntry = existingEntries.find((entry) => {
      if (Number(entry?.libraryCatelogId) !== catalogId) return false;
      const entryName = String(entry?.libraryEntryName || "").trim();
      return entryName && entryName === fileName;
    });

    const oldDocumentMeta = parseDocumentMeta(existingEntry?.libraryEntryKey);

    const entryResponse = existingEntry?.libraryEntryId
      ? await request(
          "PUT",
          `/api/libraryentries/${existingEntry.libraryEntryId}`,
          {
            ...existingEntry,
            ...entryPayload,
          },
        )
      : await request("POST", "/api/libraryentries", entryPayload);

    if (oldDocumentMeta?.id && oldDocumentMeta.id !== normalized.id) {
      try {
        await deleteFileFromDrive(
          oldDocumentMeta.id,
          null,
          oldDocumentMeta.provider,
        );
      } catch {
        // If entry cleanup fails, keep the new entry and continue commit.
      }
    }

    await commit();

    return {
      fileName,
      catalog,
      entry: entryResponse?.data || null,
      file: normalized,
    };
  } catch (error) {
    await abort().catch(() => {});
    throw error;
  }
};
