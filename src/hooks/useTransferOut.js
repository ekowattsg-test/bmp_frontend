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
import { resolveScannedValue } from "../helpers/camera_scanner_helper";
import { uploadFileToDrive } from "../helpers/file_helper";
import {
  executeTransferOut,
  fetchEligibleTransferOutDeliveryOrders,
  resolveDeliveryOrderItems,
  searchTransferStockByCode,
} from "../helpers/transfer_service";
import { generateAndStoreTransferOutPdf } from "../helpers/transfer_pdf_helper";
import { getOperatorName, getUserLogin } from "../helpers/user_display_helper";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

export default function useTransferOut() {
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

  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [dosLoading, setDosLoading] = useState(true);
  const [selectedDoId, setSelectedDoId] = useState("");
  const [selectedDo, setSelectedDo] = useState(null);
  const [doItems, setDoItems] = useState([]);

  const [scannedLocation, setScannedLocationState] = useState("");
  const scannedLocationRef = useRef("");

  const setScannedLocation = useCallback((code) => {
    const value = String(code || "").trim();
    setScannedLocationState(value);
    scannedLocationRef.current = value;
  }, []);

  const [productMap, setProductMap] = useState({});
  const [productCategoryMap, setProductCategoryMap] = useState({});
  const [productIdToCodeMap, setProductIdToCodeMap] = useState({});

  const [scannedItems, setScannedItems] = useState([]);
  const [pendingProductChoice, setPendingProductChoice] = useState(null);

  const [transferPhotos, setTransferPhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [completedResult, setCompletedResult] = useState(null);

  useEffect(() => {
    request("GET", "/api/products")
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        const nameMap = {};
        const categoryMap = {};
        const idToCodeMap = {};
        list.forEach((p) => {
          const productCode = String(p.productCode || "");
          nameMap[productCode] =
            p.productName || p.commonName || p.productCode || "";
          categoryMap[productCode] = String(
            p.productCategory || "",
          ).toUpperCase();
          idToCodeMap[String(p.productId)] = productCode;
        });
        setProductMap(nameMap);
        setProductCategoryMap(categoryMap);
        setProductIdToCodeMap(idToCodeMap);
      })
      .catch(() => {
        setProductMap({});
        setProductCategoryMap({});
        setProductIdToCodeMap({});
      });

    setDosLoading(true);
    fetchEligibleTransferOutDeliveryOrders()
      .then((rows) => setDeliveryOrders(rows))
      .catch(() => setDeliveryOrders([]))
      .finally(() => setDosLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDoId) {
      setSelectedDo(null);
      setDoItems([]);
      return;
    }

    const order =
      deliveryOrders.find((o) => o.orderId === selectedDoId) || null;
    setSelectedDo(order);

    if (order) {
      resolveDeliveryOrderItems(order)
        .then(setDoItems)
        .catch(() => setDoItems([]));
    } else {
      setDoItems([]);
    }
  }, [selectedDoId, deliveryOrders]);

  const toLocation = useMemo(
    () => String(selectedDo?.projectCode || "").trim(),
    [selectedDo],
  );

  const lineTotals = useMemo(() => {
    const totals = {};
    doItems.forEach((item) => {
      totals[item.productCode] = {
        ordered: item.quantity,
        transferred: 0,
      };
    });
    scannedItems.forEach((scan) => {
      const entry = totals[scan.productCode];
      if (entry) {
        entry.transferred += toNumber(scan.subQuantity);
      }
    });
    return totals;
  }, [doItems, scannedItems]);

  const quantityWarnings = useMemo(() => {
    const warnings = [];
    Object.entries(lineTotals).forEach(([productCode, total]) => {
      if (total.transferred !== total.ordered && total.transferred > 0) {
        warnings.push({
          productCode,
          productName: productMap[productCode] || productCode,
          ordered: total.ordered,
          transferred: total.transferred,
        });
      }
    });
    return warnings;
  }, [lineTotals, productMap]);

  const canExecute = useMemo(() => {
    if (!String(scannedLocation || "").trim()) return false;
    if (scannedItems.length === 0) return false;
    if (transferPhotos.length === 0) return false;
    if (quantityWarnings.length > 0) return false;
    return scannedItems.every(
      (scan) =>
        Number(scan.productId) > 0 &&
        String(scan.stockId || "").trim() &&
        toNumber(scan.subQuantity) > 0 &&
        toNumber(scan.subQuantity) <= toNumber(scan.available),
    );
  }, [scannedLocation, scannedItems, transferPhotos, quantityWarnings]);

  const handleClearLocation = useCallback(() => {
    setScannedLocation("");
  }, [setScannedLocation]);

  const handleScanSubmit = useCallback(
    async (rawStockId) => {
      const rawValue = String(rawStockId || "").trim();
      if (!rawValue) return;

      const currentLocation = String(scannedLocationRef.current || "").trim();
      if (!currentLocation) {
        setErrorMsg(t("transferOut.locationRequired", { stockCode: rawValue }));
        return;
      }
      setBusy(true);
      try {
        const stockId = await resolveScannedValue(rawValue);
        if (!stockId) {
          setErrorMsg(
            t("transferOut.unrecognizedStockCode", { stockCode: rawValue }),
          );
          return;
        }

        const existingIndex = scannedItems.findIndex(
          (item) => String(item.stockId || "").trim() === stockId,
        );
        if (existingIndex >= 0) {
          setErrorMsg(t("transferOut.alreadyScanned", { stockCode: stockId }));
          return;
        }

        const matches = await searchTransferStockByCode(
          stockId,
          currentLocation,
        );

        if (matches.length === 0) {
          setErrorMsg(
            t("transferOut.notInventoryProduct", { stockCode: stockId }),
          );
          return;
        }

        if (matches.length === 1) {
          const stock = matches[0];
          const available = stock.availability?.available ?? 0;
          if (available <= 0) {
            setErrorMsg(
              t("transferOut.noAvailableQuantity", {
                stockCode: stockId,
                location: currentLocation,
              }),
            );
            return;
          }
          setScannedItems((prev) => [
            ...prev,
            {
              productId: stock.productId,
              productCode: stock.productCode,
              stockId,
              subQuantity: 1,
              available,
            },
          ]);
          setErrorMsg("");
          return;
        }

        setPendingProductChoice({ stockId, options: matches });
      } catch (err) {
        console.error("[TransferOut] searchTransferStockByCode failed:", err);
        setErrorMsg(
          err?.message ||
            t("transferOut.lookupFailed", { stockCode: rawValue }),
        );
      } finally {
        setBusy(false);
      }
    },
    [scannedItems, t],
  );

  const handleSelectProduct = useCallback(
    (stockId, product) => {
      if (!stockId || !product?.productId) return;
      const productCode = productIdToCodeMap[String(product.productId)];
      const category = productCategoryMap[productCode];
      if (category !== "C") {
        setErrorMsg(
          t("transferOut.notInventoryProduct", { stockCode: stockId }),
        );
        return;
      }
      const available = product.availability?.available ?? 0;
      if (available <= 0) {
        setErrorMsg(
          t("transferOut.noAvailableQuantity", {
            stockCode: stockId,
            location: scannedLocation,
          }),
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
            available,
          },
        ];
      });
      setPendingProductChoice(null);
      setErrorMsg("");
    },
    [scannedLocation, productCategoryMap, productIdToCodeMap, t],
  );

  const handleCancelProductChoice = useCallback(() => {
    setPendingProductChoice(null);
  }, []);

  const handleUpdateScan = useCallback((index, field, value) => {
    if (field === "subQuantity") {
      const newQty = toNumber(value);
      setScannedItems((prev) =>
        prev.map((item, idx) => {
          if (idx !== index) return item;
          const max = item.available ?? Number.POSITIVE_INFINITY;
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

  const handleAddTransferPhoto = useCallback(async (file) => {
    const localUrl = URL.createObjectURL(file);
    setPhotoUploading(true);
    try {
      const metadata = await uploadFileToDrive(file, null, null);
      setTransferPhotos((prev) => [...prev, { localUrl, metadata }]);
      setErrorMsg("");
    } catch {
      URL.revokeObjectURL(localUrl);
      setErrorMsg("Failed to upload transfer photo.");
    } finally {
      setPhotoUploading(false);
    }
  }, []);

  const handleRemoveTransferPhoto = useCallback((idx) => {
    setTransferPhotos((prev) => {
      const list = [...prev];
      const [removed] = list.splice(idx, 1);
      if (removed?.localUrl?.startsWith("blob:"))
        URL.revokeObjectURL(removed.localUrl);
      return list;
    });
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
        throw new Error("Unable to determine the current user.");
      }

      const result = await executeTransferOut({
        fromLocation: String(scannedLocation || "").trim(),
        toLocation: String(toLocation || "").trim(),
        doId: selectedDoId || undefined,
        scannedItems: scannedItems.map((scan) => ({
          productId: scan.productId,
          productCode: scan.productCode,
          stockId: String(scan.stockId || "").trim(),
          subQuantity: toNumber(scan.subQuantity),
        })),
        photos: transferPhotos.map((p) => p.metadata),
        issuedBy: operatorName,
        workByStaffId: operatorName,
        description: selectedDoId
          ? `Transfer out for ${selectedDoId}`
          : "Transfer stock out",
      });

      let pdfResult = null;
      try {
        pdfResult = await generateAndStoreTransferOutPdf({
          companyId: String(userInfo?.companyId || "").trim(),
          workOrderId: result.workOrderId,
          doId: selectedDoId || undefined,
          fromLocation: String(scannedLocation || "").trim(),
          toLocation: String(toLocation || "").trim(),
          operator: getOperatorName(userInfo),
          items: scannedItems.map((scan) => ({
            productCode: scan.productCode,
            stockCode: scan.stockId,
            quantity: toNumber(scan.subQuantity),
          })),
          productMap,
          photos: transferPhotos.map((p) => p.metadata),
        });
      } catch (pdfError) {
        setErrorMsg(
          pdfError?.message ||
            "Transfer out succeeded but the PDF could not be stored.",
        );
      }

      setCompletedResult({
        workOrderId: result.workOrderId,
        pdfResult,
      });
      setSuccessMsg(
        t("transferOut.executeSuccess", { workOrderId: result.workOrderId }),
      );
      setScannedItems([]);
      setTransferPhotos([]);

      // Refresh the DO list so the transferred-out DO no longer appears.
      if (selectedDoId) {
        setSelectedDoId("");
        setSelectedDo(null);
        setDoItems([]);
        fetchEligibleTransferOutDeliveryOrders()
          .then((rows) => setDeliveryOrders(rows))
          .catch(() => setDeliveryOrders([]));
      }
    } catch (err) {
      setErrorMsg(err?.message || t("transferOut.executeFailed"));
    } finally {
      setBusy(false);
    }
  }, [
    canExecute,
    userInfo,
    scannedLocation,
    toLocation,
    selectedDoId,
    scannedItems,
    transferPhotos,
    productMap,
    t,
  ]);

  const handleReset = useCallback(() => {
    setScannedLocation("");
    setSelectedDoId("");
    setSelectedDo(null);
    setDoItems([]);
    setScannedItems([]);
    setTransferPhotos([]);
    setPendingProductChoice(null);
    setErrorMsg("");
    setSuccessMsg("");
    setCompletedResult(null);
  }, [setScannedLocation]);

  return {
    isPda,
    userInfo,

    helpOpen,
    setHelpOpen,

    operatorName: getOperatorName(userInfo),
    actionByLabel: getOperatorName(userInfo),

    deliveryOrders,
    dosLoading,
    selectedDoId,
    setSelectedDoId,
    selectedDo,
    doItems,

    scannedLocation,
    setScannedLocation,
    handleClearLocation,

    toLocation,

    productMap,

    scannedItems,
    handleScanSubmit,
    handleUpdateScan,
    handleRemoveScan,

    pendingProductChoice,
    handleSelectProduct,
    handleCancelProductChoice,

    transferPhotos,
    photoUploading,
    handleAddTransferPhoto,
    handleRemoveTransferPhoto,

    lineTotals,
    quantityWarnings,

    busy,
    errorMsg,
    setErrorMsg,
    successMsg,
    completedResult,
    canExecute,
    handleExecute,
    handleReset,
  };
}
