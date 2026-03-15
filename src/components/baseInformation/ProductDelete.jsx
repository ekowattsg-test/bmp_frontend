import React, { useState } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { getDisplayImageInfo } from "../../helpers/file_helper";

const ProductDelete = ({ product, onCancel, onDeleted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const id = product?.id || product?.productId || product?.product_id;
      await request("DELETE", `/api/products/${id}`);
      if (onDeleted) onDeleted();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.failed"));
    }
    setLoading(false);
  };

  if (!product) return null;

  return (
    <Box
      sx={{
        maxWidth: { xs: "100%", sm: 400 },
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
          {t("product.deleteTitle", "Delete Product")}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(
            "product.confirmDelete",
            "Are you sure you want to delete this product?",
          )}
        </Typography>
        <Box sx={{ my: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {product.productPicture &&
              (() => {
                const info = getDisplayImageInfo(product.productPicture);
                let src = info.imageUrl || null;
                if (!src && typeof product.productPicture === "string") {
                  const str = product.productPicture.trim();
                  if (str.startsWith("data:")) src = str;
                  else if (
                    /^[A-Za-z0-9+/=\r\n]+$/.test(str) &&
                    str.length > 100
                  )
                    src = `data:image/png;base64,${str}`;
                }
                if (!src) return null;
                return (
                  <Box sx={{ mb: 1 }}>
                    <img
                      src={src}
                      alt={product.productDescription || product.productCode}
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: "cover",
                        borderRadius: 6,
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </Box>
                );
              })()}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("product.productCode")}:
              </Typography>
              <Typography variant="body2">{product.productCode}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("product.productDescription")}:
              </Typography>
              <Typography variant="body2">
                {product.productDescription}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("product.productCategory")}:
              </Typography>
              <Typography variant="body2">
                {product.productCategory === "A"
                  ? t("product.categoryA")
                  : product.productCategory === "C"
                    ? t("product.categoryC")
                    : product.productCategory}
              </Typography>
            </Box>
          </Box>
        </Box>
        {errorMsg && (
          <Typography color="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={loading}
          >
            {t("basic.delete")}
          </Button>
          <Button
            variant="outlined"
            onClick={() => onCancel(false)}
            disabled={loading}
          >
            {t("basic.cancel", "Cancel")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ProductDelete;
