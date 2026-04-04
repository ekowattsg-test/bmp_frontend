import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { TextField, Button, Box, IconButton, Typography, InputAdornment } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { HeaderBar } from "../common";
import SelectionDialog from "../common/SelectionDialog";

const ProductBundleEdit = ({ item, onCancel }) => {
  const { t } = useTranslation();

  const [products, setProducts] = useState([]);
  const [hierarchies, setHierarchies] = useState([]);
  const [bundleCode] = useState(item.bundleCode || "");
  const [bundleName, setBundleName] = useState(item.bundleName || "");
  // members: [{ product, quantity }]
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  // raw string values for qty inputs so user can freely type
  const [qtyInputs, setQtyInputs] = useState({});

  useEffect(() => {
    Promise.allSettled([
      request("GET", "/api/products"),
      request("GET", "/api/producthierarchies"),
    ])
      .then(([prodRes, hierRes]) => {
        const productList =
          prodRes.status === "fulfilled" ? prodRes.value.data || [] : [];
        setProducts(productList);
        setHierarchies(
          hierRes.status === "fulfilled" ? hierRes.value.data || [] : [],
        );

        // bundleMembers JSON: [{ productId, quantity }, ...]
        const productById = {};
        productList.forEach((p) => {
          productById[String(p.productId)] = p;
        });

        setMembers(
          (item.bundleMembers || [])
            .map((bm) => {
              const id = String(bm.productId);
              const product = productById[id];
              return product
                ? { product, quantity: Number(bm.quantity) || 1 }
                : null;
            })
            .filter(Boolean),
        );
      })
      .finally(() => setDataLoading(false));
  }, [item.bundleId, item.bundleMembers]);

  const forbiddenByHierarchy = useMemo(() => {
    const forbidden = new Set();
    members.forEach(({ product: m }) => {
      hierarchies.forEach((h) => {
        if (String(h.parentProductId) === String(m.productId))
          forbidden.add(String(h.childProductId));
        if (String(h.childProductId) === String(m.productId))
          forbidden.add(String(h.parentProductId));
      });
    });
    return forbidden;
  }, [members, hierarchies]);

  const availableProducts = useMemo(() => {
    const selectedIds = new Set(
      members.map(({ product: m }) => String(m.productId)),
    );
    return products.filter(
      (p) =>
        !selectedIds.has(String(p.productId)) &&
        !forbiddenByHierarchy.has(String(p.productId)),
    );
  }, [products, members, forbiddenByHierarchy]);

  const fetchItems = async (search) => {
    if (!search.trim()) return availableProducts;
    const q = search.toLowerCase();
    return availableProducts.filter(
      (p) =>
        (p.productName || "").toLowerCase().includes(q) ||
        (p.productCode || "").toLowerCase().includes(q) ||
        (p.productDescription || "").toLowerCase().includes(q),
    );
  };

  const handlePickerSelect = (product) => {
    setMembers((prev) => [...prev, { product, quantity: 1 }]);
    setPickerOpen(false);
  };

  const handleRemoveMember = (productId) => {
    setMembers((prev) =>
      prev.filter(
        ({ product: m }) => String(m.productId) !== String(productId),
      ),
    );
    setQtyInputs((prev) => {
      const n = { ...prev };
      delete n[String(productId)];
      return n;
    });
  };

  const handleQtyChange = (productId, val) => {
    // Allow free typing — store raw string
    setQtyInputs((prev) => ({ ...prev, [String(productId)]: val }));
  };

  const handleQtyBlur = (productId) => {
    // On blur: clamp to minimum 1 and commit to members
    const raw = qtyInputs[String(productId)];
    const clamped = Math.max(1, parseInt(raw, 10) || 1);
    setQtyInputs((prev) => {
      const n = { ...prev };
      delete n[String(productId)];
      return n;
    });
    setMembers((prev) =>
      prev.map((entry) =>
        String(entry.product.productId) === String(productId)
          ? { ...entry, quantity: clamped }
          : entry,
      ),
    );
  };

  const getProductLabel = (p) =>
    (p.productName || p.productCode || "") +
    (p.productCode ? ` (${p.productCode})` : "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!bundleName.trim()) {
      setErrorMsg(t("productBundle.bundleNameRequired"));
      return;
    }
    if (members.length < 2) {
      setErrorMsg(t("productBundle.membersRequired"));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        bundleCode: bundleCode.trim(),
        bundleName: bundleName.trim(),
        bundleMembers: members.map(({ product: m, quantity }) => ({
          productId: m.productId,
          quantity,
        })),
      };
      await request("PUT", `/api/productbundles/${item.bundleId}`, payload);
      onCancel(true);
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message || t("productBundle.saveFailed"),
      );
      setLoading(false);
    }
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
        p: { xs: 1, sm: 2 },
        borderRadius: 2,
      }}
    >
      <HeaderBar
        title={t("productBundle.edit")}
        sx={{ mb: 1 }}
      />

      <TextField
        label={t("productBundle.bundleCode")}
        value={bundleCode}
        fullWidth
        margin="normal"
        InputProps={{ readOnly: true }}
        sx={{ "& .MuiInputBase-input": { color: "text.secondary" } }}
      />

      <TextField
        label={t("productBundle.bundleName")}
        value={bundleName}
        onChange={(e) => setBundleName(e.target.value)}
        fullWidth
        margin="normal"
        required
      />

      <Box sx={{ mt: 2, mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
          {t("productBundle.members")}
        </Typography>

        {members.map(({ product: m, quantity }) => (
          <Box
            key={m.productId}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 110px 34px",
              alignItems: "center",
              gap: 1,
              mb: 0.5,
              p: 0.75,
              borderRadius: 1,
              background: "var(--color-white)",
              border: "1px solid var(--color-gray-200)",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {getProductLabel(m)}
            </Typography>
            <TextField
              size="small"
              type="number"
              label={t("productBundle.quantity")}
              value={
                qtyInputs[String(m.productId)] !== undefined
                  ? qtyInputs[String(m.productId)]
                  : String(quantity)
              }
              onChange={(e) => handleQtyChange(m.productId, e.target.value)}
              onBlur={() => handleQtyBlur(m.productId)}
              inputProps={{ min: 1 }}
              InputProps={m.uom ? { endAdornment: <InputAdornment position="end">{m.uom}</InputAdornment> } : {}}
              sx={{ width: "100%" }}
            />
            <IconButton
              size="small"
              sx={{ flexShrink: 0 }}
              onClick={() => handleRemoveMember(m.productId)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}

        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setPickerOpen(true)}
          disabled={dataLoading || availableProducts.length === 0}
          sx={{ mt: 1 }}
        >
          {t("productBundle.addMember")}
        </Button>
        <Typography
          variant="caption"
          display="block"
          sx={{ color: "text.secondary", mt: 0.5 }}
        >
          {t("productBundle.membersHint")}
        </Typography>
      </Box>

      {errorMsg && (
        <div style={{ color: "var(--color-danger)", marginTop: 8 }}>
          {errorMsg}
        </div>
      )}

      <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
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

      <SelectionDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t("productBundle.selectProduct")}
        fetchItems={fetchItems}
        onSelect={handlePickerSelect}
        facetFields={["productCategory", "productClass"]}
        renderItem={(p) => ({
          primary: p.productName || p.productCode || "",
          secondary: [p.productCode, p.productClass]
            .filter(Boolean)
            .join(" · "),
        })}
      />
    </Box>
  );
};

export default ProductBundleEdit;
