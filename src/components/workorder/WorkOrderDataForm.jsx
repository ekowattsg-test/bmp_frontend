import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";
import ProductDialog from "../stock/ProductDialog";

/**
 * WorkOrderDataForm — list + add detail items for a single work order.
 *
 * Props:
 *   workOrder    object  — the parent work order { workOrderId, workOrderType, ... }
 *   contentType  string  — "stock" | "worker" (from workOrderType.contentType)
 *   staffList    array   — pre-loaded staff list from parent
 *   onClose()    callback — called to return to the list
 */
const WorkOrderDataForm = ({
  workOrder,
  contentType = "stock",
  staffList,
  onClose,
}) => {
  const { t } = useTranslation();

  const isWorker = contentType === "worker";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Products list (only needed for stock content type)
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const emptyForm = useMemo(
    () => ({
      productId: null,
      quantity: "",
      staffId: "",
    }),
    [],
  );

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  // Product picker dialog
  const [pickerOpen, setPickerOpen] = useState(false);

  const staffMap = useMemo(() => {
    const m = {};
    staffList.forEach((s) => {
      m[s.staffId] = s.staffName;
    });
    return m;
  }, [staffList]);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => {
      m[p.productId] = p.productName;
    });
    return m;
  }, [products]);

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/workorder-data")
      .then((res) => {
        const all = res.data || [];
        setItems(all.filter((d) => d.workOrderId === workOrder.workOrderId));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [workOrder.workOrderId]);

  useEffect(() => {
    if (!isWorker) {
      setProductsLoading(true);
      request("GET", "/api/products")
        .then((res) => setProducts(res.data || []))
        .catch(() => setProducts([]))
        .finally(() => setProductsLoading(false));
    }
  }, [isWorker]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // Clamp quantity to minimum 1
    if (name === "quantity") {
      const num = Number(value);
      setForm((prev) => ({ ...prev, quantity: num < 1 ? "1" : value }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleProductSelect = ({ product }) => {
    if (!product) return;
    setForm((prev) => ({ ...prev, productId: product.productId }));
    setErrors((prev) => ({ ...prev, productId: undefined }));
    setPickerOpen(false);
  };

  const validate = () => {
    const errs = {};
    if (!isWorker && !form.productId)
      errs.productId = t("workOrderData.required", "Required");
    if (
      !isWorker &&
      (!form.quantity ||
        isNaN(Number(form.quantity)) ||
        Number(form.quantity) <= 0)
    )
      errs.quantity = t("workOrderData.required", "Required");
    if (isWorker && !form.staffId)
      errs.staffId = t("workOrderData.required", "Required");

    // Duplicate check
    if (!isWorker && form.productId) {
      const isDup = items.some(
        (i) => Number(i.productId) === Number(form.productId),
      );
      if (isDup)
        errs.productId = t(
          "workOrderData.duplicateProduct",
          "Product already added",
        );
    }
    if (isWorker && form.staffId) {
      const isDup = items.some((i) => i.staffId === form.staffId);
      if (isDup)
        errs.staffId = t("workOrderData.duplicateStaff", "Staff already added");
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const payload = {
        workOrderId: workOrder.workOrderId,
        productId: isWorker ? null : Number(form.productId),
        quantity: isWorker ? 1 : Number(form.quantity),
        staffId: isWorker ? form.staffId : null,
      };
      const res = await request("POST", "/api/workorder-data", payload);
      setItems((prev) => [...prev, res.data]);
      setForm(emptyForm);
      setErrors({});
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await request("DELETE", `/api/workorder-data/${id}`);
      setItems((prev) => prev.filter((i) => i.workOrderDataId !== id));
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.failed"));
    }
  };

  return (
    <Box
      sx={{
        maxWidth: { xs: "100%", sm: 700 },
        mx: "auto",
        mt: 2,
        mb: 2,
        background: "var(--color-gray-100)",
        p: { xs: 1, sm: 3 },
        borderRadius: 2,
      }}
    >
      <HeaderBar
        title={t("workOrderData.title", "Work Order Details")}
        subtitle={`${t("workOrder.workOrderId")}: ${workOrder.workOrderId}`}
        showBackButton
        onBack={onClose}
        backLabel={t("basic.back", "Back")}
        sx={{ mb: 2 }}
      />

      {/* Add detail row form */}
      <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
        {t("workOrderData.addItem", "Add Detail Item")}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: isWorker
            ? { xs: "1fr", sm: "1fr auto" }
            : { xs: "1fr", sm: "1fr 1fr auto" },
          alignItems: "flex-start",
          mb: 3,
          p: 2,
          bgcolor: "background.paper",
          borderRadius: 1,
          border: "1px solid var(--color-gray-200)",
        }}
      >
        {/* Stock: product picker field */}
        {!isWorker && (
          <TextField
            label={t("workOrderData.productName", "Product")}
            value={
              form.productId != null
                ? productMap[form.productId] || String(form.productId)
                : ""
            }
            onClick={() => setPickerOpen(true)}
            size="small"
            inputProps={{ readOnly: true, style: { cursor: "pointer" } }}
            placeholder={t(
              "workOrderData.selectProduct",
              "Click to select product",
            )}
            error={!!errors.productId}
            helperText={errors.productId}
          />
        )}

        {/* Stock: quantity */}
        {!isWorker && (
          <TextField
            label={t("workOrderData.quantity", "Quantity")}
            name="quantity"
            value={form.quantity}
            onChange={handleFormChange}
            size="small"
            type="number"
            inputProps={{ min: 1 }}
            error={!!errors.quantity}
            helperText={errors.quantity}
          />
        )}

        {/* Staff dropdown (worker mode only) */}
        {isWorker && (
          <TextField
            select
            label={t("workOrderData.staffId", "Staff")}
            name="staffId"
            value={form.staffId}
            onChange={handleFormChange}
            size="small"
            error={!!errors.staffId}
            helperText={errors.staffId}
          >
            {staffList.map((s) => (
              <MenuItem key={s.staffId} value={s.staffId}>
                {s.staffName}
              </MenuItem>
            ))}
          </TextField>
        )}

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={saving}
          sx={{ whiteSpace: "nowrap", height: 40, alignSelf: "flex-start" }}
        >
          {t("basic.add", "Add")}
        </Button>
      </Box>

      {/* Product picker using ProductDialog (consistent with PurchaseOrder) */}
      {!isWorker && (
        <ProductDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelected={handleProductSelect}
        />
      )}

      {errorMsg && (
        <div style={{ color: "var(--color-danger)", marginBottom: 8 }}>
          {errorMsg}
        </div>
      )}

      {/* Existing items table */}
      {loading ? (
        <Typography variant="body2" color="text.secondary">
          {t("workOrderData.loading", "Loading...")}
        </Typography>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("workOrderData.noItems", "No detail items yet.")}
        </Typography>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ border: "1px solid var(--color-gray-200)" }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "background.default" }}>
                {!isWorker && (
                  <>
                    <TableCell>
                      {t("workOrderData.productName", "Product")}
                    </TableCell>
                    <TableCell align="right">
                      {t("workOrderData.quantity", "Quantity")}
                    </TableCell>
                  </>
                )}
                {isWorker && (
                  <TableCell>{t("workOrderData.staffId", "Staff")}</TableCell>
                )}
                <TableCell align="center" sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const staffName = staffMap[item.staffId] || item.staffId;
                const productName =
                  productMap[item.productId] || item.productId;
                return (
                  <TableRow
                    key={item.workOrderDataId}
                    sx={{ "&:hover": { bgcolor: "action.hover" } }}
                  >
                    {!isWorker && (
                      <>
                        <TableCell>{productName}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                      </>
                    )}
                    {isWorker && <TableCell>{staffName}</TableCell>}
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(item.workOrderDataId)}
                        title={t("basic.delete", "Delete")}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={onClose}
        >
          {t("basic.back", "Back")}
        </Button>
      </Box>
    </Box>
  );
};

export default WorkOrderDataForm;
