import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Box,
  FormControlLabel,
  Checkbox,
  MenuItem,
} from "@mui/material";
import { request } from "../../helpers/axios_helper";
import { useTranslation } from "react-i18next";
import { HeaderBar } from "../common";
import languageset from "../../helpers/language_helper";

const CompanyEdit = ({ company, onCancel }) => {
  const [form, setForm] = useState({
    companyId: "",
    companyName: "",
    biZCode: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    language: "",
    showCompany: false,
    active: true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { t } = useTranslation();
  const languages = languageset();

  useEffect(() => {
    setForm({
      companyId: company?.companyId || "",
      companyName: company?.companyName || "",
      biZCode: company?.biZCode || "",
      addressLine1: company?.addressLine1 || "",
      addressLine2: company?.addressLine2 || "",
      postalCode: company?.postalCode || "",
      city: company?.city || "",
      language: company?.language || "",
      showCompany: !!company?.showCompany,
      active: company?.active === true || company?.active === 1,
    });
  }, [company]);

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
      const payload = {
        companyId: String(form.companyId || "").trim(),
        companyName: String(form.companyName || "").trim(),
        biZCode: String(form.biZCode || "").trim(),
        addressLine1: String(form.addressLine1 || "").trim(),
        addressLine2: String(form.addressLine2 || "").trim(),
        postalCode: String(form.postalCode || "").trim(),
        city: String(form.city || "").trim(),
        language: String(form.language || "").trim(),
        showCompany: !!form.showCompany,
        active: form.active ? 1 : 0,
      };

      await request("PUT", `/api/companies/${form.companyId}`, payload);
      setSuccess(true);
      if (onCancel) {
        onCancel(true); // Pass true to indicate successful edit
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
      <HeaderBar
        title={t("companyList.editTitle")}
        sx={{ mb: 1 }}
      />
      <TextField
        label={t("companyList.companyId")}
        name="companyId"
        value={form.companyId}
        onChange={handleChange}
        fullWidth
        margin="normal"
        disabled
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
      <TextField
        label={t("companyList.biZCode")}
        name="biZCode"
        value={form.biZCode}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label={t("companyList.addressLine1")}
        name="addressLine1"
        value={form.addressLine1}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label={t("companyList.addressLine2")}
        name="addressLine2"
        value={form.addressLine2}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label={t("companyList.postalCode")}
        name="postalCode"
        value={form.postalCode}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label={t("companyList.city")}
        name="city"
        value={form.city}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        select
        label={t("companyList.language")}
        name="language"
        value={form.language}
        onChange={handleChange}
        fullWidth
        margin="normal"
      >
        <MenuItem value="">{t("companyList.languagePlaceholder", "Select language")}</MenuItem>
        {languages.map((lang) => (
          <MenuItem key={lang.code} value={lang.code}>
            {lang.name}
          </MenuItem>
        ))}
      </TextField>
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

export default CompanyEdit;
