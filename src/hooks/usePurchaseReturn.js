import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { request } from "../helpers/axios_helper";
import { AuthContext } from "../context/authContext";
import { getPdaUser } from "../components/pda/common/pda_user_helper";
import {
  executePurchaseReturn,
  fetchEligiblePurchaseOrdersForReturn,
  fetchPurchaseOrderItems,
  searchPurchaseReturnStockByCode,
} from "../helpers/purchase_return_service";
import { generateAndStoreReturnPdf } from "../helpers/return_pdf_helper";
import { uploadFileToDrive } from "../helpers/file_helper";
import { resolveScannedValue } from "../helpers/camera_scanner_helper";
import { getOperatorName, getUserLogin } from "../helpers/user_display_helper";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

/**
 * Hook for the Purchase Return (vendor return) flow.
 *
 * Supports both desktop web and PDA. The user selects a received purchase
 * order, chooses a source location, scans stock codes, and executes.
 */
export default function usePurchaseReturn() {
  const location = useLocation();
  const isPda = location.pathname.startsWith("/pda");

  const { t } = useTranslation();

  const authUserInfo = useContext(AuthContext)?.userInfo;
  const pdaUser = getPdaUser();
  const userInfo = useMemo(
    () => (isPda ? pdaUser : authUserInfo) || {},
    [isPda, pdaUser, authUserInfo],
  );

  const [helpOpen, setHelpOpen] = useState(false);

  const [sourceLocation, setSourceLocationState] = useState("");
  const sourceLocationRef = useRef("");

  const setSourceLocation = useCallback((code) => {
    const value = String(code || "").trim();
    setSourceLocationState(value);
    sourceLocationRef.current = value;
  }, []);

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPo, setSelectedPo] = useState(null);
  const [poItems, setPoItems] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [priceMap, setPriceMap] = useState({});

  const [scannedItems, setScannedItems] = useState([]);

  const [returnPhotos, setReturnPhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [pendingProductChoice, setPendingProductChoice] = useState(null);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [completedResult, setCompletedResult] = useState(null);

  // Load product map and eligible purchase orders on mount.
  useEffect(() => {
    request("GET", "/api/products")
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        const nameMap = {};
        list.forEach((p) => {
          const productCode = String(p.productCode || "");
          nameMap[productCode] =
            p.productName || p.commonName || p.productCode || "";
        });
        setProductMap(nameMap);
      })
      .catch(() => setProductMap({}));

    refreshPurchaseOrders().catch(() => setPurchaseOrders([]));
  }, []);

  const refreshPurchaseOrders = useCallback(async () => {
    const list = await fetchEligiblePurchaseOrdersForReturn();
    setPurchaseOrders(list);
  }, []);

  const handleSelectPo = useCallback(
    async (poId) => {
      const order = purchaseOrders.find(
        (o) => String(o.orderId) === String(poId),
      );
      if (!order) {
        setErrorMsg(t("purchaseReturn.invalidPurchaseOrder", { poId }));
        return;
      }
      setSelectedPo(order);
      setScannedItems([]);
      setErrorMsg("");
      try {
        const items = await fetchPurchaseOrderItems(order.orderId);
        setPoItems(items);
        const prices = {};
        items.forEach((item) => {
          const key = String(item.productCode || "");
          if (key) prices[key] = toNumber(item.unitPrice);
        });
        setPriceMap(prices);
      } catch {
        setPoItems([]);
        setPriceMap({});
      }
    },
    [purchaseOrders, t],
  );

  const handleClearPo = useCallback(() => {
    setSelectedPo(null);
    setPoItems([]);
    setPriceMap({});
    setScannedItems([]);
  }, []);

  const canExecute = useMemo(() => {
    if (!selectedPo) return false;
    if (!String(sourceLocation || "").trim()) return false;
    if (scannedItems.length === 0) return false;
    return scannedItems.every(
      (scan) =>
        Number(scan.productId) > 0 &&
        String(scan.stockId || "").trim() &&
        toNumber(scan.subQuantity) > 0 &&
        toNumber(scan.subQuantity) <= toNumber(scan.returnable),
    );
  }, [selectedPo, sourceLocation, scannedItems]);

  const handleClearLocation = useCallback(() => {
    setSourceLocation("");
  }, [setSourceLocation]);

  const handleScanSubmit = useCallback(
    async (rawStockId) => {
      const rawValue = String(rawStockId || "").trim();
      if (!rawValue) return;

      if (!selectedPo) {
        setErrorMsg(t("purchaseReturn.purchaseOrderRequired"));
        return;
      }
      if (!sourceLocation) {
        setErrorMsg(t("purchaseReturn.locationRequired"));
        return;
      }

      setBusy(true);
      try {
        const stockId = await resolveScannedValue(rawValue);
        if (!stockId) {
          setErrorMsg(
            t("purchaseReturn.stockNotRecognized", { stockId: rawValue }),
          );
          return;
        }

        const existingIndex = scannedItems.findIndex(
          (item) => String(item.stockId || "").trim() === stockId,
        );
        if (existingIndex >= 0) {
          setErrorMsg(t("purchaseReturn.alreadyScanned", { stockId }));
          return;
        }

        const matches = await searchPurchaseReturnStockByCode(
          stockId,
          sourceLocation,
          selectedPo.orderId,
        );

        if (matches.length === 0) {
          setErrorMsg(t("purchaseReturn.stockNotFoundAtLocation", { stockId }));
          return;
        }

        if (matches[0].returnable <= 0) {
          setErrorMsg(
            t("purchaseReturn.noReturnableQuantity", { stockCode: stockId }),
          );
          return;
        }

        if (matches.length === 1) {
          const stock = matches[0];
          setScannedItems((prev) => [
            ...prev,
            {
              productId: stock.productId,
              productCode: stock.productCode,
              stockId,
              stockCode: stock.stockCode || stockId,
              subQuantity: 1,
              returnable: stock.returnable,
              unitPrice: priceMap[stock.productCode] || 0,
            },
          ]);
          setErrorMsg("");
          return;
        }

        setPendingProductChoice({
          stockId,
          stockCode: matches[0]?.stockCode || stockId,
          options: matches,
        });
      } catch (err) {
        console.error(
          "[PurchaseReturn] searchPurchaseReturnStockByCode failed:",
          err,
        );
        setErrorMsg(
          err?.message ||
            t("purchaseReturn.lookupFailed", { stockId: rawValue }),
        );
      } finally {
        setBusy(false);
      }
    },
    [scannedItems, selectedPo, sourceLocation, priceMap, t],
  );

  const handleUpdateScan = useCallback((index, field, value) => {
    if (field === "subQuantity") {
      const newQty = toNumber(value);
      setScannedItems((prev) =>
        prev.map((item, idx) => {
          if (idx !== index) return item;
          const max = item.returnable ?? Number.POSITIVE_INFINITY;
          return { ...item, subQuantity: Math.min(Math.max(newQty, 1), max) };
        }),
      );
      return;
    }
    setScannedItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item,
      ),
    );
  }, []);

  const handleRemoveScan = useCallback((index) => {
    setScannedItems((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleAddReturnPhoto = useCallback(
    async (file) => {
      const localUrl = URL.createObjectURL(file);
      setPhotoUploading(true);
      try {
        const metadata = await uploadFileToDrive(file, null, null);
        setReturnPhotos((prev) => [...prev, { localUrl, metadata }]);
        setErrorMsg("");
      } catch {
        URL.revokeObjectURL(localUrl);
        setErrorMsg(t("purchaseReturn.photoUploadFailed"));
      } finally {
        setPhotoUploading(false);
      }
    },
    [t],
  );

  const handleRemoveReturnPhoto = useCallback((idx) => {
    setReturnPhotos((prev) => {
      const list = [...prev];
      const [removed] = list.splice(idx, 1);
      if (removed?.localUrl?.startsWith("blob:"))
        URL.revokeObjectURL(removed.localUrl);
      return list;
    });
  }, []);

  const handleSelectProduct = useCallback(
    (stockId, product) => {
      if (!stockId || !product?.productId) return;
      if (product.returnable <= 0) {
        setErrorMsg(
          t("purchaseReturn.noReturnableQuantity", { stockCode: stockId }),
        );
        return;
      }
      setScannedItems((prev) => {
        const exists = prev.some(
          (item) =>
            String(item.stockId || "").trim() ===
              String(stockId || "").trim() &&
            String(item.productId) === String(product.productId),
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            productId: product.productId,
            productCode: product.productCode,
            stockId,
            stockCode: product.stockCode || stockId,
            subQuantity: 1,
            returnable: product.returnable,
            unitPrice: priceMap[product.productCode] || 0,
          },
        ];
      });
      setPendingProductChoice(null);
      setErrorMsg("");
    },
    [priceMap, t],
  );

  const handleCancelProductChoice = useCallback(() => {
    setPendingProductChoice(null);
  }, []);

  const handleExecute = useCallback(async () => {
    if (!canExecute) return;

    setBusy(true);
    setErrorMsg("");
    setSuccessMsg("");
    setCompletedResult(null);

    try {
      const operatorName = getOperatorName(userInfo);
      const userLogin = getUserLogin(userInfo);
      if (!operatorName || !userLogin) {
        throw new Error(t("purchaseReturn.unknownUser"));
      }

      const result = await executePurchaseReturn({
        order: selectedPo,
        fromLocation: String(sourceLocation || "").trim(),
        scannedItems: scannedItems.map((scan) => ({
          productId: scan.productId,
          productCode: scan.productCode,
          stockId: String(scan.stockId || "").trim(),
          subQuantity: toNumber(scan.subQuantity),
          unitPrice: scan.unitPrice,
        })),
        photos: returnPhotos.map((p) => p.metadata),
        issuedBy: operatorName,
        workByStaffId: operatorName,
      });

      let pdfResult = null;
      try {
        pdfResult = await generateAndStoreReturnPdf({
          companyId: String(userInfo?.companyId || "").trim(),
          workOrderId: result.workOrderId,
          fromLocation: String(sourceLocation || "").trim(),
          toLocation:
            result.vendorName || selectedPo.vendorName || selectedPo.orderId,
          operator: operatorName,
          items: scannedItems.map((scan) => ({
            productCode: scan.productCode,
            stockCode: scan.stockId,
            quantity: toNumber(scan.subQuantity),
          })),
          productMap,
          photos: returnPhotos.map((p) => p.metadata),
        });
      } catch (pdfError) {
        setErrorMsg(pdfError?.message || t("purchaseReturn.pdfFailed"));
      }

      setCompletedResult({
        workOrderId: result.workOrderId,
        returnId: result.returnId,
        pdfResult,
      });
      setSuccessMsg(
        t("purchaseReturn.completed", { workOrderId: result.workOrderId }),
      );
      setScannedItems([]);
      setReturnPhotos([]);
      setSelectedPo(null);
      setPoItems([]);
      setPriceMap({});
      setSourceLocation("");
      await refreshPurchaseOrders();
    } catch (err) {
      setErrorMsg(err?.message || t("purchaseReturn.executionFailed"));
    } finally {
      setBusy(false);
    }
  }, [
    canExecute,
    userInfo,
    selectedPo,
    sourceLocation,
    scannedItems,
    returnPhotos,
    productMap,
    refreshPurchaseOrders,
    t,
  ]);

  const handleReset = useCallback(() => {
    setSelectedPo(null);
    setPoItems([]);
    setPriceMap({});
    setSourceLocation("");
    setScannedItems([]);
    setReturnPhotos([]);
    setPendingProductChoice(null);
    setErrorMsg("");
    setSuccessMsg("");
    setCompletedResult(null);
    refreshPurchaseOrders();
  }, [setSourceLocation, refreshPurchaseOrders]);

  return {
    isPda,
    userInfo,

    // Header/help
    helpOpen,
    setHelpOpen,

    // User
    operatorName: getOperatorName(userInfo),
    actionByLabel: getOperatorName(userInfo),

    // Purchase order
    purchaseOrders,
    selectedPo,
    poItems,
    handleSelectPo,
    handleClearPo,

    // Source location
    sourceLocation,
    setSourceLocation,
    handleClearLocation,

    // Products
    productMap,
    priceMap,

    // Scanning
    scannedItems,
    handleScanSubmit,
    handleUpdateScan,
    handleRemoveScan,

    // Product choice
    pendingProductChoice,
    handleSelectProduct,
    handleCancelProductChoice,

    // Photos
    returnPhotos,
    photoUploading,
    handleAddReturnPhoto,
    handleRemoveReturnPhoto,

    // Execution
    busy,
    errorMsg,
    successMsg,
    completedResult,
    canExecute,
    handleExecute,
    handleReset,
  };
}
