import React, { useState, useEffect, useContext } from "react";
import {
  TextField,
  Button,
  Box,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { request } from "../../helpers/axios_helper";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { hasRole } from "../../helpers/roles_helper";

const UserAdd = ({ onCancel }) => {
  const { userInfo, roles } = useContext(AuthContext);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    login: "",
    password: "",
    level: 0,
    companyId: userInfo.companyId || "",
    active: true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [companies, setCompanies] = useState([]);
  const { t } = useTranslation();

  const isActiveValue = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    const falseValues = new Set([
      "false",
      "0",
      "no",
      "n",
      "inactive",
      "i",
      "disabled",
      "d",
      "off",
      "f",
    ]);
    if (falseValues.has(normalized)) return false;
    const trueValues = new Set([
      "true",
      "1",
      "yes",
      "y",
      "active",
      "a",
      "enabled",
      "on",
      "t",
    ]);
    if (trueValues.has(normalized)) return true;
    return true;
  };

  useEffect(() => {
    request("GET", "/api/companies")
      .then((response) => {
        setCompanies(response.data.filter((c) => c.active));
      })
      .catch(() => {
        setCompanies([]);
      });
  }, [roles]);

  const validate = () => {
    let errs = {};
    if (!form.firstName || form.firstName.trim() === "") {
      errs.firstName = t("userList.firstName") + " is required";
    }
    if (!form.lastName || form.lastName.trim() === "") {
      errs.lastName = t("userList.lastName") + " is required";
    }
    if (!form.login || form.login.trim() === "") {
      errs.login = t("userList.login") + " is required";
    }
    if (!form.password || form.password.trim() === "") {
      errs.password = t("userList.password") + " is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg("");
    setSuccess(false);
    try {
      // Explicitly include companyId and level in the payload
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        login: form.login,
        password: form.password,
        companyId: form.companyId,
        level: form.level,
        active: isActiveValue(form.active) ? 1 : 0,
      };
      await request("POST", "/register", payload);
      setSuccess(true);
      if (onCancel) {
        onCancel(true); // Pass true to indicate successful add
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.false"));
    }
    setLoading(false);
  };

  // Generate level options from 0 to userInfo.level
  const levelOptions = Array.from(
    { length: (userInfo.level ?? 1) + 1 },
    (_, i) => i,
  );

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
      <h2
        style={{
          fontSize: "clamp(1.2rem, 4vw, 2rem)",
          margin: 0,
        }}
      >
        {t("userList.addTitle", "Add User")}
      </h2>
      <TextField
        label={t("userList.firstName")}
        name="firstName"
        value={form.firstName}
        onChange={handleChange}
        fullWidth
        margin="normal"
        error={!!errors.firstName}
        helperText={errors.firstName}
      />
      <TextField
        label={t("userList.lastName")}
        name="lastName"
        value={form.lastName}
        onChange={handleChange}
        fullWidth
        margin="normal"
        error={!!errors.lastName}
        helperText={errors.lastName}
      />
      <TextField
        label={t("userList.login")}
        name="login"
        value={form.login}
        onChange={handleChange}
        fullWidth
        margin="normal"
        error={!!errors.login}
        helperText={errors.login}
      />
      <TextField
        label={t("userList.password")}
        name="password"
        value={form.password}
        onChange={handleChange}
        fullWidth
        margin="normal"
        type="password"
        error={!!errors.password}
        helperText={errors.password}
      />
      <TextField
        select
        label={t("userList.level")}
        name="level"
        value={form.level}
        onChange={handleChange}
        fullWidth
        margin="normal"
      >
        {levelOptions.map((lvl) => (
          <MenuItem key={lvl} value={lvl}>
            {lvl}
          </MenuItem>
        ))}
      </TextField>
      {hasRole("BaseSetup", roles) ? (
        <TextField
          select
          label={t("userList.companyId")}
          name="companyId"
          value={
            companies.some((c) => c.companyId === form.companyId)
              ? form.companyId
              : ""
          }
          onChange={handleChange}
          fullWidth
          margin="normal"
        >
          {companies.map((c) => (
            <MenuItem key={c.companyId} value={c.companyId}>
              {c.companyName}
            </MenuItem>
          ))}
        </TextField>
      ) : (
        <TextField
          label={t("userList.companyId")}
          name="companyId"
          value={(() => {
            const company = companies.find(
              (c) => c.companyId === form.companyId,
            );
            return company ? company.companyName : form.companyId;
          })()}
          fullWidth
          margin="normal"
          disabled
        />
      )}
      <FormControlLabel
        sx={{ mt: 1 }}
        label={t("userList.active", "Active")}
        control={
          <Checkbox
            name="active"
            color="primary"
            checked={isActiveValue(form.active)}
            onChange={(e) => {
              const boolValue = e.target.checked;
              setForm((prev) => ({
                ...prev,
                active: boolValue,
              }));
            }}
          />
        }
      />
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

export default UserAdd;
