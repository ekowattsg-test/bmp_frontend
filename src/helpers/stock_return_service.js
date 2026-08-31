/**
 * Stock Return Service
 *
 * Orchestrates backend REST APIs to perform stock return operations.
 * A Return work order moves stock from a worker back into a location.
 */

import { request } from "./axios_helper";
import { toLocalISO } from "./date_helper";

const RETURN_WORK_ORDER_TYPE = "Return";

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

const matchesStockCode = (row, stockCode) => {
  const normalized = String(stockCode || "")
    .trim()
    .toLowerCase();
  return (
    String(row?.stockCode || "")
      .trim()
      .toLowerCase() === normalized ||
    String(row?.stockId || "")
      .trim()
      .toLowerCase() === normalized
  );
};

/**
 * Calculate the remaining quantity of a stock code that can be returned by a
 * worker. This is total Drawing/issue (movementType "O") minus worker returns
 * already recorded (movementType "W").
 */
export const getReturnableQuantity = async (stockCode) => {
  const response = await request("GET", "/api/stockmovements", null, {
    skipBackendErrorDialog: true,
  });
  const movements = toArray(response?.data).filter((m) =>
    matchesStockCode(m, stockCode),
  );

  const issuedOut = movements
    .filter((m) => String(m?.movementType || "").toUpperCase() === "O")
    .reduce((sum, m) => sum + toNumber(m.quantity), 0);

  const alreadyReturned = movements
    .filter((m) => String(m?.movementType || "").toUpperCase() === "W")
    .reduce((sum, m) => sum + toNumber(m.quantity), 0);

  return Math.max(0, issuedOut - alreadyReturned);
};

/**
 * Load active staff/workers.
 */
export const fetchActiveWorkers = async () => {
  const response = await request("GET", "/api/staffs");
  return toArray(response?.data).filter(
    (s) => s.active === 1 || s.active === true,
  );
};

/**
 * Search a stock code that can be returned by a worker.
 *
 * The backend stock-out handler does not record stock location as the worker
 * ID, so we cannot search "at worker". Instead, validate the stock code
 * exists globally and is an inventory/consumable product (category "C").
 */
export const searchStockHeldByWorker = async (stockCode, workerId) => {
  const response = await request(
    "GET",
    `/api/stockviews/stockcode/${encodeURIComponent(stockCode)}`,
    null,
    { skipBackendErrorDialog: true },
  );

  const rows = toArray(response?.data).filter(
    (row) =>
      String(row?.stockCode || "")
        .trim()
        .toLowerCase() ===
        String(stockCode || "")
          .trim()
          .toLowerCase() ||
      String(row?.stockId || "")
        .trim()
        .toLowerCase() ===
        String(stockCode || "")
          .trim()
          .toLowerCase(),
  );

  const matches = rows.filter(
    (row) => String(row?.productCategory || "").toUpperCase() === "C",
  );

  if (matches.length === 0) {
    throw new Error(`Stock code ${stockCode} not found.`);
  }

  const returnable = await getReturnableQuantity(stockCode);

  const seenProductIds = new Set();
  return matches
    .filter((row) => {
      const pid = Number(row?.productId);
      if (!Number.isFinite(pid) || pid <= 0 || seenProductIds.has(pid)) {
        return false;
      }
      seenProductIds.add(pid);
      return true;
    })
    .map((row) => ({
      stockId: row.stockId,
      stockCode: row.stockCode || stockCode,
      productId: row.productId,
      productCode: row.productCode,
      location: row.location,
      returnable,
    }));
};

/**
 * Create the Return work order.
 */
export const createReturnWorkOrder = async ({
  issuedBy,
  returnFromStaffId,
  returnFromStaffName,
}) => {
  const payload = {
    workOrderType: RETURN_WORK_ORDER_TYPE,
    workDescription: `Return stock from ${returnFromStaffName || returnFromStaffId}`,
    issuedBy,
    workBy: returnFromStaffId,
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
 * Create the INPROGRESS step for a Return work order.
 */
export const createReturnWorkStep = async ({
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
 * Returns a map keyed by productId -> workOrderDataId.
 */
export const createWorkOrderData = async ({ workOrderId, items, staffId }) => {
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
      staffId: staffId || "system",
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
 * Execute the full Stock Return flow.
 *
 * @param {object} params
 * @param {string} params.toLocation - Destination location
 * @param {string} params.returnFromStaffId - Worker staffId returning the stock
 * @param {string} [params.returnFromStaffName] - Worker display name
 * @param {Array<{productId, productCode, stockId, subQuantity}>} params.scannedItems
 * @param {Array<object>} [params.photos] - Return photo metadata to persist on the step
 * @param {string} params.issuedBy - Operator display name for the work order header
 *
 * @returns {Promise<{workOrderId, executionResult}>}
 */
export const executeStockReturn = async ({
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
  if (!returnFromStaffId) {
    throw new Error("Returning worker is required.");
  }
  if (!scannedItems || scannedItems.length === 0) {
    throw new Error("At least one stock item is required.");
  }

  // 1. Create work order
  const workOrderId = await createReturnWorkOrder({
    issuedBy,
    returnFromStaffId,
    returnFromStaffName,
  });

  // 2. Create in-progress step
  await createReturnWorkStep({
    workOrderId,
    fromLocation: returnFromStaffId,
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
    staffId: returnFromStaffId,
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
