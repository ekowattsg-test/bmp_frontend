import React, { useState, useEffect } from "react";
import { Box, TextField, InputAdornment, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { PageHeader, EmptyState, LoadingState } from "../common";
import HelpDialog from "../common/HelpDialog";
import RoleAdd from "./RoleAdd";
import RoleEdit from "./RoleEdit";
import RoleDelete from "./RoleDelete";

const RoleModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [roleData, setRoleData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/roles")
      .then((response) => {
        setRoleData(response.data || []);
      })
      .catch(() => {
        setRoleData([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelectedRole(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleEdit = (role) => {
    setSelectedRole(role);
    setAction("edit");
  };

  const handleDelete = (role) => {
    setSelectedRole(role);
    setDeleteMode(true);
  };

  const filteredRoles = roleData.filter((role) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      role.role?.toLowerCase().includes(searchLower) ||
      role.description?.toLowerCase().includes(searchLower) ||
      role.menu?.toLowerCase().includes(searchLower)
    );
  });

  const columns = [
    {
      field: "id",
      headerName: t("roleList.id", "ID"),
      width: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "role",
      headerName: t("roleList.role", "Role"),
      flex: 1,
      minWidth: 150,
    },
    {
      field: "description",
      headerName: t("roleList.description", "Description"),
      flex: 2,
      minWidth: 200,
    },
    {
      field: "menu",
      headerName: t("roleList.menu", "Menu"),
      flex: 1,
      minWidth: 150,
    },
    {
      field: "level",
      headerName: t("roleList.level", "Level"),
      width: 100,
      headerAlign: "center",
      align: "center",
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
    return <LoadingState message={t("roleList.loading", "Loading roles...")} />;
  }

  if (deleteMode && selectedRole) {
    return (
      <RoleDelete
        role={selectedRole}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedRole(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelectedRole(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (action === "edit" && selectedRole) {
    return <RoleEdit role={selectedRole} onCancel={handleEditCancel} />;
  }

  if (showAdd) {
    return <RoleAdd onCancel={handleAddCancel} />;
  }

  return (
    <Box>
      <PageHeader
        title={t("roleList.title", "Role Management")}
        subtitle={t("roleList.subtitle", "Manage user roles and permissions")}
        onHelpClick={() => setHelpOpen(true)}
        icon={SecurityIcon}
        actionLabel={t("roleList.addTitle", "Add Role")}
        onActionClick={() => setShowAdd(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("roleList.helpTitle", "Role help")}
        content={t(
          "roleList.helpBody",
          "This page manages roles. Use Add to create a role, Edit to modify, and Delete to remove roles.",
        )}
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
          placeholder={t("roleList.searchPlaceholder", "Search roles...")}
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
        {filteredRoles.length === 0 && !loading ? (
          <EmptyState
            title={t("roleList.noRoles", "No roles found")}
            description={
              search
                ? t(
                    "roleList.noSearchResults",
                    "Try adjusting your search terms",
                  )
                : t(
                    "roleList.noRolesDescription",
                    "Get started by adding your first role",
                  )
            }
            actionLabel={!search ? t("roleList.addTitle", "Add Role") : null}
            onActionClick={!search ? () => setShowAdd(true) : null}
          />
        ) : (
          <DataGrid
            rows={filteredRoles}
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
      </Box>
    </Box>
  );
};

export default RoleModern;
