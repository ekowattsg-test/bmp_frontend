import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import {
  TextField,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { LoadMoreBlockList } from "../common";
import ProductDialog from "../stock/ProductDialog";
import HeaderBar from "../common/HeaderBar";
import { fetchProductInfo } from "../../helpers/delivery_order_helper";

const DeliveryOrderEdit = ({ order, onCancel }) => {
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    customerId: order.customerId || "",
    projectCode: order.projectCode || "",
    orderDate: order.orderDate
      ? order.orderDate.split("T")[0]
      : new Date().toISOString().split("T")[0],
    deliveryDate: order.deliveryDate ? order.deliveryDate.split("T")[0] : "",
    orderStatus: order.orderStatus || "NEW",
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [activeItemTempId, setActiveItemTempId] = useState(null);

  useEffect(() => {
    Promise.all([
      request("GET", "/api/customers"),
      request("GET", "/api/projects"),
      request("GET", `/api/deliveryOrderItems/order/${order.orderId}`),
    ])
      .then(([customersRes, projectsRes, itemsRes]) => {
        setCustomers(customersRes.data || []);
        setProjects(projectsRes.data || []);
        const loaded = (itemsRes.data || []).map((item, index) => ({
          ...item,
          tempId: item.itemId ?? `existing-${index}`,
          itemType: item.itemType === "A" ? "A" : "I",
          availableQty: null,
          statsLoading: false,
        }));
        setItems(loaded);
        // Fetch stock info for each existing item in the background
        loaded.forEach((item) => {
          const pid = item.productId || "";
          if (!pid) return;
          setItems((prev) =>
            prev.map((i) =>
              i.tempId === item.tempId ? { ...i, statsLoading: true } : i,
            ),
          );
          fetchProductInfo(pid).then(({ availableQty }) => {
            setItems((prev) =>
              prev.map((i) =>
                i.tempId === item.tempId
                  ? {
                      ...i,
                      availableQty: availableQty ?? 0,
                      statsLoading: false,
                    }
                  : i,
              ),
            );
          });
        });
      })
      .catch((error) => {
        console.error("Error loading data:", error);
      })
      .finally(() => {
        setInitLoading(false);
      });
  }, [order.orderId]);

  const customerById = useMemo(
    () =>
      customers.reduce((acc, customer) => {
        const id = String(customer?.customerId || "").trim();
        if (!id) return acc;
        acc[id] = customer;
        return acc;
      }, {}),
    [customers],
  );

  const selectedProject = useMemo(
    () =>
      projects.find(
        (project) =>
          String(project?.projectCode || "") ===
          String(formData.projectCode || ""),
      ) || null,
    [projects, formData.projectCode],
  );

  useEffect(() => {
    const customerId = String(selectedProject?.customerId || "").trim();
    if (!customerId) return;
    setFormData((prev) =>
      String(prev.customerId || "") === customerId
        ? prev
        : { ...prev, customerId },
    );
  }, [selectedProject?.customerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "projectCode") {
      const selected = projects.find(
        (project) => String(project?.projectCode || "") === String(value || ""),
      );
      setFormData((prev) => ({
        ...prev,
        projectCode: value,
        customerId: String(selected?.customerId || "").trim(),
      }));
      setErrorMsg("");
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg("");
  };

  const handleOpenProductDialog = (tempId) => {
    setActiveItemTempId(tempId);
    setProductDialogOpen(true);
  };

  const handleProductSelected = async ({ product }) => {
    if (!product || !activeItemTempId) return;
    const tempId = activeItemTempId;
    setProductDialogOpen(false);
    setActiveItemTempId(null);

    setItems((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? {
              ...item,
              productCode: product.productCode || "",
              productName: product.productName || "",
              productId: product.productId || product.id || "",
              availableQty: null,
              statsLoading: true,
            }
          : item,
      ),
    );

    const pid = product.productId || product.id || "";
    const { suggestedPrice, availableQty } = await fetchProductInfo(pid);

    setItems((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? {
              ...item,
              unitPrice:
                suggestedPrice !== null ? suggestedPrice : item.unitPrice,
              availableQty: availableQty ?? 0,
              statsLoading: false,
            }
          : item,
      ),
    );
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        tempId: Date.now(),
        itemType: "I",
        productCode: "",
        productName: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (tempId) => {
    setItems(items.filter((item) => item.tempId !== tempId));
  };

  const handleItemChange = (tempId, field, value) => {
    setItems(
      items.map((item) => {
        if (item.tempId !== tempId) return item;
        if (field === "itemType") {
          return { ...item, itemType: value === "A" ? "A" : "I" };
        }
        if (field === "quantity") {
          const n = parseInt(value, 10);
          return { ...item, quantity: isNaN(n) || n < 1 ? 1 : n };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  const calculateTotal = () =>
    items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
      0,
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.customerId) {
      setErrorMsg(
        t("deliveryOrderList.errors.customerRequired", "Customer is required"),
      );
      return;
    }

    if (items.length === 0) {
      setErrorMsg(
        t(
          "deliveryOrderList.errors.itemsRequired",
          "At least one item is required",
        ),
      );
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productCode) {
        setErrorMsg(
          t(
            "deliveryOrderList.errors.productCodeRequired",
            `Product code is required for item ${i + 1}`,
          ),
        );
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        setErrorMsg(
          t(
            "deliveryOrderList.errors.quantityInvalid",
            `Quantity must be greater than 0 for item ${i + 1}`,
          ),
        );
        return;
      }
      if (item.unitPrice == null || item.unitPrice < 0) {
        setErrorMsg(
          t(
            "deliveryOrderList.errors.unitPriceInvalid",
            `Unit price must be 0 or greater for item ${i + 1}`,
          ),
        );
        return;
      }
      if (
        item.availableQty !== null &&
        item.availableQty !== undefined &&
        parseInt(item.quantity) > item.availableQty
      ) {
        setErrorMsg(
          t(
            "deliveryOrderList.errors.insufficientStock",
            `Insufficient stock for item ${i + 1}: requested ${item.quantity}, available ${item.availableQty}`,
          ),
        );
        return;
      }
    }

    const total = calculateTotal();

    const deliveryOrderData = {
      ...formData,
      deliveryAmount: total,
      orderStatus: (formData.orderStatus || "NEW").toUpperCase(),
      deliveryDate: formData.deliveryDate || null,
      items: items.map((item, index) => {
        const quantity = parseInt(item.quantity);
        const unitPrice = parseFloat(item.unitPrice);
        return {
          itemId:
            typeof item.tempId === "number" && item.itemId
              ? item.itemId
              : undefined,
          itemType: item.itemType === "A" ? "A" : "I",
          productCode: item.productCode,
          quantity,
          unitPrice,
          lineTotal: quantity * unitPrice,
          lineNumber: index + 1,
        };
      }),
    };

    setLoading(true);
    request("PUT", `/api/deliveryOrders/${order.orderId}`, deliveryOrderData)
      .then(() => {
        onCancel(true);
      })
      .catch((error) => {
        console.error("Error updating delivery order:", error);
        setErrorMsg(
          error.response?.data?.message ||
            t(
              "deliveryOrderList.errors.updateFailed",
              "Failed to update delivery order",
            ),
        );
        setLoading(false);
      });
  };

  if (initLoading) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <HeaderBar
        title={t("deliveryOrderList.editTitle", "Edit Delivery Order")}
        showBackButton
        onBack={() => onCancel(false)}
      />

      <form onSubmit={handleSubmit}>
        {/* Order Details */}
        <Box
          sx={{
            backgroundColor: "var(--color-gray-100)",
            p: { xs: 2, sm: 3 },
            borderRadius: 1,
            mb: 3,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t("deliveryOrderList.orderDetails", "Order Details")}
          </Typography>

          <Box sx={{ display: "grid", gap: 2 }}>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}
            >
              <FormControl fullWidth required>
                <InputLabel>
                  {t("deliveryOrderList.projectCode", "Project Code")}
                </InputLabel>
                <Select
                  name="projectCode"
                  value={formData.projectCode}
                  onChange={handleChange}
                  label={t("deliveryOrderList.projectCode", "Project Code")}
                >
                  {projects.map((project) => (
                    <MenuItem
                      key={project.projectCode}
                      value={project.projectCode}
                    >
                      {project.projectCode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label={t("deliveryOrderList.customerId", "Customer")}
                value={
                  selectedProject
                    ? `${customerById[String(selectedProject.customerId || "")]?.customerName || "-"} (${selectedProject.customerId || "-"})`
                    : ""
                }
                InputProps={{ readOnly: true }}
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}
            >
              <TextField
                fullWidth
                label={t("deliveryOrderList.orderDate", "Order Date")}
                name="orderDate"
                type="date"
                value={formData.orderDate}
                onChange={handleChange}
                required
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label={t("deliveryOrderList.deliveryDate", "Delivery Date")}
                name="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>
        </Box>

        {/* Items */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">
              {t("deliveryOrderList.items", "Items")}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              size="small"
            >
              {t("deliveryOrderList.addItem", "Add Item")}
            </Button>
          </Box>

          {items.length === 0 ? (
            <Box
              sx={{
                p: 3,
                textAlign: "center",
                backgroundColor: "var(--color-gray-100)",
                borderRadius: 1,
              }}
            >
              <Typography color="text.secondary">
                {t(
                  "deliveryOrderList.noItemsAdded",
                  "No items added yet. Click 'Add Item' to begin.",
                )}
              </Typography>
            </Box>
          ) : shouldUseBlockLayout ? (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 2 }}>
              <LoadMoreBlockList
                items={items}
                renderItem={(item, index) => (
                  <Paper
                    key={item.tempId}
                    sx={{
                      p: 2,
                      border: "1px solid var(--color-gray-200)",
                      borderRadius: 1,
                      backgroundColor: "background.paper",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1.5,
                      }}
                    >
                      <Typography variant="subtitle2" color="text.secondary">
                        {t("deliveryOrderList.lineNo", "#")} {index + 1}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveItem(item.tempId)}
                        sx={{ color: "error.main" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: 1.5,
                      }}
                    >
                      <TextField
                        size="small"
                        label={t("deliveryOrderList.product", "Product")}
                        value={item.productName || item.productCode || ""}
                        placeholder={t(
                          "deliveryOrderList.selectProduct",
                          "Click to select product...",
                        )}
                        InputProps={{
                          readOnly: true,
                          sx: { cursor: "pointer" },
                        }}
                        inputProps={{ style: { cursor: "pointer" } }}
                        onClick={() => handleOpenProductDialog(item.tempId)}
                        required
                        fullWidth
                      />
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 1.5,
                        }}
                      >
                        <TextField
                          size="small"
                          type="number"
                          label={t("deliveryOrderList.quantity", "Quantity")}
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              item.tempId,
                              "quantity",
                              e.target.value,
                            )
                          }
                          required
                          inputProps={{ min: 1 }}
                          fullWidth
                          error={
                            item.availableQty !== null &&
                            item.availableQty !== undefined &&
                            parseInt(item.quantity) > item.availableQty
                          }
                        />
                        {item.statsLoading ? (
                          <Typography variant="caption" color="text.secondary">
                            {t(
                              "deliveryOrderList.loadingStock",
                              "Checking stock...",
                            )}
                          </Typography>
                        ) : item.availableQty !== null &&
                          item.availableQty !== undefined ? (
                          <Typography
                            variant="caption"
                            color={
                              parseInt(item.quantity) > item.availableQty
                                ? "error.main"
                                : "text.secondary"
                            }
                          >
                            {t("deliveryOrderList.availableQty", "Available")}:{" "}
                            {item.availableQty}
                          </Typography>
                        ) : null}
                        <TextField
                          size="small"
                          type="number"
                          label={t("deliveryOrderList.unitPrice", "Unit Price")}
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(
                              item.tempId,
                              "unitPrice",
                              e.target.value,
                            )
                          }
                          required
                          inputProps={{ min: 0, step: 0.01 }}
                          fullWidth
                        />
                      </Box>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 1.5,
                        color: "text.secondary",
                        textAlign: "right",
                      }}
                    >
                      {t("deliveryOrderList.lineTotal", "Line Total")}: $
                      {((item.quantity || 0) * (item.unitPrice || 0)).toFixed(
                        2,
                      )}
                    </Typography>
                  </Paper>
                )}
              />
              <Paper
                sx={{
                  p: 2,
                  border: "1px solid var(--color-gray-200)",
                  borderRadius: 1,
                  backgroundColor: "background.default",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {t("deliveryOrderList.total", "Total")}
                </Typography>
                <Typography variant="h6" sx={{ color: "primary.main" }}>
                  ${calculateTotal().toFixed(2)}
                </Typography>
              </Paper>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "background.default" }}>
                    <TableCell>{t("deliveryOrderList.lineNo", "#")}</TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      {t("deliveryOrderList.product", "Product")}
                    </TableCell>
                    <TableCell align="right">
                      {t("deliveryOrderList.quantity", "Quantity")}
                    </TableCell>
                    <TableCell align="right">
                      {t("deliveryOrderList.unitPrice", "Unit Price")}
                    </TableCell>
                    <TableCell align="right">
                      {t("deliveryOrderList.lineTotal", "Line Total")}
                    </TableCell>
                    <TableCell align="center">
                      {t("basic.actions", "Actions")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.tempId}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <TextField
                          size="small"
                          value={item.productName || item.productCode || ""}
                          placeholder={t(
                            "deliveryOrderList.selectProduct",
                            "Click to select product...",
                          )}
                          InputProps={{
                            readOnly: true,
                            sx: { cursor: "pointer" },
                          }}
                          inputProps={{ style: { cursor: "pointer" } }}
                          onClick={() => handleOpenProductDialog(item.tempId)}
                          required
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip
                          title={
                            item.statsLoading
                              ? t(
                                  "deliveryOrderList.loadingStock",
                                  "Checking stock...",
                                )
                              : item.availableQty !== null &&
                                  item.availableQty !== undefined
                                ? `${t("deliveryOrderList.availableQty", "Available")}: ${item.availableQty}`
                                : ""
                          }
                          placement="top"
                        >
                          <TextField
                            size="small"
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                item.tempId,
                                "quantity",
                                e.target.value,
                              )
                            }
                            required
                            inputProps={{ min: 1 }}
                            sx={{ width: 80 }}
                            error={
                              item.availableQty !== null &&
                              item.availableQty !== undefined &&
                              parseInt(item.quantity) > item.availableQty
                            }
                          />
                        </Tooltip>
                        {!item.statsLoading &&
                          item.availableQty !== null &&
                          item.availableQty !== undefined && (
                            <Typography
                              variant="caption"
                              display="block"
                              color={
                                parseInt(item.quantity) > item.availableQty
                                  ? "error.main"
                                  : "text.secondary"
                              }
                            >
                              {t("deliveryOrderList.availableQty", "Avail")}:{" "}
                              {item.availableQty}
                            </Typography>
                          )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(
                              item.tempId,
                              "unitPrice",
                              e.target.value,
                            )
                          }
                          required
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        $
                        {((item.quantity || 0) * (item.unitPrice || 0)).toFixed(
                          2,
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveItem(item.tempId)}
                          sx={{ color: "error.main" }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      align="right"
                      sx={{ fontWeight: "bold" }}
                    >
                      {t("deliveryOrderList.total", "Total")}:
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      ${calculateTotal().toFixed(2)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        {errorMsg && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              backgroundColor: "error.main",
              color: "white",
              borderRadius: 1,
            }}
          >
            {errorMsg}
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {t("basic.save", "Save")}
          </Button>
          <Button
            variant="outlined"
            onClick={() => onCancel(false)}
            disabled={loading}
          >
            {t("basic.cancel", "Cancel")}
          </Button>
        </Box>
      </form>

      <ProductDialog
        open={productDialogOpen}
        onClose={() => {
          setProductDialogOpen(false);
          setActiveItemTempId(null);
        }}
        onSelected={handleProductSelected}
      />
    </Box>
  );
};

export default DeliveryOrderEdit;
