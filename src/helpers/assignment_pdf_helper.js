/**
 * Asset Assignment PDF Helper
 *
 * Generates an Asset Assignment Note PDF after an Allocating work order and
 * stores it in the document library.
 */

import { jsPDF } from "jspdf";
import { request } from "./axios_helper";
import {
  abort,
  commit,
  deleteFileFromDrive,
  fetchFileBlobUrl,
  getActiveStorageProviderConfig,
  normalizeFileMetadata,
  uploadFileToDrive,
} from "./file_helper";

const ASSIGNMENT_LIBRARY_PROJECT_CODE = "__ASSET_ASSIGNMENT";
const ASSIGNMENT_LIBRARY_CATALOG_NAME = "Asset Assignments";

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

const buildFileName = (workOrderId) => {
  const woNumber = sanitizeFileNamePart(workOrderId);
  const date = sanitizeFileNamePart(formatDateForFileName(new Date()));
  return `${woNumber}_${date}.pdf`;
};

const buildQuickSearchKey = (workOrderId, worker, fileName) => {
  return [workOrderId, worker, fileName]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
};

const ensureAssignmentCatalog = async () => {
  try {
    const response = await request(
      "GET",
      `/api/librarycatelogs/project/${encodeURIComponent(ASSIGNMENT_LIBRARY_PROJECT_CODE)}`,
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
    libraryCatelogName: ASSIGNMENT_LIBRARY_CATALOG_NAME,
    active: 1,
    visibleLevel: 0,
    description: "Generated asset assignment documents",
    projectCode: ASSIGNMENT_LIBRARY_PROJECT_CODE,
    quicSearchKey: "asset assignment, allocating, stock transfer",
  };

  const createResponse = await request(
    "POST",
    "/api/librarycatelogs",
    createPayload,
  );
  const created = createResponse?.data || null;
  return Array.isArray(created) ? created[0] : created;
};

const renderAssignmentPdf = async ({
  company,
  workOrderId,
  fromLocation,
  toLocation,
  operator,
  items,
  productMap,
  photos = [],
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
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(companyName, margin, currentY);

  pdf.setFontSize(16);
  pdf.text("Asset Assignment Note", pageWidth - margin, currentY, {
    align: "right",
  });
  currentY += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  addLabelValue("Work Order", workOrderId);
  addLabelValue("From Location", fromLocation);
  addLabelValue("Assigned To", toLocation);
  addLabelValue("Assigned", formatDateTimeForPdf(new Date()));
  addLabelValue("Action By", operator || "-");

  currentY += 4;
  pdf.setLineWidth(0.2);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Assigned Assets", margin, currentY);
  currentY += 5;

  const headers = [
    { label: "#", width: 12, align: "left" },
    { label: "Product", width: 70, align: "left" },
    { label: "Qty", width: 22, align: "right" },
    { label: "Asset Code", width: 54, align: "left" },
  ];
  const colX = headers.map((header, index) =>
    index === 0
      ? margin
      : headers.slice(0, index).reduce((sum, item) => sum + item.width, margin),
  );
  const headerHeight = 8;

  const drawHeaderRow = () => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    headers.forEach((header, index) => {
      const x = colX[index];
      pdf.rect(x, currentY, header.width, headerHeight);
      if (header.align === "right") {
        pdf.text(header.label, x + header.width - 1.5, currentY + 5.5, {
          align: "right",
        });
      } else {
        pdf.text(header.label, x + 1.5, currentY + 5.5);
      }
    });
    currentY += headerHeight;
  };

  drawHeaderRow();

  const rows = Array.isArray(items) ? items : [];
  rows.forEach((item, index) => {
    const productName =
      productMap[String(item?.productCode || "")] || item?.productCode || "-";
    const stockCode = String(item?.stockCode || "");

    const values = [
      index + 1,
      productName,
      String(item?.quantity ?? "-"),
      stockCode,
    ];
    const rowHeight = Math.max(
      8,
      ...values.map(
        (value, cellIndex) =>
          pdf.splitTextToSize(
            String(value || ""),
            headers[cellIndex].width - 2.5,
          ).length * 4.5,
      ),
    );

    ensureSpace(rowHeight + 10);
    if (currentY + rowHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      drawHeaderRow();
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    headers.forEach((header, cellIndex) => {
      const x = colX[cellIndex];
      const value = values[cellIndex];
      const align = header.align || "left";
      const wrapped = pdf.splitTextToSize(
        String(value || ""),
        header.width - 2.5,
      );
      pdf.rect(x, currentY, header.width, rowHeight);
      pdf.text(
        wrapped,
        align === "right" ? x + header.width - 1.5 : x + 1.5,
        currentY + 5,
        { align },
      );
    });

    currentY += rowHeight;
  });

  const validPhotos = Array.isArray(photos) ? photos.filter(Boolean) : [];
  if (validPhotos.length > 0) {
    pdf.addPage();
    currentY = margin;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Assignment Photos", margin, currentY);
    currentY += 8;

    const imageWidth = (contentWidth - 8) / 2;
    const imageHeight = imageWidth * 0.75;
    let colIndex = 0;

    for (const photo of validPhotos) {
      const fileId = photo.id || photo.fileId || null;
      const viewUrl =
        photo.viewUrl ||
        photo.url ||
        photo.webContentLink ||
        photo.webViewLink ||
        null;
      if (!fileId && !viewUrl) continue;

      try {
        const blobUrl = await fetchFileBlobUrl(
          fileId,
          viewUrl,
          photo.mimeType || "image/jpeg",
          photo.provider || null,
        );
        if (!blobUrl) continue;

        const response = await fetch(blobUrl);
        if (!response.ok) continue;
        const blob = await response.blob();
        URL.revokeObjectURL(blobUrl);

        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const imageFormat = String(photo.mimeType || blob.type || "")
          .toLowerCase()
          .includes("png")
          ? "PNG"
          : "JPEG";
        const x = colIndex === 0 ? margin : margin + imageWidth + 8;
        ensureSpace(imageHeight + 6);
        pdf.addImage(base64, imageFormat, x, currentY, imageWidth, imageHeight);
        colIndex = (colIndex + 1) % 2;
        if (colIndex === 0) {
          currentY += imageHeight + 6;
        }
      } catch {
        // Skip photos that cannot be embedded.
      }
    }
  }

  return pdf.output("blob");
};

/**
 * Generate an asset assignment PDF and store it in the document library.
 */
export const generateAndStoreAssignmentPdf = async ({
  companyId,
  workOrderId,
  fromLocation,
  toLocation,
  operator,
  items,
  productMap = {},
  photos = [],
}) => {
  if (!companyId) {
    throw new Error("companyId is required to generate the assignment PDF.");
  }
  if (!workOrderId) {
    throw new Error("workOrderId is required to generate the assignment PDF.");
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
    throw new Error("Unable to resolve company details for assignment PDF.");
  }

  const fileName = buildFileName(workOrderId);
  const pdfBlob = await renderAssignmentPdf({
    company,
    workOrderId,
    fromLocation,
    toLocation,
    operator,
    items,
    productMap,
    photos,
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
    const catalog = await ensureAssignmentCatalog();
    const catalogId = Number(catalog?.libraryCatelogId);
    if (!Number.isFinite(catalogId) || catalogId <= 0) {
      throw new Error("Asset assignment document catalog is not available.");
    }

    const entryPayload = {
      libraryCatelogId: catalogId,
      libraryEntryName: fileName,
      libraryEntryType: "doc",
      libraryEntryKey: JSON.stringify(normalized),
      entryQuickSearchKey: buildQuickSearchKey(
        workOrderId,
        toLocation,
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
