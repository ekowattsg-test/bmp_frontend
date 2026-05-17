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

// Returns the list of possible status transitions for a given current status.
// Each entry: { newStatus, dateField, labelKey, labelFallback }
const getTransitions = (currentStatus) => {
  switch (currentStatus) {
    case "NEW":
    case "PROCESSING":
      return [
        {
          newStatus: "ISSUED",
          dateField: "issuedDate",
          labelKey: "purchaseOrderList.action.issue",
          labelFallback: "Issue",
        },
      ];
    case "ISSUED":
      return [
        {
          newStatus: "CONFIRMED",
          dateField: "confirmedDate",
          labelKey: "purchaseOrderList.action.confirm",
          labelFallback: "Confirm",
        },
        {
          newStatus: "CANCELLED",
          dateField: "cancelledDate",
          labelKey: "purchaseOrderList.action.cancel",
          labelFallback: "Cancel",
        },
      ];
    case "CONFIRMED":
      return [
        {
          newStatus: "READY",
          dateField: "readyDate",
          labelKey: "purchaseOrderList.action.ready",
          labelFallback: "Mark Ready",
        },
      ];
    default:
      return [];
  }
};

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
    case "ISSUED":
      return "warning";
    case "CONFIRMED":
      return "secondary";
    case "READY":
      return "success";
    default:
      return "default";
  }
};

const today = () => new Date().toISOString().split("T")[0];

const PurchaseOrderStatusAction = ({ order, onClose, onUpdated }) => {
  const { t } = useTranslation();

  const transitions = getTransitions(order.orderStatus || "");

  // Full order record fetched from GET (needed so PUT includes items)
  const [fullOrder, setFullOrder] = useState(null);
  const [productMap, setProductMap] = useState({});
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    Promise.allSettled([
      request("GET", `/api/purchaseOrders/${order.orderId}`),
      request("GET", "/api/products"),
    ]).then(([orderRes, productsRes]) => {
      if (orderRes.status === "fulfilled") {
        setFullOrder(orderRes.value.data);
      } else {
        setFetchError(
          t(
            "purchaseOrderList.action.loadFailed",
            "Failed to load order details.",
          ),
        );
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

  // date state keyed by dateField, defaulting to today
  const [dates, setDates] = useState(() => {
    const init = {};
    getTransitions(order.orderStatus || "").forEach((tr) => {
      init[tr.dateField] = today();
    });
    return init;
  });

  const [loading, setLoading] = useState(null); // which newStatus is loading
  const [error, setError] = useState("");

  const handleAction = (transition) => {
    if (!fullOrder) return;
    setError("");
    setLoading(transition.newStatus);

    const payload = {
      ...fullOrder,
      orderStatus: transition.newStatus,
      [transition.dateField]: dates[transition.dateField],
    };

    request("PUT", `/api/purchaseOrders/${order.orderId}`, payload)
      .then(() => {
        setLoading(null);
        onUpdated();
      })
      .catch((err) => {
        setLoading(null);
        setError(
          err.response?.data?.message ||
            t("purchaseOrderList.action.failed", "Status update failed."),
        );
      });
  };

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
          {t("purchaseOrderList.action.title", "Purchase Order Actions")}
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
            {/* PO summary */}
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
                    {t("purchaseOrderList.orderId", "Order ID")}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body1" fontWeight={500}>
                      {order.orderId}
                    </Typography>
                    <Chip
                      label={t(
                        `purchaseOrderList.status.${(order.orderStatus || "").toLowerCase()}`,
                        order.orderStatus || "",
                      )}
                      color={getStatusColor(order.orderStatus)}
                      size="small"
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t("purchaseOrderList.vendorId", "Vendor")}
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {order.vendorName || order.vendorId}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t("purchaseOrderList.orderDate", "Order Date")}
                  </Typography>
                  <Typography variant="body1">
                    {order.orderDate
                      ? new Date(order.orderDate).toLocaleDateString()
                      : "—"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t("purchaseOrderList.purchaseAmount", "Purchase Amount")}
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={600}
                    color="primary.main"
                  >
                    ${Number(order.purchaseAmount || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Items table */}
            {fullOrder?.items?.length > 0 && (
              <>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  {t("purchaseOrderList.items", "Items")}
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
                          {t("purchaseOrderList.product", "Product")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {t("purchaseOrderList.itemType", "Item Type")}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {t("purchaseOrderList.quantity", "Qty")}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {t("purchaseOrderList.unitPrice", "Unit Price")}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {t("purchaseOrderList.lineTotal", "Line Total")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fullOrder.items.map((item, index) => {
                        const productName =
                          productMap[String(item.productCode)] || "";
                        const displayProduct =
                          productName || item.productCode || "-";
                        const rawType = String(item.itemType || "")
                          .trim()
                          .toUpperCase();
                        const displayItemType =
                          rawType === "A"
                            ? t("purchaseOrderList.itemType.assets", "Assets")
                            : rawType === "I"
                              ? t(
                                  "purchaseOrderList.itemType.inventory",
                                  "Inventory",
                                )
                              : item.itemType || "-";
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
                            <TableCell>{displayItemType}</TableCell>
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
                          colSpan={5}
                          align="right"
                          sx={{ fontWeight: 600 }}
                        >
                          {t("purchaseOrderList.total", "Total")}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, color: "primary.main" }}
                        >
                          $
                          {fullOrder.items
                            .reduce((sum, item) => {
                              const lt =
                                item.lineTotal != null
                                  ? Number(item.lineTotal)
                                  : (item.quantity || 0) *
                                    (item.unitPrice || 0);
                              return sum + lt;
                            }, 0)
                            .toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            <Divider sx={{ mb: 2 }} />
            {transitions.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 1 }}>
                {t(
                  "purchaseOrderList.action.noActions",
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
                    <TextField
                      size="small"
                      type="date"
                      label={t(
                        `purchaseOrderList.action.dateLabel.${tr.dateField}`,
                        tr.dateField
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (s) => s.toUpperCase()),
                      )}
                      value={dates[tr.dateField]}
                      onChange={(e) =>
                        setDates((prev) => ({
                          ...prev,
                          [tr.dateField]: e.target.value,
                        }))
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{ minWidth: 160 }}
                    />
                    <Button
                      variant={
                        tr.newStatus === "CANCELLED" ? "outlined" : "contained"
                      }
                      color={tr.newStatus === "CANCELLED" ? "error" : "primary"}
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

export default PurchaseOrderStatusAction;
