import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { request } from "../helpers/axios_helper";
import { AuthContext } from "../context/authContext";
import { getPdaUser } from "../components/pda/common/pda_user_helper";
import { resolveScannedValue } from "../helpers/camera_scanner_helper";
import {
  amendPurchaseOrder,
  buildAmendedPurchaseOrderPayload,
  executeReceivePoStock,
  fetchEligiblePurchaseOrders,
  fetchProductMap,
  fetchPurchaseOrder,
} from "../helpers/stock_operations_service";
import { generateAndStoreReceiptPdf } from "../helpers/receipt_pdf_helper";
import { uploadFileToDrive } from "../helpers/file_helper";
import { getOperatorName, getUserLogin } from "../helpers/user_display_helper";

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
 * Shared hook for the Receive PO Stock flow.
 *
 * Supports both desktop web and PDA. The flow is "scan first, identify after":
 * the user scans/enters a stock code, then the system either auto-matches it to
 * a PO line or prompts the user to pick the PO line and quantity.
 */
export default function useReceivePoStock() {
  const location = useLocation();
  const isPda = location.pathname.startsWith("/pda");

  const authUserInfo = useContext(AuthContext)?.userInfo;
  const pdaUser = getPdaUser();
  const userInfo = useMemo(
    () => (isPda ? pdaUser : authUserInfo) || {},
    [isPda, pdaUser, authUserInfo],
  );

  const [helpOpen, setHelpOpen] = useState(false);

  const [eligiblePos, setEligiblePos] = useState([]);
  const [posLoading, setPosLoading] = useState(true);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [order, setOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const [productMap, setProductMap] = useState({});
  const [codeToProductId, setCodeToProductId] = useState({});

  const [scannedLocation, setScannedLocation] = useState("");

  const [scannedItems, setScannedItems] = useState([]);
  const [pendingScan, setPendingScan] = useState(null);

  const [receiptPhotos, setReceiptPhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [completedResult, setCompletedResult] = useState(null);

  const [amendDialogOpen, setAmendDialogOpen] = useState(false);
  const [amendItems, setAmendItems] = useState([]);
  const [amending, setAmending] = useState(false);

  // Load eligible POs, product map, and auto-detect location on mount.
  useEffect(() => {
    setPosLoading(true);
    fetchEligiblePurchaseOrders()
      .then((rows) => setEligiblePos(rows))
      .catch(() => setEligiblePos([]))
      .finally(() => setPosLoading(false));

    fetchProductMap()
      .then(({ productMap: nameMap, codeToProductId: idMap }) => {
        setProductMap(nameMap);
        setCodeToProductId(idMap);
      })
      .catch(() => {
        setProductMap({});
        setCodeToProductId({});
      });
  }, []);

  // Pre-select PO from ?po= query parameter when eligible POs load.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const poFromQuery = params.get("po");
    if (!poFromQuery) return;
    const match = eligiblePos.find(
      (po) => String(po.orderId || "").trim() === poFromQuery.trim(),
    );
    if (match) setSelectedOrderId(match.orderId);
  }, [location.search, eligiblePos]);

  // Load selected PO detail.
  useEffect(() => {
    if (!selectedOrderId) {
      setOrder(null);
      setScannedItems([]);
      setCompletedResult(null);
      return;
    }

    setOrderLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setCompletedResult(null);
    fetchPurchaseOrder(selectedOrderId)
      .then((data) => {
        setOrder(data);
        setScannedItems([]);
        setReceiptPhotos([]);
      })
      .catch((err) => {
        setOrder(null);
        setErrorMsg(err?.message || "Failed to load purchase order details.");
      })
      .finally(() => setOrderLoading(false));
  }, [selectedOrderId]);

  const orderItems = useMemo(() => {
    return toArray(order?.items).map((item) => {
      const productCode = String(item.productCode || "");
      return {
        ...item,
        productCode,
        productName: productMap[productCode] || productCode || "-",
        productId: codeToProductId[productCode],
        quantity: toNumber(item.quantity),
      };
    });
  }, [order, productMap, codeToProductId]);

  const itemsByProductCode = useMemo(() => {
    const map = {};
    orderItems.forEach((item) => {
      map[item.productCode] = item;
    });
    return map;
  }, [orderItems]);

  const lineTotals = useMemo(() => {
    const totals = {};
    orderItems.forEach((item) => {
      totals[item.productCode] = {
        ordered: item.quantity,
        received: 0,
        stockCodes: [],
      };
    });
    scannedItems.forEach((scan) => {
      const productCode = String(scan.productCode || "");
      const entry = totals[productCode];
      if (!entry) return;
      entry.received += toNumber(scan.subQuantity);
      if (String(scan.stockId || "").trim()) {
        entry.stockCodes.push(scan.stockId);
      }
    });
    return totals;
  }, [orderItems, scannedItems]);

  const quantityWarnings = useMemo(() => {
    const warnings = [];
    Object.entries(lineTotals).forEach(([productCode, total]) => {
      if (total.received !== total.ordered && total.received > 0) {
        warnings.push({
          productCode,
          productName:
            itemsByProductCode[productCode]?.productName || productCode,
          ordered: total.ordered,
          received: total.received,
          isOver: total.received > total.ordered,
          stockCodes: total.stockCodes,
        });
      }
    });
    return warnings;
  }, [lineTotals, itemsByProductCode]);

  const canExecute = useMemo(() => {
    if (!order || !String(scannedLocation || "").trim()) return false;
    if (scannedItems.length === 0) return false;
    if (receiptPhotos.length === 0) return false;
    if (quantityWarnings.length > 0) return false;
    return scannedItems.every(
      (scan) =>
        String(scan.productCode || "").trim() &&
        String(scan.stockId || "").trim() &&
        toNumber(scan.subQuantity) > 0,
    );
  }, [order, scannedLocation, scannedItems, receiptPhotos, quantityWarnings]);

  const selectedOrder = useMemo(
    () => eligiblePos.find((po) => po.orderId === selectedOrderId) || null,
    [eligiblePos, selectedOrderId],
  );

  const addScan = useCallback(
    (productCode, stockId, subQuantity = 1, stockCode) => {
      setScannedItems((prev) => [
        ...prev,
        {
          productCode,
          stockId: String(stockId || "").trim(),
          stockCode: String(stockCode || stockId || "").trim(),
          subQuantity: toNumber(subQuantity),
        },
      ]);
    },
    [],
  );

  const handleAddReceiptPhoto = useCallback(async (file) => {
    const localUrl = URL.createObjectURL(file);
    setPhotoUploading(true);
    try {
      const metadata = await uploadFileToDrive(file, null, null);
      setReceiptPhotos((prev) => [...prev, { localUrl, metadata }]);
    } catch {
      URL.revokeObjectURL(localUrl);
      setErrorMsg("Failed to upload receipt photo.");
    } finally {
      setPhotoUploading(false);
    }
  }, []);

  const handleRemoveReceiptPhoto = useCallback((idx) => {
    setReceiptPhotos((prev) => {
      const list = [...prev];
      const [removed] = list.splice(idx, 1);
      if (removed?.localUrl?.startsWith("blob:"))
        URL.revokeObjectURL(removed.localUrl);
      return list;
    });
  }, []);

  const handleClearLocation = useCallback(() => {
    setScannedLocation("");
  }, []);

  const handleScanSubmit = useCallback(
    async (rawStockId) => {
      const stockId = String(rawStockId || "").trim();
      if (!stockId || !order) return;

      // Try auto-match by looking up the stock code in the backend.
      let stock = null;
      try {
        const stockRes = await request(
          "GET",
          `/api/stocks/search?stockCode=${encodeURIComponent(stockId)}`,
          null,
          { skipBackendErrorDialog: true },
        );
        stock = stockRes?.data || null;
        const productId = Number(stock?.productId);
        if (Number.isFinite(productId) && productId > 0) {
          const matchingItem = orderItems.find(
            (item) => item.productId === productId,
          );
          if (matchingItem) {
            addScan(
              matchingItem.productCode,
              stockId,
              1,
              stock?.stockCode || stockId,
            );
            return;
          }
        }
      } catch {
        // Stock may not exist yet; fall through to identify dialog.
      }

      // Open identify dialog so the user can pick the PO line and link the
      // scanned stock code to a product, even when no matching stock exists yet.
      setPendingScan({
        stockId,
        stockCode: stock?.stockCode || stockId,
        productCode: null,
        subQuantity: 1,
      });
    },
    [order, orderItems, addScan],
  );

  const addIdentifiedScan = useCallback(
    ({ stockId, productCode, subQuantity }) => {
      if (!stockId || !productCode) return;
      addScan(productCode, stockId, subQuantity);
      setPendingScan(null);
    },
    [addScan],
  );

  const handleUpdateScan = useCallback((index, field, value) => {
    setScannedItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item,
      ),
    );
  }, []);

  const handleRemoveScan = useCallback((index) => {
    setScannedItems((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleOpenAmendDialog = useCallback(() => {
    setAmendItems(
      orderItems.map((item) => ({
        ...item,
        quantity: item.quantity,
      })),
    );
    setAmendDialogOpen(true);
  }, [orderItems]);

  const handleAmendItemChange = useCallback((productCode, value) => {
    const quantity = toNumber(value);
    setAmendItems((prev) =>
      prev.map((item) =>
        item.productCode === productCode ? { ...item, quantity } : item,
      ),
    );
  }, []);

  const handleAmendPo = useCallback(async () => {
    if (!order) return;
    setAmending(true);
    setErrorMsg("");
    try {
      const payload = buildAmendedPurchaseOrderPayload({
        order,
        items: amendItems,
        newStatus: order.orderStatus,
      });
      await amendPurchaseOrder(order.orderId, payload);
      const refreshed = await fetchPurchaseOrder(order.orderId);
      setOrder(refreshed);
      setAmendDialogOpen(false);
      setSuccessMsg("Purchase order amended successfully.");
    } catch (err) {
      setErrorMsg(err?.message || "Failed to amend purchase order.");
    } finally {
      setAmending(false);
    }
  }, [order, amendItems]);

  const handleExecute = useCallback(async () => {
    if (!canExecute) return;

    setBusy(true);
    setErrorMsg("");
    setSuccessMsg("");
    setCompletedResult(null);

    try {
      const scansForService = scannedItems
        .map((scan) => {
          const item = itemsByProductCode[scan.productCode];
          return {
            productId: item?.productId,
            productCode: scan.productCode,
            stockId: String(scan.stockId || "").trim(),
            subQuantity: toNumber(scan.subQuantity),
          };
        })
        .filter(
          (scan) => scan.productId && scan.stockId && scan.subQuantity > 0,
        );

      const operatorName = getOperatorName(userInfo);
      const userLogin = getUserLogin(userInfo);
      if (!operatorName || !userLogin) {
        throw new Error("Unable to determine the current user.");
      }

      const result = await executeReceivePoStock({
        order,
        location: String(scannedLocation || "").trim(),
        scannedItems: scansForService,
        photos: receiptPhotos.map((p) => p.metadata),
        issuedBy: operatorName,
        workByStaffId: operatorName,
      });

      const pdfItems = orderItems.map((item) => ({
        productCode: item.productCode,
        poQuantity: item.quantity,
        receivedQuantity: lineTotals[item.productCode]?.received || 0,
        stockCodes: lineTotals[item.productCode]?.stockCodes || [],
      }));

      let pdfResult = null;
      try {
        pdfResult = await generateAndStoreReceiptPdf({
          companyId: String(userInfo?.companyId || "").trim(),
          order: result.updatedOrder,
          location: String(scannedLocation || "").trim(),
          operator: operatorName,
          items: pdfItems,
          productMap,
          photos: receiptPhotos.map((p) => p.metadata),
        });
      } catch (pdfError) {
        setErrorMsg(
          pdfError?.message ||
            "Receipt succeeded but the PDF could not be stored.",
        );
      }

      setCompletedResult({
        workOrderId: result.workOrderId,
        updatedOrder: result.updatedOrder,
        pdfResult,
      });
      setSuccessMsg(
        `Receipt completed. Work order ${result.workOrderId} created.`,
      );
      setScannedItems([]);
      setReceiptPhotos([]);

      fetchEligiblePurchaseOrders()
        .then((rows) => setEligiblePos(rows))
        .catch(() => {});
    } catch (err) {
      setErrorMsg(
        err?.message ||
          "Failed to execute receipt. No stock movements were recorded.",
      );
    } finally {
      setBusy(false);
    }
  }, [
    canExecute,
    order,
    orderItems,
    itemsByProductCode,
    scannedItems,
    scannedLocation,
    isPda,
    userInfo,
    lineTotals,
    productMap,
    receiptPhotos,
  ]);

  const handleReset = useCallback(() => {
    setSelectedOrderId("");
    setOrder(null);
    setScannedLocation("");
    setScannedItems([]);
    setPendingScan(null);
    setReceiptPhotos([]);
    setErrorMsg("");
    setSuccessMsg("");
    setCompletedResult(null);
  }, []);

  return {
    isPda,
    userInfo,

    // Header/help
    helpOpen,
    setHelpOpen,

    // PO selection
    eligiblePos,
    posLoading,
    selectedOrderId,
    setSelectedOrderId,
    selectedOrder,
    order,
    orderLoading,

    // Location
    scannedLocation,
    setScannedLocation,
    handleClearLocation,

    // Items and totals
    orderItems,
    itemsByProductCode,
    lineTotals,
    quantityWarnings,

    // Scan-first flow
    scannedItems,
    pendingScan,
    setPendingScan,
    handleScanSubmit,
    addIdentifiedScan,
    handleUpdateScan,
    handleRemoveScan,

    // Amendment
    amendDialogOpen,
    setAmendDialogOpen,
    amendItems,
    setAmendItems,
    amending,
    handleOpenAmendDialog,
    handleAmendItemChange,
    handleAmendPo,

    // Receipt photos
    receiptPhotos,
    photoUploading,
    handleAddReceiptPhoto,
    handleRemoveReceiptPhoto,

    // Execution
    busy,
    errorMsg,
    setErrorMsg,
    successMsg,
    setSuccessMsg,
    completedResult,
    canExecute,
    handleExecute,
    handleReset,
  };
}
