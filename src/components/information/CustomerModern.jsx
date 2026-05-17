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
  People as PeopleIcon,
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
import CustomerAdd from "./CustomerAdd";
import CustomerEdit from "./CustomerEdit";
import CustomerDelete from "./CustomerDelete";

const CustomerModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [customerData, setCustomerData] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const enableActions = false;
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/customers")
      .then((response) => {
        setCustomerData(response.data || []);
      })
      .catch(() => {
        setCustomerData([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelectedCustomer(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleEdit = useCallback((customer) => {
    setSelectedCustomer(customer);
    setAction("edit");
  }, []);

  const handleDelete = useCallback((customer) => {
    setSelectedCustomer(customer);
    setDeleteMode(true);
  }, []);

  const filteredCustomers = useMemo(() => {
    return customerData.filter((customer) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        customer.customerName?.toLowerCase().includes(searchLower) ||
        String(customer.customerId).toLowerCase().includes(searchLower) ||
        customer.contactEmail?.toLowerCase().includes(searchLower)
      );
    });
  }, [customerData, search]);

  const columns = useMemo(
    () => [
      {
        field: "customerName",
        headerName: t("customerList.customerName", "Customer Name"),
        flex: 1,
        minWidth: 200,
      },
      {
        field: "contactEmail",
        headerName: t("customerList.contactEmail", "Contact Email"),
        flex: 1,
        minWidth: 200,
      },
      {
        field: "latitude",
        headerName: t("customerList.latitude", "Latitude"),
        width: 120,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "longitude",
        headerName: t("customerList.longitude", "Longitude"),
        width: 120,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "active",
        headerName: t("customerList.active", "Active"),
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
      <LoadingState
        message={t("customerList.loading", "Loading customers...")}
      />
    );
  }

  if (deleteMode && selectedCustomer) {
    return (
      <CustomerDelete
        customer={selectedCustomer}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedCustomer(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelectedCustomer(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (action === "edit" && selectedCustomer) {
    return (
      <CustomerEdit customer={selectedCustomer} onCancel={handleEditCancel} />
    );
  }

  if (showAdd) {
    return <CustomerAdd onCancel={handleAddCancel} />;
  }

  const blockColumnDefs = columns
    .filter((c) => !["latitude", "longitude", "actions"].includes(c.field))
    .map((c) => ({ field: c.field, label: c.headerName }));

  return (
    <Box>
      <PageHeader
        title={t("customerList.title", "Customer Management")}
        subtitle={t("customerList.subtitle", "Manage your customers")}
        icon={PeopleIcon}
        onHelpClick={() => setHelpOpen(true)}
        {...(enableActions && {
          actionLabel: t("customerList.addTitle", "Add Customer"),
          onActionClick: () => setShowAdd(true),
        })}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("customerList.helpTitle", "Customer help")}
        content={t(
          enableActions
            ? "customerList.helpBody"
            : "customerList.helpBodyReadOnly",
          "This page lists customers.",
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
            "customerList.searchPlaceholder",
            "Search customers...",
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

      {filteredCustomers.length === 0 && !loading ? (
        <EmptyState
          title={t("customerList.noCustomers", "No customers found")}
          description={
            search
              ? t(
                  "customerList.noSearchResults",
                  "Try adjusting your search terms",
                )
              : t(
                  "customerList.noCustomersDescription",
                  "Get started by adding your first customer",
                )
          }
          actionLabel={
            enableActions && !search
              ? t("customerList.addTitle", "Add Customer")
              : null
          }
          onActionClick={
            enableActions && !search ? () => setShowAdd(true) : null
          }
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={filteredCustomers}
          renderItem={(item, idx) => (
            <BlockListItem
              key={item.customerId || idx}
              columnDefs={blockColumnDefs}
              item={item}
              onEdit={enableActions ? handleEdit : undefined}
              onDelete={enableActions ? handleDelete : undefined}
              enableActions={enableActions}
              leadingMedia={{
                placeholder: (
                  <PeopleIcon
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
            rows={filteredCustomers}
            columns={columns}
            getRowId={(row) => row.customerId}
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
        </Box>
      )}
    </Box>
  );
};

export default CustomerModern;
