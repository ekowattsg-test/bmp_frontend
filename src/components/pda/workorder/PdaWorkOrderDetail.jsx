import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import PersonIcon from "@mui/icons-material/Person";
import { request } from "../../../helpers/axios_helper";
import {
  uploadFileToDrive,
  ThumbnailImg,
  ImageCarousel,
} from "../../../helpers/file_helper";
import {
  PHASE,
  STATUS_COLOR,
  buildInitialStepPhases,
  getNextPhaseAfterScan,
  getNextPhaseAfterTo,
} from "./stepControl/stepSubstepModules";
import { createStepCentralControl } from "./stepControl/stepCentralControl";
import { getPdaStaffId, getPdaDisplayName } from "../common/pda_user_helper";
import PdaScanInput from "../common/PdaScanInput";
import { decodeToken } from "../../../helpers/qr_token_helper";

// EntityScan: scan / confirm widget per entity type
function EntityScan({
  entity,
  expected,
  onConfirm,
  disabled,
  t,
  label,
  staffNameMap = {},
}) {
  const [value, setValue] = useState("");
  const [matchError, setMatchError] = useState("");
  const [workerName, setWorkerName] = useState(null);

  const currentStaffId = getPdaStaffId();
  const isWorker = entity === "worker";
  const isPO = entity === "PO";
  const isDO = entity === "DO";

  // Self-match: logged-in user IS the expected worker → auto-confirm, no scan needed.
  // If expected differs, the user must physically scan the expected worker ID.
  const isSelfWorker =
    isWorker &&
    !!expected &&
    String(currentStaffId || "")
      .trim()
      .toLowerCase() === String(expected).trim().toLowerCase();

  // Resolve the expected worker's display name for the UI.
  useEffect(() => {
    if (!isWorker || !expected) return;
    // Use pre-loaded map if available
    const mapped = staffNameMap[String(expected)];
    if (mapped) {
      setWorkerName(mapped);
      return;
    }
    let mounted = true;
    request("GET", "/api/staffs")
      .then((res) => {
        if (!mounted) return;
        const match = (res.data || []).find(
          (s) => String(s.staffId) === String(expected),
        );
        setWorkerName(match?.staffName || null);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [isWorker, expected, staffNameMap]);

  const handleConfirm = async () => {
    if (!expected) {
      onConfirm();
      return;
    }
    // Self-worker uses the logged-in ID; all other cases use the scanned/typed value.
    let actual = isSelfWorker ? currentStaffId : value;
    // Require a valid signed QR token for all scan entities.
    // Plain-text / manually typed values are rejected.
    if (!isSelfWorker && actual) {
      const decoded = await decodeToken(actual);
      if (decoded !== null) {
        actual = decoded;
      } else {
        setMatchError(t("pda.workorder.detail.invalidQr"));
        return;
      }
    }
    if (
      String(actual || "")
        .trim()
        .toLowerCase() !== String(expected).trim().toLowerCase()
    ) {
      setMatchError(t("pda.workorder.detail.scanMismatch"));
      return;
    }
    setMatchError("");
    onConfirm();
  };

  if (isPO) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("pda.workorder.detail.expectedPO")}:{" "}
          <strong>{expected || "-"}</strong>
        </Typography>
        <Button
          variant="contained"
          fullWidth
          disabled={disabled}
          onClick={() => onConfirm()}
          sx={{ py: 1.2 }}
        >
          {t("pda.workorder.detail.confirmPO")}
        </Button>
      </Box>
    );
  }

  if (isDO) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("pda.workorder.detail.expectedDO", "DO Number")}:{" "}
          <strong>{expected || "—"}</strong>
        </Typography>
        <Button
          variant="contained"
          fullWidth
          disabled={disabled}
          onClick={() => onConfirm()}
          sx={{ py: 1.2 }}
        >
          {t("pda.workorder.detail.confirmDO", "Confirm DO")}
        </Button>
      </Box>
    );
  }

  // Self-worker: logged-in user matches expected → one-tap confirm.
  if (isSelfWorker) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {t("pda.workorder.detail.expected")}:{" "}
          <strong>{workerName || expected || "—"}</strong>
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {t("pda.workorder.detail.workerAuto")}:{" "}
          <strong>{getPdaDisplayName() || currentStaffId || "—"}</strong>
        </Typography>
        {matchError && (
          <Typography
            variant="caption"
            sx={{ color: "error.main", display: "block", mb: 1 }}
          >
            {matchError}
          </Typography>
        )}
        <Button
          variant="contained"
          fullWidth
          disabled={disabled}
          onClick={handleConfirm}
          sx={{ py: 1.2 }}
        >
          {t("pda.workorder.detail.confirm")}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: isWorker ? 0.5 : 1 }}
      >
        {label} - {t("pda.workorder.detail.expected")}:{" "}
        <strong>{(isWorker ? workerName : null) || expected || "—"}</strong>
      </Typography>
      {isWorker && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
        >
          {t(
            "pda.workorder.detail.workerScanHint",
            "Scan the required worker ID to confirm",
          )}
        </Typography>
      )}
      <PdaScanInput
        value={value}
        onChange={(v) => {
          setValue(v);
          setMatchError("");
        }}
        onSubmit={handleConfirm}
        placeholder={t("pda.workorder.detail.scanPlaceholder")}
        disabled={disabled}
        error={!!matchError}
        helperText={matchError}
        cameraContainerId="entity-scan-camera"
        sx={{ mb: 1 }}
      />
      <Button
        variant="contained"
        fullWidth
        disabled={disabled}
        onClick={handleConfirm}
        sx={{ py: 1.2 }}
      >
        {t("pda.workorder.detail.confirm")}
      </Button>
    </Box>
  );
}

// PhotoPanel: camera capture + thumbnail strip
function PhotoPanel({ photos, onAdd, onRemove, uploading }) {
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselStart, setCarouselStart] = useState(0);

  const carouselImages = photos.map((ph) => ({
    displayUrl: ph.metadata?.viewUrl || ph.metadata?.url || ph.localUrl || null,
    viewUrl: ph.metadata?.viewUrl || null,
    title: ph.metadata?.name || "",
    provider: ph.metadata?.provider || null,
    meta: ph.metadata || null,
  }));

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {photos.map((p, i) => (
        <Box key={i} sx={{ position: "relative", width: 72, height: 72 }}>
          {p.metadata?.id ? (
            <ThumbnailImg
              fileId={p.metadata.id}
              viewUrl={p.metadata.viewUrl || p.metadata.url || p.localUrl}
              provider={p.metadata.provider || null}
              width={72}
              height={72}
              alt={p.metadata.name || `photo-${i + 1}`}
              style={{
                borderRadius: 4,
                objectFit: "cover",
                border: "1px solid var(--color-gray-300)",
                cursor: "pointer",
              }}
              onClick={() => {
                setCarouselStart(i);
                setCarouselOpen(true);
              }}
            />
          ) : (
            <Box
              component="img"
              src={p.localUrl}
              onClick={() => {
                setCarouselStart(i);
                setCarouselOpen(true);
              }}
              sx={{
                width: 72,
                height: 72,
                objectFit: "cover",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                cursor: "pointer",
              }}
            />
          )}
          <IconButton
            size="small"
            onClick={() => onRemove(i)}
            sx={{
              position: "absolute",
              top: -8,
              right: -8,
              bgcolor: "background.paper",
              p: 0.25,
            }}
          >
            <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
          </IconButton>
        </Box>
      ))}
      <Box
        component="label"
        sx={{
          width: 72,
          height: 72,
          border: "2px dashed",
          borderColor: "divider",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: uploading ? "default" : "pointer",
          color: "text.disabled",
        }}
      >
        {uploading ? <CircularProgress size={20} /> : <CameraAltIcon />}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAdd(file);
            e.target.value = "";
          }}
        />
      </Box>
      <ImageCarousel
        images={carouselImages}
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
        startIndex={carouselStart}
      />
    </Box>
  );
}

// SectionLabel
function SectionLabel({ children }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      display="block"
      fontWeight={600}
      sx={{ mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}
    >
      {children}
    </Typography>
  );
}

// ── ScannedStockRow: single scanned stock line with qty controls ───────────────────────────────────
function ScannedStockRow({ sub, maxQty, onUpdateQty, onDelete }) {
  const [localQty, setLocalQty] = useState(String(sub.subQuantity || 1));

  useEffect(() => {
    setLocalQty(String(sub.subQuantity || 1));
  }, [sub.subQuantity]);

  const currentQty = Number(sub.subQuantity || 1);

  const commitQty = (val) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) {
      setLocalQty(String(currentQty));
      return;
    }
    const clamped = Math.min(n, maxQty);
    setLocalQty(String(clamped));
    if (clamped !== currentQty) onUpdateQty(clamped);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 0.5,
        py: 0.5,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* Stock code — takes all remaining space */}
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          minWidth: 0,
          fontFamily: "monospace",
          fontSize: "0.85rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={sub.stockId}
      >
        {sub.stockId}
      </Typography>

      {/* − */}
      <IconButton
        size="small"
        sx={{ p: 0.25, flexShrink: 0 }}
        onClick={() => {
          if (currentQty <= 1) onDelete();
          else onUpdateQty(currentQty - 1);
        }}
      >
        <RemoveIcon sx={{ fontSize: 16 }} />
      </IconButton>

      {/* qty input */}
      <TextField
        size="small"
        value={localQty}
        onChange={(e) => setLocalQty(e.target.value)}
        onBlur={() => commitQty(localQty)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitQty(localQty);
            e.target.blur();
          }
        }}
        inputProps={{ style: { textAlign: "center", padding: "2px 0" } }}
        sx={{
          flexShrink: 0,
          width: 46,
          "& .MuiOutlinedInput-input": { width: "100%" },
        }}
      />

      {/* + */}
      <IconButton
        size="small"
        sx={{ p: 0.25, flexShrink: 0 }}
        disabled={currentQty >= maxQty}
        onClick={() => onUpdateQty(currentQty + 1)}
      >
        <AddIcon sx={{ fontSize: 16 }} />
      </IconButton>

      {/* delete */}
      <IconButton
        size="small"
        sx={{ p: 0.25, flexShrink: 0 }}
        onClick={onDelete}
      >
        <DeleteOutlineIcon sx={{ fontSize: 16, color: "error.main" }} />
      </IconButton>
    </Box>
  );
}

// ── ScanDataPanel: full stock scanning UI ──────────────────────────────────────────────────────────
function ScanDataPanel({
  step,
  workOrderId,
  contentType,
  onComplete,
  disabled,
  t,
  readOnly = false,
}) {
  const tc = step._typeConfig;
  const isNewStock = (tc?.newStock ?? 0) === 1;
  const isWorker = contentType === "worker";

  const [loading, setLoading] = useState(true);
  const [woData, setWoData] = useState([]);
  const [subDataMap, setSubDataMap] = useState({});
  const [products, setProducts] = useState({}); // productId → product (stock mode)
  const [staffMap, setStaffMap] = useState({}); // staffId → staffName (worker mode)
  const [selectedDataId, setSelectedDataId] = useState(null);
  const [scanInput, setScanInput] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanning, setScanning] = useState(false);
  // pending disambiguation: { stock, candidates: WorkOrderData[], netQty }
  const [pendingChoice, setPendingChoice] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const fetches = [
          request("GET", "/api/workorder-data"),
          request("GET", "/api/workorder-subdata"),
          isWorker
            ? request("GET", "/api/staffs")
            : request("GET", "/api/products"),
        ];
        const [wdRes, sdRes, entityRes] = await Promise.all(fetches);
        if (!mounted) return;
        const allWd = wdRes.data || [];
        const wd = allWd.filter(
          (d) => String(d.workOrderId) === String(workOrderId),
        );
        setWoData(wd);
        const dataIdSet = new Set(wd.map((d) => d.workOrderDataId));
        const allSd = sdRes.data || [];
        const sdFiltered = allSd.filter((s) =>
          dataIdSet.has(s.workOrderDataId),
        );
        const sdMap = {};
        sdFiltered.forEach((s) => {
          if (!sdMap[s.workOrderDataId]) sdMap[s.workOrderDataId] = [];
          sdMap[s.workOrderDataId].push(s);
        });
        setSubDataMap(sdMap);
        if (isWorker) {
          const sm = {};
          (entityRes.data || []).forEach((s) => {
            sm[String(s.staffId)] = s.staffName || s.staffId;
          });
          setStaffMap(sm);
        } else {
          const prodMap = {};
          (entityRes.data || []).forEach((p) => {
            prodMap[p.productId] = p;
          });
          setProducts(prodMap);
        }
      } catch {
        // non-fatal
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [workOrderId, isWorker]);

  const scannedTotal = woData.reduce(
    (sum, d) =>
      sum +
      (subDataMap[d.workOrderDataId] || []).reduce(
        (s, sub) => s + Number(sub.subQuantity || 1),
        0,
      ),
    0,
  );
  const requiredTotal = woData.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const isComplete = woData.length > 0 && scannedTotal >= requiredTotal;

  const handleScan = async () => {
    const code = scanInput.trim();
    if (!code) return;
    setScanError("");
    setScanning(true);
    try {
      // ── Worker mode: auto-match scanned staffId against workOrderData ──
      if (isWorker) {
        // Decode the signed QR token; reject plain-text staff codes.
        const decodedStaffId = await decodeToken(code);
        if (decodedStaffId === null) {
          setScanError(t("pda.workorder.detail.invalidQr"));
          setScanning(false);
          return;
        }
        // Find the WO data line whose staffId matches the decoded value
        const targetWd = woData.find(
          (d) => String(d.staffId) === String(decodedStaffId),
        );
        if (!targetWd) {
          setScanError(t("pda.workorder.scan.stockNotInOrder"));
          setScanning(false);
          return;
        }
        const targetDataId = targetWd.workOrderDataId;
        const scannedQty = (subDataMap[targetDataId] || []).reduce(
          (s, sub) => s + Number(sub.subQuantity || 1),
          0,
        );
        if (scannedQty >= targetWd.quantity) {
          setScanError(t("pda.workorder.scan.quantityExceeded"));
          setScanning(false);
          return;
        }
        const existingW = (subDataMap[targetDataId] || []).find(
          (s) => s.stockId === decodedStaffId,
        );
        if (existingW) {
          const newQty = Number(existingW.subQuantity || 1) + 1;
          const res = await request(
            "PUT",
            `/api/workorder-subdata/${existingW.workOrderSubDataId}`,
            {
              workOrderDataId: targetDataId,
              productId: null,
              stockId: decodedStaffId,
              subQuantity: newQty,
            },
          );
          setSubDataMap((prev) => ({
            ...prev,
            [targetDataId]: (prev[targetDataId] || []).map((s) =>
              s.workOrderSubDataId === existingW.workOrderSubDataId
                ? res.data
                : s,
            ),
          }));
        } else {
          const res = await request("POST", "/api/workorder-subdata", {
            workOrderDataId: targetDataId,
            productId: null,
            stockId: decodedStaffId,
            subQuantity: 1,
          });
          setSubDataMap((prev) => ({
            ...prev,
            [targetDataId]: [...(prev[targetDataId] || []), res.data],
          }));
        }
        setScanInput("");
        return;
      }

      if (isNewStock) {
        if (!selectedDataId) {
          setScanError(t("pda.workorder.scan.tapProductFirst"));
          setScanning(false);
          return;
        }
        const wd = woData.find((d) => d.workOrderDataId === selectedDataId);
        const scannedQty = (subDataMap[selectedDataId] || []).reduce(
          (s, sub) => s + Number(sub.subQuantity || 1),
          0,
        );
        if (scannedQty >= wd.quantity) {
          setScanError(t("pda.workorder.scan.quantityExceeded"));
          setScanning(false);
          return;
        }
        const existingN = (subDataMap[selectedDataId] || []).find(
          (s) => s.stockId === code,
        );
        if (existingN) {
          const newQty = Number(existingN.subQuantity || 1) + 1;
          const res = await request(
            "PUT",
            `/api/workorder-subdata/${existingN.workOrderSubDataId}`,
            {
              workOrderDataId: selectedDataId,
              productId: wd.productId,
              stockId: code,
              subQuantity: newQty,
            },
          );
          setSubDataMap((prev) => ({
            ...prev,
            [selectedDataId]: (prev[selectedDataId] || []).map((s) =>
              s.workOrderSubDataId === existingN.workOrderSubDataId
                ? res.data
                : s,
            ),
          }));
        } else {
          const res = await request("POST", "/api/workorder-subdata", {
            workOrderDataId: selectedDataId,
            productId: wd.productId,
            stockId: code,
            subQuantity: 1,
          });
          setSubDataMap((prev) => ({
            ...prev,
            [selectedDataId]: [...(prev[selectedDataId] || []), res.data],
          }));
        }
        setScanInput("");
      } else {
        const stockRes = await request(
          "GET",
          `/api/stocks/search?stockCode=${encodeURIComponent(code)}`,
        );
        const stock = stockRes.data;
        if (!stock || !stock.stockId) {
          setScanError(t("pda.workorder.scan.stockNotFound"));
          setScanning(false);
          return;
        }
        // Validate available stock quantity once (shared path)
        const viewsRes = await request(
          "GET",
          `/api/stockviews/stock/${stock.stockId}`,
        );
        const views = viewsRes.data || [];
        // When fromLocation is a physical location (not PO/DO/vehicle/worker),
        // check stock only at that location rather than across all locations.
        const fromEntityType = tc?.fromEntity || "";
        const isPhysicalLocation =
          !fromEntityType || fromEntityType === "location";
        const fromLoc = step.fromLocation;
        const relevantViews =
          isPhysicalLocation && fromLoc
            ? views.filter((v) => v.location === fromLoc)
            : views;
        const netQty = relevantViews.reduce(
          (sum, v) => sum + (v.stockMoved || 0),
          0,
        );
        if (netQty < 1) {
          setScanError(t("pda.workorder.scan.insufficientStock"));
          setScanning(false);
          return;
        }
        let targetDataId = selectedDataId;
        if (targetDataId) {
          // Product pre-selected — verify the scanned stock belongs to it
          const wd = woData.find((d) => d.workOrderDataId === targetDataId);
          if (String(stock.productId) !== String(wd?.productId)) {
            setScanError(t("pda.workorder.scan.wrongProduct"));
            setScanning(false);
            return;
          }
        } else {
          // No product pre-selected — find all WO lines whose product matches this stock
          const candidates = woData.filter(
            (d) => String(d.productId) === String(stock.productId),
          );
          if (candidates.length === 0) {
            setScanError(t("pda.workorder.scan.stockNotInOrder"));
            setScanning(false);
            return;
          }
          if (candidates.length > 1) {
            // Ambiguous — ask user which line to assign to
            setPendingChoice({ stock, candidates, netQty });
            setScanning(false);
            return;
          }
          targetDataId = candidates[0].workOrderDataId;
        }
        const wd = woData.find((d) => d.workOrderDataId === targetDataId);
        const scannedQty = (subDataMap[targetDataId] || []).reduce(
          (s, sub) => s + Number(sub.subQuantity || 1),
          0,
        );
        if (scannedQty >= wd.quantity) {
          setScanError(t("pda.workorder.scan.quantityExceeded"));
          setScanning(false);
          return;
        }
        const existing = (subDataMap[targetDataId] || []).find(
          (s) => s.stockId === String(stock.stockCode || code),
        );
        if (existing) {
          const newQty = Number(existing.subQuantity || 1) + 1;
          const res = await request(
            "PUT",
            `/api/workorder-subdata/${existing.workOrderSubDataId}`,
            {
              workOrderDataId: targetDataId,
              productId: stock.productId,
              stockId: String(stock.stockCode || code),
              subQuantity: newQty,
            },
          );
          setSubDataMap((prev) => ({
            ...prev,
            [targetDataId]: (prev[targetDataId] || []).map((s) =>
              s.workOrderSubDataId === existing.workOrderSubDataId
                ? res.data
                : s,
            ),
          }));
        } else {
          const res = await request("POST", "/api/workorder-subdata", {
            workOrderDataId: targetDataId,
            productId: stock.productId,
            stockId: String(stock.stockCode || code),
            subQuantity: 1,
          });
          setSubDataMap((prev) => ({
            ...prev,
            [targetDataId]: [...(prev[targetDataId] || []), res.data],
          }));
        }
        setScanInput("");
      }
    } catch {
      setScanError(t("pda.workorder.scan.scanError"));
    } finally {
      setScanning(false);
    }
  };

  const handleRemoveScan = async (dataId, subDataId) => {
    try {
      await request("DELETE", `/api/workorder-subdata/${subDataId}`);
      setSubDataMap((prev) => ({
        ...prev,
        [dataId]: (prev[dataId] || []).filter(
          (s) => s.workOrderSubDataId !== subDataId,
        ),
      }));
    } catch {
      // ignore
    }
  };

  const handleUpdateSubQty = async (dataId, sub, newQty) => {
    if (newQty < 1) {
      handleRemoveScan(dataId, sub.workOrderSubDataId);
      return;
    }
    const wd = woData.find((d) => d.workOrderDataId === dataId);
    if (!wd) return;
    // Clamp to available: d.quantity - sum of others
    const othersQty = (subDataMap[dataId] || [])
      .filter((s) => s.workOrderSubDataId !== sub.workOrderSubDataId)
      .reduce((sum, s) => sum + Number(s.subQuantity || 1), 0);
    const clamped = Math.min(newQty, wd.quantity - othersQty);
    if (clamped < 1) {
      handleRemoveScan(dataId, sub.workOrderSubDataId);
      return;
    }
    try {
      const res = await request(
        "PUT",
        `/api/workorder-subdata/${sub.workOrderSubDataId}`,
        {
          workOrderDataId: dataId,
          productId: sub.productId,
          stockId: sub.stockId,
          subQuantity: clamped,
        },
      );
      setSubDataMap((prev) => ({
        ...prev,
        [dataId]: (prev[dataId] || []).map((s) =>
          s.workOrderSubDataId === sub.workOrderSubDataId ? res.data : s,
        ),
      }));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (woData.length === 0) {
    if (readOnly) return null;
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center" }}
        >
          {t("pda.workorder.scan.noItems")}
        </Typography>
        <Button
          variant="contained"
          fullWidth
          disabled={disabled}
          onClick={onComplete}
          sx={{ py: 1.2 }}
        >
          {t("pda.workorder.detail.confirm")}
        </Button>
      </Box>
    );
  }

  // Data for the currently-selected product/worker (used by the product dialog)
  const selectedWd = woData.find((d) => d.workOrderDataId === selectedDataId);
  const selectedProduct =
    selectedWd && !isWorker ? products[selectedWd.productId] : null;
  const selectedStaffName =
    selectedWd && isWorker
      ? staffMap[String(selectedWd.staffId)] || String(selectedWd.staffId)
      : null;
  const selectedScanned = selectedDataId
    ? subDataMap[selectedDataId] || []
    : [];
  const selectedScannedQty = selectedScanned.reduce(
    (sum, s) => sum + Number(s.subQuantity || 1),
    0,
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {/* Global scanner: hidden in readOnly mode */}
      {!readOnly && (isWorker || (!isNewStock && selectedDataId === null)) && (
        <PdaScanInput
          value={scanInput}
          onChange={(v) => {
            setScanInput(v);
            setScanError("");
          }}
          onSubmit={handleScan}
          placeholder={t("pda.workorder.detail.scanPlaceholder")}
          disabled={scanning}
          scanning={scanning}
          error={!!scanError}
          helperText={scanError || undefined}
          cameraContainerId="scan-panel-global"
        />
      )}

      {/* Product / worker list */}
      {woData.map((d) => {
        const product = !isWorker ? products[d.productId] : null;
        const workerName = isWorker
          ? staffMap[String(d.staffId)] || String(d.staffId)
          : null;
        const displayName = isWorker
          ? workerName || `#${d.staffId}`
          : product?.productName || product?.productCode || `#${d.productId}`;
        const scanned = subDataMap[d.workOrderDataId] || [];
        const scannedQty = scanned.reduce(
          (sum, s) => sum + Number(s.subQuantity || 1),
          0,
        );
        const isFulfilled = scannedQty >= d.quantity;
        const isSelected = !readOnly && selectedDataId === d.workOrderDataId;
        return (
          <Card
            key={d.workOrderDataId}
            variant="outlined"
            sx={{
              borderColor: isFulfilled
                ? "success.main"
                : isSelected
                  ? "primary.main"
                  : "divider",
              borderWidth: isSelected ? 2 : 1,
              cursor: readOnly || isWorker ? "default" : "pointer",
              bgcolor: isSelected ? "primary.main" : "background.paper",
            }}
            onClick={() => {
              if (readOnly || isWorker) return;
              setSelectedDataId(d.workOrderDataId);
              setProductDialogOpen(true);
              setScanError("");
            }}
          >
            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={600}
                  noWrap
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    color: isSelected ? "#fff" : "text.primary",
                  }}
                >
                  {displayName}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    component="span"
                    variant="h6"
                    fontWeight={700}
                    sx={{
                      color: isSelected
                        ? "#fff"
                        : isFulfilled
                          ? "success.main"
                          : scannedQty > 0
                            ? "warning.main"
                            : "text.disabled",
                      lineHeight: 1,
                    }}
                  >
                    {scannedQty}
                  </Typography>
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{
                      color: isSelected
                        ? "rgba(255,255,255,0.6)"
                        : "text.disabled",
                      lineHeight: 1,
                    }}
                  >
                    /
                  </Typography>
                  <Typography
                    component="span"
                    variant="h6"
                    fontWeight={700}
                    sx={{
                      color: isSelected
                        ? "rgba(255,255,255,0.85)"
                        : "text.secondary",
                      lineHeight: 1,
                    }}
                  >
                    {d.quantity}
                  </Typography>
                  {isFulfilled && (
                    <CheckCircleIcon
                      sx={{
                        color: isSelected ? "#fff" : "success.main",
                        fontSize: 20,
                      }}
                    />
                  )}
                </Box>
              </Box>
              {scanned.length > 0 && (
                <>
                  <Divider
                    sx={{
                      my: 0.75,
                      borderColor: isSelected
                        ? "rgba(255,255,255,0.2)"
                        : "divider",
                    }}
                  />
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {scanned.map((sub) => (
                      <Chip
                        key={sub.workOrderSubDataId}
                        label={`${sub.stockId} ×${sub.subQuantity || 1}`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          fontFamily: "monospace",
                          bgcolor: isSelected
                            ? "rgba(255,255,255,0.2)"
                            : "action.selected",
                          color: isSelected ? "#fff" : "text.secondary",
                          "& .MuiChip-label": { px: 0.75 },
                        }}
                      />
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      {isNewStock && selectedDataId === null && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: "center" }}
        >
          {t("pda.workorder.scan.tapToActivate")}
        </Typography>
      )}

      {/* ── Product scan dialog ── */}
      <Dialog
        open={productDialogOpen && !!selectedDataId}
        onClose={() => setProductDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { m: 1.5, width: "calc(100% - 24px)", maxHeight: "90vh" },
        }}
      >
        {/* Header: product image + name */}
        <DialogTitle sx={{ pb: 1, pr: 6 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {isWorker ? (
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  bgcolor: "background.default",
                }}
              >
                <PersonIcon sx={{ color: "text.secondary", fontSize: 32 }} />
              </Box>
            ) : selectedProduct?.productPicture ? (
              <Box
                component="img"
                src={selectedProduct.productPicture}
                alt={selectedProduct.productName || ""}
                sx={{
                  width: 56,
                  height: 56,
                  objectFit: "cover",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  flexShrink: 0,
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 1,
                  border: "1px dashed",
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  bgcolor: "background.default",
                }}
              >
                <ImageIcon sx={{ color: "text.disabled", fontSize: 28 }} />
              </Box>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {isWorker
                  ? selectedStaffName
                  : selectedProduct?.productName ||
                    selectedProduct?.productCode ||
                    `#${selectedWd?.productId}`}
              </Typography>
              {!isWorker &&
                selectedProduct?.productCode &&
                selectedProduct?.productName && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    display="block"
                  >
                    {selectedProduct.productCode}
                  </Typography>
                )}
              <Typography variant="body2" sx={{ mt: 0.25 }}>
                <span style={{ color: "inherit", opacity: 0.7 }}>
                  {t("pda.workorder.scan.required")}:{" "}
                </span>
                <strong
                  style={{
                    color:
                      selectedScannedQty >= (selectedWd?.quantity || 0)
                        ? "var(--color-success)"
                        : "inherit",
                  }}
                >
                  {selectedScannedQty}
                </strong>
                <span style={{ opacity: 0.5 }}> / </span>
                <strong style={{ opacity: 0.85 }}>
                  {selectedWd?.quantity ?? "–"}
                </strong>
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => setProductDialogOpen(false)}
            sx={{ position: "absolute", top: 8, right: 8 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 0, pb: 1 }}>
          {/* Scanner row */}
          <PdaScanInput
            value={scanInput}
            onChange={(v) => {
              setScanInput(v);
              setScanError("");
            }}
            onSubmit={handleScan}
            placeholder={t("pda.workorder.detail.scanPlaceholder")}
            disabled={scanning}
            scanning={scanning}
            error={!!scanError}
            sx={{ mb: scanError ? 0.5 : 1.5 }}
            cameraContainerId="scan-panel-dialog"
          />
          {scanError && (
            <Typography
              variant="caption"
              sx={{ color: "error.main", display: "block", mb: 1.5 }}
            >
              {scanError}
            </Typography>
          )}

          <Divider sx={{ mb: 1.5 }} />

          {/* Scanned stock rows */}
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{
              textTransform: "uppercase",
              letterSpacing: 0.5,
              display: "block",
              mb: 0.5,
            }}
          >
            {t("pda.workorder.scan.scannedItems")}
          </Typography>
          {selectedScanned.length === 0 ? (
            <Typography
              variant="body2"
              color="text.disabled"
              sx={{ textAlign: "center", py: 1.5 }}
            >
              {t("pda.workorder.scan.noScannedYet")}
            </Typography>
          ) : (
            selectedScanned.map((sub) => {
              const othersQty = selectedScanned
                .filter((s) => s.workOrderSubDataId !== sub.workOrderSubDataId)
                .reduce((sum, s) => sum + Number(s.subQuantity || 1), 0);
              const maxQty = (selectedWd?.quantity || 1) - othersQty;
              return (
                <ScannedStockRow
                  key={sub.workOrderSubDataId}
                  sub={sub}
                  maxQty={maxQty}
                  onUpdateQty={(newQty) =>
                    handleUpdateSubQty(selectedDataId, sub, newQty)
                  }
                  onDelete={() =>
                    handleRemoveScan(selectedDataId, sub.workOrderSubDataId)
                  }
                />
              );
            })
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setProductDialogOpen(false)}
            fullWidth
          >
            {t("pda.workorder.scan.done")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Disambiguation dialog: stock matches multiple WO lines */}
      <Dialog
        open={!!pendingChoice}
        onClose={() => {
          setPendingChoice(null);
          setScanError(t("pda.workorder.scan.chooseCancelled"));
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pb: 1 }}>
          {t("pda.workorder.scan.chooseProduct")}
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t("pda.workorder.scan.chooseProductHint", {
              code:
                pendingChoice?.stock?.stockCode ||
                pendingChoice?.stock?.stockId,
            })}
          </Typography>
          <List disablePadding>
            {(pendingChoice?.candidates || []).map((d) => {
              const prod = products[d.productId];
              const scanned = (subDataMap[d.workOrderDataId] || []).reduce(
                (s, sub) => s + Number(sub.subQuantity || 1),
                0,
              );
              const full = scanned >= d.quantity;
              return (
                <ListItemButton
                  key={d.workOrderDataId}
                  disabled={full}
                  onClick={async () => {
                    const { stock } = pendingChoice;
                    setPendingChoice(null);
                    try {
                      const dScanned = (
                        subDataMap[d.workOrderDataId] || []
                      ).reduce((s, sub) => s + Number(sub.subQuantity || 1), 0);
                      if (dScanned >= d.quantity) {
                        setScanError(t("pda.workorder.scan.quantityExceeded"));
                        return;
                      }
                      const existingD = (
                        subDataMap[d.workOrderDataId] || []
                      ).find(
                        (s) =>
                          s.stockId ===
                          String(stock.stockCode || stock.stockId),
                      );
                      if (existingD) {
                        const newQty = Number(existingD.subQuantity || 1) + 1;
                        const res = await request(
                          "PUT",
                          `/api/workorder-subdata/${existingD.workOrderSubDataId}`,
                          {
                            workOrderDataId: d.workOrderDataId,
                            productId: stock.productId,
                            stockId: String(stock.stockCode || stock.stockId),
                            subQuantity: newQty,
                          },
                        );
                        setSubDataMap((prev) => ({
                          ...prev,
                          [d.workOrderDataId]: (
                            prev[d.workOrderDataId] || []
                          ).map((s) =>
                            s.workOrderSubDataId ===
                            existingD.workOrderSubDataId
                              ? res.data
                              : s,
                          ),
                        }));
                      } else {
                        const res = await request(
                          "POST",
                          "/api/workorder-subdata",
                          {
                            workOrderDataId: d.workOrderDataId,
                            productId: stock.productId,
                            stockId: String(stock.stockCode || stock.stockId),
                            subQuantity: 1,
                          },
                        );
                        setSubDataMap((prev) => ({
                          ...prev,
                          [d.workOrderDataId]: [
                            ...(prev[d.workOrderDataId] || []),
                            res.data,
                          ],
                        }));
                      }
                      setScanInput("");
                    } catch {
                      setScanError(t("pda.workorder.scan.scanError"));
                    }
                  }}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    border: "1px solid",
                    borderColor: full ? "success.main" : "divider",
                  }}
                >
                  <ListItemText
                    primary={
                      prod?.productName ||
                      prod?.productCode ||
                      `#${d.productId}`
                    }
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: 600,
                    }}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      ml: 1,
                    }}
                  >
                    <Typography
                      variant="body1"
                      fontWeight={700}
                      sx={{
                        color: full
                          ? "success.main"
                          : scanned > 0
                            ? "warning.main"
                            : "text.disabled",
                      }}
                    >
                      {scanned}
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      /
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={700}
                      color="text.secondary"
                    >
                      {d.quantity}
                    </Typography>
                    {full && (
                      <CheckCircleIcon
                        sx={{ color: "success.main", fontSize: 18 }}
                      />
                    )}
                  </Box>
                </ListItemButton>
              );
            })}
          </List>
        </DialogContent>
      </Dialog>

      {!readOnly && (
        <Button
          variant="contained"
          fullWidth
          disabled={disabled || !isComplete}
          onClick={onComplete}
          sx={{ py: 1.2 }}
        >
          {t("pda.workorder.detail.confirmScan")} ({scannedTotal}/
          {requiredTotal})
        </Button>
      )}
    </Box>
  );
}

// Main component
export default function PdaWorkOrderDetail() {
  const { workOrderId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [workOrder, setWorkOrder] = useState(null);
  const [contentType, setContentType] = useState("stock"); // from WorkOrderType
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [staffNameMap, setStaffNameMap] = useState({}); // staffId → staffName

  // Phase per step: workStepsId -> PHASE constant
  const [stepPhases, setStepPhases] = useState({});
  // Photos per step: workStepsId -> [{ localUrl, metadata }]
  const [stepPhotos, setStepPhotos] = useState({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState([]);
  const [carouselStart, setCarouselStart] = useState(0);

  const openStepCarousel = (photos, idx) => {
    setCarouselImages(
      photos.map((ph) => ({
        displayUrl:
          ph.metadata?.viewUrl || ph.metadata?.url || ph.localUrl || null,
        viewUrl: ph.metadata?.viewUrl || null,
        title: ph.metadata?.name || "",
        provider: ph.metadata?.provider || null,
        meta: ph.metadata || null,
      })),
    );
    setCarouselStart(idx);
    setCarouselOpen(true);
  };

  // Load
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [woRes, stepsRes] = await Promise.all([
        request("GET", `/api/workorders/${workOrderId}`),
        request("GET", `/api/worksteps/order/${workOrderId}`),
      ]);
      const wo = woRes.data;
      setWorkOrder(wo);

      // Load staff names for resolving staff IDs throughout the view
      try {
        const staffRes = await request("GET", "/api/staffs");
        const sm = {};
        (staffRes.data || []).forEach((s) => {
          sm[String(s.staffId)] = s.staffName || s.staffId;
        });
        setStaffNameMap(sm);
      } catch {
        /* non-fatal */
      }

      let templates = [];
      try {
        const [tmplRes, woTypeRes] = await Promise.all([
          request("GET", "/api/workstepstypes"),
          request("GET", "/api/workordertypes"),
        ]);
        templates = (tmplRes.data || []).filter(
          (wst) => wst.workOrderType === wo.workOrderType,
        );
        const woType = (woTypeRes.data || []).find(
          (t) => t.workOrderType === wo.workOrderType,
        );
        if (woType?.contentType) setContentType(woType.contentType);
      } catch {
        /* non-fatal */
      }

      const raw = (stepsRes.data || [])
        .filter((s) => String(s.workOrderId) === String(workOrderId))
        .sort((a, b) => a.stepNumber - b.stepNumber);

      const enriched = raw.map((s) => {
        const tc =
          templates.find((wst) => wst.stepNumber === s.stepNumber) ?? null;
        return { ...s, _typeConfig: tc };
      });
      setSteps(enriched);

      // Init sub-step phases from persisted status through central control rules
      setStepPhases(buildInitialStepPhases(enriched));

      // Init photos from persisted step.photos (JSON array string)
      const photos = {};
      enriched.forEach((s) => {
        if (s.photos) {
          try {
            const parsed = JSON.parse(s.photos);
            if (Array.isArray(parsed)) {
              photos[s.workStepsId] = parsed.map((m) => ({
                localUrl: m.viewUrl || m.url || "",
                metadata: m,
              }));
            }
          } catch {
            /* ignore */
          }
        }
      });
      setStepPhotos(photos);
    } catch {
      setError(t("pda.workorder.detail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [workOrderId, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Save step to server
  const saveStep = useCallback(async (step) => {
    await request("PUT", `/api/worksteps/${step.workStepsId}`, {
      workStepsId: step.workStepsId,
      workOrderId: step.workOrderId,
      stepNumber: step.stepNumber,
      fromLocation: step.fromLocation,
      toLocation: step.toLocation,
      stepStatus: step.stepStatus,
      photos: step.photos ?? null,
    });
  }, []);

  // PO helper: fetch PO items, resolve productId, POST WorkOrderData
  const populateWorkOrderDataFromPO = useCallback(
    async (poId) => {
      const [itemsRes, productsRes] = await Promise.all([
        request("GET", `/api/purchaseOrderItems/order/${poId}`),
        request("GET", "/api/products"),
      ]);
      const items = itemsRes.data || [];
      const products = productsRes.data || [];
      const codeToId = {};
      products.forEach((p) => {
        if (p.productCode) codeToId[String(p.productCode)] = p.productId;
      });
      const staffId = getPdaStaffId();
      await Promise.all(
        items.map((item) =>
          request("POST", "/api/workorder-data", {
            workOrderId,
            productId: codeToId[String(item.productCode)] ?? null,
            quantity: item.quantity ?? 0,
            staffId,
          }),
        ),
      );
    },
    [workOrderId],
  );

  // DO helper: fetch DO items, resolve productId, POST WorkOrderData
  const populateWorkOrderDataFromDO = useCallback(
    async (doId) => {
      const [itemsRes, productsRes] = await Promise.all([
        request("GET", `/api/deliveryOrderItems/order/${doId}`),
        request("GET", "/api/products"),
      ]);
      const items = itemsRes.data || [];
      const products = productsRes.data || [];
      const codeToId = {};
      products.forEach((p) => {
        if (p.productCode) codeToId[String(p.productCode)] = p.productId;
      });
      const staffId = getPdaStaffId();
      await Promise.all(
        items.map((item) =>
          request("POST", "/api/workorder-data", {
            workOrderId,
            productId: codeToId[String(item.productCode)] ?? null,
            quantity: item.quantity ?? 0,
            staffId,
          }),
        ),
      );
    },
    [workOrderId],
  );

  const handleFromConfirmed = useCallback(
    async (step) => {
      setSaving(true);
      try {
        // If entity is PO, populate WorkOrderData from PO items
        if (step._typeConfig?.fromEntity === "PO" && step.fromLocation) {
          await populateWorkOrderDataFromPO(step.fromLocation);
        }
        // If entity is DO, populate WorkOrderData from DO items
        if (step._typeConfig?.fromEntity === "DO" && step.fromLocation) {
          await populateWorkOrderDataFromDO(step.fromLocation);
        }
        const updated = { ...step, stepStatus: "INPROGRESS" };
        await saveStep(updated);
        setSteps((prev) =>
          prev.map((s) => (s.workStepsId === step.workStepsId ? updated : s)),
        );
        setStepPhases((prev) => ({ ...prev, [step.workStepsId]: PHASE.SCAN }));
        // Auto-start work order on first step
        if (workOrder?.workOrderStatus === "ISSUED") {
          await request("PUT", `/api/workorders/${workOrderId}`, {
            ...workOrder,
            workOrderStatus: "INPROGRESS",
          });
          setWorkOrder((prev) => ({ ...prev, workOrderStatus: "INPROGRESS" }));
        }
      } catch {
        setError(t("pda.workorder.detail.saveError"));
      } finally {
        setSaving(false);
      }
    },
    [
      saveStep,
      workOrder,
      workOrderId,
      populateWorkOrderDataFromPO,
      populateWorkOrderDataFromDO,
      t,
    ],
  );

  // Phase: SCAN confirmed -> advance to PHOTO or TO
  const handleScanConfirmed = useCallback((step) => {
    setStepPhases((prev) => ({
      ...prev,
      [step.workStepsId]: getNextPhaseAfterScan(step._typeConfig),
    }));
  }, []);

  // Phase: Photo added
  const handlePhotoAdd = useCallback(
    async (step, file) => {
      const localUrl = URL.createObjectURL(file);
      setPhotoUploading(true);
      try {
        const metadata = await uploadFileToDrive(file, null, null);
        setStepPhotos((prev) => ({
          ...prev,
          [step.workStepsId]: [
            ...(prev[step.workStepsId] || []),
            { localUrl, metadata },
          ],
        }));
      } catch {
        URL.revokeObjectURL(localUrl);
        setError(t("pda.workorder.detail.photoError"));
      } finally {
        setPhotoUploading(false);
      }
    },
    [t],
  );

  const handlePhotoRemove = useCallback((stepId, idx) => {
    setStepPhotos((prev) => {
      const list = [...(prev[stepId] || [])];
      const [removed] = list.splice(idx, 1);
      if (removed?.localUrl?.startsWith("blob:"))
        URL.revokeObjectURL(removed.localUrl);
      return { ...prev, [stepId]: list };
    });
  }, []);

  // Phase: PHOTO confirmed -> advance to TO
  // ── Phase: PHOTO confirmed → persist photos to backend, then advance to TO ──────────────
  const handlePhotoConfirmed = useCallback(
    async (step) => {
      const photos = stepPhotos[step.workStepsId] || [];
      if (photos.length > 0) {
        const photoJson = JSON.stringify(photos.map((p) => p.metadata));
        const withPhoto = { ...step, photos: photoJson };
        try {
          await saveStep(withPhoto);
          setSteps((prev) =>
            prev.map((s) =>
              s.workStepsId === step.workStepsId ? withPhoto : s,
            ),
          );
        } catch {
          // non-fatal — photos remain in memory and will be saved again in handleFinalConfirmed
        }
      }
      setStepPhases((prev) => ({ ...prev, [step.workStepsId]: PHASE.TO }));
    },
    [stepPhotos, saveStep],
  );

  // Phase: TO completed -> advance to final CONFIRM phase
  const handleToCompleted = useCallback(
    async (step) => {
      setSaving(true);
      try {
        // If entity is PO, populate WorkOrderData from PO items
        if (step._typeConfig?.toEntity === "PO" && step.toLocation) {
          await populateWorkOrderDataFromPO(step.toLocation);
        }
        // If entity is DO, populate WorkOrderData from DO items
        if (step._typeConfig?.toEntity === "DO" && step.toLocation) {
          await populateWorkOrderDataFromDO(step.toLocation);
        }

        setStepPhases((prev) => ({
          ...prev,
          [step.workStepsId]: getNextPhaseAfterTo(),
        }));
      } catch {
        setError(t("pda.workorder.detail.saveError"));
      } finally {
        setSaving(false);
      }
    },
    [populateWorkOrderDataFromPO, populateWorkOrderDataFromDO, t],
  );

  // Phase: CONFIRM completed -> execute step and close WO if all done
  const handleFinalConfirmed = useCallback(
    async (step) => {
      setSaving(true);
      try {
        // Persist photos to step record (keep INPROGRESS so execute can find it)
        const photos = stepPhotos[step.workStepsId] || [];
        const photoJson =
          photos.length > 0
            ? JSON.stringify(photos.map((p) => p.metadata))
            : null;
        if (photoJson) {
          await saveStep({ ...step, photos: photoJson });
        }

        // Execute: backend marks INPROGRESS step DONE, closes WO if all steps done
        await request("POST", `/api/worksteps/execute/${workOrderId}`);

        // Update local state
        const updated = { ...step, stepStatus: "DONE", photos: photoJson };
        const newSteps = steps.map((s) =>
          s.workStepsId === step.workStepsId ? updated : s,
        );
        setSteps(newSteps);
        setStepPhases((prev) => {
          const n = { ...prev };
          delete n[step.workStepsId];
          return n;
        });

        if (newSteps.every((s) => s.stepStatus === "DONE")) {
          setWorkOrder((prev) => ({ ...prev, workOrderStatus: "CLOSED" }));
          setTimeout(() => navigate("/pda/orders"), 1800);
        }
      } catch (err) {
        const msg = err?.response?.data;
        setError(
          typeof msg === "string" ? msg : t("pda.workorder.detail.saveError"),
        );
      } finally {
        setSaving(false);
      }
    },
    [saveStep, steps, stepPhotos, workOrderId, navigate, t],
  );

  // Derived (central step control)
  const stepControl = createStepCentralControl({
    steps,
    stepPhases,
    stepPhotos,
    contentType,
    workByStaffId: workOrder?.workBy,
    currentStaffId: getPdaStaffId(),
  });
  const activeStepId = stepControl.getActiveStepId();
  const isClosed = ["CLOSED", "CANCELLED"].includes(workOrder?.workOrderStatus);

  useEffect(() => {
    if (loading || saving || isClosed) return;
    const active = stepControl.getActiveStep();
    if (!active) return;

    const runtime = stepControl.getRuntimeModel(active);
    if (runtime.phase === PHASE.FROM && runtime.fromEntityModule.autoExecute) {
      handleFromConfirmed(active);
      return;
    }
    if (runtime.phase === PHASE.TO && runtime.toEntityModule.autoExecute) {
      handleToCompleted(active);
      return;
    }
    if (runtime.phase === PHASE.SCAN && runtime.effectiveScanData === 0) {
      handleScanConfirmed(active);
      return;
    }
    if (runtime.phase === PHASE.CONFIRM && runtime.noConfirm) {
      handleFinalConfirmed(active);
    }
  }, [
    loading,
    saving,
    isClosed,
    steps,
    stepPhases,
    stepPhotos,
    contentType,
    workOrder?.workBy,
    handleFromConfirmed,
    handleToCompleted,
    handleScanConfirmed,
    handleFinalConfirmed,
  ]);

  // Render
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!workOrder) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error || t("pda.workorder.detail.loadError")}
      </Alert>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Work order summary */}
      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 0.5,
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {workOrder.workOrderId}
            </Typography>
            <Chip
              label={t(
                `pda.workorder.status.${workOrder.workOrderStatus}`,
                workOrder.workOrderStatus,
              )}
              size="small"
              color={STATUS_COLOR[workOrder.workOrderStatus] ?? "default"}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {workOrder.workDescription || "-"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("pda.workorder.detail.type")}: {workOrder.workOrderType}
          </Typography>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="warning" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Steps */}
      {steps.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", mt: 4 }}
        >
          {t("pda.workorder.detail.noSteps")}
        </Typography>
      ) : (
        steps.map((step) => {
          const isDone = step.stepStatus === "DONE";
          const isActive = step.workStepsId === activeStepId;
          const isLocked = !isDone && !isActive;
          const {
            tc,
            phase,
            photos,
            takePhoto,
            effectiveScanData,
            noConfirm,
            fromEntityModule,
            toEntityModule,
          } = stepControl.getRuntimeModel(step);

          return (
            <Card
              key={step.workStepsId}
              variant="outlined"
              sx={{ opacity: isLocked ? 0.5 : 1 }}
            >
              <CardContent sx={{ p: 2 }}>
                {/* Step header */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: isActive ? 2 : 0,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {isDone ? (
                      <CheckCircleIcon
                        sx={{ color: "success.main", fontSize: 20 }}
                      />
                    ) : isLocked ? (
                      <LockOutlinedIcon
                        sx={{ color: "text.disabled", fontSize: 20 }}
                      />
                    ) : (
                      <RadioButtonUncheckedIcon
                        sx={{ color: "warning.main", fontSize: 20 }}
                      />
                    )}
                    <Typography variant="body2" fontWeight={600}>
                      {t("pda.workorder.detail.step")} {step.stepNumber}
                      {tc?.stepDescription ? ` - ${tc.stepDescription}` : ""}
                    </Typography>
                  </Box>
                  <Chip
                    label={t(
                      `pda.workorder.stepStatus.${step.stepStatus}`,
                      step.stepStatus,
                    )}
                    size="small"
                    color={
                      isDone
                        ? "success"
                        : step.stepStatus === "INPROGRESS"
                          ? "warning"
                          : "default"
                    }
                  />
                </Box>

                {/* Active step: phase UI */}
                {isActive && !isClosed && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {phase === PHASE.FROM && (
                      <Box>
                        {fromEntityModule.renderEntityUi && (
                          <>
                            <SectionLabel>
                              {t("pda.workorder.detail.fromLocation")}
                              {tc?.fromEntity ? ` (${tc.fromEntity})` : ""}
                            </SectionLabel>
                            <EntityScan
                              entity={tc?.fromEntity}
                              expected={step.fromLocation}
                              onConfirm={() => handleFromConfirmed(step)}
                              disabled={saving}
                              t={t}
                              label={t("pda.workorder.detail.fromLocation")}
                            />
                          </>
                        )}
                      </Box>
                    )}

                    {phase === PHASE.SCAN && (
                      <Box>
                        {/* Work order details — always shown so staff can confirm context */}
                        <Box
                          sx={{
                            bgcolor: "background.default",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                            p: 1.5,
                            mb: 2,
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.75,
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            color="text.secondary"
                            sx={{
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {t("pda.workorder.detail.summary", "Summary")}
                          </Typography>
                          {workOrder?.workDescription && (
                            <Typography variant="body2">
                              {workOrder.workDescription}
                            </Typography>
                          )}
                          {tc?.stepDescription && (
                            <Typography variant="body2" color="text.secondary">
                              {t("pda.workorder.detail.step")} {step.stepNumber}
                              : {tc.stepDescription}
                            </Typography>
                          )}
                          <Box
                            sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}
                          >
                            {step.fromLocation && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {t("pda.workorder.detail.fromLocation")}:{" "}
                                <strong>
                                  {staffNameMap[step.fromLocation] ||
                                    step.fromLocation}
                                </strong>
                              </Typography>
                            )}
                            {step.toLocation && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {t("pda.workorder.detail.toLocation")}:{" "}
                                <strong>
                                  {staffNameMap[step.toLocation] ||
                                    step.toLocation}
                                </strong>
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        <SectionLabel>
                          {t("pda.workorder.detail.scanData")}
                        </SectionLabel>
                        {effectiveScanData === 0 ? (
                          <>
                            <ScanDataPanel
                              step={step}
                              workOrderId={workOrderId}
                              contentType={contentType}
                              disabled={saving}
                              t={t}
                              readOnly
                            />
                          </>
                        ) : (
                          <ScanDataPanel
                            step={step}
                            workOrderId={workOrderId}
                            contentType={contentType}
                            onComplete={() => handleScanConfirmed(step)}
                            disabled={saving}
                            t={t}
                          />
                        )}
                      </Box>
                    )}

                    {phase === PHASE.PHOTO && (
                      <Box>
                        <SectionLabel>
                          {t("pda.workorder.detail.photos")}
                        </SectionLabel>
                        <PhotoPanel
                          photos={photos}
                          onAdd={(file) => handlePhotoAdd(step, file)}
                          onRemove={(idx) =>
                            handlePhotoRemove(step.workStepsId, idx)
                          }
                          uploading={photoUploading}
                        />
                        <Button
                          variant="contained"
                          fullWidth
                          disabled={
                            saving ||
                            photoUploading ||
                            (takePhoto > 0 && photos.length === 0)
                          }
                          onClick={() => handlePhotoConfirmed(step)}
                          sx={{ mt: 1.5, py: 1.2 }}
                        >
                          {t("pda.workorder.detail.continueWithPhotos")} (
                          {photos.length})
                        </Button>
                      </Box>
                    )}

                    {phase === PHASE.TO && (
                      <Box>
                        {/* Summary: work order + step details before final confirmation */}
                        <Box
                          sx={{
                            bgcolor: "background.default",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                            p: 1.5,
                            mb: 2,
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.75,
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            color="text.secondary"
                            sx={{
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {t("pda.workorder.detail.summary", "Summary")}
                          </Typography>
                          {workOrder?.workDescription && (
                            <Typography variant="body2">
                              {workOrder.workDescription}
                            </Typography>
                          )}
                          {tc?.stepDescription && (
                            <Typography variant="body2" color="text.secondary">
                              {t("pda.workorder.detail.step")} {step.stepNumber}
                              : {tc.stepDescription}
                            </Typography>
                          )}
                          <Box
                            sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}
                          >
                            {step.fromLocation && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {t("pda.workorder.detail.fromLocation")}:{" "}
                                <strong>
                                  {staffNameMap[step.fromLocation] ||
                                    step.fromLocation}
                                </strong>
                              </Typography>
                            )}
                            {step.toLocation && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {t("pda.workorder.detail.toLocation")}:{" "}
                                <strong>
                                  {staffNameMap[step.toLocation] ||
                                    step.toLocation}
                                </strong>
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        {/* Photos taken for this step */}
                        {photos.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block", mb: 0.75 }}
                            >
                              {t("pda.workorder.detail.photos")} (
                              {photos.length})
                            </Typography>
                            <Box
                              sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                            >
                              {photos.map((p, i) => {
                                if (p.metadata?.id) {
                                  return (
                                    <ThumbnailImg
                                      key={i}
                                      fileId={p.metadata.id}
                                      viewUrl={
                                        p.metadata.viewUrl ||
                                        p.metadata.url ||
                                        p.localUrl
                                      }
                                      provider={p.metadata.provider || null}
                                      width={72}
                                      height={72}
                                      alt={p.metadata.name || `photo-${i + 1}`}
                                      style={{
                                        borderRadius: 4,
                                        objectFit: "cover",
                                        border:
                                          "1px solid var(--color-gray-300)",
                                        cursor: "pointer",
                                        flexShrink: 0,
                                      }}
                                      onClick={() =>
                                        openStepCarousel(photos, i)
                                      }
                                    />
                                  );
                                }
                                return (
                                  <Box
                                    key={i}
                                    component="img"
                                    src={p.localUrl || p.metadata?.viewUrl}
                                    alt={`photo-${i + 1}`}
                                    onClick={() => openStepCarousel(photos, i)}
                                    sx={{
                                      width: 72,
                                      height: 72,
                                      objectFit: "cover",
                                      borderRadius: 1,
                                      border: "1px solid",
                                      borderColor: "divider",
                                      cursor: "pointer",
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          </Box>
                        )}

                        {toEntityModule.renderEntityUi && (
                          <>
                            <SectionLabel>
                              {t("pda.workorder.detail.toLocation")}
                              {tc?.toEntity ? ` (${tc.toEntity})` : ""}
                            </SectionLabel>
                            <EntityScan
                              entity={tc?.toEntity}
                              expected={step.toLocation}
                              onConfirm={() => handleToCompleted(step)}
                              disabled={saving}
                              t={t}
                              label={t("pda.workorder.detail.toLocation")}
                              staffNameMap={staffNameMap}
                            />
                          </>
                        )}
                      </Box>
                    )}

                    {phase === PHASE.CONFIRM && (
                      <Box>
                        {!noConfirm && (
                          <Button
                            variant="contained"
                            fullWidth
                            disabled={saving}
                            onClick={() => handleFinalConfirmed(step)}
                            sx={{ py: 1.2 }}
                          >
                            {t("pda.workorder.detail.confirm")}
                          </Button>
                        )}
                      </Box>
                    )}

                    {saving && (
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <CircularProgress size={22} />
                      </Box>
                    )}
                  </Box>
                )}

                {/* Done step: show photo thumbnails */}
                {isDone && photos.length > 0 && (
                  <Box
                    sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}
                  >
                    {photos.map((p, i) => {
                      if (p.metadata?.id) {
                        return (
                          <ThumbnailImg
                            key={i}
                            fileId={p.metadata.id}
                            viewUrl={
                              p.metadata.viewUrl || p.metadata.url || p.localUrl
                            }
                            provider={p.metadata.provider || null}
                            width={52}
                            height={52}
                            alt={p.metadata.name || `photo-${i + 1}`}
                            style={{
                              borderRadius: 4,
                              objectFit: "cover",
                              border: "1px solid var(--color-gray-300)",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                            onClick={() => openStepCarousel(photos, i)}
                          />
                        );
                      }
                      return (
                        <Box
                          key={i}
                          component="img"
                          src={p.localUrl || p.metadata?.viewUrl}
                          onClick={() => openStepCarousel(photos, i)}
                          sx={{
                            width: 52,
                            height: 52,
                            objectFit: "cover",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                            cursor: "pointer",
                          }}
                        />
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <ImageCarousel
        images={carouselImages}
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
        startIndex={carouselStart}
      />

      {/* Closed banner */}
      {isClosed && (
        <Card variant="outlined" sx={{ borderColor: "success.main" }}>
          <CardContent
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 1,
              "&:last-child": { pb: 2 },
            }}
          >
            <CheckCircleIcon sx={{ color: "success.main" }} />
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ color: "success.main" }}
            >
              {t("pda.workorder.detail.allDone")}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
