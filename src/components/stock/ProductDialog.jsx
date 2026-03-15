import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Button,
  Chip,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import Modal, { ModalForm } from "../common/Modal";
import { request } from "../../helpers/axios_helper";
import {
  getFileIdFromLink,
  getFileIcon,
  getDisplayImageInfo,
} from "../../helpers/file_helper";
import FileGallery from "../common/FileGallery";
import { useTranslation } from "react-i18next";
import { Typography } from "@mui/material";
import SelectionDialog from "../common/SelectionDialog";

const ProductDialog = ({
  open,
  onClose,
  stockCode,
  presetProduct,
  onSelected,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProduct, setNewProduct] = useState({
    productCode: stockCode || "",
    productName: "",
    productCategory: "C",
    productDescription: "",
    productClass: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [createError, setCreateError] = useState("");
  const [productFiles, setProductFiles] = useState([]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    // initialize new product code from stockCode when dialog opens
    setNewProduct({
      productCode: stockCode || "",
      productName: "",
      productCategory: "C",
      productClass: "",
    });
    setProductFiles([]);
    setCreateError("");
    fetchProducts("");
  }, [open, stockCode]);

  const handleCreate = (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      if (!productFiles || productFiles.length === 0) {
        setCreateError(
          t("product.imageRequired", "Please attach at least one photo"),
        );
        return;
      }
      setCreateError("");

      if (!/^[AC]$/.test(newProduct.productCategory)) {
        alert(t("product.categoryError", "Category must be 'A' or 'C'"));
        return;
      }

      const normalized = productFiles.map((f) => ({
        id: f.id || getFileIdFromLink(f.url),
        name: f.name || "",
        mimeType: f.mimeType || "",
        uploadedAt: f.uploadedAt || new Date().toISOString(),
      }));
      const payload = {
        ...newProduct,
        productPicture: JSON.stringify(normalized),
      };
      onSelected({
        product: payload,
        productFound: false,
        createRequested: true,
      });
      setCreating(false);
    } catch (err) {
      console.error("Create product request failed", err);
      setCreating(false);
    }
  };

  const productClasses = Array.from(
    new Set(products.map((p) => p.productClass).filter(Boolean)),
  ).slice(0, 20);

  const fetchProducts = (q) => {
    setLoading(true);
    request("GET", `/api/products?search=${encodeURIComponent(q || "")}`)
      .then((res) => setProducts(res.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  const handleCreateToggle = () => {
    setCreateError("");
    setCreating((c) => {
      const next = !c;
      if (!next) {
        // closing create form: reset temporary state
        setProductFiles([]);
        setNewProduct({
          productCode: stockCode || "",
          productName: "",
          productCategory: "C",
          productDescription: "",
          productClass: "",
        });
      }
      return next;
    });
  };

  const handleSearchChange = (e) => {
    const v = e.target.value;
    setSearch(v);
    fetchProducts(v);
  };

  const handleSelect = (p) => {
    if (!p) return;
    const found = Boolean(p.productId || p.id || p.product_id);
    try {
      onSelected({ product: p, productFound: found });
    } catch (err) {
      console.error("ProductDialog handleSelect forward failed", err);
    }
    if (onClose) onClose();
  };

  useEffect(() => {
    console.log(
      "ProductDialog mounted/update - open:",
      open,
      "presetProduct:",
      presetProduct,
    );
  }, [open, presetProduct]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("stockTake.productDialogTitle")}
    >
      <Box sx={{ p: 2 }}>
        {presetProduct ? (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              {(() => {
                try {
                  const pic =
                    presetProduct.productPicture ||
                    presetProduct.imageUrl ||
                    presetProduct.productImage ||
                    presetProduct.productPictureUrl ||
                    null;
                  let parsed = null;
                  if (!pic) {
                    return (
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 1,
                          bgcolor: "background.paper",
                        }}
                      >
                        <span style={{ fontSize: 20 }}>📦</span>
                      </Box>
                    );
                  }
                  try {
                    parsed = typeof pic === "string" ? JSON.parse(pic) : pic;
                  } catch (e) {
                    parsed = pic;
                  }

                  if (Array.isArray(parsed) && parsed.length > 0) {
                    const first = parsed[0];
                    const info = getDisplayImageInfo(first);
                    console.log(
                      "ProductDialog - display image info:",
                      info,
                      "source:",
                      first,
                    );
                    if (info.imageUrl)
                      return (
                        <Box
                          sx={{ width: 64, height: 64, position: "relative" }}
                        >
                          <Box
                            component="img"
                            src={info.imageUrl}
                            sx={{
                              width: 64,
                              height: 64,
                              objectFit: "cover",
                              borderRadius: 1,
                            }}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fb =
                                e.currentTarget.parentElement.querySelector(
                                  ".fallback-icon",
                                );
                              if (fb) fb.style.display = "flex";
                            }}
                          />
                          <Box
                            className="fallback-icon"
                            sx={{
                              display: "none",
                              position: "absolute",
                              inset: 0,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 1,
                              bgcolor: "background.paper",
                            }}
                          >
                            {getFileIcon(
                              info.meta?.mimeType || first.mimeType,
                              info.meta?.name || first.name,
                            )}
                          </Box>
                        </Box>
                      );
                    return (
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 1,
                          bgcolor: "background.paper",
                        }}
                      >
                        {getFileIcon(
                          info.meta?.mimeType || first.mimeType,
                          info.meta?.name || first.name,
                        )}
                      </Box>
                    );
                  }

                  if (typeof parsed === "string") {
                    const url = parsed;
                    return (
                      <Box
                        component="img"
                        src={url}
                        sx={{
                          width: 64,
                          height: 64,
                          objectFit: "cover",
                          borderRadius: 1,
                        }}
                        referrerPolicy="no-referrer"
                      />
                    );
                  }

                  return (
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      <span style={{ fontSize: 20 }}>📦</span>
                    </Box>
                  );
                } catch (e) {
                  return (
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      <span style={{ fontSize: 20 }}>📦</span>
                    </Box>
                  );
                }
              })()}
              <Box>
                <Typography variant="subtitle1">
                  {t("stockTake.productName", "Product name")}:{" "}
                  {presetProduct.productName || presetProduct.productCode}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {t("stockTake.stockCode", "Stock code")}:{" "}
                  {stockCode || presetProduct.productCode}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              <Button
                variant="contained"
                onClick={() =>
                  onSelected({
                    product: presetProduct,
                    productFound: !!presetProduct.productId,
                  })
                }
              >
                {t("stockTake.useProduct", "Use this product")}
              </Button>
              <Button variant="outlined" onClick={onClose}>
                {t("basic.cancel")}
              </Button>
            </Box>
          </Box>
        ) : (
          <>
            {!creating && (
              <>
                <SelectionDialog
                  inline
                  open={true}
                  onClose={onClose}
                  title={t("stockTake.productDialogTitle")}
                  facetFields={["productClass"]}
                  fetchItems={async (q, filters) => {
                    // Build query params including filters
                    const params = new URLSearchParams();
                    if (q) params.set("search", q);
                    if (filters) {
                      Object.keys(filters).forEach((k) => {
                        if (filters[k]) params.set(k, filters[k]);
                      });
                    }
                    const res = await request(
                      "GET",
                      `/api/products?${params.toString()}`,
                    );
                    return res.data || [];
                  }}
                  onSelect={(p) => handleSelect(p)}
                  onCreate={() => setCreating(true)}
                  renderItem={(p) => ({
                    primary: `${t("stockTake.productName", "Product name")}: ${p.productName || p.productCode}`,
                    secondary: `${t("stockTake.stockCode", "Stock code")}: ${p.productCode}`,
                  })}
                />
              </>
            )}
          </>
        )}

        {creating ? (
          <form onSubmit={handleCreate}>
            {createError && (
              <div style={{ color: "var(--color-danger)", marginBottom: 8 }}>
                {createError}
              </div>
            )}
            <TextField
              fullWidth
              label={t("product.productCode", "Product Code")}
              placeholder={t("product.productCodePlaceholder", "Stock code")}
              value={newProduct.productCode}
              onChange={(e) =>
                setNewProduct({ ...newProduct, productCode: e.target.value })
              }
              sx={{ mb: 1 }}
              required
            />

            <TextField
              fullWidth
              label={t("product.productName", "Product Name")}
              placeholder={t("product.productNamePlaceholder", "Stock name")}
              value={newProduct.productName}
              onChange={(e) =>
                setNewProduct({ ...newProduct, productName: e.target.value })
              }
              sx={{ mb: 1 }}
              required
            />

            <FormControl fullWidth sx={{ mb: 1 }}>
              <InputLabel id="product-category-label">
                {t("product.category", "Category")}
              </InputLabel>
              <Select
                labelId="product-category-label"
                value={newProduct.productCategory}
                label={t("product.category", "Category")}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    productCategory: e.target.value,
                  })
                }
              >
                <MenuItem value="A">{t("product.categoryA", "Asset")}</MenuItem>
                <MenuItem value="C">
                  {t("product.categoryC", "Consumable")}
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              minRows={2}
              label={t("product.description", "Description")}
              placeholder={t(
                "product.descriptionPlaceholder",
                "Product description",
              )}
              value={newProduct.productDescription}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  productDescription: e.target.value,
                })
              }
              sx={{ mb: 1 }}
            />

            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                mb: 1,
                flexWrap: "wrap",
              }}
            >
              <TextField
                label={t("product.productClass", "Product Class")}
                placeholder={t(
                  "product.productClassPlaceholder",
                  "Enter or pick a class",
                )}
                value={newProduct.productClass}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, productClass: e.target.value })
                }
                size="small"
                sx={{ minWidth: 200 }}
              />
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {productClasses.map((pc) => (
                  <Chip
                    key={pc}
                    label={pc}
                    size="small"
                    onClick={() =>
                      setNewProduct((prev) => ({ ...prev, productClass: pc }))
                    }
                  />
                ))}
              </Box>
            </Box>

            {/* quantity capture belongs to the parent StockTake component */}

            <Box sx={{ mb: 1 }}>
              <FileGallery
                productPicture={newProduct.productPicture || null}
                onChange={(val) => {
                  if (!val) {
                    setProductFiles([]);
                    setNewProduct((prev) => ({
                      ...prev,
                      productPicture: null,
                    }));
                    return;
                  }
                  try {
                    const arr = typeof val === "string" ? JSON.parse(val) : val;
                    setProductFiles(arr || []);
                    setNewProduct((prev) => ({ ...prev, productPicture: val }));
                  } catch (e) {
                    setProductFiles([]);
                    setNewProduct((prev) => ({
                      ...prev,
                      productPicture: null,
                    }));
                  }
                }}
                allowAdd
                allowRemove
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button variant="outlined" onClick={handleCreateToggle}>
                {t("basic.cancel")}
              </Button>
              <Button variant="contained" type="submit">
                {t("basic.save")}
              </Button>
            </Box>
          </form>
        ) : (
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button variant="text" onClick={handleCreateToggle}>
              {t("stockTake.createProduct", "Create product")}
            </Button>
            <Button variant="outlined" onClick={onClose}>
              {t("basic.cancel")}
            </Button>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default ProductDialog;
