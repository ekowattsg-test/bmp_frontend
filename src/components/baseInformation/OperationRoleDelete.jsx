import React, { useState } from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";

const OperationRoleDelete = ({ record, staffList = [], onCancel, onDeleted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!record) return null;

  const staff = staffList.find((s) => String(s.staffId) === String(record.staffId));
  const staffDisplay = staff ? (staff.staffName || record.staffId) : record.staffId;

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await request("DELETE", `/api/operationstaffs/${record.operationRoleId}`);
      if (onDeleted) onDeleted();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.false"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 440, mx: "auto", mt: 2, mb: 2 }}>
      <HeaderBar title={t("operationRole.deleteTitle", "Delete Operation Role")} sx={{ mb: 1 }} />
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body1" gutterBottom>
          {t("operationRole.confirmDelete", "Are you sure you want to remove this operation role assignment?")}
        </Typography>
        <Box sx={{ my: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main", minWidth: 130 }}>
              {t("operationRole.staffId", "Staff")}:
            </Typography>
            <Typography variant="body2">{staffDisplay}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main", minWidth: 130 }}>
              {t("operationRole.roleName", "Operation Role")}:
            </Typography>
            <Typography variant="body2">{record.roleName}</Typography>
          </Box>
        </Box>
        {errorMsg && <div style={{ color: "var(--color-danger)", marginTop: 8 }}>{errorMsg}</div>}
      </Paper>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button variant="outlined" onClick={() => onCancel && onCancel()} disabled={loading}>
          {t("basic.cancel", "Cancel")}
        </Button>
        <Button variant="contained" color="error" onClick={handleDelete} disabled={loading}>
          {loading ? t("basic.loading", "...") : t("basic.delete", "Delete")}
        </Button>
      </Box>
    </Box>
  );
};

export default OperationRoleDelete;
