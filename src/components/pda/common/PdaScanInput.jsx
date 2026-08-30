import React, { useEffect, useRef } from "react";
import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import NfcIcon from "@mui/icons-material/Nfc";
import { useTranslation } from "react-i18next";
import { useCameraScanner } from "../../../helpers/camera_scanner_helper";
import { useNfcScanner } from "../../../helpers/nfc_scanner_helper";

/**
 * PdaScanInput — single reusable scan input for all PDA scanning steps.
 *
 * Handles:
 *   - auto-focus on mount and after camera overlay closes
 *   - camera scan button (html5-qrcode overlay)
 *   - optional submit action button (Add / CircularProgress)
 *
 * onChange receives a plain string value, not an event object.
 */
export default function PdaScanInput({
  value,
  onChange, // (value: string) => void
  onSubmit, // () => void — called on Enter or action button click
  placeholder,
  disabled = false,
  scanning = false, // shows CircularProgress in the action button
  error = false,
  helperText,
  autoFocus: autoFocusProp = true,
  showActionButton = false,
  sx,
  cameraContainerId = "pda-scan-input",
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);

  const { openScanner, scannerOpen, scannerOverlay } = useCameraScanner({
    containerId: cameraContainerId,
    onScan: onChange,
  });
  const { nfcSupported, nfcScanning, startNfc } = useNfcScanner({
    onScan: onChange,
  });

  // Focus the input on mount and whenever the camera overlay closes.
  useEffect(() => {
    if (!autoFocusProp || scannerOpen) return;
    const id = setTimeout(
      () => inputRef.current?.focus({ preventScroll: true }),
      80,
    );
    return () => clearTimeout(id);
  }, [autoFocusProp, scannerOpen]);

  return (
    <>
      <Box sx={{ display: "flex", gap: showActionButton ? 1 : 0, ...sx }}>
        <TextField
          size="small"
          fullWidth
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit?.();
          }}
          disabled={disabled}
          error={error}
          helperText={helperText}
          inputRef={inputRef}
          autoComplete="off"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={openScanner}
                  disabled={disabled}
                  aria-label={t("stockTake.openScannerHtml5", "Scan")}
                >
                  <QrCodeScannerIcon fontSize="small" />
                </IconButton>
                {nfcSupported && (
                  <IconButton
                    size="small"
                    onClick={startNfc}
                    disabled={disabled || nfcScanning}
                    aria-label={t("stockTake.openNfcScanner", "Scan NFC")}
                  >
                    {nfcScanning ? (
                      <CircularProgress size={20} />
                    ) : (
                      <NfcIcon fontSize="small" />
                    )}
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
        />
        {showActionButton && (
          <IconButton
            onClick={onSubmit}
            disabled={scanning || !String(value || "").trim()}
            color="primary"
          >
            {scanning ? <CircularProgress size={20} /> : <AddIcon />}
          </IconButton>
        )}
      </Box>
      {scannerOverlay}
    </>
  );
}
