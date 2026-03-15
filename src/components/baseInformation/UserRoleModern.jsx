import React, { useState, useEffect, useContext } from "react";
import { Box, TextField, InputAdornment, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AssignmentInd as AssignmentIndIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { AuthContext } from "../../context/authContext";
import { PageHeader, EmptyState, LoadingState } from "../common";
import HelpDialog from "../common/HelpDialog";
import UserRoleAdd from "./UserRoleAdd";
import UserRoleEdit from "./UserRoleEdit";
import UserRoleDelete from "./UserRoleDelete";

const UserRoleModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [userRoleData, setUserRoleData] = useState([]);
  const [selectedUserRole, setSelectedUserRole] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const { userInfo } = useContext(AuthContext);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      request("GET", "/api/userroleviews"),
      request("GET", "/api/roles"),
      request("GET", "/api/users"),
    ])
      .then(([userRolesResponse, rolesResponse, usersResponse]) => {
        setUserRoleData(userRolesResponse.data || []);
        setRoles(rolesResponse.data || []);
        setUsers(usersResponse.data || []);
      })
      .catch(() => {
        setUserRoleData([]);
        setRoles([]);
        setUsers([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelectedUserRole(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleEdit = (userRole) => {
    setSelectedUserRole(userRole);
    setAction("edit");
  };

  const handleDelete = (userRole) => {
    setSelectedUserRole(userRole);
    setDeleteMode(true);
  };

  const getUserName = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  const getRoleName = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.role || roleId;
  };

  const filteredUserRoles = userRoleData.filter((userRole) => {
    const currentLevel = userInfo?.level || 0;
    const role = roles.find((r) => r.id === userRole.role_id);
    const user = users.find((u) => u.id === userRole.user_id);

    // Exclude if role or user missing or their levels are higher than current user
    if (!role || typeof role.level !== "number" || role.level > currentLevel)
      return false;
    if (!user || typeof user.level !== "number" || user.level > currentLevel)
      return false;

    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      getUserName(userRole.user_id).toLowerCase().includes(searchLower) ||
      getRoleName(userRole.role_id).toLowerCase().includes(searchLower)
    );
  });

  const columns = [
    {
      field: "id",
      headerName: t("userRole.id", "ID"),
      width: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "user_id",
      headerName: t("userRole.user_id", "User"),
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => getUserName(params),
    },
    {
      field: "role_id",
      headerName: t("userRole.role_id", "Role"),
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => getRoleName(params),
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
    return (
      <LoadingState message={t("userRole.loading", "Loading user roles...")} />
    );
  }

  if (deleteMode && selectedUserRole) {
    return (
      <UserRoleDelete
        userRole={selectedUserRole}
        users={users}
        roles={roles}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedUserRole(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelectedUserRole(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (action === "edit" && selectedUserRole) {
    return (
      <UserRoleEdit userRole={selectedUserRole} onCancel={handleEditCancel} />
    );
  }

  if (showAdd) {
    return <UserRoleAdd onCancel={handleAddCancel} />;
  }

  return (
    <Box>
      <PageHeader
        title={t("userRole.title", "User-Role Mapping")}
        subtitle={t("userRole.subtitle", "Assign roles to users")}
        onHelpClick={() => setHelpOpen(true)}
        icon={AssignmentIndIcon}
        actionLabel={t("userRole.addTitle", "Add User Role")}
        onActionClick={() => setShowAdd(true)}
      />

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
          placeholder={t("userRole.searchPlaceholder", "Search user roles...")}
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

      <Box
        sx={{
          height: 600,
          width: "100%",
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        {filteredUserRoles.length === 0 && !loading ? (
          <EmptyState
            title={t("userRole.noUserRoles", "No user roles found")}
            description={
              search
                ? t(
                    "userRole.noSearchResults",
                    "Try adjusting your search terms",
                  )
                : t(
                    "userRole.noUserRolesDescription",
                    "Get started by assigning roles to users",
                  )
            }
            actionLabel={
              !search ? t("userRole.addTitle", "Add User Role") : null
            }
            onActionClick={!search ? () => setShowAdd(true) : null}
          />
        ) : (
          <DataGrid
            rows={filteredUserRoles}
            columns={columns}
            getRowId={(row) => row.userrole_id || row.id}
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
              "& .MuiDataGrid-cell:focus": { outline: "none" },
              "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
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
        <HelpDialog
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          title={t("userRole.helpTitle", "User role help")}
          content={t(
            "userRole.helpBody",
            "This page assigns roles to users. Use Add to create a mapping, Edit to modify, and Delete to remove a mapping.",
          )}
        />
      </Box>
    </Box>
  );
};

export default UserRoleModern;
