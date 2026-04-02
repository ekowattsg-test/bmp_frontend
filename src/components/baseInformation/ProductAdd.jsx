import React, { useState } from "react";
import { TextField, Button, Box, MenuItem, Autocomplete } from "@mui/material";
import { request } from "../../helpers/axios_helper";
import { useTranslation } from "react-i18next";
import { DEFAULT_UOM_OPTIONS } from "../../helpers/common_options_helper";
import FileGallery from "../common/FileGallery";
import { HeaderBar } from "../common";
import {
  normalizeFileMetadata,
  commit,
  abort,
} from "../../helpers/file_helper";

const ProductAdd = ({ onCancel }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    productCode: "",
    productName: "",
    productDescription: "",
    productCategory: "",
    productClass: "",
    uom: "",
  });
  const [productFiles, setProductFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.productCode || form.productCode.trim() === "") {
      errs.productCode = t("product.productCode") + " is required";
    }
    if (!productFiles || productFiles.length === 0) {
      errs.productFiles = t(
        "product.photoRequired",
        "At least 1 photo is required",
      );
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg("");
    setSuccess(false);
    try {
      const normalized = (productFiles || []).map((f) =>
        normalizeFileMetadata(f),
      );

      const payload = {
        productName: form.productName,
        productCode: form.productCode,
        productDescription: form.productDescription,
        productCategory: form.productCategory,
        productClass: form.productClass,
        uom: form.uom,
        productPicture:
          normalized.length > 0 ? JSON.stringify(normalized) : null,
      };

      await request("POST", "/api/products", payload);
      await commit();
      setSuccess(true);
      if (onCancel) onCancel(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.failed"));
    }
    setLoading(false);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: 600,
        mx: "auto",
        mt: 2,
        background: "var(--color-gray-100)",
        p: 2,
        borderRadius: 2,
      }}
    >
      <HeaderBar
        title={t("product.addTitle", "Add Product")}
        titleVariant="h5"
        titleSx={{ fontSize: "clamp(1.2rem, 4vw, 2rem)", fontWeight: 600 }}
        sx={{ mb: 1 }}
      />
      <TextField
        label={t("product.productCode", "Product Code")}
        name="productCode"
        value={form.productCode}
        onChange={handleChange}
        fullWidth
        margin="normal"
        error={!!errors.productCode}
        helperText={errors.productCode}
      />
      <TextField
        label={t("product.productName", "Product Name")}
        name="productName"
        value={form.productName}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label={t("product.productDescription", "Description")}
        name="productDescription"
        value={form.productDescription}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        select
        label={t("product.productCategory", "Category")}
        name="productCategory"
        value={form.productCategory}
        onChange={handleChange}
        fullWidth
        margin="normal"
      >
        <MenuItem value="">{t("product.category", "Category")}</MenuItem>
        <MenuItem value={"A"}>{t("product.categoryA", "Asset")}</MenuItem>
        <MenuItem value={"C"}>{t("product.categoryC", "Consumable")}</MenuItem>
      </TextField>
      <TextField
        label={t("product.productClass", "Class")}
        name="productClass"
        value={form.productClass}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <Autocomplete
        freeSolo
        openOnFocus
        options={DEFAULT_UOM_OPTIONS}
        value={DEFAULT_UOM_OPTIONS.find((o) => o.value === form.uom) ?? null}
        inputValue={form.uom}
        onInputChange={(_, newInputValue, reason) => {
          if (reason === "reset") return;
          setForm((prev) => ({ ...prev, uom: newInputValue }));
        }}
        onChange={(_, newValue) => {
          if (typeof newValue === "string") {
            setForm((prev) => ({ ...prev, uom: newValue }));
          } else if (newValue && typeof newValue === "object") {
            setForm((prev) => ({ ...prev, uom: newValue.value || "" }));
          } else {
            setForm((prev) => ({ ...prev, uom: "" }));
          }
        }}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : option.value
        }
        sx={{ mt: 1, mb: 0.5 }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t("product.uom", "Unit of Measure")}
            placeholder={t("product.uomPlaceholder", "e.g. pcs, kg, box")}
            fullWidth
          />
        )}
        fullWidth
      />

      <Box sx={{ my: 1 }}>
        <Box sx={{ mt: 1 }}>
          <FileGallery
            productPicture={productFiles}
            allowRemove={true}
            allowAdd={true}
            repoConfig={null}
            onChange={(json) => {
              try {
                const parsed = json ? JSON.parse(json) : [];
                const arr = Array.isArray(parsed) ? parsed : [parsed];
                const norm = arr.map((p) => normalizeFileMetadata(p));
                if (JSON.stringify(norm) !== JSON.stringify(productFiles)) {
                  setProductFiles(norm);
                }
              } catch (e) {
                // ignore parse errors
              }
            }}
          />
        </Box>
      </Box>

      {errors.productFiles && (
        <div style={{ color: "var(--color-danger)", marginTop: 8 }}>
          {errors.productFiles}
        </div>
      )}
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
          onClick={() => {
            abort();
            onCancel(false);
          }}
          disabled={loading}
        >
          {t("basic.cancel")}
        </Button>
      </Box>
    </Box>
  );
};

export default ProductAdd;
