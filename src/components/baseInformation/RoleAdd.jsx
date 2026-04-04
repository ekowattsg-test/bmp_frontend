import React, { useState } from "react";
import { MenuItem } from "@mui/material";
import { Box, Button, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";

import { useContext } from "react";
import { AuthContext } from "../../context/authContext";

const RoleAdd = ({ onCancel }) => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
  const [form, setForm] = useState({
    role: "",
    description: "",
    level: 1,
    menu: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const validate = () => {
    let errs = {};
    if (!form.role || form.role.trim() === "") {
      errs.role = t("roleList.role") + " is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "level" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg("");
    setSuccess(false);
    try {
      await request("POST", "/api/roles", form);
      setSuccess(true);
      if (onCancel) onCancel(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.false"));
    }
    setLoading(false);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: { xs: "100%", sm: 400 },
        mx: "auto",
        mt: 2,
        mb: 2,
        background: "var(--color-gray-100)",
        p: { xs: 1, sm: 2 },
        borderRadius: 2,
      }}
    >
      <HeaderBar
        title={t("roleList.addTitle")}
        sx={{ mb: 1 }}
      />
      <TextField
        label={t("roleList.role")}
        name="role"
        value={form.role}
        onChange={handleChange}
        fullWidth
        margin="normal"
        error={!!errors.role}
        helperText={errors.role}
      />
      <TextField
        label={t("roleList.description")}
        name="description"
        value={form.description}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label={t("roleList.menu", "Menu")}
        name="menu"
        value={form.menu}
        onChange={handleChange}
        fullWidth
        margin="normal"
        placeholder={t("roleList.menuPlaceholder", "Menu (optional)")}
      />
      <TextField
        select
        label={t("roleList.level")}
        name="level"
        value={form.level}
        onChange={handleChange}
        fullWidth
        margin="normal"
      >
        {Array.from(
          { length: Math.min(userInfo.level ?? 9, 9) },
          (_, i) => i + 1,
        ).map((lvl) => (
          <MenuItem key={lvl} value={lvl}>
            {lvl}
          </MenuItem>
        ))}
      </TextField>
      {errorMsg && (
        <div style={{ color: "var(--color-danger)", marginTop: 8 }}>
          {errorMsg}
        </div>
      )}
      {success && (
        <div style={{ color: "var(--color-success)", marginTop: 8 }}>
          {t("basic.true")}
        </div>
      )}
      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
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
    </Box>
  );
};

export default RoleAdd;
