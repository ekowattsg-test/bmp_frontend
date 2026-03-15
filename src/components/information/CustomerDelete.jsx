import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { Button, Box } from "@mui/material";

const CustomerDelete = ({ customer, onCancel, onDeleted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    setLoading(true);
    request("DELETE", `/api/customers/${customer.customerId}`)
      .then(() => {
        onDeleted();
      })
      .catch((error) => {
        console.error("Error deleting customer:", error);
        setLoading(false);
      });
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: 20 }}>
      <h2>{t("customerList.deleteTitle")}</h2>
      <p>
        {t("customerList.confirmDelete")} ({customer.customerName})
      </p>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={loading}
        >
          {t("basic.delete")}
        </Button>
        <Button
          variant="outlined"
          onClick={() => onCancel()}
          disabled={loading}
        >
          {t("basic.cancel")}
        </Button>
      </Box>
    </div>
  );
};

export default CustomerDelete;
