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
  ShoppingCart as ShoppingCartIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { PageHeader, EmptyState, LoadingState } from "../common";
import HelpDialog from "../common/HelpDialog";
import PurchaseOrderAdd from "./PurchaseOrderAdd";
import PurchaseOrderEdit from "./PurchaseOrderEdit";
import PurchaseOrderDelete from "./PurchaseOrderDelete";
import PurchaseOrderView from "./PurchaseOrderView";

const PurchaseOrderModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [purchaseOrderData, setPurchaseOrderData] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const { t } = useTranslation();
  const enableActions = true;

  useEffect(() => {
    // Load vendors for lookup
    request("GET", "/api/vendors")
      .then((response) => {
        setVendors(response.data || []);
      })
      .catch(() => {
        setVendors([]);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/purchaseOrders")
      .then((response) => {
        const orders = response.data || [];
        setPurchaseOrderData(orders);
      })
      .catch(() => {
        setPurchaseOrderData([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelectedOrder(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleEdit = useCallback((order) => {
    setSelectedOrder(order);
    setAction("edit");
  }, []);

  const handleDelete = useCallback((order) => {
    setSelectedOrder(order);
    setDeleteMode(true);
  }, []);

  const handleView = useCallback((order) => {
    setSelectedOrder(order);
    setViewMode(true);
  }, []);

  const getVendorName = useCallback(
    (vendorId) => {
      const vendor = vendors.find((v) => v.vendorId === vendorId);
      return vendor ? vendor.vendorName : `ID: ${vendorId}`;
    },
    [vendors],
  );

  const filteredOrders = useMemo(() => {
    return purchaseOrderData.filter((order) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      const vendorName = getVendorName(order.vendorId);
      return (
        String(order.orderId).toLowerCase().includes(searchLower) ||
        String(order.vendorId).toLowerCase().includes(searchLower) ||
        vendorName.toLowerCase().includes(searchLower) ||
        order.orderStatus?.toLowerCase().includes(searchLower)
      );
    });
  }, [purchaseOrderData, search, getVendorName]);

  const columns = useMemo(
    () => [
      {
        field: "orderId",
        headerName: t("purchaseOrderList.orderId", "Order ID"),
        width: 120,
      },
      {
        field: "vendorId",
        headerName: t("purchaseOrderList.vendorId", "Vendor"),
        width: 200,
        renderCell: (params) => {
          const vendorName = getVendorName(params.value);
          return vendorName;
        },
      },
      {
        field: "orderDate",
        headerName: t("purchaseOrderList.orderDate", "Order Date"),
        flex: 1,
        minWidth: 150,
        renderCell: (params) => {
          if (!params.value) return "";
          return new Date(params.value).toLocaleDateString();
        },
      },
      {
        field: "purchaseAmount",
        headerName: t("purchaseOrderList.purchaseAmount", "Purchase Amount"),
        width: 150,
        headerAlign: "right",
        align: "right",
        renderCell: (params) => {
          if (params.value === null || params.value === undefined) return "";
          return `$${Number(params.value).toFixed(2)}`;
        },
      },
      {
        field: "orderStatus",
        headerName: t("purchaseOrderList.orderStatus", "Order Status"),
        width: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const status = params.value || "NEW";
          let color = "default";
          if (status === "COMPLETED") color = "success";
          else if (status === "PROCESSING") color = "primary";
          else if (status === "CANCELLED") color = "error";
          else if (status === "NEW") color = "info";

          return (
            <Chip
              label={t(
                `purchaseOrderList.status.${status.toLowerCase()}`,
                status,
              )}
              color={color}
              size="small"
            />
          );
        },
      },
      ...(enableActions
        ? [
            {
              field: "actions",
              headerName: t("basic.actions", "Actions"),
              width: 150,
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(params.row);
                    }}
                    sx={{
                      color: "info.main",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(params.row);
                    }}
                    sx={{
                      color: "primary.main",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(params.row);
                    }}
                    sx={{
                      color: "error.main",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ),
            },
          ]
        : []),
    ],
    [t, enableActions, handleEdit, handleDelete, handleView, getVendorName],
  );

  if (showAdd) {
    return <PurchaseOrderAdd onCancel={handleAddCancel} />;
  }

  if (action === "edit" && selectedOrder) {
    return (
      <PurchaseOrderEdit order={selectedOrder} onCancel={handleEditCancel} />
    );
  }

  if (deleteMode && selectedOrder) {
    return (
      <PurchaseOrderDelete
        order={selectedOrder}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedOrder(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelectedOrder(null);
          setRefresh(true);
        }}
      />
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {viewMode && selectedOrder && (
        <PurchaseOrderView
          order={selectedOrder}
          onClose={() => {
            setViewMode(false);
            setSelectedOrder(null);
          }}
        />
      )}
      <PageHeader
        title={t("purchaseOrderList.title", "Purchase Orders")}
        subtitle={t("purchaseOrderList.subtitle", "Manage purchase orders")}
        icon={ShoppingCartIcon}
        actionLabel={t("basic.add", "Add")}
        onActionClick={() => setShowAdd(true)}
        onHelpClick={() => setHelpOpen(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("purchaseOrderList.helpTitle", "Purchase order help")}
        content={t(
          "purchaseOrderList.helpBody",
          "This page lists purchase orders. Use Add to create a new purchase order. Use View, Edit or Delete to manage existing orders.",
        )}
      />

      <Box
        sx={{
          p: 3,
          backgroundColor: "background.paper",
          borderRadius: 1,
          boxShadow: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder={t("purchaseOrderList.searchPlaceholder", "Search...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
        </Box>

        {loading ? (
          <LoadingState />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            message={
              search
                ? t("basic.noSearchResults", "No results found")
                : t("purchaseOrderList.noOrders", "No purchase orders found")
            }
          />
        ) : (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <DataGrid
              rows={filteredOrders}
              columns={columns}
              getRowId={(row) => row.orderId}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 25 },
                },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              sx={{
                border: "1px solid var(--color-gray-300)",
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "background.default",
                  borderBottom: "2px solid var(--color-gray-300)",
                },
                "& .MuiDataGrid-row:hover": {
                  backgroundColor: "action.hover",
                },
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PurchaseOrderModern;
