/**
 * Receipt PDF Helper
 *
 * Generates a Goods Receipt Note PDF after a PO stock receipt and stores it
 * in the document library.
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

const RECEIPT_LIBRARY_PROJECT_CODE = "__STOCK_RECEIPT";
const RECEIPT_LIBRARY_CATALOG_NAME = "Stock Receipts";

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

const buildFileName = (order) => {
  const poNumber = sanitizeFileNamePart(order?.orderId);
  const status = sanitizeFileNamePart(order?.orderStatus || "RECEIVED");
  const date = sanitizeFileNamePart(formatDateForFileName(new Date()));
  return `${poNumber}_${status}_${date}.pdf`;
};

const buildQuickSearchKey = (order, fileName) => {
  return [
    order?.orderId,
    order?.vendorName || order?.vendorId,
    order?.orderStatus || "RECEIVED",
    fileName,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
};

const ensureReceiptCatalog = async () => {
  try {
    const response = await request(
      "GET",
      `/api/librarycatelogs/project/${encodeURIComponent(RECEIPT_LIBRARY_PROJECT_CODE)}`,
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
    libraryCatelogName: RECEIPT_LIBRARY_CATALOG_NAME,
    active: 1,
    visibleLevel: 0,
    description: "Generated stock receipt documents",
    projectCode: RECEIPT_LIBRARY_PROJECT_CODE,
    quicSearchKey: "stock receipt, goods receipt note, po receipt",
  };

  const createResponse = await request(
    "POST",
    "/api/librarycatelogs",
    createPayload,
  );
  const created = createResponse?.data || null;
  return Array.isArray(created) ? created[0] : created;
};

const renderReceiptPdf = async ({
  company,
  order,
  vendor,
  location,
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
  pdf.text("Goods Receipt Note", pageWidth - margin, currentY, {
    align: "right",
  });
  currentY += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  addLabelValue("PO", order?.orderId);
  addLabelValue("Vendor", vendor?.vendorName || order?.vendorId || "-");
  addLabelValue("Location", location);
  addLabelValue("Received", formatDateTimeForPdf(new Date()));
  addLabelValue("Operator", operator || "-");
  addLabelValue("Status", order?.orderStatus || "RECEIVED");

  currentY += 4;
  pdf.setLineWidth(0.2);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Received Items", margin, currentY);
  currentY += 5;

  const headers = [
    { label: "#", width: 12, align: "left" },
    { label: "Product", width: 70, align: "left" },
    { label: "PO Qty", width: 22, align: "right" },
    { label: "Rcvd Qty", width: 24, align: "right" },
    { label: "Stock Code(s)", width: 54, align: "left" },
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
    const stockCodes = Array.isArray(item?.stockCodes)
      ? item.stockCodes.join(", ")
      : String(item?.stockCodes || "");

    const values = [
      index + 1,
      productName,
      String(item?.poQuantity ?? "-"),
      String(item?.receivedQuantity ?? "-"),
      stockCodes,
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

  // Photo appendix
  const validPhotos = Array.isArray(photos) ? photos.filter(Boolean) : [];
  if (validPhotos.length > 0) {
    pdf.addPage();
    currentY = margin;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Receipt Photos", margin, currentY);
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
 * Generate a stock receipt PDF and store it in the document library.
 */
export const generateAndStoreReceiptPdf = async ({
  companyId,
  order,
  location,
  operator,
  items,
  productMap = {},
  photos = [],
}) => {
  if (!companyId) {
    throw new Error("companyId is required to generate the receipt PDF.");
  }
  if (!order?.orderId) {
    throw new Error("orderId is required to generate the receipt PDF.");
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
    throw new Error("Unable to resolve company details for receipt PDF.");
  }

  let vendor = null;
  if (order?.vendorId !== undefined && order?.vendorId !== null) {
    try {
      const vendorResponse = await request(
        "GET",
        `/api/vendors/${order.vendorId}`,
      );
      vendor = vendorResponse?.data || null;
    } catch {
      vendor = null;
    }
  }

  const fileName = buildFileName(order);
  const pdfBlob = await renderReceiptPdf({
    company,
    order,
    vendor,
    location,
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
    const catalog = await ensureReceiptCatalog();
    const catalogId = Number(catalog?.libraryCatelogId);
    if (!Number.isFinite(catalogId) || catalogId <= 0) {
      throw new Error("Stock receipt document catalog is not available.");
    }

    const entryPayload = {
      libraryCatelogId: catalogId,
      libraryEntryName: fileName,
      libraryEntryType: "doc",
      libraryEntryKey: JSON.stringify(normalized),
      entryQuickSearchKey: buildQuickSearchKey(order, fileName),
    };

    const existingEntriesResponse = await request(
      "GET",
      `/api/libraryentries?libraryCatelogId=${encodeURIComponent(catalogId)}`,
    );
    const existingEntries = Array.isArray(existingEntriesResponse?.data)
      ? existingEntriesResponse.data
      : [];

    const orderIdPart = sanitizeFileNamePart(order?.orderId);
    const statusPart = sanitizeFileNamePart(order?.orderStatus || "RECEIVED");
    const existingEntry = existingEntries.find((entry) => {
      if (Number(entry?.libraryCatelogId) !== catalogId) return false;

      const entryName = String(entry?.libraryEntryName || "").trim();
      if (entryName && entryName === fileName) return true;

      return (
        Boolean(orderIdPart) &&
        entryName.startsWith(`${orderIdPart}_`) &&
        entryName.toLowerCase().endsWith(`_${statusPart}.pdf`.toLowerCase())
      );
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
