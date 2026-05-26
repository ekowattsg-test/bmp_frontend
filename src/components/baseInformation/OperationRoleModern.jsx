import React, { useState, useEffect } from "react";
import { Box, TextField, InputAdornment, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ManageAccounts as ManageAccountsIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  BlockListItem,
  LoadMoreBlockList,
} from "../common";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import HelpDialog from "../common/HelpDialog";
import OperationRoleAdd from "./OperationRoleAdd";
import OperationRoleEdit from "./OperationRoleEdit";
import OperationRoleDelete from "./OperationRoleDelete";

const OperationRoleModern = () => {
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();

  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [data, setData] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      request("GET", "/api/operationstaffs"),
      request("GET", "/api/staffs"),
      request("GET", "/api/operationroles"),
    ])
      .then(([osRes, staffRes, roleRes]) => {
        setData(osRes.data || []);
        setStaffList(staffRes.data || []);
        setRoles(roleRes.data || []);
      })
      .catch(() => {
        setData([]);
        setStaffList([]);
        setRoles([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const getStaffName = (staffId) => {
    const s = staffList.find((x) => String(x.staffId) === String(staffId));
    return s ? s.staffName || staffId : staffId;
  };

  const filtered = data.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      getStaffName(row.staffId).toLowerCase().includes(q) ||
      String(row.staffId).toLowerCase().includes(q) ||
      (row.roleName || "").toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      field: "displayStaffName",
      headerName: t("operationRole.staffId", "Staff"),
      flex: 1,
      minWidth: 160,
    },
    {
      field: "displayRoleName",
      headerName: t("operationRole.roleName", "Operation Role"),
      flex: 1,
      minWidth: 160,
    },
    {
      field: "actions",
      headerName: t("basic.actions", "Actions"),
      width: 110,
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
            onClick={() => {
              setSelected(params.row);
              setAction("edit");
            }}
            title={t("basic.edit", "Edit")}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              setSelected(params.row);
              setDeleteMode(true);
            }}
            title={t("basic.delete", "Delete")}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading)
    return (
      <LoadingState
        message={t("operationRole.loading", "Loading operation roles...")}
      />
    );

  if (deleteMode && selected) {
    return (
      <OperationRoleDelete
        record={selected}
        staffList={staffList}
        onCancel={() => {
          setDeleteMode(false);
          setSelected(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelected(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (action === "edit" && selected) {
    return (
      <OperationRoleEdit
        record={selected}
        staffList={staffList}
        roles={roles}
        onCancel={(edited) => {
          setAction("view");
          setSelected(null);
          if (edited) setRefresh(true);
        }}
      />
    );
  }

  if (showAdd) {
    return (
      <OperationRoleAdd
        staffList={staffList}
        roles={roles}
        onCancel={(added) => {
          setShowAdd(false);
          if (added) setRefresh(true);
        }}
      />
    );
  }

  const normalizedRows = filtered.map((row) => ({
    ...row,
    displayStaffName: getStaffName(row.staffId),
    displayRoleName: row.roleName || "",
  }));

  const blockColumnDefs = columns
    .filter((c) => c.field !== "actions")
    .map((c) => ({ field: c.field, label: c.headerName }));

  return (
    <Box>
      <PageHeader
        title={t("operationRole.title", "Operation Roles")}
        subtitle={t(
          "operationRole.subtitle",
          "Manage operation role assignments for staff",
        )}
        icon={ManageAccountsIcon}
        onHelpClick={() => setHelpOpen(true)}
        actionLabel={t("operationRole.add", "Add")}
        onActionClick={() => setShowAdd(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("operationRole.helpTitle", "Operation Roles Help")}
        content={t(
          "operationRole.help",
          "Manage operation role assignments for staff members.",
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
          placeholder={t(
            "operationRole.searchPlaceholder",
            "Search by staff or role...",
          )}
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

      {filtered.length === 0 && !loading ? (
        <EmptyState
          title={t(
            "operationRole.noData",
            "No operation role assignments found",
          )}
          description={
            search
              ? t(
                  "operationRole.noSearchResults",
                  "Try adjusting your search terms",
                )
              : t(
                  "operationRole.noDataDescription",
                  "Get started by adding your first operation role assignment",
                )
          }
          actionLabel={!search ? t("operationRole.add", "Add") : null}
          onActionClick={!search ? () => setShowAdd(true) : null}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={normalizedRows}
          renderItem={(item, idx) => (
            <BlockListItem
              key={item.operationRoleId || idx}
              columnDefs={blockColumnDefs}
              item={item}
              onEdit={(row) => {
                setSelected(row);
                setAction("edit");
              }}
              onDelete={(row) => {
                setSelected(row);
                setDeleteMode(true);
              }}
              leadingMedia={{
                placeholder: (
                  <ManageAccountsIcon
                    sx={{ color: "text.secondary", fontSize: "1.1rem" }}
                  />
                ),
                width: 40,
                height: 40,
              }}
              t={t}
            />
          )}
        />
      ) : (
        <Box
          sx={{
            height: 600,
            width: "100%",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <DataGrid
            rows={normalizedRows}
            columns={columns}
            getRowId={(row) => row.operationRoleId}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
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
        </Box>
      )}
    </Box>
  );
};

export default OperationRoleModern;
