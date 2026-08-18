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
  executeStockDisposal,
  searchDisposalStockByCode,
} from "../helpers/stock_disposal_service";
import { generateAndStoreDisposalPdf } from "../helpers/disposal_pdf_helper";
import { uploadFileToDrive } from "../helpers/file_helper";
import { resolveScannedValue } from "../helpers/camera_scanner_helper";
import { getOperatorName } from "../helpers/user_display_helper";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const REASON_OPTIONS = ["Damaged", "Expired", "Obsolete", "Other"];
const METHOD_OPTIONS = ["Destroy", "Scrap", "Donate", "Other"];

/**
 * Shared hook for the Stock Disposal flow.
 *
 * Supports both desktop web and PDA. The user selects a source location,
 * scans/enters stock codes at that location, chooses a disposal reason and
 * method, and executes.
 */
export default function useStockDisposal() {
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

  const [fromLocation, setFromLocationState] = useState("");
  const fromLocationRef = useRef("");

  const setFromLocation = useCallback((code) => {
    const value = String(code || "").trim();
    setFromLocationState(value);
    fromLocationRef.current = value;
  }, []);

  const [disposalReason, setDisposalReason] = useState("");
  const [disposalMethod, setDisposalMethod] = useState("");

  const [productMap, setProductMap] = useState({});
  const [productIdToCodeMap, setProductIdToCodeMap] = useState({});

  const [scannedItems, setScannedItems] = useState([]);

  const [disposalPhotos, setDisposalPhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [pendingProductChoice, setPendingProductChoice] = useState(null);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [completedResult, setCompletedResult] = useState(null);

  // Load product map on mount.
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
  }, []);

  const canExecute = useMemo(() => {
    if (!String(fromLocation || "").trim()) return false;
    if (!String(disposalReason || "").trim()) return false;
    if (!String(disposalMethod || "").trim()) return false;
    if (scannedItems.length === 0) return false;
    if (disposalPhotos.length === 0) return false;
    return scannedItems.every(
      (scan) =>
        Number(scan.productId) > 0 &&
        String(scan.stockId || "").trim() &&
        toNumber(scan.subQuantity) > 0 &&
        toNumber(scan.subQuantity) <= toNumber(scan.available),
    );
  }, [
    fromLocation,
    disposalReason,
    disposalMethod,
    scannedItems,
    disposalPhotos,
  ]);

  const handleClearLocation = useCallback(() => {
    setFromLocation("");
  }, [setFromLocation]);

  const handleScanSubmit = useCallback(
    async (rawStockId) => {
      const rawValue = String(rawStockId || "").trim();
      if (!rawValue) return;

      const currentLocation = String(fromLocation || "").trim();
      if (!currentLocation) {
        setErrorMsg(t("stockDisposal.locationRequired"));
        return;
      }

      setBusy(true);
      try {
        const stockId = await resolveScannedValue(rawValue);
        if (!stockId) {
          setErrorMsg(
            t("stockDisposal.stockNotRecognized", { stockCode: rawValue }),
          );
          return;
        }

        const existingIndex = scannedItems.findIndex(
          (item) => String(item.stockId || "").trim() === stockId,
        );
        if (existingIndex >= 0) {
          setErrorMsg(
            t("stockDisposal.alreadyScanned", { stockCode: stockId }),
          );
          return;
        }

        const matches = await searchDisposalStockByCode(
          stockId,
          currentLocation,
        );

        if (matches.length === 0) {
          setErrorMsg(
            t("stockDisposal.stockNotFoundAtLocation", { stockCode: stockId }),
          );
          return;
        }

        if (matches[0].availability?.current <= 0) {
          setErrorMsg(
            t("stockDisposal.noAvailableQuantity", { stockCode: stockId }),
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
              available: stock.availability?.current || 0,
            },
          ]);
          setErrorMsg("");
          return;
        }

        setPendingProductChoice({ stockId, options: matches });
      } catch (err) {
        console.error("[StockDisposal] searchDisposalStockByCode failed:", err);
        setErrorMsg(
          err?.message ||
            t("stockDisposal.lookupFailed", { stockCode: rawValue }),
        );
      } finally {
        setBusy(false);
      }
    },
    [scannedItems, fromLocation, t],
  );

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

  const handleAddDisposalPhoto = useCallback(
    async (file) => {
      const localUrl = URL.createObjectURL(file);
      setPhotoUploading(true);
      try {
        const metadata = await uploadFileToDrive(file, null, null);
        setDisposalPhotos((prev) => [...prev, { localUrl, metadata }]);
        setErrorMsg("");
      } catch {
        URL.revokeObjectURL(localUrl);
        setErrorMsg(t("stockDisposal.photoUploadFailed"));
      } finally {
        setPhotoUploading(false);
      }
    },
    [t],
  );

  const handleRemoveDisposalPhoto = useCallback((idx) => {
    setDisposalPhotos((prev) => {
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
        const available = product.availability?.current || 0;
        if (available <= 0) {
          setErrorMsg(
            t("stockDisposal.noAvailableQuantity", { stockCode: stockId }),
          );
          return prev;
        }
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
      if (!operatorName) {
        throw new Error(t("stockDisposal.unknownUser"));
      }

      const result = await executeStockDisposal({
        fromLocation: String(fromLocation || "").trim(),
        disposedBy: operatorName,
        disposalReason: String(disposalReason || "").trim(),
        disposalMethod: String(disposalMethod || "").trim(),
        scannedItems: scannedItems.map((scan) => ({
          productId: scan.productId,
          productCode: scan.productCode,
          stockId: String(scan.stockId || "").trim(),
          subQuantity: toNumber(scan.subQuantity),
        })),
        photos: disposalPhotos.map((p) => p.metadata),
      });

      let pdfResult = null;
      try {
        pdfResult = await generateAndStoreDisposalPdf({
          companyId: String(userInfo?.companyId || "").trim(),
          disposalId: result.disposalId,
          workOrderId: result.workOrderId,
          location: String(fromLocation || "").trim(),
          disposedBy: operatorName,
          disposalReason: String(disposalReason || "").trim(),
          disposalMethod: String(disposalMethod || "").trim(),
          items: scannedItems.map((scan) => ({
            productCode: scan.productCode,
            stockCode: scan.stockId,
            quantity: toNumber(scan.subQuantity),
          })),
          productMap,
          photos: disposalPhotos.map((p) => p.metadata),
        });
      } catch (pdfError) {
        setErrorMsg(pdfError?.message || t("stockDisposal.pdfFailed"));
      }

      setCompletedResult({
        disposalId: result.disposalId,
        workOrderId: result.workOrderId,
        pdfResult,
      });
      setSuccessMsg(
        t("stockDisposal.completed", {
          disposalId: result.disposalId,
          workOrderId: result.workOrderId,
        }),
      );
      setScannedItems([]);
      setDisposalPhotos([]);
      setFromLocation("");
      setDisposalReason("");
      setDisposalMethod("");
    } catch (err) {
      setErrorMsg(err?.message || t("stockDisposal.executeFailed"));
    } finally {
      setBusy(false);
    }
  }, [
    canExecute,
    userInfo,
    fromLocation,
    disposalReason,
    disposalMethod,
    scannedItems,
    disposalPhotos,
    productMap,
    t,
  ]);

  const handleReset = useCallback(() => {
    setFromLocation("");
    setDisposalReason("");
    setDisposalMethod("");
    setScannedItems([]);
    setDisposalPhotos([]);
    setPendingProductChoice(null);
    setErrorMsg("");
    setSuccessMsg("");
    setCompletedResult(null);
  }, [setFromLocation]);

  return {
    isPda,
    userInfo,

    // Header/help
    helpOpen,
    setHelpOpen,

    // User
    operatorName: getOperatorName(userInfo),
    actionByLabel: getOperatorName(userInfo),

    // Source location
    fromLocation,
    setFromLocation,
    handleClearLocation,

    // Disposal reason/method
    disposalReason,
    setDisposalReason,
    disposalMethod,
    setDisposalMethod,
    reasonOptions: REASON_OPTIONS,
    methodOptions: METHOD_OPTIONS,

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
    disposalPhotos,
    photoUploading,
    handleAddDisposalPhoto,
    handleRemoveDisposalPhoto,

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
