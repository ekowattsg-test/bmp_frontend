import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { TextField, Box, Button } from "@mui/material";
import { HeaderBar } from "../common";
import { FormActions } from "../common/CRUDActions";

const StockMovementCodeAdd = ({ onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    movementType: "",
    movementDescription: "",
    stockModifier: 0,
    holdModifier: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    request("POST", "/api/stockmovementcodes", formData)
      .then(() => {
        onCancel(true);
      })
      .catch((err) => {
        console.error("Error adding stock movement code:", err);
        setLoading(false);
      });
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <HeaderBar
        title={t("stockMovementCode.add")}
        sx={{ mb: 1 }}
      />
      <form onSubmit={handleSubmit}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("stockMovementCode.movementType")}
            name="movementType"
            value={formData.movementType}
            onChange={handleChange}
            required
            inputProps={{ maxLength: 10 }}
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("stockMovementCode.movementDescription")}
            name="movementDescription"
            value={formData.movementDescription}
            onChange={handleChange}
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("stockMovementCode.stockModifier")}
            name="stockModifier"
            type="number"
            value={formData.stockModifier}
            onChange={handleChange}
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("stockMovementCode.holdModifier")}
            name="holdModifier"
            type="number"
            value={formData.holdModifier}
            onChange={handleChange}
          />
        </Box>

        <FormActions
          loading={loading}
          onCancel={() => onCancel(false)}
          onSubmit={handleSubmit}
          submitLabel={t("basic.save")}
          cancelLabel={t("basic.cancel")}
        />
      </form>
    </div>
  );
};

export default StockMovementCodeAdd;
// Cleared for clean re-implementation
