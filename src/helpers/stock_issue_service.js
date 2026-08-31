/**
 * Stock Issue Service
 *
 * Orchestrates backend REST APIs to perform stock issue (Drawing) operations.
 * A Drawing work order moves stock out of a location and assigns it to a worker.
 */

import { request } from "./axios_helper";
import { toLocalISO } from "./date_helper";

const DRAWING_WORK_ORDER_TYPE = "Drawing";

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
 * Load available stock rows for a location.
 */
export const fetchStockByLocation = async (location) => {
  const response = await request("GET", "/api/stockviews");
  const rows = toArray(response?.data).filter(
    (row) =>
      String(row?.location || "")
        .trim()
        .toLowerCase() ===
      String(location || "")
        .trim()
        .toLowerCase(),
  );
  return rows;
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

const getMovementTotals = (row) => {
  const quantity = toNumber(row?.quantity);
  const stockModifier = toNumber(row?.stockModifier);
  const holdModifier = toNumber(row?.holdModifier);
  const explicitStockMoved = row?.stockMoved ?? "";
  const explicitHoldMoved = row?.holdMoved ?? "";

  return {
    stockMoved:
      explicitStockMoved !== ""
        ? toNumber(explicitStockMoved)
        : quantity * stockModifier,
    holdMoved:
      explicitHoldMoved !== ""
        ? toNumber(explicitHoldMoved)
        : quantity * holdModifier,
  };
};

/**
 * Compute available quantity for a stock at a location from movement rows.
 */
export const getStockAvailability = async (stockId, location) => {
  const response = await request(
    "GET",
    `/api/stockviews/stock/${encodeURIComponent(stockId)}`,
    null,
    { skipBackendErrorDialog: true },
  );

  const rows = toArray(response?.data).filter(
    (row) =>
      String(row?.stockId || "").trim() === String(stockId || "").trim() &&
      String(row?.location || "central")
        .trim()
        .toLowerCase() ===
        String(location || "central")
          .trim()
          .toLowerCase(),
  );

  const totals = rows.reduce(
    (acc, row) => {
      const movement = getMovementTotals(row);
      acc.current += movement.stockMoved;
      acc.available += movement.stockMoved + movement.holdMoved;
      return acc;
    },
    { current: 0, available: 0 },
  );

  return totals;
};

/**
/**
 * Search a stock code and return matching stock rows for a location.
 *
 * Uses the stock view endpoint (consistent with StockTakeOn) so that the
 * response includes both stockId and productCode.
 *
 * Returns an array of matches at the selected location. Multiple products can
 * share the same stock code at the same location.
 *
 * @param {object} [options]
 * @param {string[]} [options.allowedProductCategories] - If provided, only
 *   rows whose product category is in this list are returned.
 */
export const searchStockByCode = async (stockCode, location, options = {}) => {
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

  const selectedLocation = String(location || "")
    .trim()
    .toLowerCase();
  if (!selectedLocation) {
    throw new Error(
      `Location is required before scanning stock code ${stockCode}.`,
    );
  }

  let matches = rows.filter(
    (row) =>
      String(row?.location || "")
        .trim()
        .toLowerCase() === selectedLocation,
  );

  const allowedCategories = (options.allowedProductCategories || [])
    .map((c) => String(c || "").toUpperCase())
    .filter(Boolean);
  if (allowedCategories.length > 0) {
    matches = matches.filter((row) =>
      allowedCategories.includes(
        String(row?.productCategory || "").toUpperCase(),
      ),
    );
  }

  if (matches.length === 0) {
    throw new Error(
      `Stock code ${stockCode} not found at location ${location}.`,
    );
  }

  const availabilityByProductId = new Map();
  for (const row of matches) {
    const pid = Number(row?.productId);
    if (!Number.isFinite(pid) || pid <= 0) continue;
    if (availabilityByProductId.has(pid)) continue;
    const availability = await getStockAvailability(row.stockId, location);
    availabilityByProductId.set(pid, availability);
  }

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
      availability: availabilityByProductId.get(Number(row.productId)) || {
        current: 0,
        available: 0,
      },
    }));
};

/**
 * Create the Drawing work order.
 *
 * @param {object} params
 * @param {string} params.issuedBy - Operator display name (work order header)
 * @param {string} params.workByStaffId - Assigned worker staffId
 * @param {string} [params.workByStaffName] - Assigned worker display name for description
 */
export const createDrawingWorkOrder = async ({
  issuedBy,
  workByStaffId,
  workByStaffName,
}) => {
  const payload = {
    workOrderType: DRAWING_WORK_ORDER_TYPE,
    workDescription: `Issue stock to ${workByStaffName || workByStaffId}`,
    issuedBy,
    workBy: workByStaffId,
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
 * Create the INPROGRESS step for a Drawing work order.
 */
export const createDrawingWorkStep = async ({
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
 * Create WorkOrderData rows for each product being issued.
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
 * Execute the full Stock Issue (Drawing) flow.
 *
 * @param {object} params
 * @param {string} params.fromLocation - Source location
 * @param {string} params.workByStaffId - Worker staffId receiving the stock; also used as toLocation
 * @param {string} [params.workByStaffName] - Worker display name for work order description
 * @param {Array<{productId, productCode, stockId, subQuantity}>} params.scannedItems
 * @param {Array<object>} [params.photos] - Issue photo metadata to persist on the step
 * @param {string} params.issuedBy - Operator display name for the work order header
 *
 * @returns {Promise<{workOrderId, executionResult}>}
 */
export const executeStockIssue = async ({
  fromLocation,
  workByStaffId,
  workByStaffName,
  scannedItems,
  photos = [],
  issuedBy,
}) => {
  if (!fromLocation) {
    throw new Error("Source location is required.");
  }
  if (!workByStaffId) {
    throw new Error("Worker is required.");
  }
  if (!scannedItems || scannedItems.length === 0) {
    throw new Error("At least one stock item is required.");
  }

  // 1. Create work order
  const workOrderId = await createDrawingWorkOrder({
    issuedBy,
    workByStaffId,
    workByStaffName,
  });

  // 2. Create in-progress step
  await createDrawingWorkStep({
    workOrderId,
    fromLocation,
    toLocation: workByStaffId,
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
    staffId: workByStaffId,
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
