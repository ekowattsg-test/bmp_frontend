import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { TextField, Button, Box } from "@mui/material";
import { HeaderBar } from "../common";

const VendorEdit = ({ vendor, onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(vendor);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    request("PUT", `/api/vendors/${vendor.vendorId}`, {
      ...formData,
      active: formData.active ? 1 : 0,
    })
      .then(() => {
        onCancel(true);
      })
      .catch((error) => {
        console.error("Error editing vendor:", error);
        setLoading(false);
      });
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <HeaderBar
        title={t("vendorList.editTitle")}
        sx={{ mb: 1 }}
      />
      <form onSubmit={handleSubmit}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("vendorList.vendorId")}
            name="vendorId"
            value={formData.vendorId}
            disabled
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("vendorList.vendorName")}
            name="vendorName"
            value={formData.vendorName}
            onChange={handleChange}
            required
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("vendorList.contactEmail")}
            name="contactEmail"
            type="email"
            value={formData.contactEmail}
            onChange={handleChange}
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("vendorList.latitude")}
            name="latitude"
            value={formData.latitude}
            onChange={handleChange}
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("vendorList.longitude")}
            name="longitude"
            value={formData.longitude}
            onChange={handleChange}
          />
        </Box>
        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <input
            type="checkbox"
            name="active"
            checked={formData.active}
            onChange={handleChange}
          />
          <label>{t("vendorList.active")}</label>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {t("basic.save")}
          </Button>
          <Button
            variant="outlined"
            onClick={() => onCancel(false)}
            disabled={loading}
          >
            {t("basic.cancel")}
          </Button>
        </Box>
      </form>
    </div>
  );
};

export default VendorEdit;
