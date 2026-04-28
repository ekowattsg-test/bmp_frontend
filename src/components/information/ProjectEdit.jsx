import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";

const ProjectEdit = ({ project, customers, onCancel }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    projectCode: project.projectCode || "",
    projectName: project.projectName || "",
    projectDescription: project.projectDescription || "",
    customerId: project.customerId !== null && project.customerId !== undefined ? project.customerId : "",
    startDate: project.startDate || "",
    endDate: project.endDate || "",
    projectLocation: project.projectLocation || "",
    mobileNumber: project.mobileNumber || "",
    active: project.active !== undefined ? project.active : true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const validate = () => {
    const errs = {};
    if (!form.projectName.trim())
      errs.projectName = t("project.projectName") + " is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitch = (e) => {
    setForm((prev) => ({ ...prev, active: e.target.checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await request("PUT", `/api/projects/${project.projectCode}`, {
        ...form,
        customerId: form.customerId !== "" ? Number(form.customerId) : null,
      });
      onCancel(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.false"));
    }
    setLoading(false);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: { xs: "100%", sm: 560 },
        mx: "auto",
        mt: 2,
        mb: 2,
        background: "var(--color-gray-100)",
        p: { xs: 1, sm: 3 },
        borderRadius: 2,
      }}
    >
      <HeaderBar title={t("project.editTitle")} sx={{ mb: 1 }} />
      <TextField
        label={t("project.projectCode")}
        value={form.projectCode}
        fullWidth
        margin="normal"
        disabled
      />
      <TextField
        label={t("project.projectName")}
        name="projectName"
        value={form.projectName}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        error={!!errors.projectName}
        helperText={errors.projectName}
      />
      <TextField
        label={t("project.projectDescription")}
        name="projectDescription"
        value={form.projectDescription}
        onChange={handleChange}
        fullWidth
        margin="normal"
        multiline
        rows={2}
      />
      <TextField
        select
        label={t("project.customerId")}
        name="customerId"
        value={form.customerId}
        onChange={handleChange}
        fullWidth
        margin="normal"
      >
        <MenuItem value="">{t("project.noCustomer")}</MenuItem>
        {customers.map((c) => (
          <MenuItem key={c.customerId} value={c.customerId}>
            {c.customerName}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={t("project.startDate")}
        name="startDate"
        value={form.startDate}
        onChange={handleChange}
        fullWidth
        margin="normal"
        type="date"
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label={t("project.endDate")}
        name="endDate"
        value={form.endDate}
        onChange={handleChange}
        fullWidth
        margin="normal"
        type="date"
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label={t("project.projectLocation")}
        name="projectLocation"
        value={form.projectLocation}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label={t("project.mobileNumber")}
        name="mobileNumber"
        value={form.mobileNumber}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <FormControlLabel
        control={
          <Switch
            checked={form.active}
            onChange={handleSwitch}
            name="active"
          />
        }
        label={t("project.active")}
        sx={{ mt: 1 }}
      />
      {errorMsg && (
        <div style={{ color: "var(--color-danger)", marginTop: 8 }}>
          {errorMsg}
        </div>
      )}
      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {t("basic.save")}
        </Button>
        <Button
          variant="outlined"
          onClick={() => onCancel(false)}
          disabled={loading}
        >
          {t("basic.cancel")}
        </Button>
      </Box>
    </Box>
  );
};

export default ProjectEdit;
