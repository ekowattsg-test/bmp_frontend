import React, { useContext, useState } from "react";
import { Box, Button, Typography, Paper, Alert, Stack } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { PageHeader } from "../common";
import HelpDialog from "../common/HelpDialog";
import { uploadFileToWebhook } from "../../helpers/webhook_upload_helper";

const ProductExcelUpload = () => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
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

    if (!/\.csv$/i.test(selected.name || "")) {
      setFile(null);
      setErrorMsg(t("productExcelUpload.invalidFileType"));
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg(t("productExcelUpload.fileRequired"));
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const result = await uploadFileToWebhook({
        file,
        webhookUrl: import.meta.env.VITE_N8N_PRODUCT_EXCEL_WEBHOOK_URL,
        fields: {
          action: "productExcelUpload",
          purpose: "productExcelProcessing",
          companyId: String(userInfo?.companyId || ""),
        },
      });

      if (result.status === 200) {
        setSuccessMsg(t("productExcelUpload.success"));
      } else {
        setSuccessMsg(`${t("productExcelUpload.success")} (${result.status})`);
      }

      setFile(null);
    } catch (error) {
      setErrorMsg(error?.message || t("productExcelUpload.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("productExcelUpload.title")}
        subtitle={t("productExcelUpload.subtitle")}
        onHelpClick={() => setHelpOpen(true)}
        icon={UploadFileIcon}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("productExcelUpload.helpTitle")}
        content={t("productExcelUpload.helpBody")}
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
            {t("productExcelUpload.fileHint")}
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={loading}
            >
              {t("productExcelUpload.selectFile")}
              <input
                type="file"
                hidden
                accept=".csv,text/csv"
                onChange={handleFileChange}
              />
            </Button>

            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={loading || !file}
            >
              {loading
                ? t("productExcelUpload.uploading")
                : t("productExcelUpload.upload")}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary">
            {t("productExcelUpload.selectedFile")}:{" "}
            {file ? file.name : t("productExcelUpload.none")}
          </Typography>

          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
          {successMsg && <Alert severity="success">{successMsg}</Alert>}
        </Stack>
      </Paper>
    </Box>
  );
};

export default ProductExcelUpload;
