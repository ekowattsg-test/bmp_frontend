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
  executeStockIssue,
  searchStockByCode,
} from "../helpers/stock_issue_service";
import { generateAndStoreIssuePdf } from "../helpers/issue_pdf_helper";
import { uploadFileToDrive } from "../helpers/file_helper";
import { resolveScannedValue } from "../helpers/camera_scanner_helper";
import {
  fetchActiveStaffList,
  resolveStaffByScan,
} from "../helpers/staff_scan_helper";
import { getOperatorName, getUserLogin } from "../helpers/user_display_helper";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

/**
 * Shared hook for the Stock Issue (Drawing) flow.
 *
 * Supports both desktop web and PDA. The user selects a source location,
 * scans/enters stock codes, chooses a worker to issue to, and executes.
 */
export default function useStockIssue() {
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

  const [scannedLocation, setScannedLocationState] = useState("");
  const scannedLocationRef = useRef("");

  const setScannedLocation = useCallback((code) => {
    const value = String(code || "").trim();
    setScannedLocationState(value);
    scannedLocationRef.current = value;
  }, []);

  const [recipientStaffId, setRecipientStaffId] = useState("");
  const [recipientStaffName, setRecipientStaffName] = useState("");
  const [activeStaffList, setActiveStaffList] = useState([]);

  const [productMap, setProductMap] = useState({});
  const [codeToProductId, setCodeToProductId] = useState({});
  const [productCategoryMap, setProductCategoryMap] = useState({});
  const [productIdToCodeMap, setProductIdToCodeMap] = useState({});

  const [scannedItems, setScannedItems] = useState([]);

  const [issuePhotos, setIssuePhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [pendingProductChoice, setPendingProductChoice] = useState(null);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [completedResult, setCompletedResult] = useState(null);

  // Load product map, valid location codes, and active staff list on mount.
  useEffect(() => {
    request("GET", "/api/products")
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        const nameMap = {};
        const idMap = {};
        const categoryMap = {};
        const idToCodeMap = {};
        list.forEach((p) => {
          const productCode = String(p.productCode || "");
          nameMap[productCode] =
            p.productName || p.commonName || p.productCode || "";
          idMap[productCode] = p.productId;
          categoryMap[productCode] = String(
            p.productCategory || "",
          ).toUpperCase();
          idToCodeMap[String(p.productId)] = productCode;
        });
        setProductMap(nameMap);
        setCodeToProductId(idMap);
        setProductCategoryMap(categoryMap);
        setProductIdToCodeMap(idToCodeMap);
      })
      .catch(() => {
        setProductMap({});
        setCodeToProductId({});
        setProductCategoryMap({});
        setProductIdToCodeMap({});
      });

    fetchActiveStaffList()
      .then(setActiveStaffList)
      .catch(() => setActiveStaffList([]));
  }, []);

  const canExecute = useMemo(() => {
    if (!String(scannedLocation || "").trim()) return false;
    if (!String(recipientStaffId || "").trim()) return false;
    if (scannedItems.length === 0) return false;
    if (issuePhotos.length === 0) return false;
    return scannedItems.every(
      (scan) =>
        Number(scan.productId) > 0 &&
        String(scan.stockId || "").trim() &&
        toNumber(scan.subQuantity) > 0 &&
        toNumber(scan.subQuantity) <= toNumber(scan.available),
    );
  }, [scannedLocation, recipientStaffId, scannedItems, issuePhotos]);

  const handleClearLocation = useCallback(() => {
    setScannedLocation("");
  }, [setScannedLocation]);

  const handleScanRecipient = useCallback(
    async (rawValue) => {
      const value = String(rawValue || "").trim();
      if (!value) return;
      setBusy(true);
      try {
        const staff = await resolveStaffByScan(value, activeStaffList);
        setRecipientStaffId(staff.staffId);
        setRecipientStaffName(staff.staffName);
        setErrorMsg("");
      } catch (err) {
        setErrorMsg(err?.message || t("stockIssue.invalidStaffQr", { value }));
      } finally {
        setBusy(false);
      }
    },
    [t, activeStaffList],
  );

  const handleClearRecipient = useCallback(() => {
    setRecipientStaffId("");
    setRecipientStaffName("");
  }, []);

  const handleScanSubmit = useCallback(
    async (rawStockId) => {
      const rawValue = String(rawStockId || "").trim();
      if (!rawValue) return;

      const currentLocation = String(scannedLocationRef.current || "").trim();
      if (!currentLocation) {
        setErrorMsg(t("stockIssue.locationRequired", { stockCode: rawValue }));
        return;
      }

      setBusy(true);
      try {
        const stockId = await resolveScannedValue(rawValue);
        if (!stockId) {
          setErrorMsg(`Stock code ${rawValue} is not recognized.`);
          return;
        }

        const existingIndex = scannedItems.findIndex(
          (item) => String(item.stockId || "").trim() === stockId,
        );
        if (existingIndex >= 0) {
          setErrorMsg(`Stock code ${stockId} has already been scanned.`);
          return;
        }

        const matches = await searchStockByCode(stockId, currentLocation, {
          allowedProductCategories: ["C"],
        });

        if (matches.length === 0) {
          setErrorMsg(
            t("stockIssue.notInventoryProduct", { stockCode: stockId }),
          );
          return;
        }

        if (matches.length === 1) {
          const stock = matches[0];
          const available = stock.availability?.available ?? 0;
          if (available <= 0) {
            setErrorMsg(
              `Stock code ${stockId} has no available quantity at location ${currentLocation}.`,
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
        console.error("[StockIssue] searchStockByCode failed:", err);
        setErrorMsg(err?.message || `Stock code ${rawValue} lookup failed.`);
      } finally {
        setBusy(false);
      }
    },
    [scannedItems],
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

  const handleAddIssuePhoto = useCallback(async (file) => {
    const localUrl = URL.createObjectURL(file);
    setPhotoUploading(true);
    try {
      const metadata = await uploadFileToDrive(file, null, null);
      setIssuePhotos((prev) => [...prev, { localUrl, metadata }]);
      setErrorMsg("");
    } catch {
      URL.revokeObjectURL(localUrl);
      setErrorMsg("Failed to upload issue photo.");
    } finally {
      setPhotoUploading(false);
    }
  }, []);

  const handleRemoveIssuePhoto = useCallback((idx) => {
    setIssuePhotos((prev) => {
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
      const productCode = productIdToCodeMap[String(product.productId)];
      const category = productCategoryMap[productCode];
      if (category !== "C") {
        setErrorMsg(
          t("stockIssue.notInventoryProduct", { stockCode: stockId }),
        );
        return;
      }
      const available = product.availability?.available ?? 0;
      if (available <= 0) {
        setErrorMsg(
          `Stock code ${stockId} has no available quantity at location ${scannedLocation}.`,
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

  const handleExecute = useCallback(async () => {
    if (!canExecute) return;

    setBusy(true);
    setErrorMsg("");
    setSuccessMsg("");
    setCompletedResult(null);

    try {
      const operatorName = getOperatorName(userInfo);
      const userLogin = getUserLogin(userInfo);
      const recipientId = String(recipientStaffId || "").trim();
      if (!operatorName || !userLogin) {
        throw new Error("Unable to determine the current user.");
      }
      if (!recipientId) {
        throw new Error(t("stockIssue.recipientRequired"));
      }

      const result = await executeStockIssue({
        fromLocation: String(scannedLocation || "").trim(),
        workByStaffId: recipientId,
        workByStaffName: recipientStaffName || recipientId,
        scannedItems: scannedItems.map((scan) => ({
          productId: scan.productId,
          productCode: scan.productCode,
          stockId: String(scan.stockId || "").trim(),
          subQuantity: toNumber(scan.subQuantity),
        })),
        photos: issuePhotos.map((p) => p.metadata),
        issuedBy: operatorName,
      });

      let pdfResult = null;
      try {
        pdfResult = await generateAndStoreIssuePdf({
          companyId: String(userInfo?.companyId || "").trim(),
          workOrderId: result.workOrderId,
          fromLocation: String(scannedLocation || "").trim(),
          toLocation: recipientStaffName || recipientId,
          operator: operatorName,
          items: scannedItems.map((scan) => ({
            productCode: scan.productCode,
            stockCode: scan.stockId,
            quantity: toNumber(scan.subQuantity),
          })),
          productMap,
          photos: issuePhotos.map((p) => p.metadata),
        });
      } catch (pdfError) {
        setErrorMsg(
          pdfError?.message ||
            "Issue succeeded but the PDF could not be stored.",
        );
      }

      setCompletedResult({
        workOrderId: result.workOrderId,
        pdfResult,
      });
      setSuccessMsg(
        `Issue completed. Work order ${result.workOrderId} created.`,
      );
      setScannedItems([]);
      setIssuePhotos([]);
      setScannedLocation("");
    } catch (err) {
      setErrorMsg(
        err?.message ||
          "Failed to execute stock issue. No stock movements were recorded.",
      );
    } finally {
      setBusy(false);
    }
  }, [
    canExecute,
    isPda,
    userInfo,
    scannedLocation,
    recipientStaffId,
    scannedItems,
    issuePhotos,
    productMap,
    t,
  ]);

  const handleReset = useCallback(() => {
    setScannedLocation("");
    setRecipientStaffId("");
    setRecipientStaffName("");
    setScannedItems([]);
    setIssuePhotos([]);
    setPendingProductChoice(null);
    setErrorMsg("");
    setSuccessMsg("");
    setCompletedResult(null);
  }, [setScannedLocation]);

  return {
    isPda,
    userInfo,

    // Header/help
    helpOpen,
    setHelpOpen,

    // User
    operatorName: getOperatorName(userInfo),
    actionByLabel: getOperatorName(userInfo),

    // Location
    scannedLocation,
    setScannedLocation,
    handleClearLocation,

    // Recipient
    recipientStaffId,
    recipientStaffName,
    handleScanRecipient,
    handleClearRecipient,

    // Products
    productMap,
    codeToProductId,

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
    issuePhotos,
    photoUploading,
    handleAddIssuePhoto,
    handleRemoveIssuePhoto,

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
