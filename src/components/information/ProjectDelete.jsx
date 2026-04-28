import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";

const ProjectDelete = ({ project, onCancel, onDeleted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await request("DELETE", `/api/projects/${project.projectCode}`);
      onDeleted();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.false"));
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 480,
        mx: "auto",
        mt: 2,
        background: "var(--color-gray-100)",
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
      }}
    >
      <HeaderBar title={t("project.deleteTitle")} sx={{ mb: 2 }} />
      <Typography sx={{ mb: 2 }}>
        {t("project.confirmDelete")} <strong>{project.projectName}</strong>?
      </Typography>
      {errorMsg && (
        <div style={{ color: "var(--color-danger)", marginBottom: 8 }}>
          {errorMsg}
        </div>
      )}
      <Box sx={{ display: "flex", gap: 2 }}>
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
          onClick={() => onCancel()}
          disabled={loading}
        >
          {t("basic.cancel")}
        </Button>
      </Box>
    </Box>
  );
};

export default ProjectDelete;
