import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { hasRole } from "../../helpers/roles_helper";
import { request } from "../../helpers/axios_helper";
import { PageHeader, EmptyState, LoadingState } from "../common";
import HelpDialog from "../common/HelpDialog";
import UserAdd from "./UserAdd";
import UserEdit from "./UserEdit";
import UserDelete from "./UserDelete";

const UserModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [userData, setUserData] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const { userInfo, roles } = useContext(AuthContext);

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

  useEffect(() => {
    setLoading(true);
    Promise.all([
      request("GET", "/api/users"),
      request("GET", "/api/companies"),
    ])
      .then(([usersResponse, companiesResponse]) => {
        setUserData(usersResponse.data || []);
        setCompanies(companiesResponse.data || []);
      })
      .catch(() => {
        setUserData([]);
        setCompanies([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelectedUser(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setAction("edit");
  };

  const handleDelete = (user) => {
    setSelectedUser(user);
    setDeleteMode(true);
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(
      (c) => c.id === companyId || c.companyId === companyId,
    );
    return company?.companyName || companyId;
  };

  const isCompanyActive = (companyId) => {
    if (!companyId) return false;
    const company = companies.find(
      (c) => c.id === companyId || c.companyId === companyId,
    );
    if (!company) return false;
    const rawActive =
      getRawActiveValue(company) ?? company.active ?? company.isActive;
    return isActiveValue(rawActive);
  };

  // Filter users based on company, level and search
  const filteredUsers = userData.filter((user) => {
    // only show users whose company is active
    if (!isCompanyActive(user.companyId)) return false;

    // if current user doesn't have BaseSetup, restrict to same company
    if (!hasRole("BaseSetup", roles)) {
      if (user.companyId !== userInfo.companyId) return false;
      // hide users with a higher level than the current user
      if (
        typeof user.level === "number" &&
        typeof userInfo.level === "number"
      ) {
        if (user.level > userInfo.level) return false;
      }
    }

    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.login?.toLowerCase().includes(searchLower) ||
      user.mobileNumber?.toLowerCase().includes(searchLower) ||
      getCompanyName(user.companyId).toLowerCase().includes(searchLower)
    );
  });

  // DataGrid columns configuration
  const columns = [
    {
      field: "id",
      headerName: t("userList.id", "ID"),
      width: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "firstName",
      headerName: t("userList.firstName", "First Name"),
      flex: 1,
      minWidth: 120,
    },
    {
      field: "lastName",
      headerName: t("userList.lastName", "Last Name"),
      flex: 1,
      minWidth: 120,
    },
    {
      field: "login",
      headerName: t("userList.login", "Login"),
      flex: 1,
      minWidth: 150,
    },
    {
      field: "mobileNumber",
      headerName: t("userList.mobileNumber", "Mobile Number"),
      flex: 1,
      minWidth: 140,
    },
    {
      field: "companyId",
      headerName: t("userList.companyId", "Company"),
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => getCompanyName(params),
    },
    {
      field: "level",
      headerName: t("userList.level", "Level"),
      width: 100,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "active",
      headerName: t("userList.active", "Active"),
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const rawActive =
          params.value ?? getRawActiveValue(params.row) ?? params.row?.active;
        const isActive = isActiveValue(rawActive);
        return (
          <Chip
            label={isActive ? t("basic.true", "Yes") : t("basic.false", "No")}
            color={isActive ? "success" : "default"}
            size="small"
          />
        );
      },
    },
    {
      field: "lastPasswordChanged",
      headerName: t("userList.lastPasswordChanged", "PW Last Changed"),
      width: 150,
      valueFormatter: (params) => {
        if (!params) return "";
        const date = new Date(params);
        return date.toLocaleDateString();
      },
    },
    {
      field: "actions",
      headerName: t("basic.actions", "Actions"),
      width: 120,
      sortable: false,
      filterable: false,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleEdit(params.row)}
            title={t("basic.edit", "Edit")}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row)}
            title={t("basic.delete", "Delete")}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading) {
    return <LoadingState message={t("userList.loading", "Loading users...")} />;
  }

  // Delete Dialog
  if (deleteMode && selectedUser) {
    return (
      <UserDelete
        user={selectedUser}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedUser(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelectedUser(null);
          setRefresh(true);
        }}
      />
    );
  }

  // Edit Dialog
  if (action === "edit" && selectedUser) {
    return <UserEdit user={selectedUser} onCancel={handleEditCancel} />;
  }

  // Add Dialog
  if (showAdd) {
    return <UserAdd onCancel={handleAddCancel} />;
  }

  return (
    <Box>
      {/* Page Header */}
      <PageHeader
        title={t("userList.title", "User Management")}
        subtitle={t(
          "userList.subtitle",
          "Manage system users and their access",
        )}
        onHelpClick={() => setHelpOpen(true)}
        icon={PeopleIcon}
        actionLabel={t("userList.addTitle", "Add User")}
        onActionClick={() => setShowAdd(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("userList.helpTitle", "User help")}
        content={t(
          "userList.helpBody",
          "This page manages system users. Use Add to create a new user, Edit to modify user details, and Delete to remove users.",
        )}
      />

      {/* Search and Filters */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("userList.searchPlaceholder", "Search users...")}
          size="small"
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Data Grid */}
      <Box
        sx={{
          height: 600,
          width: "100%",
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        {filteredUsers.length === 0 && !loading ? (
          <EmptyState
            title={t("userList.noUsers", "No users found")}
            description={
              search
                ? t(
                    "userList.noSearchResults",
                    "Try adjusting your search terms",
                  )
                : t(
                    "userList.noUsersDescription",
                    "Get started by adding your first user",
                  )
            }
            actionLabel={!search ? t("userList.addTitle", "Add User") : null}
            onActionClick={!search ? () => setShowAdd(true) : null}
          />
        ) : (
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            getRowId={(row) => row.id}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10, page: 0 },
              },
            }}
            pageSizeOptions={[5, 10, 25, 50]}
            disableRowSelectionOnClick
            autoHeight={false}
            sx={{
              border: 0,
              "& .MuiDataGrid-cell:focus": {
                outline: "none",
              },
              "& .MuiDataGrid-row:hover": {
                bgcolor: "action.hover",
              },
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "grey.50",
                borderRadius: 0,
              },
              "& .MuiDataGrid-footerContainer": {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                minHeight: "52px",
                gap: "12px",
              },
              "& .MuiTablePagination-root": {
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "16px",
              },
              "& .MuiTablePagination-displayedRows": {
                margin: 0,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
              },
              "& .MuiTablePagination-selectLabel": {
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              },
              "& .MuiTablePagination-select": {
                display: "flex",
                alignItems: "center",
              },
              "& .MuiTablePagination-actions": {
                display: "flex",
                alignItems: "center",
                marginLeft: 0,
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default UserModern;
