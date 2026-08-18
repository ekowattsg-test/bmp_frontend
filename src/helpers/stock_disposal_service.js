/**
 * Stock Disposal Service
 *
 * Orchestrates backend REST APIs to perform stock disposal operations.
 * A StockDisposal work order writes off inventory (category C) from a location
 * using movement type D.
 */

import { request } from "./axios_helper";
import { toLocalISO } from "./date_helper";
import { searchStockByCode } from "./stock_issue_service";

const DISPOSAL_WORK_ORDER_TYPE = "StockDisposal";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

/**
 * Search a stock code at a location and return matches restricted to
 * product category C (consumable/inventory).
 */
export const searchDisposalStockByCode = async (stockCode, location) => {
  return searchStockByCode(stockCode, location, {
    allowedProductCategories: ["C"],
  });
};

/**
 * Create the StockDisposal header record.
 */
export const createStockDisposalHeader = async ({
  location,
  disposedBy,
  disposalReason,
  disposalMethod,
}) => {
  const payload = {
    location: String(location || "").trim(),
    disposedBy: String(disposedBy || "").trim(),
    disposalDate: toLocalISO(),
    disposalReason: String(disposalReason || "").trim(),
    disposalMethod: String(disposalMethod || "").trim(),
    disposalStatus: "NEW",
    totalQuantity: 0,
  };
  const response = await request("POST", "/api/stockDisposals", payload);
  const data = response?.data;
  if (!data?.disposalId) {
    throw new Error("StockDisposal creation did not return a disposal ID.");
  }
  return data;
};

/**
 * Create a StockDisposalItem line.
 */
export const createStockDisposalItem = async ({
  disposalId,
  productId,
  productCode,
  stockCode,
  quantity,
}) => {
  const payload = {
    disposalId,
    productId,
    productCode: String(productCode || "").trim(),
    stockCode: String(stockCode || "").trim(),
    quantity: toNumber(quantity),
  };
  const response = await request("POST", "/api/stockDisposalItems", payload);
  return response?.data || null;
};

/**
 * Create the StockDisposal work order.
 * The disposalId is stored in workDescription so the backend handler can
 * locate and finalize the StockDisposal record.
 */
export const createDisposalWorkOrder = async ({
  issuedBy,
  disposalId,
  fromLocation,
}) => {
  const payload = {
    workOrderType: DISPOSAL_WORK_ORDER_TYPE,
    workDescription: `DISPOSAL:${disposalId}`,
    issuedBy,
    workBy: issuedBy,
    workOrderDate: toLocalISO(),
    workOrderStatus: "NEW",
  };
  const response = await request("POST", "/api/workorders", payload);
  const data = response?.data;
  if (!data?.workOrderId) {
    throw new Error("Work order creation did not return a work order ID.");
  }
  return data.workOrderId;
};

/**
 * Create the INPROGRESS step for a StockDisposal work order.
 */
export const createDisposalWorkStep = async ({
  workOrderId,
  fromLocation,
  disposalMethod,
  stepNumber = 1,
  photos = [],
}) => {
  const payload = {
    workOrderId,
    stepNumber,
    fromLocation,
    toLocation: String(disposalMethod || "DISPOSAL").trim(),
    photos:
      Array.isArray(photos) && photos.length > 0 ? JSON.stringify(photos) : "",
    stepStatus: "INPROGRESS",
  };
  const response = await request("POST", "/api/worksteps", payload);
  return response?.data || null;
};

/**
 * Create WorkOrderData rows for each product being disposed.
 */
export const createWorkOrderData = async ({ workOrderId, items }) => {
  const map = {};
  for (const item of items) {
    const productId = Number(item.productId);
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new Error(
        `Product ID is missing for stock code ${item.stockCode || ""}.`,
      );
    }

    const payload = {
      workOrderId,
      productId,
      quantity: toNumber(item.quantity),
      staffId: "system",
    };

    const response = await request("POST", "/api/workorder-data", payload);
    const data = response?.data;
    if (!data?.workOrderDataId) {
      throw new Error(
        `WorkOrderData creation did not return an ID for product ${productId}.`,
      );
    }
    map[productId] = data.workOrderDataId;
  }
  return map;
};

/**
 * Create WorkOrderSubData rows for each scanned item.
 */
export const createWorkOrderSubData = async ({
  workOrderDataId,
  productId,
  stockId,
  subQuantity,
}) => {
  const payload = {
    workOrderDataId,
    productId,
    stockId: String(stockId || "").trim(),
    subQuantity: toNumber(subQuantity),
  };
  const response = await request("POST", "/api/workorder-subdata", payload);
  return response?.data || null;
};

/**
 * Execute the work order step.
 */
export const executeWorkStep = async (workOrderId) => {
  const response = await request(
    "POST",
    `/api/worksteps/execute/${workOrderId}`,
  );
  return response?.data || null;
};

/**
 * Execute the full Stock Disposal flow.
 *
 * @param {object} params
 * @param {string} params.fromLocation - Source location
 * @param {string} params.disposedBy - Operator display name
 * @param {string} params.disposalReason - Reason for disposal
 * @param {string} params.disposalMethod - Method of disposal
 * @param {Array<{productId, productCode, stockId, subQuantity}>} params.scannedItems
 * @param {Array<object>} [params.photos] - Disposal photo metadata
 *
 * @returns {Promise<{disposalId, workOrderId, executionResult}>}
 */
export const executeStockDisposal = async ({
  fromLocation,
  disposedBy,
  disposalReason,
  disposalMethod,
  scannedItems,
  photos = [],
}) => {
  if (!fromLocation) {
    throw new Error("Source location is required.");
  }
  if (!disposedBy) {
    throw new Error("Disposed-by operator is required.");
  }
  if (!disposalReason) {
    throw new Error("Disposal reason is required.");
  }
  if (!disposalMethod) {
    throw new Error("Disposal method is required.");
  }
  if (!scannedItems || scannedItems.length === 0) {
    throw new Error("At least one stock item is required.");
  }

  // 1. Create StockDisposal header and line items
  const header = await createStockDisposalHeader({
    location: fromLocation,
    disposedBy,
    disposalReason,
    disposalMethod,
  });
  const disposalId = header.disposalId;

  for (const scan of scannedItems) {
    await createStockDisposalItem({
      disposalId,
      productId: scan.productId,
      productCode: scan.productCode,
      stockCode: scan.stockId,
      quantity: scan.subQuantity,
    });
  }

  // 2. Create work order with disposal id in description
  const workOrderId = await createDisposalWorkOrder({
    issuedBy: disposedBy,
    disposalId,
    fromLocation,
  });

  // 3. Create in-progress step
  await createDisposalWorkStep({
    workOrderId,
    fromLocation,
    disposalMethod,
    photos,
  });

  // 4. Group scanned items by productId for WorkOrderData
  const groupedByProduct = {};
  scannedItems.forEach((scan) => {
    const productId = Number(scan.productId);
    if (!groupedByProduct[productId]) {
      groupedByProduct[productId] = {
        productId,
        stockCode: scan.stockCode,
        quantity: 0,
      };
    }
    groupedByProduct[productId].quantity += toNumber(scan.subQuantity);
  });

  const dataIdMap = await createWorkOrderData({
    workOrderId,
    items: Object.values(groupedByProduct),
  });

  // 5. Create WorkOrderSubData per scanned item
  for (const scan of scannedItems) {
    const productId = Number(scan.productId);
    const workOrderDataId = dataIdMap[productId];
    if (!workOrderDataId) {
      throw new Error(
        `No WorkOrderData found for product ${scan.productCode || productId}.`,
      );
    }

    await createWorkOrderSubData({
      workOrderDataId,
      productId,
      stockId: scan.stockId,
      subQuantity: scan.subQuantity,
    });
  }

  // 6. Execute the step
  const executionResult = await executeWorkStep(workOrderId);

  return {
    disposalId,
    workOrderId,
    executionResult,
  };
};
