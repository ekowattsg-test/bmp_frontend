import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { AuthContext } from "../../context/authContext";
import { generateAndStorePurchaseOrderPdf } from "../../helpers/purchase_order_pdf_helper";
import { StaffSelectionDialog } from "../common";
import {
  resolveCurrentUserForMessaging,
  buildPurchaseOrderReadyMessage,
  sendDirectMessage,
} from "../../helpers/messaging_helper";
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
  const { userInfo } = useContext(AuthContext);
  const [currentOrder, setCurrentOrder] = useState(order);

  const transitions = getTransitions(currentOrder.orderStatus || "");

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
          map[String(p.productCode)] = p;
        });
        setProductMap(map);
      }
    });
  }, [order.orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

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
  const [success, setSuccess] = useState("");

  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [currentMessagingUser, setCurrentMessagingUser] = useState(null);

  useEffect(() => {
    setStaffDialogOpen(false);
    setPendingTransition(null);
    setCurrentMessagingUser(null);
  }, [order.orderId]);

  const ensureMessagingUser = async () => {
    if (currentMessagingUser) return currentMessagingUser;
    const resolved = await resolveCurrentUserForMessaging(userInfo);
    if (resolved) setCurrentMessagingUser(resolved);
    return resolved;
  };

  const handleAction = async (transition) => {
    if (!fullOrder) return;
    setError("");
    setSuccess("");

    if (transition.newStatus === "READY") {
      const messagingUser = await ensureMessagingUser();
      if (!messagingUser) {
        setError(
          t(
            "purchaseOrderList.action.messagingNotEligible",
            "You are not eligible to send messages. Status update aborted.",
          ),
        );
        return;
      }
      setPendingTransition(transition);
      setStaffDialogOpen(true);
      return;
    }

    setLoading(transition.newStatus);

    const payload = {
      ...fullOrder,
      orderStatus: transition.newStatus,
      [transition.dateField]: dates[transition.dateField],
    };

    try {
      await request("PUT", `/api/purchaseOrders/${order.orderId}`, payload);

      const nextOrder = {
        ...currentOrder,
        ...payload,
      };
      setCurrentOrder(nextOrder);
      setFullOrder((prev) => (prev ? { ...prev, ...payload } : prev));

      if (transition.newStatus === "ISSUED") {
        try {
          await generateAndStorePurchaseOrderPdf({
            companyId: String(userInfo?.companyId || "").trim(),
            order: nextOrder,
            items: fullOrder?.items || [],
            productMap,
          });
        } catch (pdfError) {
          setLoading(null);
          setError(
            pdfError?.message ||
              t(
                "purchaseOrderList.action.pdfFailed",
                "Purchase order was issued, but the PDF could not be stored.",
              ),
          );
          return;
        }
      }

      setLoading(null);
      onUpdated();
    } catch (err) {
      setLoading(null);
      setError(
        err.response?.data?.message ||
          t("purchaseOrderList.action.failed", "Status update failed."),
      );
    }
  };

  const handleStaffConfirm = async (staff) => {
    if (!pendingTransition || !fullOrder) return;
    setStaffDialogOpen(false);
    setError("");
    setSuccess("");
    setLoading(pendingTransition.newStatus);

    const transition = pendingTransition;
    const payload = {
      ...fullOrder,
      orderStatus: transition.newStatus,
      [transition.dateField]: dates[transition.dateField],
    };

    try {
      await request("PUT", `/api/purchaseOrders/${order.orderId}`, payload);

      const nextOrder = {
        ...currentOrder,
        ...payload,
      };
      setCurrentOrder(nextOrder);
      setFullOrder((prev) => (prev ? { ...prev, ...payload } : prev));

      let messageError = "";
      try {
        const messagingUser =
          currentMessagingUser || (await ensureMessagingUser());
        const content = buildPurchaseOrderReadyMessage(
          nextOrder,
          dates[transition.dateField],
          t,
        );
        await sendDirectMessage(messagingUser, staff.staffId, content);
        setSuccess(
          t(
            "purchaseOrderList.action.readySuccess",
            "Purchase order marked ready and message sent to {{staffName}}.",
            { staffName: staff.staffName || staff.staffId },
          ),
        );
      } catch (msgErr) {
        messageError =
          msgErr?.response?.data?.message ||
          msgErr?.message ||
          t(
            "purchaseOrderList.action.messageFailed",
            "Status updated, but the message could not be sent.",
          );
        setError(messageError);
      }

      setLoading(null);
      setPendingTransition(null);
      if (!messageError) onUpdated();
    } catch (err) {
      setLoading(null);
      setPendingTransition(null);
      setError(
        err.response?.data?.message ||
          t("purchaseOrderList.action.failed", "Status update failed."),
      );
    }
  };

  const handleManualRegeneratePdf = async () => {
    if (!fullOrder) return;

    setError("");
    setSuccess("");
    setLoading("MANUAL_PDF");

    try {
      await generateAndStorePurchaseOrderPdf({
        companyId: String(userInfo?.companyId || "").trim(),
        order: {
          ...fullOrder,
          ...currentOrder,
        },
        items: fullOrder?.items || [],
        productMap,
      });

      setSuccess(
        t(
          "purchaseOrderList.action.pdfRegenerated",
          "Purchase order PDF regenerated and stored.",
        ),
      );
      setLoading(null);
      onUpdated();
    } catch (pdfError) {
      setLoading(null);
      setError(
        pdfError?.message ||
          t(
            "purchaseOrderList.action.pdfRegenerateFailed",
            "Failed to regenerate purchase order PDF.",
          ),
      );
    }
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
        <Typography component="span" variant="h6" fontWeight={600}>
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
                      {currentOrder.orderId}
                    </Typography>
                    <Chip
                      label={t(
                        `purchaseOrderList.status.${(currentOrder.orderStatus || "").toLowerCase()}`,
                        currentOrder.orderStatus || "",
                      )}
                      color={getStatusColor(currentOrder.orderStatus)}
                      size="small"
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t("purchaseOrderList.vendorId", "Vendor")}
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {currentOrder.vendorName || currentOrder.vendorId}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t("purchaseOrderList.orderDate", "Order Date")}
                  </Typography>
                  <Typography variant="body1">
                    {currentOrder.orderDate
                      ? new Date(currentOrder.orderDate).toLocaleDateString()
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
                    ${Number(currentOrder.purchaseAmount || 0).toFixed(2)}
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
                        const product =
                          productMap[String(item?.productCode || "").trim()] ||
                          null;
                        const displayProduct =
                          String(product?.commonName || "").trim() ||
                          String(product?.productName || "").trim() ||
                          String(item?.productCode || "").trim() ||
                          "-";
                        const rawType = String(item.itemType || "")
                          .trim()
                          .toUpperCase();
                        const displayItemType =
                          rawType === "A"
                            ? t(
                                "purchaseOrderList.itemTypeOptions.assets",
                                "Assets",
                              )
                            : rawType === "I"
                              ? t(
                                  "purchaseOrderList.itemTypeOptions.inventory",
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

            <Box
              sx={{
                mt: 2,
                p: 1.5,
                border: "1px solid var(--color-gray-200)",
                borderRadius: 1,
                backgroundColor: "background.paper",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t(
                  "purchaseOrderList.action.regeneratePdfHint",
                  "Regenerate and replace the document for this PO and current status.",
                )}
              </Typography>
              <Button
                variant="outlined"
                onClick={handleManualRegeneratePdf}
                disabled={loading !== null || !fullOrder}
                startIcon={
                  loading === "MANUAL_PDF" ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : undefined
                }
              >
                {t("purchaseOrderList.action.regeneratePdf", "Regenerate PDF")}
              </Button>
            </Box>

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

            {success && (
              <Typography
                sx={{
                  mt: 2,
                  color: "var(--color-success)",
                  fontSize: "0.875rem",
                }}
              >
                {success}
              </Typography>
            )}
          </>
        )}
      </DialogContent>

      <StaffSelectionDialog
        open={staffDialogOpen}
        onClose={() => {
          setStaffDialogOpen(false);
          setPendingTransition(null);
        }}
        onConfirm={handleStaffConfirm}
        title={t(
          "purchaseOrderList.action.selectStaffTitle",
          "Select Staff to Collect Inventory",
        )}
        description={t(
          "purchaseOrderList.action.selectStaffDescription",
          "Choose a delivery staff member to assign the collection of this purchase order.",
        )}
        roleFilters={["DELIVER"]}
        confirmLabel={t("purchaseOrderList.action.confirmAssign", "Assign")}
      />
    </Dialog>
  );
};

export default PurchaseOrderStatusAction;
