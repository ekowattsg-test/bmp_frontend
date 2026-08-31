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
import { fetchActiveWorkers } from "../helpers/stock_return_service";
import {
  executeAssetReturn,
  searchAssetReturnByCode,
} from "../helpers/asset_return_service";
import { generateAndStoreAssetReturnPdf } from "../helpers/asset_return_pdf_helper";
import { uploadFileToDrive } from "../helpers/file_helper";
import { resolveScannedValue } from "../helpers/camera_scanner_helper";
import { resolveStaffByScan } from "../helpers/staff_scan_helper";
import { getOperatorName, getUserLogin } from "../helpers/user_display_helper";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

/**
 * Shared hook for the Asset Return flow.
 *
 * Supports both desktop web and PDA. The user selects a returning worker,
 * scans/enters asset codes held by that worker, chooses a destination location,
 * and executes.
 */
export default function useAssetReturn() {
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

  const [returnFromStaffId, setReturnFromStaffId] = useState("");
  const [returnFromStaffName, setReturnFromStaffName] = useState("");
  const [activeStaffList, setActiveStaffList] = useState([]);

  const [productMap, setProductMap] = useState({});
  const [productIdToCodeMap, setProductIdToCodeMap] = useState({});

  const [scannedItems, setScannedItems] = useState([]);

  const [returnPhotos, setReturnPhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [pendingProductChoice, setPendingProductChoice] = useState(null);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [completedResult, setCompletedResult] = useState(null);

  // Load product map and active staff list on mount.
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

    fetchActiveWorkers()
      .then(setActiveStaffList)
      .catch(() => setActiveStaffList([]));
  }, []);

  const canExecute = useMemo(() => {
    if (!String(returnFromStaffId || "").trim()) return false;
    if (!String(returnLocation || "").trim()) return false;
    if (scannedItems.length === 0) return false;
    if (returnPhotos.length === 0) return false;
    return scannedItems.every(
      (scan) =>
        Number(scan.productId) > 0 &&
        String(scan.stockId || "").trim() &&
        toNumber(scan.subQuantity) > 0 &&
        toNumber(scan.subQuantity) <= toNumber(scan.returnable),
    );
  }, [returnFromStaffId, returnLocation, scannedItems, returnPhotos]);

  const handleClearLocation = useCallback(() => {
    setReturnLocation("");
  }, [setReturnLocation]);

  const handleScanWorker = useCallback(
    async (rawValue) => {
      const value = String(rawValue || "").trim();
      if (!value) return;
      setBusy(true);
      try {
        const staff = await resolveStaffByScan(value, activeStaffList);
        setReturnFromStaffId(staff.staffId);
        setReturnFromStaffName(staff.staffName);
        setErrorMsg("");
      } catch (err) {
        setErrorMsg(err?.message || t("assetReturn.invalidStaffQr", { value }));
      } finally {
        setBusy(false);
      }
    },
    [t, activeStaffList],
  );

  const handleClearWorker = useCallback(() => {
    setReturnFromStaffId("");
    setReturnFromStaffName("");
  }, []);

  const handleScanSubmit = useCallback(
    async (rawStockId) => {
      const rawValue = String(rawStockId || "").trim();
      if (!rawValue) return;

      const currentWorker = String(
        returnFromStaffName || returnFromStaffId || "",
      ).trim();
      if (!currentWorker) {
        setErrorMsg(t("assetReturn.workerRequired", { stockCode: rawValue }));
        return;
      }

      setBusy(true);
      try {
        const stockId = await resolveScannedValue(rawValue);
        if (!stockId) {
          setErrorMsg(
            t("assetReturn.stockNotRecognized", { stockCode: rawValue }),
          );
          return;
        }

        const existingIndex = scannedItems.findIndex(
          (item) => String(item.stockId || "").trim() === stockId,
        );
        if (existingIndex >= 0) {
          setErrorMsg(t("assetReturn.alreadyScanned", { stockCode: stockId }));
          return;
        }

        const matches = await searchAssetReturnByCode(stockId, currentWorker);

        if (matches.length === 0) {
          setErrorMsg(t("assetReturn.notHeldByWorker", { stockCode: stockId }));
          return;
        }

        if (matches[0].returnable <= 0) {
          setErrorMsg(
            t("assetReturn.noReturnableQuantity", { stockCode: stockId }),
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
        console.error("[AssetReturn] searchAssetReturnByCode failed:", err);
        setErrorMsg(
          err?.message ||
            t("assetReturn.lookupFailed", { stockCode: rawValue }),
        );
      } finally {
        setBusy(false);
      }
    },
    [scannedItems, returnFromStaffId, t],
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
        setErrorMsg(t("assetReturn.photoUploadFailed"));
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
      setScannedItems((prev) => {
        const exists = prev.some(
          (item) =>
            String(item.stockId || "").trim() ===
              String(stockId || "").trim() &&
            String(item.productId) === String(product.productId),
        );
        if (exists) return prev;
        if (product.returnable <= 0) {
          setErrorMsg(
            t("assetReturn.noReturnableQuantity", { stockCode: stockId }),
          );
          return prev;
        }
        return [
          ...prev,
          {
            productId: product.productId,
            productCode: product.productCode,
            stockId,
            stockCode: product.stockCode || stockId,
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
      const workerId = String(returnFromStaffId || "").trim();
      if (!operatorName || !userLogin) {
        throw new Error(t("assetReturn.unknownUser"));
      }
      if (!workerId) {
        throw new Error(t("assetReturn.workerRequired"));
      }

      const result = await executeAssetReturn({
        toLocation: String(returnLocation || "").trim(),
        returnFromStaffId: workerId,
        returnFromStaffName: returnFromStaffName || workerId,
        scannedItems: scannedItems.map((scan) => ({
          productId: scan.productId,
          productCode: scan.productCode,
          stockId: String(scan.stockId || "").trim(),
          subQuantity: toNumber(scan.subQuantity),
        })),
        photos: returnPhotos.map((p) => p.metadata),
        issuedBy: operatorName,
      });

      let pdfResult = null;
      try {
        pdfResult = await generateAndStoreAssetReturnPdf({
          companyId: String(userInfo?.companyId || "").trim(),
          workOrderId: result.workOrderId,
          fromLocation: returnFromStaffName || workerId,
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
        setErrorMsg(pdfError?.message || t("assetReturn.pdfFailed"));
      }

      setCompletedResult({
        workOrderId: result.workOrderId,
        pdfResult,
      });
      setSuccessMsg(
        t("assetReturn.completed", { workOrderId: result.workOrderId }),
      );
      setScannedItems([]);
      setReturnPhotos([]);
      setReturnLocation("");
    } catch (err) {
      setErrorMsg(err?.message || t("assetReturn.executeFailed"));
    } finally {
      setBusy(false);
    }
  }, [
    canExecute,
    isPda,
    userInfo,
    returnLocation,
    returnFromStaffId,
    returnFromStaffName,
    scannedItems,
    returnPhotos,
    productMap,
    t,
  ]);

  const handleReset = useCallback(() => {
    setReturnLocation("");
    setReturnFromStaffId("");
    setReturnFromStaffName("");
    setScannedItems([]);
    setReturnPhotos([]);
    setPendingProductChoice(null);
    setErrorMsg("");
    setSuccessMsg("");
    setCompletedResult(null);
  }, [setReturnLocation]);

  return {
    isPda,
    userInfo,

    // Header/help
    helpOpen,
    setHelpOpen,

    // User
    operatorName: getOperatorName(userInfo),
    actionByLabel: getOperatorName(userInfo),

    // Returning worker
    returnFromStaffId,
    returnFromStaffName,
    handleScanWorker,
    handleClearWorker,

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
