import React, { useState } from "react";
import { Box, Checkbox, FormControlLabel, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";
import { FormActions } from "../common/CRUDActions";

const BriefingAdd = ({ onCancel }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    briefingTitle: "",
    briefingDescription: "",
    active: "0",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!String(form.briefingTitle || "").trim()) {
      setErrorMsg(t("basic.requiredFields", "All fields are required."));
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccess(false);

    try {
      await request("POST", "/api/briefings", {
        briefingTitle: String(form.briefingTitle || "").trim(),
        briefingDescription: String(form.briefingDescription || "").trim(),
        active: Number(form.active),
      });
      setSuccess(true);
      if (onCancel) onCancel(true);
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message ||
          t("briefing.saveFailed", "Save failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: 560,
        mx: "auto",
        mt: 2,
        mb: 2,
        background: "var(--color-gray-100)",
        p: 2,
        borderRadius: 2,
      }}
    >
      <HeaderBar
        title={t("briefing.addTitle", "Add Briefing Setup")}
        sx={{ mb: 1 }}
      />

      <TextField
        label={t("briefing.titleLabel", "Title")}
        name="briefingTitle"
        value={form.briefingTitle}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
      />

      <TextField
        label={t("briefing.descriptionLabel", "Description")}
        name="briefingDescription"
        value={form.briefingDescription}
        onChange={handleChange}
        fullWidth
        multiline
        minRows={3}
        margin="normal"
      />

      <FormControlLabel
        sx={{ mt: 1 }}
        control={
          <Checkbox
            checked={String(form.active) === "1"}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                active: event.target.checked ? "1" : "0",
              }))
            }
          />
        }
        label={t("briefing.activeLabel", "Active")}
      />

      {errorMsg && (
        <div style={{ color: "var(--color-danger)", marginTop: 8 }}>
          {errorMsg}
        </div>
      )}
      {success && (
        <div style={{ color: "var(--color-success)", marginTop: 8 }}>
          {t("basic.true")}
        </div>
      )}

      <FormActions
        onSubmit={handleSubmit}
        onCancel={() => onCancel && onCancel(false)}
        loading={loading}
        submitLabel={t("basic.save", "Save")}
      />
    </Box>
  );
};

export default BriefingAdd;
