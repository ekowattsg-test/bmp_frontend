import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";
import Modal from "../common/Modal";
import { request } from "../../helpers/axios_helper";

const normalizeScannedValue = (raw) => {
  if (!raw) return "";
  const value = String(raw).trim();
  try {
    const url = new URL(value);
    const keys = ["stockCode", "code", "q", "id"];
    for (const key of keys) {
      if (url.searchParams.has(key)) {
        return String(url.searchParams.get(key) || "").trim();
      }
    }
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      return String(segments[segments.length - 1] || "").trim();
    }
  } catch {
    // Not a URL, use raw value.
  }
  return value;
};

const StockCodeScanInput = ({
  value,
  onChange,
  onSubmit,
  busy = false,
  label,
  placeholder,
  submitLabel,
  allowProductSearch = false,
}) => {
  const { t } = useTranslation();
  const html5QrRef = useRef(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerAllProducts, setPickerAllProducts] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const pickerProducts = (() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return pickerAllProducts;
    return pickerAllProducts.filter((p) =>
      String(p.productName || "")
        .toLowerCase()
        .includes(q),
    );
  })();

  const openPicker = () => {
    setPickerSearch("");
    setPickerOpen(true);
    if (pickerAllProducts.length === 0) {
      setPickerLoading(true);
      request("GET", "/api/stockviews")
        .then((res) => {
          const rows = Array.isArray(res?.data) ? res.data : [];
          const seen = new Set();
          const unique = rows.filter((r) => {
            const code = String(r?.stockCode || "").trim();
            if (!code || seen.has(code)) return false;
            seen.add(code);
            return true;
          });
          setPickerAllProducts(unique);
        })
        .catch(() => setPickerAllProducts([]))
        .finally(() => setPickerLoading(false));
    }
  };

  const handlePickerSearch = (q) => {
    setPickerSearch(q);
  };

  const handlePickerSelect = (product) => {
    const code = String(product.stockCode || "").trim();
    if (!code) return;
    setPickerOpen(false);
    onChange(code);
    onSubmit(code);
  };

  const stopScanner = async () => {
    setScannerOpen(false);
    try {
      if (html5QrRef.current) {
        try {
          await html5QrRef.current.stop();
        } catch {
          // Ignore stop errors when scanner is not actively running.
        }
        try {
          html5QrRef.current.clear && html5QrRef.current.clear();
        } catch {
          // Ignore cleanup errors.
        }
        html5QrRef.current = null;
      }
    } catch {
      // Ignore scanner cleanup errors.
    }
  };

  const openScanner = async () => {
    if (!("mediaDevices" in navigator)) {
      alert(t("stockTake.cameraNotSupported", "Camera not supported"));
      return;
    }

    await stopScanner();
    setScannerOpen(true);

    try {
      const mod = await import("html5-qrcode");
      const Html5Qrcode =
        mod && (mod.Html5Qrcode || mod.default || mod.Html5Qrcode);
      if (!Html5Qrcode) throw new Error("Html5Qrcode not available");

      html5QrRef.current = new Html5Qrcode("stock-code-scanner");
      await html5QrRef.current.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: 200 },
        async (decodedText) => {
          const normalized = normalizeScannedValue(decodedText);
          if (!normalized) return;
          onChange(normalized);
          await stopScanner();
          onSubmit(normalized);
        },
        () => {},
      );
    } catch (error) {
      console.error("Failed to start stock scanner", error);
      alert(t("stockTake.cameraFailed", "Failed to open camera"));
      await stopScanner();
    }
  };

  return (
    <>
      <Box
        sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}
      >
        <TextField
          label={label || t("stockTake.stockCode", "Stock code")}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || t("stockTake.scanPlaceholder")}
          fullWidth
          size="small"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {allowProductSearch && (
                  <IconButton
                    size="small"
                    onClick={openPicker}
                    aria-label={t(
                      "stockCodeScan.searchByProduct",
                      "Search by product",
                    )}
                    disabled={busy}
                  >
                    <SearchIcon />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={openScanner}
                  aria-label={t("stockTake.openScannerHtml5", "Scan")}
                  disabled={busy}
                >
                  <QrCodeScannerIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit(value);
            }
          }}
        />
        <Button
          variant="contained"
          onClick={() => onSubmit(value)}
          disabled={busy || !String(value || "").trim()}
        >
          {submitLabel || t("stockTake.scan", "Scan")}
        </Button>
      </Box>

      {scannerOpen && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0,0,0,0.6)",
          }}
        >
          <Box
            sx={{
              width: 320,
              maxWidth: "90%",
              bgcolor: "background.paper",
              p: 1,
              borderRadius: 1,
            }}
          >
            <div
              id="stock-code-scanner"
              style={{ width: "100%", height: 240, borderRadius: 6 }}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
              <Button variant="outlined" onClick={() => stopScanner()}>
                {t("basic.cancel", "Cancel")}
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {allowProductSearch && (
        <Modal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          title={t("stockCodeScan.searchByProductTitle", "Search Product")}
          maxWidth="sm"
        >
          <TextField
            autoFocus
            size="small"
            fullWidth
            label={t("stockCodeScan.searchByProductLabel", "Product name")}
            value={pickerSearch}
            onChange={(e) => handlePickerSearch(e.target.value)}
            placeholder={t(
              "stockCodeScan.searchByProductPlaceholder",
              "Type product name to search...",
            )}
            sx={{ mb: 1 }}
          />
          {pickerLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          <List dense disablePadding sx={{ maxHeight: 360, overflowY: "auto" }}>
            {pickerProducts.map((p) => (
              <ListItemButton
                key={p.stockCode}
                onClick={() => handlePickerSelect(p)}
                sx={{ gap: 2 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {p.productName || "-"}
                  </Typography>
                </Box>
                <Box sx={{ flexShrink: 0 }}>
                  <Typography variant="body2" color="text.secondary">
                    {p.stockCode || "-"}
                  </Typography>
                </Box>
              </ListItemButton>
            ))}
            {!pickerLoading && pickerProducts.length === 0 && (
              <Typography sx={{ p: 2, color: "text.secondary" }}>
                {t("stockCodeScan.noProductsFound", "No products found")}
              </Typography>
            )}
          </List>
        </Modal>
      )}
    </>
  );
};

export default StockCodeScanInput;
