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
import {
  executeAssetAssignment,
  searchAssetByCode,
} from "../helpers/asset_assignment_service";
import { generateAndStoreAssignmentPdf } from "../helpers/assignment_pdf_helper";
import { uploadFileToDrive } from "../helpers/file_helper";
import {
  fetchValidLocationCodes,
  resolveLocationByGps,
  resolveLocationByScan,
} from "../helpers/location_scan_helper";
import {
  fetchActiveStaffList,
  resolveStaffByScan,
} from "../helpers/staff_scan_helper";

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

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

/**
 * Shared hook for the Asset Assignment (Allocating) flow.
 */
export default function useAssetAssignment() {
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

  const [scannedLocation, setScannedLocation] = useState("");
  const scannedLocationRef = useRef("");

  const [locationGpsBusy, setLocationGpsBusy] = useState(false);
  const [locationGpsFailed, setLocationGpsFailed] = useState(false);
  const [validLocationCodes, setValidLocationCodes] = useState({
    projectCodes: [],
    inventoryLocations: [],
    all: [],
  });

  const [recipientStaffId, setRecipientStaffId] = useState("");
  const [recipientStaffName, setRecipientStaffName] = useState("");
  const [activeStaffList, setActiveStaffList] = useState([]);

  const [productMap, setProductMap] = useState({});
  const [productCategoryMap, setProductCategoryMap] = useState({});
  const [productIdToCodeMap, setProductIdToCodeMap] = useState({});

  const [scannedItems, setScannedItems] = useState([]);
  const [pendingProductChoice, setPendingProductChoice] = useState(null);

  const [assignmentPhotos, setAssignmentPhotos] = useState([]);
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
              setScannedLocation(code);
              scannedLocationRef.current = code;
            } else {
              setLocationGpsFailed(true);
            }
          })
          .catch(() => setLocationGpsFailed(true))
          .finally(() => setLocationGpsBusy(false));
      });

    fetchActiveStaffList()
      .then(setActiveStaffList)
      .catch(() => setActiveStaffList([]));
  }, []);

  const canExecute = useMemo(() => {
    if (!String(scannedLocation || "").trim()) return false;
    if (!String(recipientStaffId || "").trim()) return false;
    if (scannedItems.length === 0) return false;
    if (assignmentPhotos.length === 0) return false;
    return scannedItems.every(
      (scan) =>
        Number(scan.productId) > 0 &&
        String(scan.stockId || "").trim() &&
        toNumber(scan.subQuantity) > 0 &&
        toNumber(scan.subQuantity) <= toNumber(scan.available),
    );
  }, [scannedLocation, recipientStaffId, scannedItems, assignmentPhotos]);

  const handleAutoDetectLocation = useCallback(async () => {
    setLocationGpsBusy(true);
    setLocationGpsFailed(false);
    setErrorMsg("");
    try {
      const code = await resolveLocationByGps(validLocationCodes.projectCodes);
      if (code) {
        setScannedLocation(code);
        scannedLocationRef.current = code;
        setLocationGpsFailed(false);
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
        setScannedLocation(code);
        scannedLocationRef.current = code;
        setErrorMsg("");
      } catch (err) {
        setErrorMsg(
          err?.message ||
            t("assetAssignment.invalidLocationCode", { code: value }),
        );
      } finally {
        setBusy(false);
      }
    },
    [t, validLocationCodes],
  );

  const handleClearLocation = useCallback(() => {
    setScannedLocation("");
    scannedLocationRef.current = "";
    setLocationGpsFailed(false);
  }, []);

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
        setErrorMsg(
          err?.message || t("assetAssignment.invalidStaffQr", { value }),
        );
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
        setErrorMsg(
          t("assetAssignment.locationRequired", { stockCode: rawValue }),
        );
        return;
      }
      if (!recipientStaffId) {
        setErrorMsg(
          t("assetAssignment.recipientRequired", { stockCode: rawValue }),
        );
        return;
      }

      setBusy(true);
      try {
        const stockId = await resolveScannedValue(rawValue);
        if (!stockId) {
          setErrorMsg(`Asset code ${rawValue} is not recognized.`);
          return;
        }

        const existingIndex = scannedItems.findIndex(
          (item) => String(item.stockId || "").trim() === stockId,
        );
        if (existingIndex >= 0) {
          setErrorMsg(`Asset code ${stockId} has already been scanned.`);
          return;
        }

        const matches = await searchAssetByCode(stockId, currentLocation, {
          allowedProductCategories: ["A"],
        });

        if (matches.length === 0) {
          setErrorMsg(
            t("assetAssignment.notAssetProduct", { stockCode: stockId }),
          );
          return;
        }

        if (matches.length === 1) {
          const stock = matches[0];
          const available = stock.availability?.available ?? 0;
          if (available <= 0) {
            setErrorMsg(
              `Asset code ${stockId} has no available quantity at location ${currentLocation}.`,
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
        console.error("[AssetAssignment] searchAssetByCode failed:", err);
        setErrorMsg(err?.message || `Asset code ${rawValue} lookup failed.`);
      } finally {
        setBusy(false);
      }
    },
    [scannedItems, recipientStaffId, t],
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

  const handleSelectProduct = useCallback(
    (stockId, product) => {
      if (!stockId || !product?.productId) return;
      const productCode = productIdToCodeMap[String(product.productId)];
      const category = productCategoryMap[productCode];
      if (category !== "A") {
        setErrorMsg(
          t("assetAssignment.notAssetProduct", { stockCode: stockId }),
        );
        return;
      }
      const available = product.availability?.available ?? 0;
      if (available <= 0) {
        setErrorMsg(
          `Asset code ${stockId} has no available quantity at location ${scannedLocation}.`,
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

  const handleAddAssignmentPhoto = useCallback(async (file) => {
    const localUrl = URL.createObjectURL(file);
    setPhotoUploading(true);
    try {
      const metadata = await uploadFileToDrive(file, null, null);
      setAssignmentPhotos((prev) => [...prev, { localUrl, metadata }]);
      setErrorMsg("");
    } catch {
      URL.revokeObjectURL(localUrl);
      setErrorMsg("Failed to upload assignment photo.");
    } finally {
      setPhotoUploading(false);
    }
  }, []);

  const handleRemoveAssignmentPhoto = useCallback((idx) => {
    setAssignmentPhotos((prev) => {
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
      const recipientId = String(recipientStaffId || "").trim();
      if (!operatorName || !userLogin) {
        throw new Error("Unable to determine the current user.");
      }
      if (!recipientId) {
        throw new Error(t("assetAssignment.recipientRequired"));
      }

      const result = await executeAssetAssignment({
        fromLocation: String(scannedLocation || "").trim(),
        workByStaffId: recipientId,
        workByStaffName: recipientStaffName || recipientId,
        scannedItems: scannedItems.map((scan) => ({
          productId: scan.productId,
          productCode: scan.productCode,
          stockId: String(scan.stockId || "").trim(),
          subQuantity: toNumber(scan.subQuantity),
        })),
        photos: assignmentPhotos.map((p) => p.metadata),
        issuedBy: userLogin,
      });

      let pdfResult = null;
      try {
        pdfResult = await generateAndStoreAssignmentPdf({
          companyId: String(userInfo?.companyId || "").trim(),
          workOrderId: result.workOrderId,
          fromLocation: String(scannedLocation || "").trim(),
          toLocation: recipientStaffName || recipientId,
          operator: userLogin,
          items: scannedItems.map((scan) => ({
            productCode: scan.productCode,
            stockCode: scan.stockId,
            quantity: toNumber(scan.subQuantity),
          })),
          productMap,
          photos: assignmentPhotos.map((p) => p.metadata),
        });
      } catch (pdfError) {
        setErrorMsg(
          pdfError?.message ||
            "Assignment succeeded but the PDF could not be stored.",
        );
      }

      setCompletedResult({
        workOrderId: result.workOrderId,
        pdfResult,
      });
      setSuccessMsg(
        `Assignment completed. Work order ${result.workOrderId} created.`,
      );
      setScannedItems([]);
      setAssignmentPhotos([]);
      setScannedLocation("");
    } catch (err) {
      setErrorMsg(
        err?.message ||
          "Failed to execute asset assignment. No asset movements were recorded.",
      );
    } finally {
      setBusy(false);
    }
  }, [
    canExecute,
    userInfo,
    scannedLocation,
    recipientStaffId,
    recipientStaffName,
    scannedItems,
    assignmentPhotos,
    productMap,
    t,
  ]);

  const handleReset = useCallback(() => {
    setScannedLocation("");
    scannedLocationRef.current = "";
    setLocationGpsFailed(false);
    setRecipientStaffId("");
    setRecipientStaffName("");
    setScannedItems([]);
    setAssignmentPhotos([]);
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

    scannedLocation,
    locationGpsBusy,
    locationGpsFailed,
    handleAutoDetectLocation,
    handleScanLocation,
    handleClearLocation,

    recipientStaffId,
    recipientStaffName,
    handleScanRecipient,
    handleClearRecipient,

    productMap,

    scannedItems,
    handleScanSubmit,
    handleUpdateScan,
    handleRemoveScan,

    pendingProductChoice,
    handleSelectProduct,
    handleCancelProductChoice,

    assignmentPhotos,
    photoUploading,
    handleAddAssignmentPhoto,
    handleRemoveAssignmentPhoto,

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
