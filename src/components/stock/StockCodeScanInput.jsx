import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { useTranslation } from "react-i18next";

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
}) => {
  const { t } = useTranslation();
  const html5QrRef = useRef(null);
  const [scannerOpen, setScannerOpen] = useState(false);

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
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
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
    </>
  );
};

export default StockCodeScanInput;
