import React, { useState, useRef } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
} from "@mui/material";
import {
  QrCode2 as QrCode2Icon,
  Print as PrintIcon,
  QrCodeScanner as QrCodeScannerIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { signEntity } from "../../helpers/qr_token_helper";
import PageHeader from "../common/PageHeader";
import HelpDialog from "../common/HelpDialog";

const QrGenerator = () => {
  const { t } = useTranslation();
  const printRef = useRef(null);

  const [helpOpen, setHelpOpen] = useState(false);
  const [entityId, setEntityId] = useState("");
  const [qrToken, setQrToken] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    const trimmed = entityId.trim();
    if (!trimmed) {
      setError(t("qrGenerator.noEntityId"));
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const token = await signEntity(trimmed);
      setQrToken(token);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open("", "_blank", "width=400,height=500");
    win.document.write(`
      <html>
        <head>
          <title>QR Code – ${entityId}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 24px; }
            svg { display: block; margin: 0 auto 16px; }
            p { margin: 4px 0; font-size: 14px; }
            .small { font-size: 11px; color: #555; word-break: break-all; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <p><strong>${entityId}</strong></p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Box>
      <PageHeader
        title={t("qrGenerator.title")}
        subtitle={t("qrGenerator.subtitle")}
        icon={QrCode2Icon}
        onHelpClick={() => setHelpOpen(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("qrGenerator.helpTitle")}
        content={t("qrGenerator.helpBody")}
      />

      <Paper
        sx={{
          p: 3,
          maxWidth: 480,
          backgroundColor: "var(--color-gray-100)",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label={t("qrGenerator.entityIdLabel")}
            placeholder={t("qrGenerator.entityIdPlaceholder")}
            value={entityId}
            onChange={(e) => {
              setEntityId(e.target.value);
              setQrToken(null);
              setError("");
            }}
            size="small"
            fullWidth
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            variant="contained"
            startIcon={<QrCodeScannerIcon />}
            onClick={handleGenerate}
            disabled={generating}
          >
            {t("qrGenerator.generateButton")}
          </Button>
        </Box>
      </Paper>

      {qrToken && (
        <Paper
          sx={{
            mt: 3,
            p: 3,
            maxWidth: 480,
            borderRadius: 2,
            boxShadow: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          {/* Hidden div used for printing */}
          <Box ref={printRef} sx={{ display: "contents" }}>
            <QRCodeSVG value={qrToken} size={220} level="M" includeMargin />
          </Box>

          <Typography variant="subtitle1" fontWeight={700} textAlign="center">
            {entityId.trim()}
          </Typography>

          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            fullWidth
          >
            {t("qrGenerator.printButton")}
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default QrGenerator;
