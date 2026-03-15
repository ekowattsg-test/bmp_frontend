import React, { useState } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";

const StaffSkillDelete = ({ skill, onCancel, onDeleted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await request("DELETE", `/api/staffskills/${skill.staffSkillId}`);
      if (onDeleted) onDeleted();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.false"));
    }
    setLoading(false);
  };

  if (!skill) return null;

  return (
    <Box
      sx={{
        maxWidth: { xs: "100%", sm: 500 },
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
          {t("staffSkillList.deleteTitle", "Delete Skill")}
        </Typography>
        <Box
          sx={{
            my: 2,
            p: 2,
            backgroundColor: "var(--color-warning-bg)",
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
            {t("staffSkillList.confirmDelete", "Delete this skill?")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            <strong>{skill.skillName}</strong>
          </Typography>
        </Box>
        {errorMsg && (
          <Typography color="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={loading}
            sx={{ flex: 1 }}
          >
            {t("basic.delete", "Delete")}
          </Button>
          <Button
            variant="outlined"
            onClick={() => onCancel(false)}
            disabled={loading}
            sx={{ flex: 1 }}
          >
            {t("basic.cancel", "Cancel")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default StaffSkillDelete;
