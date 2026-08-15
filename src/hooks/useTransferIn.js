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
  executeTransferIn,
  fetchEligibleTransferInDeliveryOrders,
  resolveDeliveryOrderItems,
} from "../helpers/transfer_service";
import { generateAndStoreTransferInPdf } from "../helpers/transfer_pdf_helper";
import {
  fetchValidLocationCodes,
  resolveLocationByGps,
  resolveLocationByScan,
} from "../helpers/location_scan_helper";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getOperatorName = (info) => {
  if (!info) return "";
  return (
    String(info.staffName || "").trim() ||
    `${info.firstName ?? ""} ${info.lastName ?? ""}`.trim() ||
    getUserLogin(info)
  );
};

const getUserLogin = (info) => {
  return String(info?.login || info?.userName || "").trim();
};

export default function useTransferIn() {
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

  const [fromLocation, setFromLocation] = useState("");
  const fromLocationRef = useRef("");
  const [locationGpsBusy, setLocationGpsBusy] = useState(false);
  const [locationGpsFailed, setLocationGpsFailed] = useState(false);
  const [validLocationCodes, setValidLocationCodes] = useState({
    projectCodes: [],
    inventoryLocations: [],
    all: [],
  });

  const [productMap, setProductMap] = useState({});
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
        const idToCodeMap = {};
        list.forEach((p) => {
          const productCode = String(p.productCode || "");
          nameMap[productCode] =
            p.productName || p.commonName || p.productCode || "";
          idToCodeMap[String(p.productId)] = productCode;
        });
        setProductMap(nameMap);
        setProductIdToCodeMap(idToCodeMap);
      })
      .catch(() => {
        setProductMap({});
        setProductIdToCodeMap({});
      });

    fetchValidLocationCodes()
      .then((codes) => {
        setValidLocationCodes(codes);
        return codes;
      })
      .catch(() => {
        setValidLocationCodes({
          projectCodes: [],
          inventoryLocations: [],
          all: [],
        });
        return { projectCodes: [], inventoryLocations: [], all: [] };
      })
      .then((codes) => {
        setLocationGpsBusy(true);
        return resolveLocationByGps(codes.projectCodes)
          .then((code) => {
            if (code) {
              setFromLocation(code);
              fromLocationRef.current = code;
            } else {
              setLocationGpsFailed(true);
            }
          })
          .catch(() => setLocationGpsFailed(true))
          .finally(() => setLocationGpsBusy(false));
      });

    setDosLoading(true);
    fetchEligibleTransferInDeliveryOrders()
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
        received: 0,
      };
    });
    scannedItems.forEach((scan) => {
      const entry = totals[scan.productCode];
      if (entry) {
        entry.received += toNumber(scan.subQuantity);
      }
    });
    return totals;
  }, [doItems, scannedItems]);

  const quantityWarnings = useMemo(() => {
    const warnings = [];
    Object.entries(lineTotals).forEach(([productCode, total]) => {
      if (total.received !== total.ordered && total.received > 0) {
        warnings.push({
          productCode,
          productName: productMap[productCode] || productCode,
          ordered: total.ordered,
          received: total.received,
        });
      }
    });
    return warnings;
  }, [lineTotals, productMap]);

  const canExecute = useMemo(() => {
    if (!String(fromLocation || "").trim()) return false;
    if (scannedItems.length === 0) return false;
    if (transferPhotos.length === 0) return false;
    if (quantityWarnings.length > 0) return false;
    return scannedItems.every(
      (scan) =>
        Number(scan.productId) > 0 &&
        String(scan.stockId || "").trim() &&
        toNumber(scan.subQuantity) > 0,
    );
  }, [fromLocation, scannedItems, transferPhotos, quantityWarnings]);

  const handleAutoDetectLocation = useCallback(async () => {
    setLocationGpsBusy(true);
    setLocationGpsFailed(false);
    setErrorMsg("");
    try {
      const code = await resolveLocationByGps(validLocationCodes.projectCodes);
      if (code) {
        setFromLocation(code);
        fromLocationRef.current = code;
      } else {
        setLocationGpsFailed(true);
      }
    } catch {
      setLocationGpsFailed(true);
    } finally {
      setLocationGpsBusy(false);
    }
  }, [validLocationCodes.projectCodes]);

  const handleScanLocation = useCallback(
    async (rawValue) => {
      const value = String(rawValue || "").trim();
      if (!value) return;
      setBusy(true);
      try {
        const code = await resolveLocationByScan(value, validLocationCodes);
        setFromLocation(code);
        fromLocationRef.current = code;
        setErrorMsg("");
      } catch (err) {
        setErrorMsg(
          err?.message ||
            t("transferIn.invalidFromLocationCode", { code: value }),
        );
      } finally {
        setBusy(false);
      }
    },
    [validLocationCodes, t],
  );

  const handleClearLocation = useCallback(() => {
    setFromLocation("");
    fromLocationRef.current = "";
    setLocationGpsFailed(false);
  }, []);

  const handleScanFromLocation = useCallback(
    async (rawValue) => {
      const value = String(rawValue || "").trim();
      if (!value) return;
      setBusy(true);
      try {
        const code = await resolveLocationByScan(value, validLocationCodes);
        setFromLocation(code);
        fromLocationRef.current = code;
        setErrorMsg("");
      } catch (err) {
        setErrorMsg(
          err?.message ||
            t("transferIn.invalidFromLocationCode", { code: value }),
        );
      } finally {
        setBusy(false);
      }
    },
    [validLocationCodes, t],
  );

  const handleClearFromLocation = useCallback(() => {
    setFromLocation("");
    fromLocationRef.current = "";
  }, []);

  const handleScanSubmit = useCallback(
    async (rawStockId) => {
      const rawValue = String(rawStockId || "").trim();
      if (!rawValue) return;

      const currentLocation = String(fromLocationRef.current || "").trim();
      if (!currentLocation) {
        setErrorMsg(
          t("transferIn.fromLocationRequired", { stockCode: rawValue }),
        );
        return;
      }

      setBusy(true);
      try {
        const stockId = await resolveScannedValue(rawValue);
        if (!stockId) {
          setErrorMsg(
            t("transferIn.unrecognizedStockCode", { stockCode: rawValue }),
          );
          return;
        }

        const existingIndex = scannedItems.findIndex(
          (item) => String(item.stockId || "").trim() === stockId,
        );
        if (existingIndex >= 0) {
          setErrorMsg(t("transferIn.alreadyScanned", { stockCode: stockId }));
          return;
        }

        // For transfer in, the stock may not exist at destination yet, so we
        // only validate by DO line product code if a DO is selected.
        let productCode = null;
        let productId = null;

        if (selectedDoId && doItems.length > 0) {
          // Try to find a matching DO line by stock code lookup first.
          const response = await request(
            "GET",
            `/api/stocks/search?stockCode=${encodeURIComponent(stockId)}`,
            null,
            { skipBackendErrorDialog: true },
          );
          const stock = response?.data;
          const foundProductId = Number(stock?.productId);
          if (Number.isFinite(foundProductId) && foundProductId > 0) {
            const foundCode = productIdToCodeMap[String(foundProductId)];
            const matchingItem = doItems.find(
              (item) => item.productCode === foundCode,
            );
            if (matchingItem) {
              productCode = matchingItem.productCode;
              productId = matchingItem.productId;
            }
          }

          if (!productCode) {
            setErrorMsg(
              t("transferIn.stockNotInDeliveryOrder", { stockCode: stockId }),
            );
            return;
          }
        } else {
          // No DO selected: require stock lookup to identify product.
          const response = await request(
            "GET",
            `/api/stocks/search?stockCode=${encodeURIComponent(stockId)}`,
            null,
            { skipBackendErrorDialog: true },
          );
          const stock = response?.data;
          const foundProductId = Number(stock?.productId);
          if (Number.isFinite(foundProductId) && foundProductId > 0) {
            productCode = productIdToCodeMap[String(foundProductId)];
            productId = foundProductId;
          }
        }

        if (!productCode || !productId) {
          setErrorMsg(
            t("transferIn.unrecognizedStockCode", { stockCode: stockId }),
          );
          return;
        }

        setScannedItems((prev) => [
          ...prev,
          {
            productId,
            productCode,
            stockId,
            subQuantity: 1,
            available: Number.POSITIVE_INFINITY,
          },
        ]);
        setErrorMsg("");
      } catch (err) {
        console.error("[TransferIn] scan failed:", err);
        setErrorMsg(
          err?.message || t("transferIn.lookupFailed", { stockCode: rawValue }),
        );
      } finally {
        setBusy(false);
      }
    },
    [scannedItems, selectedDoId, doItems, productIdToCodeMap, t],
  );

  const handleUpdateScan = useCallback((index, field, value) => {
    if (field === "subQuantity") {
      const newQty = toNumber(value);
      setScannedItems((prev) =>
        prev.map((item, idx) =>
          idx === index ? { ...item, subQuantity: Math.max(newQty, 1) } : item,
        ),
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
      const userLogin = getUserLogin(userInfo);
      if (!userLogin) {
        throw new Error("Unable to determine the current user.");
      }

      const result = await executeTransferIn({
        fromLocation: String(fromLocation || "").trim(),
        toLocation: String(toLocation || "").trim(),
        doId: selectedDoId || undefined,
        scannedItems: scannedItems.map((scan) => ({
          productId: scan.productId,
          productCode: scan.productCode,
          stockId: String(scan.stockId || "").trim(),
          subQuantity: toNumber(scan.subQuantity),
        })),
        photos: transferPhotos.map((p) => p.metadata),
        issuedBy: userLogin,
        workByStaffId: userLogin,
        description: selectedDoId
          ? `Transfer in for ${selectedDoId}`
          : "Transfer stock in",
      });

      let pdfResult = null;
      try {
        pdfResult = await generateAndStoreTransferInPdf({
          companyId: String(userInfo?.companyId || "").trim(),
          workOrderId: result.workOrderId,
          doId: selectedDoId || undefined,
          fromLocation: String(fromLocation || "").trim(),
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
            "Transfer in succeeded but the PDF could not be stored.",
        );
      }

      setCompletedResult({
        workOrderId: result.workOrderId,
        pdfResult,
      });
      setSuccessMsg(
        t("transferIn.executeSuccess", { workOrderId: result.workOrderId }),
      );
      setScannedItems([]);
      setTransferPhotos([]);

      // Refresh the DO list so the received DO no longer appears.
      if (selectedDoId) {
        setSelectedDoId("");
        setSelectedDo(null);
        setDoItems([]);
        fetchEligibleTransferInDeliveryOrders()
          .then((rows) => setDeliveryOrders(rows))
          .catch(() => setDeliveryOrders([]));
      }
    } catch (err) {
      setErrorMsg(err?.message || t("transferIn.executeFailed"));
    } finally {
      setBusy(false);
    }
  }, [
    canExecute,
    userInfo,
    fromLocation,
    toLocation,
    selectedDoId,
    scannedItems,
    transferPhotos,
    productMap,
    t,
  ]);

  const handleReset = useCallback(() => {
    setSelectedDoId("");
    setSelectedDo(null);
    setDoItems([]);
    setFromLocation("");
    fromLocationRef.current = "";
    setLocationGpsFailed(false);
    setScannedItems([]);
    setTransferPhotos([]);
    setPendingProductChoice(null);
    setErrorMsg("");
    setSuccessMsg("");
    setCompletedResult(null);
  }, []);

  return {
    isPda,
    userInfo,

    helpOpen,
    setHelpOpen,

    operatorName: getOperatorName(userInfo),
    actionByLabel: getUserLogin(userInfo),

    deliveryOrders,
    dosLoading,
    selectedDoId,
    setSelectedDoId,
    selectedDo,
    doItems,

    fromLocation,
    handleScanFromLocation,
    handleClearFromLocation,

    toLocation,

    locationGpsBusy,
    locationGpsFailed,
    handleAutoDetectLocation,
    handleScanLocation,
    handleClearLocation,

    productMap,

    scannedItems,
    handleScanSubmit,
    handleUpdateScan,
    handleRemoveScan,

    pendingProductChoice,
    handleSelectProduct: () => {},
    handleCancelProductChoice: () => setPendingProductChoice(null),

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
