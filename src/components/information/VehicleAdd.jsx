import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { TextField, Button, Box, MenuItem } from "@mui/material";
import { HeaderBar } from "../common";

const VehicleAdd = ({ onCancel }) => {
  const { t } = useTranslation();
  const [staffList, setStaffList] = useState([]);
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    driver: "",
    active: 1,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    request("GET", "/api/staffs")
      .then((res) =>
        setStaffList((res.data || []).filter((s) => s.active === 1)),
      )
      .catch(() => setStaffList([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    request("POST", "/api/vehicles", {
      ...formData,
      active: Number(formData.active),
    })
      .then(() => onCancel(true))
      .catch((err) => {
        setErrorMsg(err?.response?.data?.message || t("basic.failed"));
        setLoading(false);
      });
  };

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: 20,
        background: "var(--color-gray-100)",
        borderRadius: 8,
      }}
    >
      <HeaderBar
        title={t("vehicleList.addTitle", "Add Vehicle")}
        sx={{ mb: 2 }}
      />
      <form onSubmit={handleSubmit}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label={t("vehicleList.vehicleNumber", "Vehicle No.")}
            name="vehicleNumber"
            value={formData.vehicleNumber}
            onChange={handleChange}
            required
          />
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            select
            fullWidth
            label={t("vehicleList.driver", "Driver")}
            name="driver"
            value={formData.driver}
            onChange={handleChange}
          >
            <MenuItem value="">{t("basic.none", "— None —")}</MenuItem>
            {staffList.map((s) => (
              <MenuItem key={s.staffId} value={s.staffId}>
                {s.staffName}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            select
            fullWidth
            label={t("vehicleList.active", "Active")}
            name="active"
            value={formData.active}
            onChange={handleChange}
          >
            <MenuItem value={1}>{t("basic.true", "Yes")}</MenuItem>
            <MenuItem value={0}>{t("basic.false", "No")}</MenuItem>
          </TextField>
        </Box>
        {errorMsg && (
          <div style={{ color: "var(--color-danger)", marginBottom: 8 }}>
            {errorMsg}
          </div>
        )}
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

export default VehicleAdd;
