import React, { useState } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";

const CompanyDelete = ({ company, onCancel, onDeleted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await request("DELETE", `/api/companies/${company.companyId}`);
      if (onDeleted) onDeleted();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.failed"));
    }
    setLoading(false);
  };

  if (!company) return null;

  return (
    <Box
      sx={{
        maxWidth: { xs: "100%", sm: 400 },
        mx: "auto",
        mt: 4,
        p: { xs: 1, sm: 3 },
      }}
    >
      <Paper sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
        <Typography
          variant="h6"
          gutterBottom
          style={{ fontSize: "clamp(1.2rem, 4vw, 2rem)" }}
        >
          {t("companyList.deleteTitle", "Delete Company")}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(
            "companyList.confirmDelete",
            "Are you sure you want to delete this company?"
          )}
        </Typography>
        <Box sx={{ my: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("companyList.companyId")}:
              </Typography>
              <Typography variant="body2">{company.companyId}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("companyList.companyName")}:
              </Typography>
              <Typography variant="body2">{company.companyName}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("companyList.active")}:
              </Typography>
              <Typography variant="body2">
                {t(`basic.${company.active ? "true" : "false"}`)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("companyList.showCompany")}:
              </Typography>
              <Typography variant="body2">
                {t(`basic.${company.showCompany ? "true" : "false"}`)}
              </Typography>
            </Box>
          </Box>
        </Box>
        {errorMsg && (
          <Typography color="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={loading}
          >
            {t("basic.delete")}
          </Button>
          <Button
            variant="outlined"
            onClick={() => onCancel(false)}
            disabled={loading}
          >
            {t("basic.cancel", "Cancel")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default CompanyDelete;
