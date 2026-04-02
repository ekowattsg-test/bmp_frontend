import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  TextField,
  Box,
  Autocomplete,
  Typography,
  InputAdornment,
} from "@mui/material";
import { HeaderBar } from "../common";
import { FormActions } from "../common/CRUDActions";

const UOMHierarchyEdit = ({ item, onCancel }) => {
  const { t } = useTranslation();

  const [products, setProducts] = useState([]);
  const [usedProductIds, setUsedProductIds] = useState(new Set());
  const [parent, setParent] = useState(null);
  const [child, setChild] = useState(null);
  const [numberOfChildren, setNumberOfChildren] = useState(
    item.numberOfChildren || 2,
  );
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    Promise.all([
      request("GET", "/api/products"),
      request("GET", "/api/producthierarchies"),
    ])
      .then(([prodRes, hierRes]) => {
        const list = prodRes.data || [];
        setProducts(list);
        setParent(
          list.find(
            (p) => String(p.productId) === String(item.parentProductId),
          ) || null,
        );
        setChild(
          list.find(
            (p) => String(p.productId) === String(item.childProductId),
          ) || null,
        );
        // Exclude products used in OTHER hierarchy records
        const used = new Set();
        (hierRes.data || []).forEach((h) => {
          if (String(h.hierarchyId) === String(item.hierarchyId)) return;
          if (h.parentProductId != null) used.add(String(h.parentProductId));
          if (h.childProductId != null) used.add(String(h.childProductId));
        });
        setUsedProductIds(used);
      })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [item.parentProductId, item.childProductId, item.hierarchyId]);

  const availableProducts = products.filter(
    (p) => !usedProductIds.has(String(p.productId)),
  );

  const getOptionLabel = (option) => {
    if (!option) return "";
    const name = option.productName || option.productCode || "";
    const code = option.productCode ? " (" + option.productCode + ")" : "";
    return name + code;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!parent) {
      setErrorMsg(t("uomHierarchy.parentRequired"));
      return;
    }
    if (!child) {
      setErrorMsg(t("uomHierarchy.childRequired"));
      return;
    }
    if (parent.productId === child.productId) {
      setErrorMsg(t("uomHierarchy.sameProductError"));
      return;
    }
    const qty = Number(numberOfChildren);
    if (!Number.isFinite(qty) || qty <= 1) {
      setErrorMsg(t("uomHierarchy.quantityRequired"));
      return;
    }

    setLoading(true);
    request("PUT", `/api/producthierarchies/${item.hierarchyId}`, {
      parentProductId: parent.productId,
      childProductId: child.productId,
      numberOfChildren: qty,
    })
      .then(() => onCancel(true))
      .catch((err) => {
        setErrorMsg(
          err?.response?.data?.message || t("uomHierarchy.saveFailed"),
        );
        setLoading(false);
      });
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <HeaderBar
        title={t("uomHierarchy.edit")}
        titleVariant="h5"
        titleSx={{ fontSize: "clamp(1.2rem, 4vw, 2rem)", fontWeight: 600 }}
        sx={{ mb: 1 }}
      />

      {errorMsg && (
        <div style={{ color: "var(--color-danger)", marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Box sx={{ mb: 2 }}>
          <Autocomplete
            options={products}
            getOptionLabel={getOptionLabel}
            value={parent}
            onChange={(_, val) => {
              setParent(val);
              if (child && val && child.productId === val.productId) {
                setChild(null);
              }
            }}
            loading={productsLoading}
            isOptionEqualToValue={(opt, val) =>
              opt.productId === val?.productId
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("uomHierarchy.parentProduct")}
                required
              />
            )}
          />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("uomHierarchy.parentHint")}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Autocomplete
            options={availableProducts.filter(
              (p) => !parent || p.productId !== parent.productId,
            )}
            getOptionLabel={getOptionLabel}
            value={child}
            onChange={(_, val) => setChild(val)}
            loading={productsLoading}
            isOptionEqualToValue={(opt, val) =>
              opt.productId === val?.productId
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("uomHierarchy.childProduct")}
                required
              />
            )}
          />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("uomHierarchy.childHint")}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            type="number"
            label={t("uomHierarchy.quantity")}
            value={numberOfChildren}
            onChange={(e) => setNumberOfChildren(e.target.value)}
            inputProps={{ min: 2, step: 1 }}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {t("uomHierarchy.quantityUnit")}
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("uomHierarchy.quantityHint")}
          </Typography>
        </Box>

        <FormActions
          loading={loading}
          onCancel={() => onCancel(false)}
          onSubmit={handleSubmit}
          submitLabel={t("basic.save")}
          cancelLabel={t("basic.cancel")}
        />
      </form>
    </div>
  );
};

export default UOMHierarchyEdit;
