import React, { useEffect, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Normalise a raw scanned value.
 * If it looks like a URL, extract the meaningful segment; otherwise return as-is.
 */
export const normalizeScannedValue = (raw) => {
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
    // Not a URL — use raw value.
  }
  return value;
};

/**
 * useCameraScanner — shared hook that provides html5-qrcode camera scanning.
 *
 * @param {object} options
 * @param {function} options.onScan   Called with the normalised scanned string.
 * @param {string}  [options.containerId]  ID of the div html5-qrcode will render into.
 *
 * Returns { scannerOpen, openScanner, stopScanner, scannerOverlay }
 * Place `scannerOverlay` anywhere in the JSX tree (fixed overlay, z-index 1400).
 */
export function useCameraScanner({
  onScan,
  containerId = "pda-camera-scanner",
}) {
  const { t } = useTranslation();
  const html5QrRef = useRef(null);
  const onScanRef = useRef(onScan);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Keep ref current without needing it in deps of openScanner.
  onScanRef.current = onScan;

  const stopScanner = async () => {
    setScannerOpen(false);
    try {
      if (html5QrRef.current) {
        try {
          await html5QrRef.current.stop();
        } catch {
          // Ignore stop errors.
        }
        try {
          html5QrRef.current.clear?.();
        } catch {
          // Ignore cleanup errors.
        }
        html5QrRef.current = null;
      }
    } catch {
      // Ignore.
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
      const Html5Qrcode = mod?.Html5Qrcode || mod?.default;
      if (!Html5Qrcode) throw new Error("Html5Qrcode not available");
      html5QrRef.current = new Html5Qrcode(containerId);
      await html5QrRef.current.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: 200 },
        async (decodedText) => {
          const normalized = normalizeScannedValue(decodedText);
          if (!normalized) return;
          await stopScanner();
          onScanRef.current?.(normalized);
        },
        () => {},
      );
    } catch (err) {
      console.error("Failed to start camera scanner", err);
      alert(t("stockTake.cameraFailed", "Failed to open camera"));
      await stopScanner();
    }
  };

  // Clean up scanner resources when the host component unmounts.
  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        try {
          html5QrRef.current.stop().catch?.(() => {});
        } catch {
          // Ignore.
        }
        html5QrRef.current = null;
      }
    };
  }, []);

  const scannerOverlay = scannerOpen ? (
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
          id={containerId}
          style={{ width: "100%", height: 240, borderRadius: 6 }}
        />
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
          <Button variant="outlined" onClick={stopScanner}>
            {t("basic.cancel", "Cancel")}
          </Button>
        </Box>
      </Box>
    </Box>
  ) : null;

  return { scannerOpen, openScanner, stopScanner, scannerOverlay };
}
