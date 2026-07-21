import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { TextField, Button, Box } from "@mui/material";
import { HeaderBar } from "../common";

const buildAddressPayload = ({ line1, line2, city, postalCode }) => {
  const payload = {
    Line1: String(line1 || "").trim(),
    PostalCode: String(postalCode || "").trim(),
    City: String(city || "").trim(),
  };
  const normalizedLine2 = String(line2 || "").trim();
  if (normalizedLine2) payload.Line2 = normalizedLine2;
  return JSON.stringify(payload);
};

const VendorAdd = ({ onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    vendorId: "",
    vendorName: "",
    active: true,
    contactEmail: "",
    addressLine1: "",
    addressLine2: "",
    addressCity: "",
    addressPostalCode: "",
    latitude: "",
    longitude: "",
  });
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
    const vendorPayload = {
      vendorId: formData.vendorId,
      vendorName: formData.vendorName,
      contactEmail: formData.contactEmail,
      latitude: formData.latitude,
      longitude: formData.longitude,
      address: buildAddressPayload({
        line1: formData.addressLine1,
        line2: formData.addressLine2,
        city: formData.addressCity,
        postalCode: formData.addressPostalCode,
      }),
      active: formData.active ? 1 : 0,
    };
    request("POST", "/api/vendors", {
      ...vendorPayload,
    })
      .then(() => {
        onCancel(true);
      })
      .catch((error) => {
        console.error("Error adding vendor:", error);
        setLoading(false);
      });
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <HeaderBar title={t("vendorList.addTitle")} sx={{ mb: 1 }} />
      <form onSubmit={handleSubmit}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("vendorList.vendorId")}
            name="vendorId"
            value={formData.vendorId}
            onChange={handleChange}
            required
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
            label={t("vendorList.addressLine1", "Address Line 1")}
            name="addressLine1"
            value={formData.addressLine1}
            onChange={handleChange}
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("vendorList.addressLine2", "Address Line 2")}
            name="addressLine2"
            value={formData.addressLine2}
            onChange={handleChange}
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("vendorList.addressPostalCode", "Postal Code")}
            name="addressPostalCode"
            value={formData.addressPostalCode}
            onChange={handleChange}
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("vendorList.addressCity", "City")}
            name="addressCity"
            value={formData.addressCity}
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

export default VendorAdd;
