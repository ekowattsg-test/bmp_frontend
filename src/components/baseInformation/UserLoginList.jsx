import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import HistoryIcon from "@mui/icons-material/History";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { AuthContext } from "../../context/authContext";
import { hasRole } from "../../helpers/roles_helper";
import { PageHeader, LoadingState, EmptyState } from "../common";
import HelpDialog from "../common/HelpDialog";

const UserLoginList = () => {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const { userInfo, roles } = useContext(AuthContext);

  const [searchText, setSearchText] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const [loginRes, usersRes, companiesRes] = await Promise.all([
          request("GET", "/api/userlogins"),
          request("GET", "/api/users"),
          request("GET", "/api/companies"),
        ]);

        if (!mounted) return;

        const loginRows = Array.isArray(loginRes?.data)
          ? loginRes.data
          : Array.isArray(loginRes)
            ? loginRes
            : [];

        const userRows = Array.isArray(usersRes?.data)
          ? usersRes.data
          : Array.isArray(usersRes)
            ? usersRes
            : [];

        const companyRows = Array.isArray(companiesRes?.data)
          ? companiesRes.data
          : Array.isArray(companiesRes)
            ? companiesRes
            : [];

        setRows(loginRows);
        setUsers(userRows);
        setCompanies(companyRows);
      } catch (error) {
        if (!mounted) return;
        setErrorMsg(error?.message || t("userLoginList.errorLoading"));
        setRows([]);
        setUsers([]);
        setCompanies([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [t]);

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

  const getRawActiveValue = (row) => {
    if (!row) return undefined;
    const candidates = [
      "active",
      "activeYn",
      "activeYN",
      "active_flag",
      "activeFlag",
      "isActive",
      "enabled",
      "status",
    ];
    for (const key of candidates) {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        return row[key];
      }
    }
    return undefined;
  };

  const currentUserLevel = Number(userInfo?.level);
  const isLevel9Viewer =
    Number.isFinite(currentUserLevel) && currentUserLevel === 9;

  const visibleCompanyIds = useMemo(() => {
    const ownCompanyId = String(userInfo?.companyId ?? "");
    const canViewAllCompanies = hasRole("BaseSetup", roles);

    return new Set(
      companies
        .filter((company) => {
          if (isLevel9Viewer) return true;

          const rawActive =
            getRawActiveValue(company) ?? company.active ?? company.isActive;
          const active = isActiveValue(rawActive);
          if (!active) return false;

          if (canViewAllCompanies) return true;

          const companyId = String(company.id ?? company.companyId ?? "");
          return companyId === ownCompanyId;
        })
        .map((company) => String(company.id ?? company.companyId ?? "")),
    );
  }, [companies, isLevel9Viewer, roles, userInfo?.companyId]);

  const visibleUsers = useMemo(() => {
    return users.filter((user) => {
      if (isLevel9Viewer) return true;

      const companyId = String(user.companyId ?? "");
      if (!visibleCompanyIds.has(companyId)) return false;

      const userLevel = Number(user.level);
      if (
        Number.isFinite(currentUserLevel) &&
        Number.isFinite(userLevel) &&
        userLevel > currentUserLevel
      ) {
        return false;
      }

      return true;
    });
  }, [users, isLevel9Viewer, visibleCompanyIds, currentUserLevel]);

  const visibleUserIds = useMemo(() => {
    return new Set(visibleUsers.map((u) => String(u.id)));
  }, [visibleUsers]);

  useEffect(() => {
    if (selectedUserId && !visibleUserIds.has(String(selectedUserId))) {
      setSelectedUserId("");
    }
  }, [selectedUserId, visibleUserIds]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (!isLevel9Viewer && !visibleUserIds.has(String(row.userId))) {
        return false;
      }

      const fullName = `${row.firstName || ""} ${row.lastName || ""}`
        .trim()
        .toLowerCase();
      const loginType = String(row.loginType || "").toLowerCase();
      const keyword = searchText.trim().toLowerCase();

      const keywordMatch =
        !keyword || fullName.includes(keyword) || loginType.includes(keyword);

      const userMatch =
        !selectedUserId || String(row.userId) === String(selectedUserId);

      const loginDate = row.timeLogin ? new Date(row.timeLogin) : null;

      const startMatch =
        !startDate ||
        (loginDate && loginDate >= new Date(`${startDate}T00:00:00`));

      const endMatch =
        !endDate || (loginDate && loginDate <= new Date(`${endDate}T23:59:59`));

      return keywordMatch && userMatch && startMatch && endMatch;
    });
  }, [
    rows,
    searchText,
    selectedUserId,
    startDate,
    endDate,
    isLevel9Viewer,
    visibleUserIds,
  ]);

  const columns = [
    {
      field: "id",
      headerName: t("userLoginList.columnId"),
      width: 90,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "firstName",
      headerName: t("userLoginList.columnFirstName"),
      flex: 1,
      minWidth: 120,
    },
    {
      field: "lastName",
      headerName: t("userLoginList.columnLastName"),
      flex: 1,
      minWidth: 120,
    },
    {
      field: "loginType",
      headerName: t("userLoginList.columnLoginType"),
      width: 140,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "timeLogin",
      headerName: t("userLoginList.columnTimeLogin"),
      flex: 1,
      minWidth: 200,
      valueFormatter: (value) => {
        if (!value) return "";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return d.toLocaleString();
      },
    },
  ];

  const clearFilters = () => {
    setSearchText("");
    setSelectedUserId("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <Box>
      <PageHeader
        title={t("userLoginList.title")}
        subtitle={t("userLoginList.subtitle")}
        onHelpClick={() => setHelpOpen(true)}
        icon={HistoryIcon}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("userLoginList.helpTitle")}
        content={t("userLoginList.helpBody")}
      />

      <Paper
        elevation={1}
        sx={{
          p: 2,
          mb: 2,
          backgroundColor: "background.paper",
          border: "1px solid var(--color-gray-200)",
          borderRadius: 2,
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            fullWidth
            size="small"
            label={t("userLoginList.search")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <TextField
            select
            size="small"
            sx={{ minWidth: { xs: "100%", md: 220 } }}
            label={t("userLoginList.user")}
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <MenuItem value="">{t("userLoginList.allUsers")}</MenuItem>
            {visibleUsers.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.login}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            type="date"
            label={t("userLoginList.startDate")}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            size="small"
            type="date"
            label={t("userLoginList.endDate")}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <Button variant="outlined" onClick={clearFilters}>
            {t("userLoginList.clear")}
          </Button>
        </Stack>
      </Paper>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {loading ? (
        <LoadingState message={t("common.loading")} />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title={t("userLoginList.emptyTitle")}
          description={t("userLoginList.emptyDescription")}
        />
      ) : (
        <Paper
          elevation={1}
          sx={{
            backgroundColor: "background.paper",
            border: "1px solid var(--color-gray-200)",
            borderRadius: 2,
          }}
        >
          <DataGrid
            autoHeight
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 25,
                  page: 0,
                },
              },
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        </Paper>
      )}
    </Box>
  );
};

export default UserLoginList;
