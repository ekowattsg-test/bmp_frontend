import React, { useState, useEffect, useContext, useMemo } from "react";
import { Box, Button, TextField, MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { AuthContext } from "../../context/authContext";
import { HeaderBar } from "../common";

const UserRoleAdd = ({ onCancel }) => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
  const [form, setForm] = useState({ roleId: "", userId: "" });
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [userRoleViews, setUserRoleViews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Fetch roles, filter by level
    request("GET", "/api/roles")
      .then((response) => {
        const filteredRoles = response.data.filter(
          (r) => typeof r.level === "number" && r.level <= userInfo.level,
        );
        setRoles(filteredRoles);
      })
      .catch(() => setRoles([]));
    // Fetch users, filter by company and level
    request("GET", "/api/users")
      .then((response) => {
        let filteredUsers = response.data;
        if (userInfo.level !== 9) {
          filteredUsers = filteredUsers.filter(
            (u) =>
              u.companyId === userInfo.companyId &&
              typeof u.level === "number" &&
              u.level <= userInfo.level,
          );
        }
        setUsers(filteredUsers);
      })
      .catch(() => setUsers([]));

    request("GET", "/api/userroleviews")
      .then((response) => {
        setUserRoleViews(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => setUserRoleViews([]));
  }, [userInfo]);

  const assignedRoleIds = useMemo(() => {
    const selectedUserId = String(form.userId || "").trim();
    if (!selectedUserId) return new Set();

    return new Set(
      userRoleViews
        .filter(
          (row) =>
            String(row.user_id || row.userId || "").trim() === selectedUserId,
        )
        .map((row) => String(row.role_id || row.roleId || "").trim())
        .filter(Boolean),
    );
  }, [userRoleViews, form.userId]);

  const availableRoles = useMemo(() => {
    const selectedRoleId = String(form.roleId || "").trim();
    return roles.filter((role) => {
      const roleId = String(role.id || "").trim();
      if (!roleId) return false;
      if (roleId === selectedRoleId) return true;
      return !assignedRoleIds.has(roleId);
    });
  }, [roles, assignedRoleIds, form.roleId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccess(false);
    try {
      await request("POST", "/api/userroles", {
        ...form,
        user_id: form.userId,
        role_id: form.roleId,
      });
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
        maxWidth: 400,
        mx: "auto",
        mt: 2,
        mb: 2,
        background: "var(--color-gray-100)",
        p: 2,
        borderRadius: 2,
      }}
    >
      <HeaderBar
        title={t("userRole.addTitle", "Add UserRole")}
        sx={{ mb: 1 }}
      />
      <TextField
        select
        label={t("userRole.user_id", "User")}
        name="userId"
        value={form.userId}
        onChange={handleChange}
        fullWidth
        margin="normal"
      >
        {users.map((user) => (
          <MenuItem key={user.id} value={user.id}>
            {user.lastName} {user.firstName}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label={t("userRole.role_id", "Role")}
        name="roleId"
        value={form.roleId}
        onChange={handleChange}
        fullWidth
        margin="normal"
      >
        {availableRoles.map((role) => (
          <MenuItem key={role.id} value={role.id}>
            {role.description}
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

export default UserRoleAdd;
