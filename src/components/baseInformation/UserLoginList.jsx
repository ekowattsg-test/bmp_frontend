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
import { PageHeader, LoadingState, EmptyState, BlockListItem } from "../common";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
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
  const { shouldUseBlockLayout } = useResponsiveLayout();

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

  const normalizedRows = useMemo(() => {
    return rows.map((row) => {
      const d = row.timeLogin ? new Date(row.timeLogin) : null;
      const displayTimeLogin =
        d && !Number.isNaN(d.getTime())
          ? d.toLocaleString()
          : String(row.timeLogin || "");

      return {
        ...row,
        displayTimeLogin,
        displayLoginType: String(row.loginType || ""),
        displayFullName:
          `${row.lastName || ""} ${row.firstName || ""}`.trim() || "-",
      };
    });
  }, [rows]);

  useEffect(() => {
    if (selectedUserId && !visibleUserIds.has(String(selectedUserId))) {
      setSelectedUserId("");
    }
  }, [selectedUserId, visibleUserIds]);

  const filteredRows = useMemo(() => {
    const filtered = normalizedRows.filter((row) => {
      if (!isLevel9Viewer && !visibleUserIds.has(String(row.userId))) {
        return false;
      }

      const fullName = row.displayFullName.toLowerCase();
      const loginType = row.displayLoginType.toLowerCase();
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

    return filtered.sort((a, b) => {
      const timeA = a.timeLogin ? new Date(a.timeLogin).getTime() : 0;
      const timeB = b.timeLogin ? new Date(b.timeLogin).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;

      const typeA = String(a.loginType || "").toLowerCase();
      const typeB = String(b.loginType || "").toLowerCase();
      if (typeA !== typeB) return typeA.localeCompare(typeB);

      const nameA = `${a.lastName || ""} ${a.firstName || ""}`
        .trim()
        .toLowerCase();
      const nameB = `${b.lastName || ""} ${b.firstName || ""}`
        .trim()
        .toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [
    normalizedRows,
    searchText,
    selectedUserId,
    startDate,
    endDate,
    isLevel9Viewer,
    visibleUserIds,
  ]);

  const columns = [
    {
      field: "displayTimeLogin",
      headerName: t("userLoginList.columnTimeLogin"),
      flex: 1,
      minWidth: 200,
    },
    {
      field: "displayLoginType",
      headerName: t("userLoginList.columnLoginType"),
      width: 140,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "displayFullName",
      headerName: t("userLoginList.columnName", "Name"),
      flex: 1,
      minWidth: 180,
    },
  ];

  const clearFilters = () => {
    setSearchText("");
    setSelectedUserId("");
    setStartDate("");
    setEndDate("");
  };

  const blockColumnDefs = columns.map((c) => ({
    field: c.field,
    label: c.headerName,
  }));

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
        title={t("userLoginList.helpTitle", "User login records help")}
        content={t(
          "userLoginList.helpBody",
          "This page shows user login history. Use filters to narrow results by user and date range.",
        )}
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
      ) : shouldUseBlockLayout ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 2 }}>
          {filteredRows.map((item, idx) => (
            <BlockListItem
              key={item.id || idx}
              columnDefs={blockColumnDefs}
              item={item}
              enableActions={false}
              leadingMedia={{
                placeholder: (
                  <HistoryIcon
                    sx={{ color: "text.secondary", fontSize: "1.1rem" }}
                  />
                ),
                width: 40,
                height: 40,
              }}
              t={t}
            />
          ))}
        </Box>
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
