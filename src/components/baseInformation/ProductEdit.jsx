import React, { useState, useEffect, useRef } from "react";
import { TextField, Button, Box, MenuItem, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { request } from "../../helpers/axios_helper";
import {
  getDisplayImageInfo,
  ImageCarousel,
  ThumbnailImg,
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
    productCode: "",
    productName: "",
    productDescription: "",
    productCategory: "",
    productClass: "",
  });
  const [productFiles, setProductFiles] = useState([]);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState([]);
  const [carouselStart, setCarouselStart] = useState(0);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (product) {
      // normalize category to 'A' or 'C' when possible
      let rawCat = product.productCategory || "";
      const catA = t("product.categoryA", "Asset");
      const catC = t("product.categoryC", "Consumable");
      if (rawCat === catA) rawCat = "A";
      if (rawCat === catC) rawCat = "C";
      // fallback: if label starts with A/a or C/c
      if (
        !rawCat &&
        product.productCategory &&
        typeof product.productCategory === "string"
      ) {
        const s = product.productCategory.trim().toLowerCase();
        if (s.startsWith("a")) rawCat = "A";
        if (s.startsWith("c")) rawCat = "C";
      }

      setForm({
        productCode: product.productCode || "",
        productName:
          product.productName || product.name || product.productNameEn || "",
        productDescription: product.productDescription || "",
        productCategory: rawCat || "",
        productClass: product.productClass || "",
      });

      // parse existing pictures into productFiles array
      try {
        const pic = product.productPicture;
        let parsed = pic;
        if (typeof pic === "string") {
          try {
            parsed = JSON.parse(pic);
          } catch (e) {
            // not JSON - treat as single url
            parsed = [pic];
          }
        }
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const norm = arr.filter(Boolean).map((p) => {
          if (typeof p === "string") return { url: p };
          return p;
        });
        setProductFiles(norm);
      } catch (e) {
        setProductFiles([]);
      }
    }
  }, [product]);

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

  const handleRemoveFile = (idx) => {
    setProductFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const buildImages = (files) => {
    if (!files) return [];
    const arr = Array.isArray(files) ? files : [files];
    return arr
      .map((f) => getDisplayImageInfo(f.url || f))
      .filter((info) => info && (info.imageUrl || info.meta?.id))
      .map((info) => ({
        displayUrl: info.imageUrl || null,
        viewUrl: info.meta?.viewUrl || null,
        title: info.meta?.name || "",
        provider: info.meta?.provider || null,
        meta: info.meta || null,
      }));
  };

  const handleImageClick = (idx) => {
    const imgs = buildImages(productFiles);
    if (!imgs || imgs.length === 0) return;
    setCarouselImages(imgs);
    setCarouselStart(idx || 0);
    setCarouselOpen(true);
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
        productPicture:
          normalized.length > 0 ? JSON.stringify(normalized) : null,
      };
      const id = product?.id || product?.productId || product?.product_id;
      await request("PUT", `/api/products/${id}`, payload);
      await commit();
      setSuccess(true);
      if (onCancel) onCancel(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.failed"));
    }
    setLoading(false);
  };

  // no helper required: uploads happen immediately on file select

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
                // runtime debug: child -> parent change sequence
                console.debug("ProductEdit:onChange received", {
                  norm,
                  productFiles,
                });
                if (JSON.stringify(norm) !== JSON.stringify(productFiles)) {
                  setProductFiles(norm);
                  console.debug("ProductEdit:setProductFiles", norm);
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
      {carouselOpen && (
        <ImageCarousel
          images={carouselImages}
          open={carouselOpen}
          onClose={() => setCarouselOpen(false)}
          startIndex={carouselStart}
        />
      )}
    </Box>
  );
};

export default ProductEdit;
