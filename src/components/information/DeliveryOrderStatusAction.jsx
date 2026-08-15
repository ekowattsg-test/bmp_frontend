import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Chip,
  Divider,
  TextField,
  Button,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

// Lifecycle:
//   NEW        → READY (readyDate)
//   READY      → NEW (no date)  |  READY → ISSUED (issuedDate)
//   ISSUED     → IN_TRANSIT (set automatically by transfer-out endAction)
//   IN_TRANSIT → DELIVERED (deliveredDate)  |  IN_TRANSIT → CANCELLED (cancelledDate)
//   ISSUED     → DELIVERED (deliveredDate)  |  ISSUED → CANCELLED (cancelledDate)
const getTransitions = (currentStatus) => {
  switch (currentStatus) {
    case "NEW":
      return [
        {
          newStatus: "READY",
          dateField: "readyDate",
          labelKey: "deliveryOrderList.action.markReady",
          labelFallback: "Mark Ready",
        },
      ];
    case "READY":
      return [
        {
          newStatus: "NEW",
          dateField: null,
          labelKey: "deliveryOrderList.action.backToNew",
          labelFallback: "Back to New",
        },
        {
          newStatus: "ISSUED",
          dateField: "issuedDate",
          labelKey: "deliveryOrderList.action.issue",
          labelFallback: "Issue",
        },
      ];
    case "ISSUED":
      return [
        {
          newStatus: "DELIVERED",
          dateField: "deliveredDate",
          labelKey: "deliveryOrderList.action.deliver",
          labelFallback: "Mark Delivered",
        },
        {
          newStatus: "CANCELLED",
          dateField: "cancelledDate",
          labelKey: "deliveryOrderList.action.cancel",
          labelFallback: "Cancel",
        },
      ];
    case "IN_TRANSIT":
      return [
        {
          newStatus: "DELIVERED",
          dateField: "deliveredDate",
          labelKey: "deliveryOrderList.action.deliver",
          labelFallback: "Mark Delivered",
        },
        {
          newStatus: "CANCELLED",
          dateField: "cancelledDate",
          labelKey: "deliveryOrderList.action.cancel",
          labelFallback: "Cancel",
        },
      ];
    default:
      return [];
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "NEW":
      return "info";
    case "READY":
      return "secondary";
    case "ISSUED":
      return "warning";
    case "IN_TRANSIT":
      return "warning";
    case "DELIVERED":
      return "success";
    case "CANCELLED":
      return "error";
    default:
      return "default";
  }
};

const today = () => new Date().toISOString().split("T")[0];

const DeliveryOrderStatusAction = ({ order, onClose, onUpdated }) => {
  const { t } = useTranslation();

  const transitions = getTransitions(order.orderStatus || "");

  const [fullOrder, setFullOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    Promise.allSettled([
      request("GET", `/api/deliveryOrders/${order.orderId}`),
      request("GET", `/api/deliveryOrderItems/order/${order.orderId}`),
      request("GET", "/api/products"),
    ]).then(([orderRes, itemsRes, productsRes]) => {
      if (orderRes.status === "fulfilled") {
        setFullOrder(orderRes.value.data);
      } else {
        setFetchError(
          t(
            "deliveryOrderList.action.loadFailed",
            "Failed to load order details.",
          ),
        );
      }
      if (itemsRes.status === "fulfilled") {
        setItems(itemsRes.value.data || []);
      }
      if (productsRes.status === "fulfilled") {
        const map = {};
        (productsRes.value.data || []).forEach((p) => {
          map[String(p.productCode)] = p.productName;
        });
        setProductMap(map);
      }
    });
  }, [order.orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [dates, setDates] = useState(() => {
    const init = {};
    getTransitions(order.orderStatus || "").forEach((tr) => {
      if (tr.dateField) init[tr.dateField] = today();
    });
    return init;
  });

  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  const handleAction = (transition) => {
    if (!fullOrder) return;
    setError("");
    setLoading(transition.newStatus);

    const payload = {
      ...fullOrder,
      orderStatus: transition.newStatus,
      ...(transition.dateField
        ? { [transition.dateField]: dates[transition.dateField] }
        : {}),
    };

    request("PUT", `/api/deliveryOrders/${order.orderId}`, payload)
      .then(() => {
        setLoading(null);
        onUpdated();
      })
      .catch((err) => {
        setLoading(null);
        setError(
          err.response?.data?.message ||
            t("deliveryOrderList.action.failed", "Status update failed."),
        );
      });
  };

  const total = items.reduce(
    (sum, item) =>
      sum + (item.lineTotal ?? (item.quantity || 0) * (item.unitPrice || 0)),
    0,
  );

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          {t("deliveryOrderList.action.title", "Delivery Order Actions")}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {fetchError && (
          <Typography
            sx={{ color: "var(--color-danger)", mb: 2, fontSize: "0.875rem" }}
          >
            {fetchError}
          </Typography>
        )}
        {!fullOrder && !fetchError && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}
        {fullOrder && (
          <>
            {/* Order summary */}
            <Box
              sx={{
                backgroundColor: "var(--color-gray-100)",
                p: 2,
                borderRadius: 1,
                mb: 3,
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t("deliveryOrderList.orderId", "Order ID")}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body1" fontWeight={500}>
                      {order.orderId}
                    </Typography>
                    <Chip
                      label={t(
                        `deliveryOrderList.status.${(order.orderStatus || "").toLowerCase()}`,
                        order.orderStatus || "",
                      )}
                      color={getStatusColor(order.orderStatus)}
                      size="small"
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t("deliveryOrderList.customerId", "Customer")}
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {order.displayCustomerName ||
                      String(order.customerId ?? "")}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t("deliveryOrderList.orderDate", "Order Date")}
                  </Typography>
                  <Typography variant="body1">
                    {order.orderDate
                      ? new Date(order.orderDate).toLocaleDateString()
                      : "—"}
                  </Typography>
                </Box>

                {order.projectCode && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("deliveryOrderList.projectCode", "Project Code")}
                    </Typography>
                    <Typography variant="body1">{order.projectCode}</Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t("deliveryOrderList.deliveryAmount", "Delivery Amount")}
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={600}
                    color="primary.main"
                  >
                    ${Number(order.deliveryAmount || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Items table */}
            {items.length > 0 && (
              <>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  {t("deliveryOrderList.items", "Items")}
                </Typography>
                <TableContainer
                  sx={{
                    border: "1px solid var(--color-gray-200)",
                    borderRadius: 1,
                    mb: 3,
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "background.default" }}>
                        <TableCell sx={{ width: 36, fontWeight: 600 }}>
                          #
                        </TableCell>
                        <TableCell sx={{ minWidth: 200, fontWeight: 600 }}>
                          {t("deliveryOrderList.product", "Product")}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {t("deliveryOrderList.quantity", "Qty")}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {t("deliveryOrderList.unitPrice", "Unit Price")}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {t("deliveryOrderList.lineTotal", "Line Total")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item, index) => {
                        const productName =
                          productMap[String(item.productCode)] || "";
                        const displayProduct =
                          productName || item.productCode || "-";
                        const lineTotal =
                          item.lineTotal != null
                            ? Number(item.lineTotal)
                            : (item.quantity || 0) * (item.unitPrice || 0);
                        return (
                          <TableRow
                            key={item.itemId || index}
                            sx={{
                              "&:hover": { backgroundColor: "action.hover" },
                            }}
                          >
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{displayProduct}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">
                              ${Number(item.unitPrice || 0).toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              ${lineTotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow sx={{ backgroundColor: "background.default" }}>
                        <TableCell
                          colSpan={4}
                          align="right"
                          sx={{ fontWeight: 600 }}
                        >
                          {t("deliveryOrderList.total", "Total")}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, color: "primary.main" }}
                        >
                          ${total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            <Divider sx={{ mb: 2 }} />

            {/* Action buttons */}
            {transitions.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 1 }}>
                {t(
                  "deliveryOrderList.action.noActions",
                  "No status actions available for this order.",
                )}
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {transitions.map((tr) => (
                  <Box
                    key={tr.newStatus}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 1.5,
                      border: "1px solid var(--color-gray-200)",
                      borderRadius: 1,
                      backgroundColor: "background.paper",
                    }}
                  >
                    {tr.dateField && (
                      <TextField
                        size="small"
                        type="date"
                        label={t(
                          `deliveryOrderList.action.dateLabel.${tr.dateField}`,
                          tr.dateField
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (s) => s.toUpperCase()),
                        )}
                        value={dates[tr.dateField] || ""}
                        onChange={(e) =>
                          setDates((prev) => ({
                            ...prev,
                            [tr.dateField]: e.target.value,
                          }))
                        }
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 160 }}
                      />
                    )}
                    <Button
                      variant={
                        tr.newStatus === "CANCELLED" || tr.newStatus === "NEW"
                          ? "outlined"
                          : "contained"
                      }
                      color={
                        tr.newStatus === "CANCELLED"
                          ? "error"
                          : tr.newStatus === "NEW"
                            ? "inherit"
                            : "primary"
                      }
                      onClick={() => handleAction(tr)}
                      disabled={loading !== null || !fullOrder}
                      startIcon={
                        loading === tr.newStatus ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : undefined
                      }
                    >
                      {t(tr.labelKey, tr.labelFallback)}
                    </Button>
                  </Box>
                ))}
              </Box>
            )}

            {error && (
              <Typography
                sx={{
                  mt: 2,
                  color: "var(--color-danger)",
                  fontSize: "0.875rem",
                }}
              >
                {error}
              </Typography>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryOrderStatusAction;
