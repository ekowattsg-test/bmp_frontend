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
  PlayCircleOutline as ActionIcon,
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
import HelpDialog from "../common/HelpDialog";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import PurchaseOrderAdd from "./PurchaseOrderAdd";
import PurchaseOrderEdit from "./PurchaseOrderEdit";
import PurchaseOrderDelete from "./PurchaseOrderDelete";
import PurchaseOrderView from "./PurchaseOrderView";
import PurchaseOrderStatusAction from "./PurchaseOrderStatusAction";

const PurchaseOrderModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [purchaseOrderData, setPurchaseOrderData] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [actionMode, setActionMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const enableActions = true;

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/purchaseorderview")
      .then((response) => {
        const rows = response.data || [];
        // Deduplicate by orderId — keep first row per order for the list
        const seen = new Map();
        rows.forEach((row) => {
          if (!seen.has(row.orderId)) seen.set(row.orderId, row);
        });
        setPurchaseOrderData(Array.from(seen.values()));
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

  const handleAction = useCallback((order) => {
    setSelectedOrder(order);
    setActionMode(true);
  }, []);

  const filteredOrders = useMemo(() => {
    return purchaseOrderData.filter((order) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        String(order.orderId).toLowerCase().includes(searchLower) ||
        String(order.vendorId ?? "")
          .toLowerCase()
          .includes(searchLower) ||
        (order.vendorName ?? "").toLowerCase().includes(searchLower) ||
        order.orderStatus?.toLowerCase().includes(searchLower)
      );
    });
  }, [purchaseOrderData, search]);

  const normalizedOrders = useMemo(() => {
    return filteredOrders.map((order) => {
      const status = order.orderStatus || "NEW";
      const displayVendorName =
        order.vendorName || String(order.vendorId ?? "");
      const displayOrderDate = order.orderDate
        ? new Date(order.orderDate).toLocaleDateString()
        : "";
      const displayPurchaseAmount =
        order.purchaseAmount === null || order.purchaseAmount === undefined
          ? ""
          : `$${Number(order.purchaseAmount).toFixed(2)}`;
      const displayOrderStatus = t(
        `purchaseOrderList.status.${status.toLowerCase()}`,
        status,
      );

      return {
        ...order,
        displayVendorName,
        displayOrderDate,
        displayPurchaseAmount,
        displayOrderStatus,
        orderStatus: status,
      };
    });
  }, [filteredOrders, t]);

  const columns = useMemo(
    () => [
      {
        field: "orderId",
        headerName: t("purchaseOrderList.orderId", "Order ID"),
        width: 120,
      },
      {
        field: "displayVendorName",
        headerName: t("purchaseOrderList.vendorId", "Vendor"),
        width: 200,
      },
      {
        field: "displayOrderDate",
        headerName: t("purchaseOrderList.orderDate", "Order Date"),
        flex: 1,
        minWidth: 150,
      },
      {
        field: "displayPurchaseAmount",
        headerName: t("purchaseOrderList.purchaseAmount", "Purchase Amount"),
        width: 150,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "displayOrderStatus",
        headerName: t("purchaseOrderList.orderStatus", "Order Status"),
        width: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const status = params.row.orderStatus || "NEW";
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
                      "&:hover": { backgroundColor: "action.hover" },
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
                    disabled={params.row.orderStatus !== "PROCESSING"}
                    sx={{
                      color:
                        params.row.orderStatus === "PROCESSING"
                          ? "primary.main"
                          : "text.disabled",
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(params.row);
                    }}
                    title={t("purchaseOrderList.action.title", "Actions")}
                    sx={{
                      color: "success.main",
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                  >
                    <ActionIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(params.row);
                    }}
                    sx={{
                      color: "error.main",
                      "&:hover": { backgroundColor: "action.hover" },
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
    [t, enableActions, handleEdit, handleDelete, handleView, handleAction],
  );

  const blockColumnDefs = columns
    .filter((c) => c.field !== "actions")
    .map((c) => ({ field: c.field, label: c.headerName }));

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
      {actionMode && selectedOrder && (
        <PurchaseOrderStatusAction
          order={selectedOrder}
          onClose={() => {
            setActionMode(false);
            setSelectedOrder(null);
          }}
          onUpdated={() => {
            setActionMode(false);
            setSelectedOrder(null);
            setRefresh(true);
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
            title={
              search
                ? t("basic.noSearchResults", "No results found")
                : t("purchaseOrderList.noOrders", "No purchase orders found")
            }
          />
        ) : shouldUseBlockLayout ? (
          <LoadMoreBlockList
            items={normalizedOrders}
            renderItem={(item, idx) => (
              <BlockListItem
                key={item.orderId || idx}
                columnDefs={blockColumnDefs}
                item={item}
                onView={handleView}
                onEdit={
                  item.orderStatus === "PROCESSING" ? handleEdit : undefined
                }
                onDelete={handleDelete}
                onAction={handleAction}
                leadingMedia={{
                  placeholder: (
                    <ShoppingCartIcon
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
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <DataGrid
              rows={normalizedOrders}
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
