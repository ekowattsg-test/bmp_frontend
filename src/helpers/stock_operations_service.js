/**
 * Stock Operations Service
 *
 * Orchestrates backend REST APIs to perform stock operations that are not
 * exposed as single endpoints (no Java backend changes allowed).
 *
 * Current scope: Receive PO stock via WorkOrder workflow.
 */

import { request } from "./axios_helper";
import { toLocalISO } from "./date_helper";

const RECEIVE_WORK_ORDER_TYPE = "Receive";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
};

const isReadyForReceipt = (status) => {
  const normalized = String(status || "")
    .trim()
    .toUpperCase();
  // PO must be marked ready before physical receipt.
  return normalized === "READY";
};

/**
 * Load the full product list and return maps for productCode lookup.
 */
export const fetchProductMap = async () => {
  const response = await request("GET", "/api/products");
  const list = toArray(response?.data);
  const nameMap = {};
  const idMap = {};
  list.forEach((p) => {
    nameMap[String(p.productCode || "")] =
      p.productName || p.commonName || p.productCode || "";
    idMap[String(p.productCode || "")] = p.productId;
  });
  return { productMap: nameMap, codeToProductId: idMap };
};

/**
 * Load POs that are eligible for receiving.
 */
export const fetchEligiblePurchaseOrders = async () => {
  const response = await request("GET", "/api/purchaseorderview");
  const rows = toArray(response?.data);

  // purchaseorderview may return one row per item; deduplicate by orderId.
  const seen = new Map();
  rows.forEach((row) => {
    if (!row?.orderId) return;
    if (!seen.has(row.orderId)) {
      seen.set(row.orderId, row);
    }
  });

  return Array.from(seen.values()).filter((order) =>
    isReadyForReceipt(order?.orderStatus),
  );
};

/**
 * Load full PO header + items.
 */
export const fetchPurchaseOrder = async (orderId) => {
  const response = await request("GET", `/api/purchaseOrders/${orderId}`);
  const order = response?.data || null;
  if (!order) {
    throw new Error("Purchase order not found.");
  }
  return order;
};

/**
 * Amend PO quantities after vendor confirmation.
 */
export const amendPurchaseOrder = async (orderId, orderPayload) => {
  const response = await request(
    "PUT",
    `/api/purchaseOrders/${orderId}`,
    orderPayload,
  );
  return response?.data || null;
};

/**
 * Build the normalized PO payload used for amendment.
 * Keeps header fields and rewrites item quantities.
 */
export const buildAmendedPurchaseOrderPayload = ({
  order,
  items,
  newStatus,
}) => {
  const normalizedItems = toArray(items).map((item, index) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    return {
      itemId: item.itemId || null,
      itemType:
        item.itemType == null || item.itemType === "" ? "I" : item.itemType,
      productCode: item.productCode,
      internalProductCode: item.internalProductCode || null,
      internalOrderId: item.internalOrderId || null,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
      lineNumber: index + 1,
    };
  });

  return {
    ...order,
    orderStatus: newStatus || order?.orderStatus || "READY",
    purchaseAmount: normalizedItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    ),
    items: normalizedItems,
  };
};

/**
 * Create the Receive work order.
 *
 * @param {object} params
 * @param {string} params.poId - Purchase order id
 * @param {string} params.issuedBy - Operator display name (work order header)
 * @param {string} params.workByStaffId - Operator staffId (work order assignment)
 */
export const createWorkOrder = async ({ poId, issuedBy, workByStaffId }) => {
  const payload = {
    workOrderType: RECEIVE_WORK_ORDER_TYPE,
    workDescription: `Receive stock for ${poId}`,
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
 * Create the INPROGRESS step for a Receive work order.
 */
export const createWorkStep = async ({
  workOrderId,
  poId,
  location,
  stepNumber = 1,
  photos = [],
}) => {
  const payload = {
    workOrderId,
    stepNumber,
    fromLocation: poId,
    toLocation: location,
    photos:
      Array.isArray(photos) && photos.length > 0 ? JSON.stringify(photos) : "",
    stepStatus: "INPROGRESS",
  };
  const response = await request("POST", "/api/worksteps", payload);
  return response?.data || null;
};

/**
 * Create WorkOrderData rows for each PO line.
 * Returns a map keyed by productId -> workOrderDataId.
 */
export const createWorkOrderData = async ({ workOrderId, poItems, workBy }) => {
  const map = {};
  for (const item of poItems) {
    const productId = Number(item.productId);
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new Error(
        `Product ID is missing for PO line ${item.productCode || ""}.`,
      );
    }

    const payload = {
      workOrderId,
      productId,
      quantity: Number(item.quantity || 0),
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
    subQuantity: Number(subQuantity || 0),
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
 * Execute the full Receive PO stock flow.
 *
 * @param {object} params
 * @param {object} params.order - Full PO object (must include orderId and items)
 * @param {string} params.location - Destination location
 * @param {Array<{productId, stockId, subQuantity}>} params.scannedItems
 * @param {Array<object>} [params.photos] - Receipt photo metadata to persist on the step
 * @param {string} params.issuedBy - Operator display name for the work order header
 * @param {string} params.workByStaffId - Operator staffId for the work order assignment
 *
 * @returns {Promise<{workOrderId, stepResult, executionResult, updatedOrder}>}
 */
export const executeReceivePoStock = async ({
  order,
  location,
  scannedItems,
  photos = [],
  issuedBy,
  workByStaffId,
}) => {
  if (!order?.orderId) {
    throw new Error("Purchase order is required.");
  }
  if (!location) {
    throw new Error("Receive location is required.");
  }
  if (!scannedItems || scannedItems.length === 0) {
    throw new Error("At least one received item is required.");
  }

  // 1. Create work order
  const workOrderId = await createWorkOrder({
    poId: order.orderId,
    issuedBy,
    workByStaffId,
  });

  // 2. Create in-progress step
  await createWorkStep({
    workOrderId,
    poId: order.orderId,
    location,
    photos,
  });

  // 3. Resolve product IDs by productCode at execution time, just like the
  // PDA work-order helper does, so PO items that arrive without productId
  // still map correctly.
  const [itemsRes, productsRes] = await Promise.all([
    request("GET", `/api/purchaseOrderItems/order/${order.orderId}`),
    request("GET", "/api/products"),
  ]);

  const products = toArray(productsRes?.data);
  const codeToProductId = {};
  products.forEach((p) => {
    if (p.productCode) {
      codeToProductId[String(p.productCode)] = p.productId;
    }
  });

  const poItems = toArray(itemsRes?.data || order.items).map((item) => {
    const productCode = String(item.productCode || "");
    const productId = Number(
      item.productId ?? codeToProductId[productCode] ?? null,
    );
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new Error(
        `Product ID is missing for PO line ${productCode || ""}.`,
      );
    }
    return { ...item, productCode, productId };
  });

  const dataIdMap = await createWorkOrderData({
    workOrderId,
    poItems,
    workBy: workByStaffId,
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
      stockId: scan.stockId,
      subQuantity: scan.subQuantity,
    });
  }

  // 5. Execute the step
  const executionResult = await executeWorkStep(workOrderId);

  // 6. Refresh PO from authoritative API
  const updatedOrder = await fetchPurchaseOrder(order.orderId);

  return {
    workOrderId,
    executionResult,
    updatedOrder,
  };
};
