import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { Button, Box, Typography, Alert } from "@mui/material";
import { Warning as WarningIcon } from "@mui/icons-material";

const PurchaseOrderDelete = ({ order, onCancel, onDeleted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = () => {
    setLoading(true);
    setErrorMsg("");
    request("DELETE", `/api/purchaseOrders/${order.orderId}`)
      .then(() => {
        onDeleted();
      })
      .catch((error) => {
        console.error("Error deleting purchase order:", error);
        setErrorMsg(
          error.response?.data?.message ||
            t(
              "purchaseOrderList.errors.deleteFailed",
              "Failed to delete purchase order",
            ),
        );
        setLoading(false);
      });
  };

  return (
    <Box
      sx={{
        maxWidth: 500,
        margin: "0 auto",
        p: 3,
        mt: 5,
        backgroundColor: "background.paper",
        borderRadius: 1,
        boxShadow: 3,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 1 }}>
        <WarningIcon sx={{ color: "error.main", fontSize: 32 }} />
        <Typography variant="h5" color="error">
          {t("purchaseOrderList.deleteTitle", "Delete Purchase Order")}
        </Typography>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        {t(
          "purchaseOrderList.deleteWarning",
          "This action cannot be undone. All items associated with this purchase order will also be deleted.",
        )}
      </Alert>

      <Box
        sx={{
          backgroundColor: "var(--color-gray-100)",
          p: 2,
          borderRadius: 1,
          mb: 3,
        }}
      >
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {t("purchaseOrderList.orderDetails", "Order Details")}:
        </Typography>
        <Typography variant="body1">
          <strong>{t("purchaseOrderList.orderId", "Order ID")}:</strong>{" "}
          {order.orderId}
        </Typography>
        <Typography variant="body1">
          <strong>{t("purchaseOrderList.vendorId", "Vendor ID")}:</strong>{" "}
          {order.vendorId}
        </Typography>
        <Typography variant="body1">
          <strong>{t("purchaseOrderList.orderDate", "Order Date")}:</strong>{" "}
          {order.orderDate
            ? new Date(order.orderDate).toLocaleDateString()
            : "N/A"}
        </Typography>
        <Typography variant="body1">
          <strong>
            {t("purchaseOrderList.purchaseAmount", "Purchase Amount")}:
          </strong>{" "}
          ${order.purchaseAmount?.toFixed(2) || "0.00"}
        </Typography>
        <Typography variant="body1">
          <strong>{t("purchaseOrderList.orderStatus", "Status")}:</strong>{" "}
          {order.orderStatus}
        </Typography>
      </Box>

      <Typography variant="body1" sx={{ mb: 3 }}>
        {t(
          "purchaseOrderList.confirmDelete",
          "Are you sure you want to delete this purchase order?",
        )}
      </Typography>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          onClick={() => onCancel()}
          disabled={loading}
        >
          {t("basic.cancel", "Cancel")}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading
            ? t("basic.deleting", "Deleting...")
            : t("basic.delete", "Delete")}
        </Button>
      </Box>
    </Box>
  );
};

export default PurchaseOrderDelete;
