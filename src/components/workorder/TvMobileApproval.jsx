import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { useCameraScanner } from "../../helpers/camera_scanner_helper";
import HeaderBar from "../common/HeaderBar";

const TvMobileApproval = () => {
  const { t } = useTranslation();
  const [sessionCode, setSessionCode] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const resetForm = () => {
    setSessionCode("");
    setPin("");
    setSuccessMsg("");
    setErrorMsg("");
  };

  const { openScanner, scannerOverlay } = useCameraScanner({
    onScan: (scannedValue) => {
      setSessionCode(String(scannedValue || "").trim());
      setErrorMsg("");
    },
    containerId: "tv-approval-session-code-scanner",
    normalize: false,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const payload = {
      sessionCode: String(sessionCode || "").trim(),
      pin: String(pin || "").trim(),
      destinationUrl: "/tv/projects",
    };

    if (!payload.sessionCode || !payload.pin) {
      setErrorMsg(
        t("tvApproval.errorRequired", "Session code and PIN are required."),
      );
      return;
    }

    setSubmitting(true);
    try {
      await request("POST", "/api/tv-auth/approve", payload, {
        skipAuthRedirect: true,
        skipBackendErrorDialog: true,
      });
      setSuccessMsg(
        t("tvApproval.success", "TV session approved successfully."),
      );
      setErrorMsg("");
    } catch (error) {
      const backendMessage = String(
        error?.response?.data?.message || "",
      ).trim();
      setErrorMsg(
        backendMessage ||
          t("tvApproval.errorFailed", "Failed to approve TV session."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <HeaderBar
        title={t("tvApproval.title", "Mobile App Approval")}
        subtitle={t(
          "tvApproval.subtitle",
          "Approve TV login sessions from Operations",
        )}
      />

      {successMsg ? (
        <Box
          sx={{
            maxWidth: 560,
            mt: 2,
            p: 3,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <Stack spacing={2}>
            <Alert severity="success">{successMsg}</Alert>
            <Typography variant="body2" color="text.secondary">
              {t(
                "tvApproval.successDetail",
                "TV session approval has been confirmed.",
              )}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="contained" onClick={resetForm}>
                {t("tvApproval.approveAnother", "Approve another session")}
              </Button>
            </Box>
          </Stack>
        </Box>
      ) : (
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            maxWidth: 560,
            mt: 2,
            p: 3,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <Stack spacing={2}>
            <TextField
              label={t("tvApproval.sessionCode", "Session Code")}
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              required
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={openScanner}
                      aria-label={t(
                        "tvApproval.scanSessionCode",
                        "Scan session code",
                      )}
                      disabled={submitting}
                    >
                      <QrCodeScannerIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label={t("tvApproval.pin", "PIN")}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              fullWidth
            />
            {errorMsg ? <Alert severity="error">{errorMsg}</Alert> : null}

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting
                  ? t("tvApproval.submitting", "Approving...")
                  : t("tvApproval.approve", "Approve")}
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary">
              {t(
                "tvApproval.helper",
                "Use the session code and PIN shown on the TV bootstrap screen.",
              )}
            </Typography>
          </Stack>
        </Box>
      )}
      {scannerOverlay}
    </Box>
  );
};

export default TvMobileApproval;
