import React, { useState, useEffect } from "react";
import { TextField, Button, Box, MenuItem, Autocomplete } from "@mui/material";
import { DEFAULT_UOM_OPTIONS } from "../../helpers/common_options_helper";
import { request } from "../../helpers/axios_helper";
import {
  normalizeFileMetadata,
  commit,
  abort,
} from "../../helpers/file_helper";
import FileGallery from "../common/FileGallery";
import { useTranslation } from "react-i18next";
import { HeaderBar } from "../common";

const ProductEdit = ({ product, onCancel }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    productId: "",
    productCode: "",
    productName: "",
    productDescription: "",
    productCategory: "",
    productClass: "",
    uom: "",
    productBrand: "",
    commonName: "",
    specification: "",
  });
  const [productFiles, setProductFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!product) return;
    const rawCat = product.productCategory || "";
    setForm((prev) => ({
      ...prev,
      productId: product.productId || product.id || product.product_id || "",
      productCode: product.productCode || "",
      productName: product.productName || "",
      productDescription: product.productDescription || "",
      productCategory: rawCat,
      productClass: product.productClass || "",
      uom: product.uom || "",
      productBrand: product.productBrand || "",
      commonName: product.commonName || "",
      specification: product.specification || "",
    }));

    try {
      const meta = Array.isArray(product.productPicture)
        ? product.productPicture.map((p) => normalizeFileMetadata(p))
        : [];
      setProductFiles(meta);
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setErrorMsg("");
    setLoading(true);
    try {
      const id = form.productId || product?.id;
      const payload = {
        productCode: form.productCode,
        productName: form.productName,
        productDescription: form.productDescription,
        productCategory: form.productCategory,
        productClass: form.productClass,
        uom: form.uom,
        productBrand: form.productBrand,
        commonName: form.commonName,
        specification: form.specification,
        productPicture: productFiles,
      };
      await request("PUT", `/api/products/${id}`, payload);
      await commit();
      setSuccess(true);
      if (onCancel) onCancel(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.failed"));
    }
    setLoading(false);
  };

  if (!product) return null;

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
        title={t("product.editTitle", "Edit Product")}
        sx={{ mb: 1 }}
      />

      <TextField
        label={t("product.productId", "Product ID")}
        name="productId"
        value={form.productId}
        fullWidth
        margin="normal"
        InputProps={{ readOnly: true }}
      />

      <TextField
        label={t("product.productCode", "Product Code")}
        name="productCode"
        value={form.productCode}
        onChange={handleChange}
        inputProps={{ readOnly: true }}
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
        label={t("product.productBrand", "Brand")}
        name="productBrand"
        value={form.productBrand}
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

      <TextField
        label={t("product.specification", "Specification")}
        name="specification"
        value={form.specification}
        onChange={handleChange}
        fullWidth
        margin="normal"
        multiline
        minRows={2}
      />

      <TextField
        label={t("product.commonName", "Common Name")}
        name="commonName"
        value={form.commonName}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />

      <Box sx={{ my: 1 }}>
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
              setProductFiles(norm);
            } catch (e) {
              // ignore
            }
          }}
        />
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

export default ProductEdit;
