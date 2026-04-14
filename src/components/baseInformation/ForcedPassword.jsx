import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  TextField,
} from "@mui/material";
import { LockReset as LockResetIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { hasRole } from "../../helpers/roles_helper";
import { request } from "../../helpers/axios_helper";
import { LoadingState, PageHeader } from "../common";
import HelpDialog from "../common/HelpDialog";

const toLevelNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeBackendMessage = (message) => String(message || "").trim();

const ForcedPassword = () => {
  const { t } = useTranslation();
  const { userInfo, roles } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [form, setForm] = useState({
    targetUserId: "",
    newPassword: "",
    confirmPassword: "",
    ownPassword: "",
  });

  const currentUserId = userInfo?.id;
  const currentUserLevel = toLevelNumber(
    userInfo?.level ?? userInfo?.userLevel,
  );
  const currentCompanyId = userInfo?.companyId;
  const canCrossCompany = hasRole("BaseSetup", roles);

  useEffect(() => {
    setLoadingUsers(true);
    request("GET", "/api/users")
      .then((response) => {
        setUsers(response?.data || []);
      })
      .catch(() => {
        setUsers([]);
      })
      .finally(() => setLoadingUsers(false));
  }, []);

  const availableUsers = useMemo(() => {
    return (users || []).filter((user) => {
      if (!user || user.id === undefined || user.id === null) return false;
      if (user.id === currentUserId) return false;

      if (!canCrossCompany && user.companyId !== currentCompanyId) return false;

      const targetLevel = toLevelNumber(user.level ?? user.userLevel);
      if (targetLevel > currentUserLevel) return false;

      return true;
    });
  }, [
    users,
    currentUserId,
    canCrossCompany,
    currentCompanyId,
    currentUserLevel,
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    if (!Number.isFinite(Number(currentUserId))) {
      setErrorMsg(t("forcedPassword.errors.invalidRequestingUser"));
      return false;
    }
    if (!form.targetUserId) {
      setErrorMsg(t("forcedPassword.validation.userRequired"));
      return false;
    }
    if (!form.newPassword || !form.confirmPassword || !form.ownPassword) {
      setErrorMsg(t("forcedPassword.validation.required"));
      return false;
    }
    if (form.newPassword !== form.confirmPassword) {
      setErrorMsg(t("forcedPassword.validation.mismatch"));
      return false;
    }
    if (form.newPassword.length < 8) {
      setErrorMsg(t("forcedPassword.validation.length"));
      return false;
    }
    return true;
  };

  const getFriendlyErrorMessage = (error) => {
    const status = error?.response?.status;
    const backendRawMessage =
      error?.response?.data?.message || error?.response?.data?.error;
    const backendMessage = normalizeBackendMessage(backendRawMessage);

    const backendMessageMap = {
      "Requesting user not found": t(
        "forcedPassword.errors.requestingUserNotFound",
      ),
      "Invalid password": t("forcedPassword.errors.invalidPassword"),
      "Requesting user account is inactive": t(
        "forcedPassword.errors.requestingUserInactive",
      ),
      "Target user not found": t("forcedPassword.errors.targetUserNotFound"),
    };

    if (backendMessage && backendMessageMap[backendMessage]) {
      return backendMessageMap[backendMessage];
    }

    if (!error?.response) {
      return t("forcedPassword.errors.network");
    }

    if (status === 400) {
      return backendMessage || t("forcedPassword.errors.badRequest");
    }

    if (status === 401 || status === 403) {
      return backendMessage || t("forcedPassword.errors.unauthorized");
    }

    if (status === 404) {
      return backendMessage || t("forcedPassword.errors.notFound");
    }

    if (status >= 500) {
      return t("forcedPassword.errors.server");
    }

    return backendMessage || t("forcedPassword.error");
  };

  const submitForcedPassword = async () => {
    const payload = {
      requestingUserId: Number(currentUserId),
      requestingUserPassword: form.ownPassword,
      targetUserId: Number(form.targetUserId),
      newPassword: form.newPassword,
    };

    return request("POST", "/api/admin/password/force-change", payload, {
      skipAuthRedirect: true,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await submitForcedPassword();
      setSuccessMsg(response?.data?.message || t("forcedPassword.success"));
      setForm((prev) => ({
        ...prev,
        newPassword: "",
        confirmPassword: "",
        ownPassword: "",
      }));
    } catch (error) {
      setErrorMsg(getFriendlyErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUsers) {
    return (
      <LoadingState
        message={t("forcedPassword.loading", "Loading available users...")}
      />
    );
  }

  const selectedUser = availableUsers.find(
    (user) => String(user.id) === String(form.targetUserId),
  );

  return (
    <Box>
      <PageHeader
        title={t("forcedPassword.title")}
        subtitle={t("forcedPassword.subtitle")}
        icon={LockResetIcon}
        onHelpClick={() => setHelpOpen(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("forcedPassword.helpTitle")}
        content={t("forcedPassword.helpBody")}
      />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          maxWidth: 520,
          backgroundColor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          p: { xs: 2, sm: 3 },
        }}
      >
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}
        {successMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMsg}
          </Alert>
        )}

        <TextField
          select
          fullWidth
          name="targetUserId"
          label={t("forcedPassword.targetUser")}
          value={form.targetUserId}
          onChange={handleChange}
          margin="normal"
          helperText={t("forcedPassword.targetUserHint")}
        >
          {availableUsers.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              {`${user.firstName || ""} ${user.lastName || ""}`.trim()} (
              {user.login}) -{" "}
              {t("forcedPassword.level", { level: user.level ?? 0 })}
            </MenuItem>
          ))}
        </TextField>

        {availableUsers.length === 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {t("forcedPassword.noAvailableUsers")}
          </Alert>
        )}

        <TextField
          fullWidth
          type="password"
          name="newPassword"
          label={t("forcedPassword.newPassword")}
          value={form.newPassword}
          onChange={handleChange}
          margin="normal"
          autoComplete="new-password"
          disabled={!selectedUser}
        />

        <TextField
          fullWidth
          type="password"
          name="confirmPassword"
          label={t("forcedPassword.confirmPassword")}
          value={form.confirmPassword}
          onChange={handleChange}
          margin="normal"
          autoComplete="new-password"
          disabled={!selectedUser}
        />

        <TextField
          fullWidth
          type="password"
          name="ownPassword"
          label={t("forcedPassword.ownPassword")}
          value={form.ownPassword}
          onChange={handleChange}
          margin="normal"
          autoComplete="current-password"
          disabled={!selectedUser}
          helperText={t("forcedPassword.ownPasswordHint")}
        />

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            mt: 2,
          }}
        >
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !selectedUser}
            startIcon={submitting ? <CircularProgress size={18} /> : null}
          >
            {submitting
              ? t("forcedPassword.submitting")
              : t("forcedPassword.submit")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ForcedPassword;
