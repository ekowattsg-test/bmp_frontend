import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import StockCodeScanInput from "../stock/StockCodeScanInput";
import {
  fetchValidLocationCodes,
  resolveLocationByGps,
  resolveLocationByScan,
} from "../../helpers/location_scan_helper";

const buildDefaultLabels = (t) => ({
  title: t("locationScanner.title", "Scan Location QR Code"),
  detectByGps: t("locationScanner.detectByGps", "Detect by GPS"),
  detectingLocation: t(
    "locationScanner.detectingLocation",
    "Detecting location...",
  ),
  gpsLocationFailed: t(
    "locationScanner.gpsLocationFailed",
    "Could not detect location via GPS. Please scan the location QR code.",
  ),
  changeLocation: t("locationScanner.changeLocation", "Change Location"),
  scanLabel: t("locationScanner.scanLabel", "Location"),
  scanPlaceholder: t(
    "locationScanner.scanPlaceholder",
    "Scan or type location code...",
  ),
});

function LocationScanner({
  value,
  onChange,
  gpsEnabled = true,
  autoDetectGpsOnMount = false,
  disabled = false,
  onScanSuccess,
  labels: labelsProp,
  title,
}) {
  const { t } = useTranslation();
  const labels = { ...buildDefaultLabels(t), ...labelsProp };

  const [scanInput, setScanInput] = useState("");
  const [gpsBusy, setGpsBusy] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [gpsFailed, setGpsFailed] = useState(false);
  const [validCodes, setValidCodes] = useState({
    projectCodes: [],
    inventoryLocations: [],
  });
  const [scanError, setScanError] = useState("");

  const isBusy = disabled;
  const gpsButtonBusy = gpsBusy || scanBusy;

  // Debounce timer for scanner auto-submit. Barcode scanners send the entire
  // code in a rapid burst, so a short pause after input change means the scan
  // is complete and we can submit without waiting for an Enter key.
  const scanTimerRef = useRef(null);
  const lastInputTimeRef = useRef(0);
  const SCAN_TYPING_GAP_MS = 80;
  const SCAN_SUBMIT_DELAY_MS = 250;

  const onChangeRef = useRef(onChange);
  const onScanSuccessRef = useRef(onScanSuccess);
  const validCodesRef = useRef(validCodes);
  useEffect(() => {
    onChangeRef.current = onChange;
    onScanSuccessRef.current = onScanSuccess;
    validCodesRef.current = validCodes;
  }, [onChange, onScanSuccess, validCodes]);

  useEffect(() => {
    let cancelled = false;
    fetchValidLocationCodes()
      .then((codes) => {
        if (!cancelled) {
          setValidCodes(codes);
          if (
            autoDetectGpsOnMount &&
            gpsEnabled &&
            !value &&
            codes.projectCodes.length > 0
          ) {
            setGpsBusy(true);
            resolveLocationByGps(codes.projectCodes)
              .then((code) => {
                if (!cancelled) {
                  if (code) {
                    onChangeRef.current(code);
                    if (typeof onScanSuccessRef.current === "function") {
                      onScanSuccessRef.current(code);
                    }
                  } else {
                    setGpsFailed(true);
                  }
                }
              })
              .catch(() => {
                if (!cancelled) setGpsFailed(true);
              })
              .finally(() => {
                if (!cancelled) setGpsBusy(false);
              });
          }
        }
      })
      .catch(() => {
        if (!cancelled)
          setValidCodes({ projectCodes: [], inventoryLocations: [] });
      });
    return () => {
      cancelled = true;
    };
    // Auto-detect on mount only; ignore callback reference changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDetectGpsOnMount, gpsEnabled, value]);

  const handleScan = useCallback(
    async (rawValue) => {
      const inputValue = String(rawValue || "").trim();
      if (!inputValue) return;
      setScanBusy(true);
      setScanError("");
      try {
        const code = await resolveLocationByScan(
          inputValue,
          validCodesRef.current,
        );
        setScanInput("");
        onChangeRef.current(code);
        if (typeof onScanSuccessRef.current === "function") {
          onScanSuccessRef.current(code);
        }
      } catch (err) {
        setScanInput("");
        setScanError(
          err?.message ||
            t("locationScanner.invalidLocationCode", {
              code: inputValue,
              defaultValue: `Invalid location code: ${inputValue}`,
            }),
        );
      } finally {
        setScanBusy(false);
      }
    },
    [t],
  );

  const scheduleScanSubmit = useCallback(
    (nextValue) => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      const trimmed = String(nextValue || "").trim();
      if (!trimmed) return;

      const now = Date.now();
      const gap = now - lastInputTimeRef.current;
      lastInputTimeRef.current = now;

      // If characters are arriving rapidly (scanner burst), use a short delay.
      // If the user is typing slowly, wait longer so they can finish.
      const delay =
        gap > 0 && gap < SCAN_TYPING_GAP_MS
          ? SCAN_SUBMIT_DELAY_MS
          : SCAN_TYPING_GAP_MS * 10;

      scanTimerRef.current = setTimeout(() => {
        scanTimerRef.current = null;
        handleScan(trimmed);
      }, delay);
    },
    [handleScan],
  );

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, []);

  const handleDetectByGps = async () => {
    setGpsBusy(true);
    setGpsFailed(false);
    setScanError("");
    try {
      const code = await resolveLocationByGps(
        validCodesRef.current.projectCodes,
      );
      if (code) {
        onChangeRef.current(code);
        if (typeof onScanSuccessRef.current === "function") {
          onScanSuccessRef.current(code);
        }
      } else {
        setGpsFailed(true);
      }
    } catch {
      setGpsFailed(true);
    } finally {
      setGpsBusy(false);
    }
  };

  const handleClear = () => {
    onChange("");
    setGpsFailed(false);
    setScanError("");
  };

  const renderSelected = () => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1.5,
        bgcolor: "action.selected",
        borderRadius: 1,
        border: "1px solid var(--color-gray-300)",
      }}
    >
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
        {value}
      </Typography>
      <Button
        size="small"
        variant="outlined"
        onClick={handleClear}
        disabled={disabled}
      >
        {labels.changeLocation}
      </Button>
    </Box>
  );

  const renderDetecting = () => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
      <CircularProgress size={20} />
      <Typography variant="body2" color="text.secondary">
        {labels.detectingLocation}
      </Typography>
    </Box>
  );

  const renderScanner = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {gpsEnabled && (
        <Button
          variant="outlined"
          onClick={handleDetectByGps}
          disabled={gpsButtonBusy || disabled}
          sx={{ alignSelf: "flex-start" }}
        >
          {labels.detectByGps}
        </Button>
      )}
      {gpsBusy && renderDetecting()}
      {gpsFailed && !gpsBusy && (
        <Alert severity="info" sx={{ py: 0.5 }}>
          {labels.gpsLocationFailed}
        </Alert>
      )}
      <StockCodeScanInput
        value={scanInput}
        onChange={(nextValue) => {
          setScanInput(nextValue);
          scheduleScanSubmit(nextValue);
        }}
        onSubmit={handleScan}
        busy={scanBusy}
        disabled={disabled}
        label={labels.scanLabel}
        placeholder={labels.scanPlaceholder}
        showSubmitButton={false}
        allowProductSearch={false}
      />
      {scanError && (
        <Alert severity="error" sx={{ py: 0.5 }}>
          {scanError}
        </Alert>
      )}
    </Box>
  );

  const renderContent = () => {
    if (value) {
      return renderSelected();
    }
    return renderScanner();
  };

  if (title) {
    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            {title}
          </Typography>
          {renderContent()}
        </CardContent>
      </Card>
    );
  }

  return renderContent();
}

LocationScanner.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  gpsEnabled: PropTypes.bool,
  autoDetectGpsOnMount: PropTypes.bool,
  disabled: PropTypes.bool,
  onScanSuccess: PropTypes.func,
  labels: PropTypes.object,
  title: PropTypes.string,
};

export default LocationScanner;
