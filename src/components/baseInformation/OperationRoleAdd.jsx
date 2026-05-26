import React, { useState } from "react";
import { Box, TextField, MenuItem, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";
import { FormActions } from "../common/CRUDActions";

const OperationRoleAdd = ({ staffList = [], roles = [], onCancel }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ staffId: "", roleName: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.staffId || !form.roleName) {
      setErrorMsg(t("basic.requiredFields", "All fields are required."));
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setSuccess(false);
    try {
      await request("POST", "/api/operationstaffs", {
        staffId: form.staffId,
        roleName: form.roleName,
      });
      setSuccess(true);
      if (onCancel) onCancel(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.false"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: 440, mx: "auto", mt: 2, mb: 2, background: "var(--color-gray-100)", p: 2, borderRadius: 2 }}
    >
      <HeaderBar title={t("operationRole.addTitle", "Add Operation Role")} sx={{ mb: 1 }} />

      <TextField
        select
        label={t("operationRole.staffId", "Staff")}
        name="staffId"
        value={form.staffId}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
      >
        {staffList.map((s) => (
          <MenuItem key={s.staffId} value={s.staffId}>
            {s.staffName || s.staffId}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label={t("operationRole.roleName", "Operation Role")}
        name="roleName"
        value={form.roleName}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
      >
        {roles.map((r) => (
          <MenuItem key={r.roleName} value={r.roleName}>
            {r.roleName}{r.roleDescription ? ` — ${r.roleDescription}` : ""}
          </MenuItem>
        ))}
      </TextField>

      {errorMsg && <div style={{ color: "var(--color-danger)", marginTop: 8 }}>{errorMsg}</div>}
      {success && <div style={{ color: "var(--color-success)", marginTop: 8 }}>{t("basic.true")}</div>}

      <FormActions
        onSubmit={handleSubmit}
        onCancel={() => onCancel && onCancel(false)}
        loading={loading}
        submitLabel={t("basic.save", "Save")}
      />
    </Box>
  );
};

export default OperationRoleAdd;
