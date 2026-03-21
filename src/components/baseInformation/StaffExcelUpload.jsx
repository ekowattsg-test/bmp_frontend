import React, { useState } from "react";
import { Box, Button, Typography, Paper, Alert, Stack } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../common";
import HelpDialog from "../common/HelpDialog";
import { uploadFileToWebhook } from "../../helpers/webhook_upload_helper";

const StaffExcelUpload = () => {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    setErrorMsg("");
    setSuccessMsg("");

    if (!selected) {
      setFile(null);
      return;
    }

    if (!/\.(xls|xlsx)$/i.test(selected.name || "")) {
      setFile(null);
      setErrorMsg(t("staffExcelUpload.invalidFileType"));
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg(t("staffExcelUpload.fileRequired"));
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const result = await uploadFileToWebhook({
        file,
        webhookUrl:
          import.meta.env.VITE_N8N_STAFF_EXCEL_WEBHOOK_URL ||
          import.meta.env.VITE_N8N_BASE_URL,
        fields: {
          action: "staffExcelUpload",
          purpose: "staffExcelProcessing",
        },
      });

      if (result.status === 200) {
        setSuccessMsg(t("staffExcelUpload.success"));
      } else {
        setSuccessMsg(`${t("staffExcelUpload.success")} (${result.status})`);
      }

      setFile(null);
    } catch (error) {
      setErrorMsg(error?.message || t("staffExcelUpload.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("staffExcelUpload.title")}
        subtitle={t("staffExcelUpload.subtitle")}
        onHelpClick={() => setHelpOpen(true)}
        icon={UploadFileIcon}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("staffExcelUpload.helpTitle")}
        content={t("staffExcelUpload.helpBody")}
      />

      <Paper
        elevation={1}
        sx={{
          p: 3,
          backgroundColor: "background.paper",
          border: "1px solid var(--color-gray-200)",
          borderRadius: 2,
        }}
      >
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t("staffExcelUpload.fileHint")}
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={loading}
            >
              {t("staffExcelUpload.selectFile")}
              <input
                type="file"
                hidden
                accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
              />
            </Button>

            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={loading || !file}
            >
              {loading
                ? t("staffExcelUpload.uploading")
                : t("staffExcelUpload.upload")}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary">
            {t("staffExcelUpload.selectedFile")}:{" "}
            {file ? file.name : t("staffExcelUpload.none")}
          </Typography>

          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
          {successMsg && <Alert severity="success">{successMsg}</Alert>}
        </Stack>
      </Paper>
    </Box>
  );
};

export default StaffExcelUpload;
