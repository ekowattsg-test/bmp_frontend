import React, { useState } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";

const BriefingDelete = ({ briefing, onCancel, onDeleted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!briefing) return null;

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await request("DELETE", `/api/briefings/${briefing.briefingId}`);
      if (onDeleted) onDeleted();
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message ||
          t("briefing.deleteFailed", "Delete failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", mt: 2, mb: 2 }}>
      <HeaderBar
        title={t("briefing.deleteTitle", "Delete Briefing Setup")}
        sx={{ mb: 1 }}
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body1" gutterBottom>
          {t(
            "briefing.confirmDelete",
            "Are you sure you want to delete this briefing setup?",
          )}
        </Typography>

        <Box sx={{ my: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, color: "primary.main", minWidth: 130 }}
            >
              {t("briefing.titleLabel", "Title")}:
            </Typography>
            <Typography variant="body2">{briefing.briefingTitle}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, color: "primary.main", minWidth: 130 }}
            >
              {t("briefing.activeLabel", "Active")}:
            </Typography>
            <Typography variant="body2">
              {Number(briefing.active) === 1
                ? t("basic.true", "True")
                : t("basic.false", "False")}
            </Typography>
          </Box>
        </Box>

        {errorMsg && (
          <div style={{ color: "var(--color-danger)", marginTop: 8 }}>
            {errorMsg}
          </div>
        )}
      </Paper>

      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          onClick={() => onCancel && onCancel()}
          disabled={loading}
        >
          {t("basic.cancel", "Cancel")}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? t("basic.loading", "...") : t("basic.delete", "Delete")}
        </Button>
      </Box>
    </Box>
  );
};

export default BriefingDelete;
