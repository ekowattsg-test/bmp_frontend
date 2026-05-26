import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { Box, Typography, Button, Paper } from "@mui/material";
import { Warning as WarningIcon } from "@mui/icons-material";
import HeaderBar from "../common/HeaderBar";

const DeliveryOrderDelete = ({ order, onCancel, onDeleted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = () => {
    setLoading(true);
    setErrorMsg("");
    request("DELETE", `/api/deliveryOrders/${order.orderId}`)
      .then(() => {
        onDeleted();
      })
      .catch((error) => {
        console.error("Error deleting delivery order:", error);
        setErrorMsg(
          error.response?.data?.message ||
            t(
              "deliveryOrderList.errors.deleteFailed",
              "Failed to delete delivery order",
            ),
        );
        setLoading(false);
      });
  };

  return (
    <Box sx={{ p: 3 }}>
      <HeaderBar
        title={t("deliveryOrderList.deleteTitle", "Delete Delivery Order")}
        showBackButton
        onBack={onCancel}
      />

      <Paper
        sx={{
          p: 3,
          border: "1px solid var(--color-danger)",
          borderRadius: 1,
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <WarningIcon sx={{ color: "error.main", mt: 0.5 }} />
          <Box>
            <Typography variant="h6" sx={{ color: "error.main", mb: 1 }}>
              {t(
                "deliveryOrderList.confirmDelete",
                "Are you sure you want to delete this delivery order?",
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t(
                "deliveryOrderList.deleteWarning",
                "This action cannot be undone. All items associated with this delivery order will also be deleted.",
              )}
            </Typography>

            <Box
              sx={{
                backgroundColor: "var(--color-gray-100)",
                p: 2,
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t("deliveryOrderList.orderId", "Order ID")}:{" "}
                <strong>{order.orderId}</strong>
              </Typography>
              {(order.customerName || order.customerId) && (
                <Typography variant="body2" color="text.secondary">
                  {t("deliveryOrderList.customerId", "Customer")}:{" "}
                  <strong>
                    {order.customerName
                      ? `${order.customerName} (${order.customerId})`
                      : order.customerId}
                  </strong>
                </Typography>
              )}
              {order.orderDate && (
                <Typography variant="body2" color="text.secondary">
                  {t("deliveryOrderList.orderDate", "Order Date")}:{" "}
                  <strong>
                    {new Date(order.orderDate).toLocaleDateString()}
                  </strong>
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>

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
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={loading}
        >
          {t("basic.confirm", "Confirm")}
        </Button>
        <Button variant="outlined" onClick={onCancel} disabled={loading}>
          {t("basic.cancel", "Cancel")}
        </Button>
      </Box>
    </Box>
  );
};

export default DeliveryOrderDelete;
