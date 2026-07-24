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
  LocalShipping as LocalShippingIcon,
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
import DeliveryOrderAdd from "./DeliveryOrderAdd";
import DeliveryOrderEdit from "./DeliveryOrderEdit";
import DeliveryOrderDelete from "./DeliveryOrderDelete";
import DeliveryOrderView from "./DeliveryOrderView";
import DeliveryOrderStatusAction from "./DeliveryOrderStatusAction";

const DeliveryOrderModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [deliveryOrderData, setDeliveryOrderData] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [actionMode, setActionMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [customerMap, setCustomerMap] = useState({});
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      request("GET", "/api/deliveryOrders"),
      request("GET", "/api/customers"),
    ])
      .then(([ordersRes, customersRes]) => {
        setDeliveryOrderData(ordersRes.data || []);
        const map = {};
        (customersRes.data || []).forEach((c) => {
          map[c.customerId] = c.customerName;
        });
        setCustomerMap(map);
      })
      .catch(() => {
        setDeliveryOrderData([]);
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
    return deliveryOrderData.filter((order) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      const resolvedName =
        customerMap[order.customerId] || order.customerName || "";
      return (
        String(order.orderId).toLowerCase().includes(searchLower) ||
        resolvedName.toLowerCase().includes(searchLower) ||
        (order.projectCode || "").toLowerCase().includes(searchLower) ||
        order.orderStatus?.toLowerCase().includes(searchLower)
      );
    });
  }, [deliveryOrderData, search, customerMap]);

  const normalizedOrders = useMemo(() => {
    return filteredOrders.map((order) => {
      const status = order.orderStatus || "NEW";
      const displayCustomerName =
        customerMap[order.customerId] ||
        order.customerName ||
        String(order.customerId ?? "");
      const displayOrderDate = order.orderDate
        ? new Date(order.orderDate).toLocaleDateString()
        : "";
      const displayDeliveryDate = order.deliveryDate
        ? new Date(order.deliveryDate).toLocaleDateString()
        : "";
      const displayDeliveryAmount =
        order.deliveryAmount === null || order.deliveryAmount === undefined
          ? ""
          : `$${Number(order.deliveryAmount).toFixed(2)}`;
      const displayOrderStatus = t(
        `deliveryOrderList.status.${status.toLowerCase()}`,
        status,
      );

      return {
        ...order,
        displayCustomerName,
        displayOrderDate,
        displayDeliveryDate,
        displayDeliveryAmount,
        displayOrderStatus,
        orderStatus: status,
      };
    });
  }, [filteredOrders, t, customerMap]);

  const getStatusColor = (status) => {
    if (status === "NEW") return "info";
    if (status === "READY") return "secondary";
    if (status === "ISSUED") return "warning";
    if (status === "DELIVERED") return "success";
    if (status === "CANCELLED") return "error";
    if (status === "COMPLETED") return "success";
    if (status === "PROCESSING") return "primary";
    return "default";
  };

  const getActionState = (order) => {
    const status = order?.orderStatus || "NEW";
    return {
      canEdit: status === "NEW" || status === "ISSUED",
      canDelete: status === "NEW",
      hasActions: status === "NEW" || status === "READY" || status === "ISSUED",
    };
  };

  const columns = useMemo(
    () => [
      {
        field: "orderId",
        headerName: t("deliveryOrderList.orderId", "Order ID"),
        width: 120,
      },
      {
        field: "displayCustomerName",
        headerName: t("deliveryOrderList.customerId", "Customer"),
        width: 200,
      },
      {
        field: "projectCode",
        headerName: t("deliveryOrderList.projectCode", "Project Code"),
        width: 150,
      },
      {
        field: "displayOrderDate",
        headerName: t("deliveryOrderList.orderDate", "Order Date"),
        flex: 1,
        minWidth: 130,
      },
      {
        field: "displayDeliveryDate",
        headerName: t("deliveryOrderList.deliveryDate", "Delivery Date"),
        flex: 1,
        minWidth: 130,
      },
      {
        field: "displayDeliveryAmount",
        headerName: t("deliveryOrderList.deliveryAmount", "Amount"),
        width: 130,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "displayOrderStatus",
        headerName: t("deliveryOrderList.orderStatus", "Status"),
        width: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <Chip
            label={t(
              `deliveryOrderList.status.${(params.row.orderStatus || "new").toLowerCase()}`,
              params.row.orderStatus,
            )}
            color={getStatusColor(params.row.orderStatus)}
            size="small"
          />
        ),
      },
      {
        field: "actions",
        headerName: t("basic.actions", "Actions"),
        width: 160,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const { canEdit, canDelete, hasActions } = getActionState(params.row);
          return (
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
                disabled={!canEdit}
                sx={{
                  color: canEdit ? "primary.main" : "text.disabled",
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
                disabled={!hasActions}
                title={t("deliveryOrderList.action.title", "Actions")}
                sx={{
                  color: hasActions ? "success.main" : "text.disabled",
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
                disabled={!canDelete}
                sx={{
                  color: canDelete ? "error.main" : "text.disabled",
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    [t, handleEdit, handleDelete, handleView, handleAction],
  );

  const blockColumnDefs = columns
    .filter((c) => c.field !== "actions")
    .map((c) => ({ field: c.field, label: c.headerName }));

  if (showAdd) {
    return <DeliveryOrderAdd onCancel={handleAddCancel} />;
  }

  if (action === "edit" && selectedOrder) {
    return (
      <DeliveryOrderEdit order={selectedOrder} onCancel={handleEditCancel} />
    );
  }

  if (deleteMode && selectedOrder) {
    return (
      <DeliveryOrderDelete
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
        <DeliveryOrderView
          order={selectedOrder}
          onClose={() => {
            setViewMode(false);
            setSelectedOrder(null);
          }}
        />
      )}
      {actionMode && selectedOrder && (
        <DeliveryOrderStatusAction
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
        title={t("deliveryOrderList.title", "Delivery Orders")}
        subtitle={t("deliveryOrderList.subtitle", "Manage delivery orders")}
        icon={LocalShippingIcon}
        actionLabel={t("basic.add", "Add")}
        onActionClick={() => setShowAdd(true)}
        onHelpClick={() => setHelpOpen(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("deliveryOrderList.helpTitle", "Delivery order help")}
        content={t(
          "deliveryOrderList.helpBody",
          "This page lists delivery orders. Use Add to create a new delivery order. Use View, Edit or Delete to manage existing orders.",
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
            placeholder={t("deliveryOrderList.searchPlaceholder", "Search...")}
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
                : t("deliveryOrderList.noOrders", "No delivery orders found")
            }
            description={
              !search
                ? t(
                    "deliveryOrderList.noOrdersDesc",
                    "Add a delivery order to record goods dispatched to a customer.",
                  )
                : undefined
            }
            actionLabel={!search ? t("basic.add", "Add") : undefined}
            onActionClick={!search ? () => setShowAdd(true) : undefined}
          />
        ) : shouldUseBlockLayout ? (
          <LoadMoreBlockList
            items={normalizedOrders}
            renderItem={(item, idx) =>
              (() => {
                const { canEdit, canDelete, hasActions } = getActionState(item);
                return (
                  <BlockListItem
                    key={item.orderId || idx}
                    columnDefs={blockColumnDefs}
                    item={item}
                    onView={handleView}
                    onEdit={canEdit ? handleEdit : undefined}
                    onDelete={canDelete ? handleDelete : undefined}
                    leadingMedia={{
                      placeholder: (
                        <LocalShippingIcon
                          sx={{ color: "text.secondary", fontSize: "1.1rem" }}
                        />
                      ),
                      width: 40,
                      height: 40,
                    }}
                    extraContent={
                      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAction(item);
                          }}
                          disabled={!hasActions}
                          title={t("deliveryOrderList.action.title", "Actions")}
                          sx={{
                            color: hasActions
                              ? "success.main"
                              : "text.disabled",
                            "&:hover": { backgroundColor: "action.hover" },
                          }}
                        >
                          <ActionIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                    t={t}
                  />
                );
              })()
            }
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

export default DeliveryOrderModern;
