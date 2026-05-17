import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { Button, Box, Typography } from "@mui/material";
import { HeaderBar } from "../common";

const VehicleDelete = ({ vehicle, onCancel, onDeleted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = () => {
    setLoading(true);
    setErrorMsg("");
    request("DELETE", `/api/vehicles/${vehicle.vehicleNumber}`)
      .then(() => onDeleted())
      .catch((err) => {
        setErrorMsg(err?.response?.data?.message || t("basic.failed"));
        setLoading(false);
      });
  };

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: 20,
        background: "var(--color-gray-100)",
        borderRadius: 8,
      }}
    >
      <HeaderBar
        title={t("vehicleList.deleteTitle", "Delete Vehicle")}
        sx={{ mb: 2 }}
      />
      <Typography sx={{ mb: 2 }}>
        {t(
          "vehicleList.confirmDelete",
          "Are you sure you want to delete this vehicle?",
        )}{" "}
        <strong>{vehicle.vehicleNumber}</strong>
      </Typography>
      {errorMsg && (
        <div style={{ color: "var(--color-danger)", marginBottom: 8 }}>
          {errorMsg}
        </div>
      )}
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

export default VehicleDelete;
