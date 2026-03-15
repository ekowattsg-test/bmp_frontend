import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Store as StoreIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { PageHeader, EmptyState, LoadingState } from "../common";
import HelpDialog from "../common/HelpDialog";
import VendorAdd from "./VendorAdd";
import VendorEdit from "./VendorEdit";
import VendorDelete from "./VendorDelete";

const VendorModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [vendorData, setVendorData] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const enableActions = false;
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/vendors")
      .then((response) => {
        setVendorData(response.data || []);
      })
      .catch(() => {
        setVendorData([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelectedVendor(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleEdit = useCallback((vendor) => {
    setSelectedVendor(vendor);
    setAction("edit");
  }, []);

  const handleDelete = useCallback((vendor) => {
    setSelectedVendor(vendor);
    setDeleteMode(true);
  }, []);

  const filteredVendors = useMemo(() => {
    return vendorData.filter((vendor) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        vendor.vendorName?.toLowerCase().includes(searchLower) ||
        String(vendor.vendorId).toLowerCase().includes(searchLower) ||
        vendor.contactEmail?.toLowerCase().includes(searchLower)
      );
    });
  }, [vendorData, search]);

  const columns = useMemo(
    () => [
      {
        field: "vendorId",
        headerName: t("vendorList.vendorId", "Vendor ID"),
        width: 150,
      },
      {
        field: "vendorName",
        headerName: t("vendorList.vendorName", "Vendor Name"),
        flex: 1,
        minWidth: 200,
      },
      {
        field: "contactEmail",
        headerName: t("vendorList.contactEmail", "Contact Email"),
        flex: 1,
        minWidth: 200,
      },
      {
        field: "latitude",
        headerName: t("vendorList.latitude", "Latitude"),
        width: 120,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "longitude",
        headerName: t("vendorList.longitude", "Longitude"),
        width: 120,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "active",
        headerName: t("vendorList.active", "Active"),
        width: 100,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <Chip
            label={
              params.value ? t("basic.true", "Yes") : t("basic.false", "No")
            }
            color={params.value ? "success" : "default"}
            size="small"
          />
        ),
      },
      ...(enableActions
        ? [
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
          ]
        : []),
    ],
    [t, enableActions, handleEdit, handleDelete],
  );

  if (loading) {
    return (
      <LoadingState message={t("vendorList.loading", "Loading vendors...")} />
    );
  }

  if (deleteMode && selectedVendor) {
    return (
      <VendorDelete
        vendor={selectedVendor}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedVendor(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelectedVendor(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (action === "edit" && selectedVendor) {
    return <VendorEdit vendor={selectedVendor} onCancel={handleEditCancel} />;
  }

  if (showAdd) {
    return <VendorAdd onCancel={handleAddCancel} />;
  }

  return (
    <Box>
      <PageHeader
        title={t("vendorList.title", "Vendor Management")}
        subtitle={t("vendorList.subtitle", "Manage your vendors")}
        icon={StoreIcon}
        onHelpClick={() => setHelpOpen(true)}
        {...(enableActions && {
          actionLabel: t("vendorList.addTitle", "Add Vendor"),
          onActionClick: () => setShowAdd(true),
        })}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("vendorList.helpTitle", "Vendor help")}
        content={t(
          "vendorList.helpBody",
          "This page lists vendors. Use Add to create a new vendor. Use Edit or Delete to modify existing records.",
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
          placeholder={t("vendorList.searchPlaceholder", "Search vendors...")}
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
        {filteredVendors.length === 0 && !loading ? (
          <EmptyState
            title={t("vendorList.noVendors", "No vendors found")}
            description={
              search
                ? t(
                    "vendorList.noSearchResults",
                    "Try adjusting your search terms",
                  )
                : t(
                    "vendorList.noVendorsDescription",
                    "Get started by adding your first vendor",
                  )
            }
            actionLabel={
              !search ? t("vendorList.addTitle", "Add Vendor") : null
            }
            onActionClick={!search ? () => setShowAdd(true) : null}
          />
        ) : (
          <DataGrid
            rows={filteredVendors}
            columns={columns}
            getRowId={(row) => row.vendorId}
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

export default VendorModern;
