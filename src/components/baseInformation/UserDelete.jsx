import React, { useState, useEffect } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";

const UserDelete = ({ user, onCancel, onDeleted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (user && user.companyId) {
      request("GET", "/api/companies")
        .then((response) => {
          const found = response.data.find(
            (c) => c.companyId === user.companyId
          );
          setCompanyName(found ? found.companyName : user.companyId);
        })
        .catch(() => {
          setCompanyName(user.companyId);
        });
    }
  }, [user]);

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await request("DELETE", `/api/users/${user.id}`);
      if (onDeleted) onDeleted();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.failed"));
    }
    setLoading(false);
  };

  if (!user) return null;

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
          {t("userList.deleteTitle", "Delete User")}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(
            "userList.confirmDelete",
            "Are you sure you want to delete this user?"
          )}
        </Typography>
        <Box sx={{ my: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("userList.firstName")}:
              </Typography>
              <Typography variant="body2">{user.firstName}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("userList.lastName")}:
              </Typography>
              <Typography variant="body2">{user.lastName}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("userList.login")}:
              </Typography>
              <Typography variant="body2">{user.login}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("userList.companyId")}:
              </Typography>
              <Typography variant="body2">{companyName}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("userList.level")}:
              </Typography>
              <Typography variant="body2">{user.level}</Typography>
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

export default UserDelete;
