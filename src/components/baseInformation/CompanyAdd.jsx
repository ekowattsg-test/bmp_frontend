import React, { useState } from "react";
import {
  TextField,
  Button,
  Box,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { request } from "../../helpers/axios_helper";
import { useTranslation } from "react-i18next";

const CompanyAdd = ({ onCancel }) => {
  const [form, setForm] = useState({
    companyId: "",
    companyName: "",
    showCompany: false,
    active: true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { t } = useTranslation();

  const validate = () => {
    let errs = {};
    if (!form.companyName || form.companyName.trim() === "") {
      errs.companyName = t("companyList.companyName") + " is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg("");
    setSuccess(false);
    try {
      await request("POST", "/api/companies", {
        ...form,
        active: form.active ? 1 : 0,
      });
      setSuccess(true);
      if (onCancel) {
        onCancel(true); // Pass true to indicate successful add
      }
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
        maxWidth: { xs: "100%", sm: 400 },
        mx: "auto",
        mt: 2,
        mb: 2,
        background: "var(--color-gray-100)",
        p: { xs: 1, sm: 2 },
        borderRadius: 2,
      }}
    >
      <h2
        style={{
          fontSize: "clamp(1.2rem, 4vw, 2rem)",
          margin: 0,
        }}
      >
        {t("companyList.title")}
      </h2>
      <TextField
        label={t("companyList.companyId")}
        name="companyId"
        value={form.companyId}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label={t("companyList.companyName")}
        name="companyName"
        value={form.companyName}
        onChange={handleChange}
        fullWidth
        margin="normal"
        error={!!errors.companyName}
        helperText={errors.companyName}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={!!form.showCompany}
            onChange={handleChange}
            name="showCompany"
          />
        }
        label={t("companyList.showCompany")}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={!!form.active}
            onChange={handleChange}
            name="active"
          />
        }
        label={t("companyList.active")}
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

export default CompanyAdd;
