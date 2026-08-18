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
  executeReturnIn,
  fetchDeliveryOrderItems,
  fetchEligibleReturnInDeliveryOrders,
  searchReturnInStockByCode,
} from "../helpers/transfer_return_service";
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
 * Hook for the Delivery Return (Return In) flow.
 *
 * Supports both desktop web and PDA. The user selects a delivered delivery
 * order, chooses a destination location, scans stock codes, and executes.
 */
export default function useTransferReturnIn() {
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

  const [returnLocation, setReturnLocationState] = useState("");
  const returnLocationRef = useRef("");

  const setReturnLocation = useCallback((code) => {
    const value = String(code || "").trim();
    setReturnLocationState(value);
    returnLocationRef.current = value;
  }, []);

  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [selectedDo, setSelectedDo] = useState(null);
  const [doItems, setDoItems] = useState([]);
  const [productMap, setProductMap] = useState({});

  const [scannedItems, setScannedItems] = useState([]);

  const [returnPhotos, setReturnPhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [pendingProductChoice, setPendingProductChoice] = useState(null);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [completedResult, setCompletedResult] = useState(null);

  // Load product map and eligible delivery orders on mount.
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

    refreshDeliveryOrders().catch(() => setDeliveryOrders([]));
  }, []);

  const refreshDeliveryOrders = useCallback(async () => {
    const list = await fetchEligibleReturnInDeliveryOrders();
    setDeliveryOrders(list);
  }, []);

  const handleSelectDo = useCallback(
    async (doId) => {
      const order = deliveryOrders.find(
        (o) => String(o.orderId) === String(doId),
      );
      if (!order) {
        setErrorMsg(t("transferReturnIn.invalidDeliveryOrder", { doId }));
        return;
      }
      setSelectedDo(order);
      setScannedItems([]);
      setErrorMsg("");
      try {
        const items = await fetchDeliveryOrderItems(order.orderId);
        setDoItems(items);
      } catch {
        setDoItems([]);
      }
    },
    [deliveryOrders, t],
  );

  const handleClearDo = useCallback(() => {
    setSelectedDo(null);
    setDoItems([]);
    setScannedItems([]);
  }, []);

  const canExecute = useMemo(() => {
    if (!selectedDo) return false;
    if (!String(returnLocation || "").trim()) return false;
    if (scannedItems.length === 0) return false;
    return scannedItems.every(
      (scan) =>
        Number(scan.productId) > 0 &&
        String(scan.stockId || "").trim() &&
        toNumber(scan.subQuantity) > 0 &&
        toNumber(scan.subQuantity) <= toNumber(scan.returnable),
    );
  }, [selectedDo, returnLocation, scannedItems]);

  const handleClearLocation = useCallback(() => {
    setReturnLocation("");
  }, [setReturnLocation]);

  const handleScanSubmit = useCallback(
    async (rawStockId) => {
      const rawValue = String(rawStockId || "").trim();
      if (!rawValue) return;

      if (!selectedDo) {
        setErrorMsg(t("transferReturnIn.deliveryOrderRequired"));
        return;
      }
      if (!returnLocation) {
        setErrorMsg(t("transferReturnIn.locationRequired"));
        return;
      }

      setBusy(true);
      try {
        const stockId = await resolveScannedValue(rawValue);
        if (!stockId) {
          setErrorMsg(
            t("transferReturnIn.stockNotRecognized", { stockId: rawValue }),
          );
          return;
        }

        const existingIndex = scannedItems.findIndex(
          (item) => String(item.stockId || "").trim() === stockId,
        );
        if (existingIndex >= 0) {
          setErrorMsg(t("transferReturnIn.alreadyScanned", { stockId }));
          return;
        }

        const matches = await searchReturnInStockByCode(
          stockId,
          returnLocation,
          selectedDo.orderId,
        );

        if (matches.length === 0) {
          setErrorMsg(
            t("transferReturnIn.stockNotFoundAtLocation", { stockId }),
          );
          return;
        }

        if (matches[0].returnable <= 0) {
          setErrorMsg(
            t("transferReturnIn.noReturnableQuantity", { stockCode: stockId }),
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
              subQuantity: 1,
              returnable: stock.returnable,
            },
          ]);
          setErrorMsg("");
          return;
        }

        setPendingProductChoice({ stockId, options: matches });
      } catch (err) {
        console.error(
          "[TransferReturnIn] searchReturnInStockByCode failed:",
          err,
        );
        setErrorMsg(
          err?.message ||
            t("transferReturnIn.lookupFailed", { stockId: rawValue }),
        );
      } finally {
        setBusy(false);
      }
    },
    [scannedItems, selectedDo, returnLocation, t],
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
        setErrorMsg(t("transferReturnIn.photoUploadFailed"));
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
          t("transferReturnIn.noReturnableQuantity", { stockCode: stockId }),
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
            subQuantity: 1,
            returnable: product.returnable,
          },
        ];
      });
      setPendingProductChoice(null);
      setErrorMsg("");
    },
    [t],
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
        throw new Error(t("transferReturnIn.unknownUser"));
      }

      const result = await executeReturnIn({
        doId: selectedDo.orderId,
        fromLocation:
          selectedDo.projectCode || selectedDo.location || selectedDo.orderId,
        toLocation: String(returnLocation || "").trim(),
        scannedItems: scannedItems.map((scan) => ({
          productId: scan.productId,
          productCode: scan.productCode,
          stockId: String(scan.stockId || "").trim(),
          subQuantity: toNumber(scan.subQuantity),
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
          fromLocation: selectedDo.projectCode || selectedDo.orderId,
          toLocation: String(returnLocation || "").trim(),
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
        setErrorMsg(pdfError?.message || t("transferReturnIn.pdfFailed"));
      }

      setCompletedResult({
        workOrderId: result.workOrderId,
        returnId: result.returnId,
        pdfResult,
      });
      setSuccessMsg(
        t("transferReturnIn.completed", { workOrderId: result.workOrderId }),
      );
      setScannedItems([]);
      setReturnPhotos([]);
      setSelectedDo(null);
      setDoItems([]);
      setReturnLocation("");
      await refreshDeliveryOrders();
    } catch (err) {
      setErrorMsg(err?.message || t("transferReturnIn.executionFailed"));
    } finally {
      setBusy(false);
    }
  }, [
    canExecute,
    userInfo,
    selectedDo,
    returnLocation,
    scannedItems,
    returnPhotos,
    productMap,
    refreshDeliveryOrders,
    t,
  ]);

  const handleReset = useCallback(() => {
    setSelectedDo(null);
    setDoItems([]);
    setReturnLocation("");
    setScannedItems([]);
    setReturnPhotos([]);
    setPendingProductChoice(null);
    setErrorMsg("");
    setSuccessMsg("");
    setCompletedResult(null);
    refreshDeliveryOrders();
  }, [setReturnLocation, refreshDeliveryOrders]);

  return {
    isPda,
    userInfo,

    // Header/help
    helpOpen,
    setHelpOpen,

    // User
    operatorName: getOperatorName(userInfo),
    actionByLabel: getOperatorName(userInfo),

    // Delivery order
    deliveryOrders,
    selectedDo,
    doItems,
    handleSelectDo,
    handleClearDo,

    // Destination location
    returnLocation,
    setReturnLocation,
    handleClearLocation,

    // Products
    productMap,

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
