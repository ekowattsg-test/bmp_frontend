/**
 * Asset Assignment Service
 *
 * Orchestrates backend REST APIs to perform asset assignment (Allocating) operations.
 * An Allocating work order moves an asset out of a location and assigns it to a worker.
 */

import { request } from "./axios_helper";
import { toLocalISO } from "./date_helper";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
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

const ALLOCATING_WORK_ORDER_TYPE = "Allocating";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
};

/**
 * Load available asset rows for a location.
 */
export const fetchAssetsByLocation = async (location) => {
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
 * Search an asset stock code and return matching rows for a location.
 *
 * @param {string} stockCode
 * @param {string} location
 * @param {object} [options]
 * @param {string[]} [options.allowedProductCategories]
 */
export const searchAssetByCode = async (stockCode, location, options = {}) => {
  const response = await request(
    "GET",
    `/api/stockviews/stockcode/${encodeURIComponent(stockCode)}`,
    null,
    { skipBackendErrorDialog: true },
  );

  const selectedLocation = String(location || "")
    .trim()
    .toLowerCase();
  if (!selectedLocation) {
    throw new Error(
      `Location is required before scanning asset code ${stockCode}.`,
    );
  }

  const rows = toArray(response?.data).filter(
    (row) =>
      (String(row?.stockCode || "")
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
            .toLowerCase()) &&
      String(row?.location || "")
        .trim()
        .toLowerCase() === selectedLocation,
  );

  const allowedCategories = (options.allowedProductCategories || [])
    .map((c) => String(c || "").toUpperCase())
    .filter(Boolean);

  let matches = rows;
  if (allowedCategories.length > 0) {
    matches = matches.filter((row) =>
      allowedCategories.includes(
        String(row?.productCategory || "").toUpperCase(),
      ),
    );
  }

  if (matches.length === 0) {
    throw new Error(
      `Asset code ${stockCode} not found at location ${location}.`,
    );
  }

  const seenProductIds = new Set();
  const uniqueMatches = matches.filter((row) => {
    const pid = Number(row?.productId);
    if (!Number.isFinite(pid) || pid <= 0 || seenProductIds.has(pid)) {
      return false;
    }
    seenProductIds.add(pid);
    return true;
  });

  const availabilityByProductId = new Map();
  for (const row of uniqueMatches) {
    const pid = Number(row?.productId);
    if (!Number.isFinite(pid) || pid <= 0) continue;
    const availability = await getStockAvailability(row.stockId, location);
    availabilityByProductId.set(pid, availability);
  }

  return uniqueMatches.map((row) => ({
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
 * Create the Allocating work order.
 */
export const createAllocatingWorkOrder = async ({
  issuedBy,
  workByStaffId,
  workByStaffName,
}) => {
  const payload = {
    workOrderType: ALLOCATING_WORK_ORDER_TYPE,
    workDescription: `Assign asset to ${workByStaffName || workByStaffId}`,
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
 * Create the INPROGRESS step for an Allocating work order.
 */
export const createAllocatingWorkStep = async ({
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
 * Create WorkOrderData rows for each product being assigned.
 */
export const createWorkOrderData = async ({ workOrderId, items, staffId }) => {
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
 * Execute the full Asset Assignment (Allocating) flow.
 */
export const executeAssetAssignment = async ({
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
    throw new Error("At least one asset is required.");
  }

  const workOrderId = await createAllocatingWorkOrder({
    issuedBy,
    workByStaffId,
    workByStaffName,
  });

  await createAllocatingWorkStep({
    workOrderId,
    fromLocation,
    toLocation: workByStaffId,
    photos,
  });

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

  const executionResult = await executeWorkStep(workOrderId);

  return {
    workOrderId,
    executionResult,
  };
};
