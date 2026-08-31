/**
 * Transfer Service
 *
 * Orchestrates Delivery Order linked stock transfers:
 * - Transfer Out: moves inventory out of a source location (movement type G)
 * - Transfer In: moves inventory into a destination location (movement type C)
 *
 * Assumes backend change request BACKEND_CHANGE_TRANSFER_IN_OUT.md is applied.
 */

import { request } from "./axios_helper";
import { toLocalISO } from "./date_helper";
import { searchStockByCode } from "./stock_issue_service";

const TRANSFER_OUT_WORK_ORDER_TYPE = "TransferOut";
const TRANSFER_IN_WORK_ORDER_TYPE = "TransferIn";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
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

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
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

const normalizeOrderStatus = (status) =>
  String(status || "")
    .trim()
    .toUpperCase();

/**
 * Fetch delivery orders eligible for Transfer Out.
 * Only DOs that have been issued (status = ISSUED) can be transferred out.
 */
export const fetchEligibleTransferOutDeliveryOrders = async () => {
  const all = await fetchDeliveryOrders();
  return all.filter((o) => normalizeOrderStatus(o.orderStatus) === "ISSUED");
};

/**
 * Fetch delivery orders eligible for Transfer In.
 * Only DOs currently in transit (status = IN_TRANSIT) can be received.
 */
export const fetchEligibleTransferInDeliveryOrders = async () => {
  const all = await fetchDeliveryOrders();
  return all.filter(
    (o) => normalizeOrderStatus(o.orderStatus) === "IN_TRANSIT",
  );
};

/**
 * Resolve product IDs for delivery order items.
 */
export const resolveDeliveryOrderItems = async (order) => {
  const response = await request("GET", "/api/products", null, {
    skipBackendErrorDialog: true,
  });
  const products = toArray(response?.data);
  const codeToProductId = {};
  const codeToProductName = {};
  products.forEach((p) => {
    if (p.productCode) {
      const code = String(p.productCode);
      codeToProductId[code] = p.productId;
      codeToProductName[code] =
        p.productName || p.commonName || p.productCode || "";
    }
  });

  return toArray(order?.items).map((item) => {
    const productCode = String(item.productCode || "");
    return {
      ...item,
      productCode,
      productId: codeToProductId[productCode],
      productName:
        item.productName || codeToProductName[productCode] || productCode,
      quantity: toNumber(item.quantity),
    };
  });
};

/**
 * Search a stock code at a location and return matching rows.
 * Only inventory/consumable products (category "C") are allowed.
 */
export const searchTransferStockByCode = async (stockCode, location) => {
  return searchStockByCode(stockCode, location, {
    allowedProductCategories: ["C"],
  });
};

/**
 * Create a Transfer Out work order.
 */
export const createTransferOutWorkOrder = async ({
  issuedBy,
  workByStaffId,
  description,
}) => {
  const payload = {
    workOrderType: TRANSFER_OUT_WORK_ORDER_TYPE,
    workDescription: description || "Transfer stock out",
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
 * Create a Transfer In work order.
 */
export const createTransferInWorkOrder = async ({
  issuedBy,
  workByStaffId,
  description,
}) => {
  const payload = {
    workOrderType: TRANSFER_IN_WORK_ORDER_TYPE,
    workDescription: description || "Transfer stock in",
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
 * Create the INPROGRESS step for a Transfer Out work order.
 */
export const createTransferOutWorkStep = async ({
  workOrderId,
  fromLocation,
  toLocation,
  doId,
  stepNumber = 1,
  photos = [],
}) => {
  const payload = {
    workOrderId,
    stepNumber,
    fromLocation: doId ? `${doId}|${fromLocation}` : fromLocation,
    toLocation,
    photos:
      Array.isArray(photos) && photos.length > 0 ? JSON.stringify(photos) : "",
    stepStatus: "INPROGRESS",
  };
  const response = await request("POST", "/api/worksteps", payload);
  return response?.data || null;
};

/**
 * Create the INPROGRESS step for a Transfer In work order.
 */
export const createTransferInWorkStep = async ({
  workOrderId,
  fromLocation,
  toLocation,
  doId,
  stepNumber = 1,
  photos = [],
}) => {
  const payload = {
    workOrderId,
    stepNumber,
    fromLocation: doId ? `${doId}|${fromLocation}` : fromLocation,
    toLocation,
    photos:
      Array.isArray(photos) && photos.length > 0 ? JSON.stringify(photos) : "",
    stepStatus: "INPROGRESS",
  };
  const response = await request("POST", "/api/worksteps", payload);
  return response?.data || null;
};

/**
 * Create WorkOrderData rows for each product being transferred.
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

const todayDateString = () => new Date().toISOString().split("T")[0];

/**
 * Update a delivery order status to a target value.
 * Returns the refreshed delivery order, or null if no orderId is provided.
 */
export const updateDeliveryOrderStatus = async (orderId, targetStatus) => {
  if (!orderId) return null;

  const order = await fetchDeliveryOrder(orderId);
  if (!order) {
    throw new Error(`Delivery order ${orderId} not found.`);
  }

  const payload = {
    ...order,
    orderStatus: targetStatus,
    ...(targetStatus === "DELIVERED"
      ? { deliveredDate: todayDateString() }
      : {}),
  };

  const response = await request(
    "PUT",
    `/api/deliveryOrders/${encodeURIComponent(orderId)}`,
    payload,
    { skipBackendErrorDialog: true },
  );
  return response?.data || null;
};

/**
 * Execute the full Transfer Out flow.
 */
export const executeTransferOut = async ({
  fromLocation,
  toLocation,
  doId,
  scannedItems,
  photos = [],
  issuedBy,
  workByStaffId,
  description,
}) => {
  if (!fromLocation) {
    throw new Error("Source location is required.");
  }

  let resolvedToLocation = String(toLocation || "").trim();
  if (!resolvedToLocation && doId) {
    const order = await fetchDeliveryOrder(doId);
    resolvedToLocation = String(order?.projectCode || "").trim();
  }
  if (!resolvedToLocation) {
    throw new Error("Destination location is required.");
  }

  if (!scannedItems || scannedItems.length === 0) {
    throw new Error("At least one stock item is required.");
  }

  const workOrderId = await createTransferOutWorkOrder({
    issuedBy,
    workByStaffId,
    description,
  });

  await createTransferOutWorkStep({
    workOrderId,
    fromLocation,
    toLocation: resolvedToLocation,
    doId,
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
    workBy: workByStaffId,
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
      stockId: scan.stockCode || scan.stockId,
      subQuantity: scan.subQuantity,
    });
  }

  const executionResult = await executeWorkStep(workOrderId);

  // Ensure the linked delivery order advances to IN_TRANSIT even if the
  // backend transfer-out handler does not update it.
  let updatedDo = null;
  if (doId) {
    try {
      updatedDo = await updateDeliveryOrderStatus(doId, "IN_TRANSIT");
    } catch (doErr) {
      // Log but do not fail the whole operation; stock already moved.
      console.warn(
        "[transfer-out] Could not advance delivery order status:",
        doErr?.message || doErr,
      );
    }
  }

  return {
    workOrderId,
    executionResult,
    updatedDo,
  };
};

/**
 * Execute the full Transfer In flow.
 */
export const executeTransferIn = async ({
  fromLocation,
  toLocation,
  doId,
  scannedItems,
  photos = [],
  issuedBy,
  workByStaffId,
  description,
}) => {
  if (!fromLocation) {
    throw new Error("Source location is required.");
  }

  let resolvedToLocation = String(toLocation || "").trim();
  if (!resolvedToLocation && doId) {
    const order = await fetchDeliveryOrder(doId);
    resolvedToLocation = String(order?.projectCode || "").trim();
  }
  if (!resolvedToLocation) {
    throw new Error("Destination location is required.");
  }

  if (!scannedItems || scannedItems.length === 0) {
    throw new Error("At least one stock item is required.");
  }

  const workOrderId = await createTransferInWorkOrder({
    issuedBy,
    workByStaffId,
    description,
  });

  await createTransferInWorkStep({
    workOrderId,
    fromLocation,
    toLocation: resolvedToLocation,
    doId,
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
    workBy: workByStaffId,
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
      stockId: scan.stockCode || scan.stockId,
      subQuantity: scan.subQuantity,
    });
  }

  const executionResult = await executeWorkStep(workOrderId);

  // Ensure the linked delivery order advances to DELIVERED even if the
  // backend transfer-in handler does not update it.
  let updatedDo = null;
  if (doId) {
    try {
      updatedDo = await updateDeliveryOrderStatus(doId, "DELIVERED");
    } catch (doErr) {
      // Log but do not fail the whole operation; stock already moved.
      console.warn(
        "[transfer-in] Could not advance delivery order status:",
        doErr?.message || doErr,
      );
    }
  }

  return {
    workOrderId,
    executionResult,
    updatedDo,
  };
};
