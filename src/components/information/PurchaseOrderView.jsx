import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  CircularProgress,
  Dialog,
  DialogContent,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { BlockListItem, LoadMoreBlockList } from "../common";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";

const PurchaseOrderView = ({ order, onClose }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const { shouldUseBlockLayout } = useResponsiveLayout();

  useEffect(() => {
    // Load vendor details
    request("GET", `/api/vendors/${order.vendorId}`)
      .then((response) => {
        setVendor(response.data);
      })
      .catch((error) => {
        console.error("Error loading vendor:", error);
      });

    // Load purchase order items
    setLoading(true);
    request("GET", `/api/purchaseOrderItems/order/${order.orderId}`)
      .then((response) => {
        setItems(response.data || []);
      })
      .catch((error) => {
        console.error("Error loading items:", error);
        setItems([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [order.orderId, order.vendorId]);

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "PROCESSING":
        return "primary";
      case "CANCELLED":
        return "error";
      case "NEW":
        return "info";
      default:
        return "default";
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const lineTotal =
        item.lineTotal !== undefined && item.lineTotal !== null
          ? item.lineTotal
          : (item.quantity || 0) * (item.unitPrice || 0);
      return sum + lineTotal;
    }, 0);
  };

  const normalizedItems = useMemo(() => {
    return items.map((item, index) => {
      const rawItemType = item.itemType;
      const normalizedType = rawItemType
        ? String(rawItemType).trim().toUpperCase()
        : "";

      let displayItemType = rawItemType || "-";
      if (normalizedType === "A") {
        displayItemType = t("purchaseOrderList.itemType.assets", "Assets");
      } else if (normalizedType === "I") {
        displayItemType = t(
          "purchaseOrderList.itemType.inventory",
          "Inventory",
        );
      }

      const lineTotal =
        item.lineTotal !== undefined && item.lineTotal !== null
          ? Number(item.lineTotal)
          : (item.quantity || 0) * (item.unitPrice || 0);

      return {
        ...item,
        lineNo: index + 1,
        displayItemType,
        displayInternalProductCode: item.internalProductCode || "-",
        displayInternalOrderId: item.internalOrderId || "-",
        displayQuantity: item.quantity,
        displayUnitPrice: `$${Number(item.unitPrice || 0).toFixed(2)}`,
        displayLineTotal: `$${lineTotal.toFixed(2)}`,
      };
    });
  }, [items, t]);

  const itemColumnDefs = useMemo(
    () => [
      { field: "lineNo", label: t("purchaseOrderList.lineNo", "#") },
      {
        field: "productCode",
        label: t("purchaseOrderList.productCode", "Product Code"),
      },
      {
        field: "displayItemType",
        label: t("purchaseOrderList.itemType", "Item Type"),
      },
      {
        field: "displayInternalProductCode",
        label: t(
          "purchaseOrderList.internalProductCode",
          "Internal Product Code",
        ),
      },
      {
        field: "displayInternalOrderId",
        label: t("purchaseOrderList.internalOrderId", "Internal Order ID"),
      },
      {
        field: "displayQuantity",
        label: t("purchaseOrderList.quantity", "Quantity"),
      },
      {
        field: "displayUnitPrice",
        label: t("purchaseOrderList.unitPrice", "Unit Price"),
      },
      {
        field: "displayLineTotal",
        label: t("purchaseOrderList.lineTotal", "Line Total"),
      },
    ],
    [t],
  );

  return (
    <Dialog open={true} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h5" fontWeight={600}>
              {t("purchaseOrderList.viewTitle", "Purchase Order Details")}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Order Information */}
          <Box
            sx={{
              backgroundColor: "var(--color-gray-100)",
              p: 2,
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
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              {/* Order ID and Order Status inline */}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("purchaseOrderList.orderId", "Order ID")}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body1" fontWeight={500}>
                    {order.orderId}
                  </Typography>
                  <Chip
                    label={t(
                      `purchaseOrderList.status.${order.orderStatus?.toLowerCase()}`,
                      order.orderStatus,
                    )}
                    color={getStatusColor(order.orderStatus)}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>
              </Box>

              {/* Vendor (moved to where order status was) */}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("purchaseOrderList.vendorId", "Vendor")}
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {vendor
                    ? `${vendor.vendorName} (${vendor.vendorId})`
                    : order.vendorId}
                </Typography>
              </Box>

              {/* Order Amount (moved to where vendor was) */}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("purchaseOrderList.purchaseAmount", "Purchase Amount")}
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  color="primary.main"
                >
                  ${order.purchaseAmount?.toFixed(2) || "0.00"}
                </Typography>
              </Box>

              {/* Order Date (remains in place) */}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("purchaseOrderList.orderDate", "Order Date")}
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {order.orderDate
                    ? new Date(order.orderDate).toLocaleDateString()
                    : "N/A"}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Items Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t("purchaseOrderList.items", "Items")}
            </Typography>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : items.length === 0 ? (
              <Box
                sx={{
                  p: 3,
                  textAlign: "center",
                  backgroundColor: "var(--color-gray-100)",
                  borderRadius: 1,
                }}
              >
                <Typography color="text.secondary">
                  {t("purchaseOrderList.noItems", "No items found")}
                </Typography>
              </Box>
            ) : shouldUseBlockLayout ? (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 2 }}>
                <LoadMoreBlockList
                  items={normalizedItems}
                  renderItem={(item, index) => (
                    <BlockListItem
                      key={item.itemId || index}
                      columnDefs={itemColumnDefs}
                      item={item}
                      enableActions={false}
                      t={t}
                    />
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
              <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "background.default" }}>
                      <TableCell>
                        {t("purchaseOrderList.lineNo", "#")}
                      </TableCell>
                      <TableCell>
                        {t("purchaseOrderList.productCode", "Product Code")}
                      </TableCell>
                      <TableCell>
                        {t("purchaseOrderList.itemType", "Item Type")}
                      </TableCell>
                      <TableCell>
                        {t(
                          "purchaseOrderList.internalProductCode",
                          "Internal Product Code",
                        )}
                      </TableCell>
                      <TableCell>
                        {t(
                          "purchaseOrderList.internalOrderId",
                          "Internal Order ID",
                        )}
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {normalizedItems.map((item, index) => (
                      <TableRow key={item.itemId || index}>
                        <TableCell>{item.lineNo}</TableCell>
                        <TableCell>{item.productCode}</TableCell>
                        <TableCell>{item.displayItemType}</TableCell>
                        <TableCell>{item.displayInternalProductCode}</TableCell>
                        <TableCell>{item.displayInternalOrderId}</TableCell>
                        <TableCell align="right">
                          {item.displayQuantity}
                        </TableCell>
                        <TableCell align="right">
                          {item.displayUnitPrice}
                        </TableCell>
                        <TableCell align="right">
                          {item.displayLineTotal}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        align="right"
                        sx={{ fontWeight: "bold", borderTop: 2 }}
                      >
                        {t("purchaseOrderList.total", "Total")}:
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: "bold", borderTop: 2 }}
                      >
                        ${calculateTotal().toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseOrderView;
