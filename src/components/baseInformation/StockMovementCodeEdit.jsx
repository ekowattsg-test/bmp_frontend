import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { TextField, Box } from "@mui/material";
import { HeaderBar } from "../common";
import { FormActions } from "../common/CRUDActions";

const StockMovementCodeEdit = ({ item, onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ ...item });
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
    request("PUT", `/api/stockmovementcodes/${formData.movementType}`, formData)
      .then(() => onCancel(true))
      .catch((err) => {
        console.error("Error updating stock movement code:", err);
        setLoading(false);
      });
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <HeaderBar
        title={t("stockMovementCode.edit")}
        titleVariant="h5"
        titleSx={{ fontSize: "clamp(1.2rem, 4vw, 2rem)", fontWeight: 600 }}
        sx={{ mb: 1 }}
      />
      <form onSubmit={handleSubmit}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("stockMovementCode.movementType")}
            name="movementType"
            value={formData.movementType}
            disabled
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("stockMovementCode.movementDescription")}
            name="movementDescription"
            value={formData.movementDescription || ""}
            onChange={handleChange}
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("stockMovementCode.stockModifier")}
            name="stockModifier"
            type="number"
            value={formData.stockModifier || 0}
            onChange={handleChange}
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("stockMovementCode.holdModifier")}
            name="holdModifier"
            type="number"
            value={formData.holdModifier || 0}
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

export default StockMovementCodeEdit;
// Cleared for clean re-implementation
