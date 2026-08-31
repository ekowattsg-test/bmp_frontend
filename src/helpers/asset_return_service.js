/**
 * Asset Return Service
 *
 * Orchestrates worker asset returns:
 * - AssetReturn: moves assets from a worker back to a location (movement type A)
 */

import { request } from "./axios_helper";
import { toLocalISO } from "./date_helper";
import { searchAssetByCode } from "./asset_assignment_service";

const ASSET_RETURN_WORK_ORDER_TYPE = "AssetReturn";

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
 * Calculate how much of an asset stock code is currently held by a worker.
 *
 * Uses the same net-stock calculation as the inventory card: sum all
 * stockModifier movements at the worker's location minus any asset-return
 * movements (type A) already recorded there.
 */
export const getReturnableAssetQuantity = async (workerId, stockCode) => {
  const response = await request(
    "GET",
    `/api/stockviews/stockcode/${encodeURIComponent(stockCode)}`,
    null,
    { skipBackendErrorDialog: true },
  );

  const rows = toArray(response?.data).filter(
    (row) =>
      String(row?.stockId || "").trim() === String(stockCode || "").trim() ||
      String(row?.stockCode || "").trim() === String(stockCode || "").trim(),
  );

  let held = 0;
  let returned = 0;
  rows.forEach((row) => {
    const location = String(row?.location || "")
      .trim()
      .toLowerCase();
    const workerLocation = String(workerId || "")
      .trim()
      .toLowerCase();
    const stockMoved = toNumber(row?.stockMoved);

    if (location !== workerLocation) return;

    // Direction is controlled by the movement type's stockModifier.
    // Any positive movement at the worker location increases held stock;
    // any negative movement reduces it (returned).
    if (stockMoved > 0) {
      held += stockMoved;
    } else if (stockMoved < 0) {
      returned += Math.abs(stockMoved);
    }
  });

  return Math.max(0, held - returned);
};

/**
 * Search an asset code held by a worker and attach returnable quantity.
 */
export const searchAssetReturnByCode = async (stockCode, workerId) => {
  const matches = await searchAssetByCode(stockCode, workerId, {
    allowedProductCategories: ["A"],
  });

  const returnableByProduct = new Map();
  for (const row of matches) {
    const productId = Number(row.productId);
    if (
      !Number.isFinite(productId) ||
      productId <= 0 ||
      returnableByProduct.has(productId)
    ) {
      continue;
    }
    const returnable = await getReturnableAssetQuantity(
      workerId,
      row.stockCode || row.stockId,
    );
    returnableByProduct.set(productId, returnable);
  }

  return matches.map((row) => ({
    ...row,
    returnable: returnableByProduct.get(Number(row.productId)) || 0,
  }));
};

/**
 * Create the AssetReturn work order.
 */
export const createAssetReturnWorkOrder = async ({
  issuedBy,
  returnFromStaffId,
  returnFromStaffName,
}) => {
  const payload = {
    workOrderType: ASSET_RETURN_WORK_ORDER_TYPE,
    workDescription: `Return asset from ${returnFromStaffName || returnFromStaffId}`,
    issuedBy,
    workBy: returnFromStaffName || returnFromStaffId,
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
 * Create the INPROGRESS step for an AssetReturn work order.
 */
export const createAssetReturnWorkStep = async ({
  workOrderId,
  fromLocation,
  toLocation,
  stepNumber = 1,
  photos = [],
}) => {
  const payload = {
    workOrderId,
    stepNumber,
    fromLocation,
    toLocation,
    photos:
      Array.isArray(photos) && photos.length > 0 ? JSON.stringify(photos) : "",
    stepStatus: "INPROGRESS",
  };
  const response = await request("POST", "/api/worksteps", payload);
  return response?.data || null;
};

/**
 * Create WorkOrderData rows for each product being returned.
 */
export const createWorkOrderData = async ({ workOrderId, items, workBy }) => {
  const map = {};
  for (const item of items) {
    const productId = Number(item.productId);
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new Error(
        `Product ID is missing for asset code ${item.stockCode || ""}.`,
      );
    }

    const payload = {
      workOrderId,
      productId,
      quantity: toNumber(item.quantity),
      staffId: workBy || "system",
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
 * Execute the full AssetReturn flow.
 *
 * @param {object} params
 * @param {string} params.toLocation - Destination location
 * @param {string} params.returnFromStaffId - Worker staffId returning the asset
 * @param {string} [params.returnFromStaffName] - Worker display name
 * @param {Array<{productId, productCode, stockId, subQuantity}>} params.scannedItems
 * @param {Array<object>} [params.photos] - Return photo metadata
 * @param {string} params.issuedBy - Operator display name for the work order header
 *
 * @returns {Promise<{workOrderId, executionResult}>}
 */
export const executeAssetReturn = async ({
  toLocation,
  returnFromStaffId,
  returnFromStaffName,
  scannedItems,
  photos = [],
  issuedBy,
}) => {
  if (!toLocation) {
    throw new Error("Destination location is required.");
  }
  const workerLocation = String(
    returnFromStaffName || returnFromStaffId || "",
  ).trim();
  if (!workerLocation) {
    throw new Error("Returning worker is required.");
  }
  if (!scannedItems || scannedItems.length === 0) {
    throw new Error("At least one asset is required.");
  }

  // 1. Create work order
  const workOrderId = await createAssetReturnWorkOrder({
    issuedBy,
    returnFromStaffId,
    returnFromStaffName,
  });

  // 2. Create in-progress step
  await createAssetReturnWorkStep({
    workOrderId,
    fromLocation: workerLocation,
    toLocation,
    photos,
  });

  // 3. Group scanned items by productId for WorkOrderData
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
    workBy: workerLocation,
  });

  // 4. Create WorkOrderSubData per scanned item
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
      stockId: scan.stockCode || scan.stockId,
      subQuantity: scan.subQuantity,
    });
  }

  // 5. Execute the step
  const executionResult = await executeWorkStep(workOrderId);

  return {
    workOrderId,
    executionResult,
  };
};
