/**
 * Transfer Return Service
 *
 * Orchestrates Delivery Order linked stock returns:
 * - Return In: moves inventory from a customer/site back into a location (movement type T)
 */

import { request } from "./axios_helper";
import { toLocalISO } from "./date_helper";
import { searchStockByCode } from "./stock_issue_service";

const RETURN_IN_WORK_ORDER_TYPE = "ReturnIn";

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
 * Build a map of customerId -> customerName from the customers endpoint.
 */
const fetchCustomerMap = async () => {
  const response = await request("GET", "/api/customers", null, {
    skipBackendErrorDialog: true,
  });
  const map = {};
  toArray(response?.data).forEach((c) => {
    if (c.customerId != null) {
      map[c.customerId] = c.customerName || "";
    }
  });
  return map;
};

/**
 * Enrich delivery orders with customerName from a customer map.
 */
const enrichDeliveryOrdersWithCustomerName = (orders, customerMap) => {
  return orders.map((o) => {
    const resolved = customerMap[o.customerId] || o.customerName || "";
    return { ...o, customerName: resolved };
  });
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
 * Fetch all prior DeliveryReturn headers for a delivery order.
 */
export const fetchDeliveryReturnsByDoId = async (doId) => {
  const response = await request(
    "GET",
    `/api/deliveryReturns/do/${encodeURIComponent(doId)}`,
    null,
    { skipBackendErrorDialog: true },
  );
  return toArray(response?.data);
};

/**
 * Fetch line items for a DeliveryReturn.
 */
export const fetchDeliveryReturnItems = async (returnId) => {
  const response = await request(
    "GET",
    `/api/deliveryReturnItems/return/${encodeURIComponent(returnId)}`,
    null,
    { skipBackendErrorDialog: true },
  );
  return toArray(response?.data);
};

/**
 * Calculate how much of a stock code can still be returned against a delivery
 * order: total delivered quantity minus quantities already returned.
 */
export const getReturnableQuantityForDo = async (doId, stockCode) => {
  const doItems = await fetchDeliveryOrderItems(doId);
  const delivered = doItems
    .filter((item) => matchesStockCode(item, stockCode))
    .reduce((sum, item) => sum + toNumber(item.quantity), 0);

  const returns = await fetchDeliveryReturnsByDoId(doId);
  let alreadyReturned = 0;
  for (const ret of returns) {
    const items = await fetchDeliveryReturnItems(ret.returnId);
    alreadyReturned += items
      .filter((item) => matchesStockCode(item, stockCode))
      .reduce((sum, item) => sum + toNumber(item.quantity), 0);
  }

  return Math.max(0, delivered - alreadyReturned);
};

/**
 * Fetch all delivery orders, enriched with customerName.
 */
export const fetchDeliveryOrders = async () => {
  const [response, customerMap] = await Promise.all([
    request("GET", "/api/deliveryOrders", null, {
      skipBackendErrorDialog: true,
    }),
    fetchCustomerMap().catch(() => ({})),
  ]);
  return enrichDeliveryOrdersWithCustomerName(
    toArray(response?.data),
    customerMap,
  );
};

/**
 * Fetch a single delivery order by id.
 */
export const fetchDeliveryOrder = async (orderId) => {
  const response = await request(
    "GET",
    `/api/deliveryOrders/${encodeURIComponent(orderId)}`,
    null,
    { skipBackendErrorDialog: true },
  );
  return response?.data || null;
};

/**
 * Fetch delivery order items by order id.
 */
export const fetchDeliveryOrderItems = async (orderId) => {
  const response = await request(
    "GET",
    `/api/deliveryOrderItems/order/${encodeURIComponent(orderId)}`,
    null,
    { skipBackendErrorDialog: true },
  );
  return toArray(response?.data);
};

const normalizeOrderStatus = (status) =>
  String(status || "")
    .trim()
    .toUpperCase();

/**
 * Fetch delivery orders eligible for return-in.
 * Only DOs that have been delivered (status = DELIVERED or PARTIALLY_RETURNED)
 * can be returned into stock.
 */
export const fetchEligibleReturnInDeliveryOrders = async () => {
  const all = await fetchDeliveryOrders();
  return all.filter((o) => {
    const status = normalizeOrderStatus(o.orderStatus);
    return status === "DELIVERED" || status === "PARTIALLY_RETURNED";
  });
};

/**
 * Create a DeliveryReturn header.
 */
export const createDeliveryReturn = async ({ doId, location, returnedBy }) => {
  const payload = {
    doId,
    location,
    returnedBy,
    returnDate: toLocalISO(),
    returnStatus: "NEW",
    totalQuantity: 0,
  };
  const response = await request("POST", "/api/deliveryReturns", payload);
  const data = response?.data;
  if (!data?.returnId) {
    throw new Error("Delivery return creation did not return a return ID.");
  }
  return data.returnId;
};

/**
 * Add a line item to a DeliveryReturn.
 */
export const createDeliveryReturnItem = async ({
  returnId,
  productId,
  productCode,
  stockCode,
  quantity,
}) => {
  const payload = {
    returnId,
    productId,
    productCode,
    stockCode,
    quantity: toNumber(quantity),
  };
  const response = await request("POST", "/api/deliveryReturnItems", payload);
  return response?.data || null;
};

/**
 * Search a stock code at a location and return matching rows.
 * Only inventory/consumable products (category "C") are allowed.
 */
export const searchReturnInStockByCode = async (stockCode, location, doId) => {
  const matches = await searchStockByCode(stockCode, location, {
    allowedProductCategories: ["C"],
  });

  if (!doId) {
    return matches.map((row) => ({ ...row, returnable: 0 }));
  }

  const returnable = await getReturnableQuantityForDo(doId, stockCode);
  return matches.map((row) => ({ ...row, returnable }));
};

/**
 * Create a Return In work order.
 */
export const createReturnInWorkOrder = async ({
  issuedBy,
  workByStaffId,
  returnId,
  doId,
}) => {
  const payload = {
    workOrderType: RETURN_IN_WORK_ORDER_TYPE,
    workDescription: `RETURN:${returnId}:DO:${doId}`,
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
 * Create the INPROGRESS step for a Return In work order.
 */
export const createReturnInWorkStep = async ({
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
 * Execute the full Return In flow.
 *
 * @param {object} params
 * @param {string} params.doId - Delivery order id
 * @param {string} params.fromLocation - Source location (customer/site)
 * @param {string} params.toLocation - Destination receiving location
 * @param {Array<{productId, productCode, stockId, subQuantity}>} params.scannedItems
 * @param {Array<object>} [params.photos] - Return photo metadata to persist on the step
 * @param {string} params.issuedBy - Operator display name for the work order header
 * @param {string} params.workByStaffId - Operator staffId for the work order assignment
 */
export const executeReturnIn = async ({
  doId,
  fromLocation,
  toLocation,
  scannedItems,
  photos = [],
  issuedBy,
  workByStaffId,
}) => {
  if (!doId) {
    throw new Error("Delivery order is required.");
  }
  if (!fromLocation) {
    throw new Error("Source location is required.");
  }
  if (!toLocation) {
    throw new Error("Destination location is required.");
  }
  if (!scannedItems || scannedItems.length === 0) {
    throw new Error("At least one returned item is required.");
  }

  // 1. Create delivery return header
  const returnId = await createDeliveryReturn({
    doId,
    location: toLocation,
    returnedBy: issuedBy,
  });

  // 2. Create delivery return items
  for (const scan of scannedItems) {
    await createDeliveryReturnItem({
      returnId,
      productId: scan.productId,
      productCode: scan.productCode,
      stockCode: String(scan.stockId || "").trim(),
      quantity: toNumber(scan.subQuantity),
    });
  }

  // 3. Create work order
  const workOrderId = await createReturnInWorkOrder({
    issuedBy,
    workByStaffId,
    returnId,
    doId,
  });

  // 4. Create in-progress step
  await createReturnInWorkStep({
    workOrderId,
    fromLocation,
    toLocation,
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
      stockId: scan.stockCode || scan.stockId,
      subQuantity: scan.subQuantity,
    });
  }

  // 7. Execute the step
  const executionResult = await executeWorkStep(workOrderId);

  return {
    workOrderId,
    returnId,
    executionResult,
  };
};
