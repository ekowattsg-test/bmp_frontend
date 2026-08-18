/**
 * Purchase Return Service
 *
 * Orchestrates vendor returns:
 * - PurchaseReturn: moves inventory back to a vendor (movement type P)
 */

import { request } from "./axios_helper";
import { toLocalISO } from "./date_helper";
import { searchStockByCode } from "./stock_issue_service";

const PURCHASE_RETURN_WORK_ORDER_TYPE = "PurchaseReturn";

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

const normalizeOrderStatus = (status) =>
  String(status || "")
    .trim()
    .toUpperCase();

const matchesProductCode = (row, productCode) => {
  const normalized = String(productCode || "")
    .trim()
    .toLowerCase();
  return (
    String(row?.productCode || "")
      .trim()
      .toLowerCase() === normalized
  );
};

/**
 * Fetch all prior PurchaseReturn headers for a purchase order.
 */
export const fetchPurchaseReturnsByPoId = async (poId) => {
  const response = await request(
    "GET",
    `/api/purchaseReturns/po/${encodeURIComponent(poId)}`,
    null,
    { skipBackendErrorDialog: true },
  );
  return toArray(response?.data);
};

/**
 * Fetch all PurchaseReturn headers.
 */
export const fetchPurchaseReturns = async () => {
  const response = await request("GET", "/api/purchaseReturns", null, {
    skipBackendErrorDialog: true,
  });
  return toArray(response?.data);
};

/**
 * Fetch line items for a PurchaseReturn.
 */
export const fetchPurchaseReturnItems = async (returnId) => {
  const response = await request(
    "GET",
    `/api/purchaseReturnItems/return/${encodeURIComponent(returnId)}`,
    null,
    { skipBackendErrorDialog: true },
  );
  return toArray(response?.data);
};

/**
 * Calculate how much of a product can still be returned against a purchase
 * order: total received quantity minus quantities already returned.
 *
 * Purchase order items are tracked by productCode, not stock code, so the
 * returnable limit is computed per product.
 */
export const getReturnableQuantityForProduct = async (poId, productCode) => {
  const poItems = await fetchPurchaseOrderItems(poId);
  const received = poItems
    .filter((item) => matchesProductCode(item, productCode))
    .reduce((sum, item) => sum + toNumber(item.quantity), 0);

  const returns = await fetchPurchaseReturnsByPoId(poId);
  let alreadyReturned = 0;
  for (const ret of returns) {
    const items = await fetchPurchaseReturnItems(ret.returnId);
    alreadyReturned += items
      .filter((item) => matchesProductCode(item, productCode))
      .reduce((sum, item) => sum + toNumber(item.quantity), 0);
  }

  return Math.max(0, received - alreadyReturned);
};

/**
 * Fetch all purchase orders.
 */
export const fetchPurchaseOrders = async () => {
  const response = await request("GET", "/api/purchaseOrders", null, {
    skipBackendErrorDialog: true,
  });
  return toArray(response?.data);
};

/**
 * Fetch a single purchase order by id.
 */
export const fetchPurchaseOrder = async (orderId) => {
  const response = await request(
    "GET",
    `/api/purchaseOrders/${encodeURIComponent(orderId)}`,
    null,
    { skipBackendErrorDialog: true },
  );
  return response?.data || null;
};

/**
 * Fetch purchase order items by order id.
 */
export const fetchPurchaseOrderItems = async (orderId) => {
  const response = await request(
    "GET",
    `/api/purchaseOrderItems/order/${encodeURIComponent(orderId)}`,
    null,
    { skipBackendErrorDialog: true },
  );
  return toArray(response?.data);
};

/**
 * Fetch purchase orders eligible for vendor return.
 * Only POs that have been received (status = RECEIVED or PARTIALLY_RETURNED)
 * can be returned to the vendor.
 */
export const fetchEligiblePurchaseOrdersForReturn = async () => {
  const all = await fetchPurchaseOrders();
  return all.filter((o) => {
    const status = normalizeOrderStatus(o.orderStatus);
    return status === "RECEIVED" || status === "PARTIALLY_RETURNED";
  });
};

/**
 * Create a PurchaseReturn header.
 */
export const createPurchaseReturn = async ({
  poId,
  location,
  returnedBy,
  vendorId,
}) => {
  const payload = {
    poId,
    location,
    returnedBy,
    vendorId,
    returnDate: toLocalISO(),
    returnStatus: "NEW",
    totalQuantity: 0,
    creditAmount: 0,
  };
  const response = await request("POST", "/api/purchaseReturns", payload);
  const data = response?.data;
  if (!data?.returnId) {
    throw new Error("Purchase return creation did not return a return ID.");
  }
  return data.returnId;
};

/**
 * Fetch a vendor by id.
 */
export const fetchVendorById = async (vendorId) => {
  const response = await request(
    "GET",
    `/api/vendors/${encodeURIComponent(vendorId)}`,
    null,
    { skipBackendErrorDialog: true },
  );
  return response?.data || null;
};

/**
 * Add a line item to a PurchaseReturn.
 */
export const createPurchaseReturnItem = async ({
  returnId,
  productId,
  productCode,
  stockCode,
  quantity,
  unitPrice,
  lineTotal,
}) => {
  const payload = {
    returnId,
    productId,
    productCode,
    stockCode,
    quantity: toNumber(quantity),
    unitPrice: toNumber(unitPrice),
    lineTotal: toNumber(lineTotal),
  };
  const response = await request("POST", "/api/purchaseReturnItems", payload);
  return response?.data || null;
};

/**
 * Search a stock code at a location and return matching rows.
 * Only inventory/consumable products (category "C") are allowed.
 */
export const searchPurchaseReturnStockByCode = async (
  stockCode,
  location,
  poId,
) => {
  const matches = await searchStockByCode(stockCode, location, {
    allowedProductCategories: ["C"],
  });

  if (!poId) {
    return matches.map((row) => ({ ...row, returnable: 0 }));
  }

  const returnableByProduct = new Map();
  for (const row of matches) {
    const productCode = row.productCode;
    if (!productCode || returnableByProduct.has(productCode)) continue;
    const returnable = await getReturnableQuantityForProduct(poId, productCode);
    returnableByProduct.set(productCode, returnable);
  }

  return matches.map((row) => ({
    ...row,
    returnable: returnableByProduct.get(row.productCode) || 0,
  }));
};

/**
 * Create a PurchaseReturn work order.
 */
export const createPurchaseReturnWorkOrder = async ({
  issuedBy,
  workByStaffId,
  returnId,
  poId,
}) => {
  const payload = {
    workOrderType: PURCHASE_RETURN_WORK_ORDER_TYPE,
    workDescription: `RETURN:${returnId}:PO:${poId}`,
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
 * Create the INPROGRESS step for a PurchaseReturn work order.
 */
export const createPurchaseReturnWorkStep = async ({
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
        `Product ID is missing for stock code ${item.stockCode || ""}.`,
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
 * Execute the full PurchaseReturn flow.
 *
 * @param {object} params
 * @param {object} params.order - Full PO object
 * @param {string} params.fromLocation - Source location (warehouse/bin)
 * @param {Array<{productId, productCode, stockId, subQuantity, unitPrice}>} params.scannedItems
 * @param {Array<object>} [params.photos] - Return photo metadata to persist on the step
 * @param {string} params.issuedBy - Operator display name for the work order header
 * @param {string} params.workByStaffId - Operator staffId for the work order assignment
 */
export const executePurchaseReturn = async ({
  order,
  fromLocation,
  scannedItems,
  photos = [],
  issuedBy,
  workByStaffId,
}) => {
  if (!order?.orderId) {
    throw new Error("Purchase order is required.");
  }
  if (!fromLocation) {
    throw new Error("Source location is required.");
  }
  if (!scannedItems || scannedItems.length === 0) {
    throw new Error("At least one returned item is required.");
  }

  const poId = order.orderId;

  // Resolve price map from PO items
  const poItems = await fetchPurchaseOrderItems(poId);
  const priceMap = {};
  poItems.forEach((item) => {
    const key = String(item.productCode || "");
    if (key) {
      priceMap[key] = toNumber(item.unitPrice);
    }
  });

  // 1. Create purchase return header
  const returnId = await createPurchaseReturn({
    poId,
    location: fromLocation,
    returnedBy: issuedBy,
    vendorId: order.vendorId,
  });

  // 2. Create purchase return items
  for (const scan of scannedItems) {
    const unitPrice = toNumber(
      scan.unitPrice ?? priceMap[scan.productCode] ?? 0,
    );
    const quantity = toNumber(scan.subQuantity);
    await createPurchaseReturnItem({
      returnId,
      productId: scan.productId,
      productCode: scan.productCode,
      stockCode: String(scan.stockId || "").trim(),
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
    });
  }

  // 3. Create work order
  const workOrderId = await createPurchaseReturnWorkOrder({
    issuedBy,
    workByStaffId,
    returnId,
    poId,
  });

  // 4. Resolve vendor name and create in-progress step
  const vendor = order.vendorId ? await fetchVendorById(order.vendorId) : null;
  const vendorName =
    vendor?.vendorName || order.vendorName || order.vendorId || poId;
  await createPurchaseReturnWorkStep({
    workOrderId,
    fromLocation,
    toLocation: vendorName,
    photos,
  });

  // 5. Group scanned items by productId for WorkOrderData
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
    workBy: workByStaffId,
  });

  // 6. Create WorkOrderSubData per scanned item
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

  // 7. Execute the step
  const executionResult = await executeWorkStep(workOrderId);

  return {
    workOrderId,
    returnId,
    executionResult,
    vendorName,
  };
};
