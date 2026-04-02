import React from "react";
import PropTypes from "prop-types";
import { Box, Paper, Typography } from "@mui/material";
import { getFileIcon, ThumbnailImg } from "../../helpers/file_helper";

/**
 * ProductInfoCard
 *
 * Displays a product's thumbnail, name, stock code, and optional UOM
 * in a consistent card wrapper. Used across all stock movement forms.
 *
 * Props:
 *   productInfo      – { thumb, productName, stockCode, uom }
 *   productLabel     – translated label for the product name row
 *   stockCodeLabel   – translated label for the stock code row
 *   uomLabel         – (optional) translated label for UOM; shown only when
 *                      provided AND productInfo.uom is non-empty
 *   children         – additional content rendered inside the card (e.g. location table)
 */
const ProductInfoCard = ({
  productInfo,
  productLabel,
  stockCodeLabel,
  uomLabel,
  children,
}) => {
  if (!productInfo) return null;

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        backgroundColor: "background.paper",
        border: "1px solid var(--color-gray-200)",
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
        {productInfo.thumb?.meta?.id ? (
          <ThumbnailImg
            fileId={productInfo.thumb.meta.id}
            viewUrl={productInfo.thumb.meta.viewUrl || ""}
            provider={productInfo.thumb.meta.provider || null}
            width={64}
            height={64}
            alt={productInfo.productName || "product image"}
            style={{ borderRadius: 4 }}
          />
        ) : productInfo.thumb?.imageUrl ? (
          <Box
            component="img"
            src={productInfo.thumb.imageUrl}
            alt={productInfo.productName || "product image"}
            sx={{
              width: 64,
              height: 64,
              borderRadius: 1,
              objectFit: "cover",
            }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "background.default",
            }}
          >
            {getFileIcon("", productInfo.productName || "")}
          </Box>
        )}

        <Box>
          <Typography>
            {productLabel}: {productInfo.productName || "-"}
          </Typography>
          <Typography>
            {stockCodeLabel}: {productInfo.stockCode || "-"}
          </Typography>
          {uomLabel && productInfo.uom && (
            <Typography>
              {uomLabel}: {productInfo.uom}
            </Typography>
          )}
        </Box>
      </Box>

      {children}
    </Paper>
  );
};

ProductInfoCard.propTypes = {
  productInfo: PropTypes.shape({
    thumb: PropTypes.shape({
      meta: PropTypes.shape({
        id: PropTypes.string,
        viewUrl: PropTypes.string,
        provider: PropTypes.string,
      }),
      imageUrl: PropTypes.string,
    }),
    productName: PropTypes.string,
    stockCode: PropTypes.string,
    uom: PropTypes.string,
  }).isRequired,
  productLabel: PropTypes.string.isRequired,
  stockCodeLabel: PropTypes.string.isRequired,
  uomLabel: PropTypes.string,
  children: PropTypes.node,
};

export default ProductInfoCard;
