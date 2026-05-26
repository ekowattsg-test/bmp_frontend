import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Grid,
} from "@mui/material";
import { LocalShipping as LocalShippingIcon } from "@mui/icons-material";

const DeliveryOrderView = ({ order, onClose }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      request("GET", `/api/deliveryOrderItems/order/${order.orderId}`),
      request("GET", "/api/products"),
      request("GET", "/api/customers"),
    ])
      .then(([itemsRes, productsRes, customersRes]) => {
        setItems(itemsRes.data || []);
        const map = {};
        (productsRes.data || []).forEach((p) => {
          if (p.productCode)
            map[p.productCode] = p.productName || p.productCode;
        });
        setProductMap(map);
        const customer = (customersRes.data || []).find(
          (c) => String(c.customerId) === String(order.customerId),
        );
        setCustomerName(
          customer?.customerName ||
            order.customerName ||
            String(order.customerId),
        );
      })
      .catch((error) => {
        console.error("Error loading delivery order details:", error);
        setItems([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [order.orderId]);

  const getStatusColor = (status) => {
    if (status === "COMPLETED") return "success";
    if (status === "PROCESSING") return "primary";
    if (status === "CANCELLED") return "error";
    if (status === "NEW") return "info";
    return "default";
  };

  const total = items.reduce(
    (sum, item) =>
      sum + (item.lineTotal ?? (item.quantity || 0) * (item.unitPrice || 0)),
    0,
  );

  const displayDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LocalShippingIcon color="primary" />
          <Typography variant="h6">
            {t("deliveryOrderList.viewTitle", "Delivery Order Details")}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Order Header */}
        <Box
          sx={{
            backgroundColor: "var(--color-gray-100)",
            p: 2,
            borderRadius: 1,
            mb: 3,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
            {t("deliveryOrderList.orderDetails", "Order Details")}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                {t("deliveryOrderList.orderId", "Order ID")}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {order.orderId}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                {t("deliveryOrderList.customerId", "Customer")}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {customerName}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                {t("deliveryOrderList.orderDate", "Order Date")}
              </Typography>
              <Typography variant="body1">
                {displayDate(order.orderDate)}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                {t("deliveryOrderList.deliveryDate", "Delivery Date")}
              </Typography>
              <Typography variant="body1">
                {displayDate(order.deliveryDate)}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                {t("deliveryOrderList.orderStatus", "Status")}
              </Typography>
              <Chip
                label={t(
                  `deliveryOrderList.status.${(order.orderStatus || "new").toLowerCase()}`,
                  order.orderStatus,
                )}
                color={getStatusColor(order.orderStatus)}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Grid>

            {order.projectCode && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  {t("deliveryOrderList.projectCode", "Project Code")}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {order.projectCode}
                </Typography>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                {t("deliveryOrderList.deliveryAmount", "Delivery Amount")}
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 500, color: "primary.main" }}
              >
                {order.deliveryAmount != null
                  ? `$${Number(order.deliveryAmount).toFixed(2)}`
                  : "-"}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Items */}
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
          {t("deliveryOrderList.items", "Items")}
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Typography
            color="text.secondary"
            sx={{ py: 2, textAlign: "center" }}
          >
            {t("deliveryOrderList.noItems", "No items found")}
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "background.default" }}>
                  <TableCell>{t("deliveryOrderList.lineNo", "#")}</TableCell>
                  <TableCell>
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
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => {
                  const lineTotal =
                    item.lineTotal ??
                    (item.quantity || 0) * (item.unitPrice || 0);
                  return (
                    <TableRow key={item.itemId ?? index}>
                      <TableCell>{item.lineNumber ?? index + 1}</TableCell>
                      <TableCell>
                        {productMap[item.productCode] || item.productCode}
                      </TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">
                        ${Number(item.unitPrice || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        ${Number(lineTotal).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell
                    colSpan={3}
                    align="right"
                    sx={{ fontWeight: "bold" }}
                  >
                    {t("deliveryOrderList.total", "Total")}:
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    ${total.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          {t("basic.close", "Close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeliveryOrderView;
