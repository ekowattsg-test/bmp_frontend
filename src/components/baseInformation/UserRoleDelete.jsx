import React, { useState } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";

const UserRoleDelete = ({
  userRole,
  users = [],
  roles = [],
  onCancel,
  onDeleted,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await request("DELETE", `/api/userroles/${userRole.userrole_id}`);
      if (onDeleted) onDeleted();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.false"));
    }
    setLoading(false);
  };

  if (!userRole) return null;
  // Lookup user and role for display
  const user = users.find(
    (u) => u.id === userRole.user_id || u.id === userRole.userId
  );
  const role = roles.find(
    (r) => r.id === userRole.role_id || r.id === userRole.roleId
  );

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 4, p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography
          variant="h6"
          gutterBottom
          style={{ fontSize: "clamp(1.2rem, 4vw, 2rem)" }}
        >
          {t("userRole.deleteTitle", "Delete UserRole")}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(
            "userRole.confirmDelete",
            "Are you sure you want to delete this user-role mapping?"
          )}
        </Typography>
        <Box sx={{ my: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {/* ID hidden */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("userRole.user_id", "User")}:
              </Typography>
              <Typography variant="body2">
                {user
                  ? `${user.lastName} ${user.firstName}`
                  : userRole.userName
                  ? userRole.userName
                  : userRole.lastName && userRole.firstName
                  ? `${userRole.lastName} ${userRole.firstName}`
                  : userRole.user_id}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "primary.main", minWidth: 120 }}
              >
                {t("userRole.role_id", "Role")}:
              </Typography>
              <Typography variant="body2">
                {role
                  ? role.description
                  : userRole.roleDescription
                  ? userRole.roleDescription
                  : userRole.description
                  ? userRole.description
                  : userRole.role_id}
              </Typography>
            </Box>
          </Box>
        </Box>
        {errorMsg && (
          <Typography color="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
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
            onClick={() => onCancel(false)}
            disabled={loading}
          >
            {t("basic.cancel")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default UserRoleDelete;
