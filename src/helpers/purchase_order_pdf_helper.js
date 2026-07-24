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

const PO_LIBRARY_PROJECT_CODE = "__PO";
const PO_LIBRARY_CATALOG_NAME = "Purchase Orders";

const sanitizeFileNamePart = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "NA";
  const cleaned = raw
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, "")
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

const formatDateForPdf = (value) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};

const parseAddressObject = (value) => {
  if (!value) {
    return { Line1: "", Line2: "", PostalCode: "", City: "" };
  }

  if (typeof value === "object") {
    return {
      Line1: String(value?.Line1 || "").trim(),
      Line2: String(value?.Line2 || "").trim(),
      PostalCode: String(value?.PostalCode || "").trim(),
      City: String(value?.City || "").trim(),
    };
  }

  try {
    const parsed = JSON.parse(String(value));
    return {
      Line1: String(parsed?.Line1 || "").trim(),
      Line2: String(parsed?.Line2 || "").trim(),
      PostalCode: String(parsed?.PostalCode || "").trim(),
      City: String(parsed?.City || "").trim(),
    };
  } catch {
    return { Line1: "", Line2: "", PostalCode: "", City: "" };
  }
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

const getProductDisplay = (item, productMap) => {
  const product = productMap[String(item?.productCode || "").trim()] || null;
  const commonName = String(product?.commonName || "").trim();
  if (commonName) return commonName;

  const productName = String(product?.productName || "").trim();
  if (productName) return productName;

  return String(item?.productCode || "").trim() || "-";
};

const buildFileName = (order) => {
  const poNumber = sanitizeFileNamePart(order?.orderId);
  const poDate = sanitizeFileNamePart(
    formatDateForFileName(order?.issuedDate || order?.orderDate),
  );
  const vendorName = sanitizeFileNamePart(
    order?.vendorName || order?.vendorId || "Vendor",
  );
  const poStatus = sanitizeFileNamePart(order?.orderStatus || "ISSUED");
  return `${poNumber}_${poDate}_${vendorName}_${poStatus}.pdf`;
};

const buildQuickSearchKey = (order, fileName) => {
  const poDate = formatDateForFileName(order?.issuedDate || order?.orderDate);
  return [
    order?.orderId,
    order?.projectCode,
    poDate,
    order?.vendorName || order?.vendorId,
    order?.orderStatus || "ISSUED",
    fileName,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
};

const ensurePurchaseOrderCatalog = async () => {
  try {
    const response = await request(
      "GET",
      `/api/librarycatelogs/project/${encodeURIComponent(PO_LIBRARY_PROJECT_CODE)}`,
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
    libraryCatelogName: PO_LIBRARY_CATALOG_NAME,
    active: 1,
    visibleLevel: 0,
    description: "Generated purchase order documents",
    projectCode: PO_LIBRARY_PROJECT_CODE,
    quicSearchKey: "purchase order,po,issued",
  };

  const createResponse = await request(
    "POST",
    "/api/librarycatelogs",
    createPayload,
  );
  const created = createResponse?.data || null;
  return Array.isArray(created) ? created[0] : created;
};

const renderPurchaseOrderPdf = ({ company, vendor, order, items, productMap }) => {
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

  const addSimpleText = (text, x, maxWidth) => {
    const raw = String(text || "").trim();
    if (!raw) return;
    const wrapped = pdf.splitTextToSize(raw, maxWidth);
    pdf.text(wrapped, x, currentY);
    currentY += wrapped.length * 4.5;
  };

  const companyName = String(company?.companyName || "Company").trim();
  const bizCode = String(company?.biZCode || "").trim();
  const addressLine = [
    String(company?.addressLine1 || "").trim(),
    String(company?.addressLine2 || "").trim(),
  ]
    .filter(Boolean)
    .join(" ");
  const postalCityLine = [
    String(company?.postalCode || "").trim(),
    String(company?.city || "").trim(),
  ]
    .filter(Boolean)
    .join(" ");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(companyName, margin, currentY);

  if (bizCode) {
    const companyNameWidth = pdf.getTextWidth(companyName);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(` (${bizCode})`, margin + companyNameWidth, currentY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
  }

  pdf.setFontSize(16);
  pdf.text("Purchase Order", pageWidth - margin, currentY, { align: "right" });
  currentY += 7;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  addSimpleText(addressLine, margin, contentWidth);
  addSimpleText(postalCityLine, margin, contentWidth);

  currentY += 4;
  pdf.setLineWidth(0.3);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  const blockGap = 8;
  const leftBlockWidth = (contentWidth - blockGap) * 0.48;
  const rightBlockX = margin + leftBlockWidth + blockGap;
  const rightBlockWidth = contentWidth - leftBlockWidth - blockGap;
  const poBlockStartY = currentY;

  // Left block: PO number, date, status
  addLabelValue("PO Number", order?.orderId, margin, leftBlockWidth);
  addLabelValue(
    "PO Date",
    formatDateForPdf(order?.issuedDate || order?.orderDate),
    margin,
    leftBlockWidth,
  );
  addLabelValue("Status", order?.orderStatus || "ISSUED", margin, leftBlockWidth);

  const leftBlockEndY = currentY;

  // Right block: vendor name and address
  currentY = poBlockStartY;
  const vendorName = String(vendor?.vendorName || order?.vendorName || order?.vendorId || "-").trim();
  const vendorAddress = parseAddressObject(vendor?.address);
  const vendorAddressLine = [vendorAddress.Line1, vendorAddress.Line2]
    .filter(Boolean)
    .join(" ");
  const vendorPostalCity = [vendorAddress.PostalCode, vendorAddress.City]
    .filter(Boolean)
    .join(" ");

  addLabelValue("Vendor", vendorName, rightBlockX, rightBlockWidth);
  addLabelValue(
    "Address",
    [vendorAddressLine, vendorPostalCity].filter(Boolean).join("\n") || "-",
    rightBlockX,
    rightBlockWidth,
  );

  const rightBlockEndY = currentY;
  currentY = Math.max(leftBlockEndY, rightBlockEndY);

  if (order?.projectCode) {
    addLabelValue("Project", order.projectCode, margin, leftBlockWidth);
  }

  currentY += 2;
  pdf.setLineWidth(0.2);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Items", margin, currentY);
  currentY += 5;

  const headers = [
    { label: "#", width: 12, align: "left" },
    { label: "Product", width: 94, align: "left" },
    { label: "Qty", width: 18, align: "right" },
    { label: "Unit Price", width: 28, align: "right" },
    { label: "Line Total", width: 30, align: "right" },
  ];
  const colX = headers.map((header, index) =>
    index === 0 ? margin : headers.slice(0, index).reduce((sum, item) => sum + item.width, margin),
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
    const productText = getProductDisplay(item, productMap);
    const quantityText = String(item?.quantity ?? "-");
    const unitPrice = Number(item?.unitPrice || 0);
    const lineTotal =
      item?.lineTotal !== undefined && item?.lineTotal !== null
        ? Number(item.lineTotal)
        : Number(item?.quantity || 0) * unitPrice;
    const values = [
      index + 1,
      productText,
      quantityText,
      `$${unitPrice.toFixed(2)}`,
      `$${lineTotal.toFixed(2)}`,
    ];
    const rowHeight = Math.max(
      8,
      ...values.map((value, cellIndex) =>
        pdf.splitTextToSize(String(value || ""), headers[cellIndex].width - 2.5)
          .length * 4.5,
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
      const wrapped = pdf.splitTextToSize(String(value || ""), header.width - 2.5);
      pdf.rect(x, currentY, header.width, rowHeight);
      pdf.text(wrapped, align === "right" ? x + header.width - 1.5 : x + 1.5, currentY + 5, {
        align,
      });
    });

    currentY += rowHeight;
  });

  const total = rows.reduce((sum, item) => {
    const lineTotal =
      item?.lineTotal !== undefined && item?.lineTotal !== null
        ? Number(item.lineTotal)
        : Number(item?.quantity || 0) * Number(item?.unitPrice || 0);
    return sum + lineTotal;
  }, 0);

  currentY += 6;
  ensureSpace(16);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);

  const totalRowHeight = 8;
  if (currentY + totalRowHeight > pageHeight - margin) {
    pdf.addPage();
    currentY = margin;
    drawHeaderRow();
  }

  const mergedWidth = headers[0].width + headers[1].width + headers[2].width;
  pdf.rect(colX[0], currentY, mergedWidth, totalRowHeight);
  pdf.rect(colX[3], currentY, headers[3].width, totalRowHeight);
  pdf.rect(colX[4], currentY, headers[4].width, totalRowHeight);

  pdf.text("Total", colX[3] + headers[3].width - 1.5, currentY + 5.5, {
    align: "right",
  });
  pdf.text(`$${total.toFixed(2)}`, colX[4] + headers[4].width - 1.5, currentY + 5.5, {
    align: "right",
  });

  return pdf.output("blob");
};

export const generateAndStorePurchaseOrderPdf = async ({
  companyId,
  order,
  items = [],
  productMap = {},
}) => {
  if (!companyId) {
    throw new Error("companyId is required to generate the purchase order PDF.");
  }
  if (!order?.orderId) {
    throw new Error("orderId is required to generate the purchase order PDF.");
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
    throw new Error("Unable to resolve company details for purchase order PDF.");
  }

  let vendor = null;
  if (order?.vendorId !== undefined && order?.vendorId !== null) {
    try {
      const vendorResponse = await request("GET", `/api/vendors/${order.vendorId}`);
      vendor = vendorResponse?.data || null;
    } catch {
      vendor = null;
    }
  }

  const fileName = buildFileName(order);
  const pdfBlob = renderPurchaseOrderPdf({
    company,
    vendor,
    order,
    items,
    productMap,
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
    const catalog = await ensurePurchaseOrderCatalog();
    const catalogId = Number(catalog?.libraryCatelogId);
    if (!Number.isFinite(catalogId) || catalogId <= 0) {
      throw new Error("Purchase order document catalog is not available.");
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
    const statusPart = sanitizeFileNamePart(order?.orderStatus || "ISSUED");
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

    if (
      oldDocumentMeta?.id &&
      oldDocumentMeta.id !== normalized.id
    ) {
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
