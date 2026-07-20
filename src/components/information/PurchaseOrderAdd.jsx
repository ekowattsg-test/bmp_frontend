import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { LoadMoreBlockList } from "../common";
import ProductDialog from "../stock/ProductDialog";

const PurchaseOrderAdd = ({ onCancel }) => {
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const [vendors, setVendors] = useState([]);
  const [formData, setFormData] = useState({
    vendorId: "",
    orderDate: new Date().toISOString().split("T")[0],
    orderStatus: "PROCESSING",
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [activeItemTempId, setActiveItemTempId] = useState(null);

  useEffect(() => {
    // Load vendors for dropdown
    request("GET", "/api/vendors")
      .then((response) => {
        setVendors(response.data || []);
      })
      .catch((error) => {
        console.error("Error loading vendors:", error);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrorMsg("");
  };

  const handleOpenProductDialog = (tempId) => {
    setActiveItemTempId(tempId);
    setProductDialogOpen(true);
  };

  const handleProductSelected = ({ product }) => {
    if (!product || !activeItemTempId) return;
    setItems((prev) =>
      prev.map((item) =>
        item.tempId === activeItemTempId
          ? {
              ...item,
              productCode: product.productCode || "",
              productName: product.productName || "",
            }
          : item,
      ),
    );
    setProductDialogOpen(false);
    setActiveItemTempId(null);
  };

  const handleAddItem = () => {
    const newItem = {
      tempId: Date.now(), // Temporary ID for UI
      itemType: "I",
      productCode: "",
      productName: "",
      internalProductCode: "",
      internalOrderId: "",
      quantity: 1,
      unitPrice: 0,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (tempId) => {
    setItems(items.filter((item) => item.tempId !== tempId));
  };

  const handleItemChange = (tempId, field, value) => {
    setItems(
      items.map((item) => {
        if (item.tempId !== tempId) return item;
        // If changing itemType, always enforce 'I' or 'A', never null/empty
        if (field === "itemType") {
          return { ...item, itemType: value === "A" ? "A" : "I" };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unitPrice || 0);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.vendorId) {
      setErrorMsg(
        t("purchaseOrderList.errors.vendorRequired", "Vendor is required"),
      );
      return;
    }

    if (items.length === 0) {
      setErrorMsg(
        t(
          "purchaseOrderList.errors.itemsRequired",
          "At least one item is required",
        ),
      );
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productCode) {
        setErrorMsg(
          t(
            "purchaseOrderList.errors.productCodeRequired",
            `Product code is required for item ${i + 1}`,
          ),
        );
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        setErrorMsg(
          t(
            "purchaseOrderList.errors.quantityInvalid",
            `Quantity must be greater than 0 for item ${i + 1}`,
          ),
        );
        return;
      }
      if (!item.unitPrice || item.unitPrice < 0) {
        setErrorMsg(
          t(
            "purchaseOrderList.errors.unitPriceInvalid",
            `Unit price must be 0 or greater for item ${i + 1}`,
          ),
        );
        return;
      }
    }

    const total = calculateTotal();

    // Prepare the data for submission
    // Normalize state before submit
    const normalizedItems = items.map((item) => ({
      ...item,
      itemType:
        item.itemType == null || item.itemType === "" ? "I" : item.itemType,
    }));
    const purchaseOrderData = {
      ...formData,
      purchaseAmount: total,
      // Ensure orderStatus is explicitly provided and normalized to the
      // backend-expected form (uppercase). Default to "PROCESSING" for manual creates.
      orderStatus: (formData.orderStatus || "PROCESSING").toUpperCase(),
      items: normalizedItems.map((item, index) => {
        const quantity = parseInt(item.quantity);
        const unitPrice = parseFloat(item.unitPrice);
        const lineTotal = quantity * unitPrice;
        return {
          itemType: item.itemType,
          productCode: item.productCode,
          internalProductCode: item.internalProductCode || null,
          internalOrderId: item.internalOrderId || null,
          quantity: quantity,
          unitPrice: unitPrice,
          lineTotal: lineTotal,
          lineNumber: index + 1,
        };
      }),
    };

    setLoading(true);
    request("POST", "/api/purchaseOrders", purchaseOrderData)
      .then(() => {
        onCancel(true);
      })
      .catch((error) => {
        console.error("Error adding purchase order:", error);
        setErrorMsg(
          error.response?.data?.message ||
            t(
              "purchaseOrderList.errors.addFailed",
              "Failed to add purchase order",
            ),
        );
        setLoading(false);
      });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {t("purchaseOrderList.addTitle", "Add Purchase Order")}
      </Typography>

      <form onSubmit={handleSubmit}>
        <Box
          sx={{
            backgroundColor: "var(--color-gray-100)",
            p: { xs: 2, sm: 3 },
            borderRadius: 1,
            mb: 3,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t("purchaseOrderList.orderDetails", "Order Details")}
          </Typography>

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            }}
          >
            <FormControl fullWidth required>
              <InputLabel>
                {t("purchaseOrderList.vendorId", "Vendor")}
              </InputLabel>
              <Select
                name="vendorId"
                value={formData.vendorId}
                onChange={handleChange}
                label={t("purchaseOrderList.vendorId")}
              >
                {vendors.map((vendor) => (
                  <MenuItem key={vendor.vendorId} value={vendor.vendorId}>
                    {vendor.vendorName} ({vendor.vendorId})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={t("purchaseOrderList.orderDate", "Order Date")}
              name="orderDate"
              type="date"
              value={formData.orderDate}
              onChange={handleChange}
              required
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>
                {t("purchaseOrderList.orderStatus", "Order Status")}
              </InputLabel>
              <Select
                name="orderStatus"
                value={formData.orderStatus}
                onChange={handleChange}
                label={t("purchaseOrderList.orderStatus")}
                disabled
              >
                <MenuItem value="NEW">
                  {t("purchaseOrderList.status.new", "New")}
                </MenuItem>
                <MenuItem value="PROCESSING">
                  {t("purchaseOrderList.status.processing", "Processing")}
                </MenuItem>
                <MenuItem value="COMPLETED">
                  {t("purchaseOrderList.status.completed", "Completed")}
                </MenuItem>
                <MenuItem value="CANCELLED">
                  {t("purchaseOrderList.status.cancelled", "Cancelled")}
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Purchase Order Items */}
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
              {t("purchaseOrderList.items", "Items")}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              size="small"
            >
              {t("purchaseOrderList.addItem", "Add Item")}
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
                  "purchaseOrderList.noItemsAdded",
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
                        {t("purchaseOrderList.lineNo", "#")} {index + 1}
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
                        label={t("purchaseOrderList.product", "Product")}
                        value={
                          item.productName
                            ? `${item.productName} (${item.productCode})`
                            : ""
                        }
                        placeholder={t(
                          "purchaseOrderList.selectProduct",
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

                      <FormControl size="small" fullWidth>
                        <InputLabel>
                          {t("purchaseOrderList.itemType", "Item Type")}
                        </InputLabel>
                        <Select
                          value={item.itemType === "A" ? "A" : "I"}
                          onChange={(e) =>
                            handleItemChange(
                              item.tempId,
                              "itemType",
                              e.target.value,
                            )
                          }
                          label={t("purchaseOrderList.itemType", "Item Type")}
                        >
                          <MenuItem value="I">
                            {t(
                              "purchaseOrderList.itemTypeOptions.inventory",
                              "Inventory",
                            )}
                          </MenuItem>
                          <MenuItem value="A">
                            {t("purchaseOrderList.itemTypeOptions.assets", "Assets")}
                          </MenuItem>
                        </Select>
                      </FormControl>

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
                          label={t("purchaseOrderList.quantity", "Quantity")}
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
                        />
                        <TextField
                          size="small"
                          type="number"
                          label={t("purchaseOrderList.unitPrice", "Unit Price")}
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
                      {t("purchaseOrderList.lineTotal", "Line Total")}: $
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
                  {t("purchaseOrderList.total", "Total")}
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
                    <TableCell>{t("purchaseOrderList.lineNo", "#")}</TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      {t("purchaseOrderList.product", "Product")}
                    </TableCell>
                    <TableCell>
                      {t("purchaseOrderList.itemType", "Item Type")}
                    </TableCell>
                    <TableCell align="right">
                      {t("purchaseOrderList.quantity", "Quantity")}
                    </TableCell>
                    <TableCell align="right">
                      {t("purchaseOrderList.unitPrice", "Unit Price")}
                    </TableCell>
                    <TableCell align="right">
                      {t("purchaseOrderList.lineTotal", "Line Total")}
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
                          value={
                            item.productName
                              ? `${item.productName} (${item.productCode})`
                              : ""
                          }
                          placeholder={t(
                            "purchaseOrderList.selectProduct",
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
                        <FormControl size="small" fullWidth>
                          <Select
                            value={item.itemType === "A" ? "A" : "I"}
                            onChange={(e) =>
                              handleItemChange(
                                item.tempId,
                                "itemType",
                                e.target.value,
                              )
                            }
                          >
                            <MenuItem value="I">
                              {t(
                                "purchaseOrderList.itemTypeOptions.inventory",
                                "Inventory",
                              )}
                            </MenuItem>
                            <MenuItem value="A">
                              {t("purchaseOrderList.itemTypeOptions.assets", "Assets")}
                            </MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
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
                        />
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
                      {t("purchaseOrderList.total", "Total")}:
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
              backgroundColor: "var(--color-danger)",
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

export default PurchaseOrderAdd;
