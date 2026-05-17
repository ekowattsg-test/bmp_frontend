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
  DirectionsCar as CarIcon,
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
import VehicleAdd from "./VehicleAdd";
import VehicleEdit from "./VehicleEdit";
import VehicleDelete from "./VehicleDelete";

const VehicleModern = () => {
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();

  const [vehicles, setVehicles] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [deleteVehicle, setDeleteVehicle] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      request("GET", "/api/vehicles"),
      request("GET", "/api/staffs"),
    ])
      .then(([vRes, sRes]) => {
        setVehicles(vRes.data || []);
        setStaffList(sRes.data || []);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const staffMap = useMemo(() => {
    const m = {};
    staffList.forEach((s) => {
      m[s.staffId] = s.staffName;
    });
    return m;
  }, [staffList]);

  const handleEdit = useCallback((vehicle) => setEditVehicle(vehicle), []);
  const handleDelete = useCallback((vehicle) => setDeleteVehicle(vehicle), []);

  const filtered = useMemo(() => {
    if (!search) return vehicles;
    const q = search.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.vehicleNumber?.toLowerCase().includes(q) ||
        (staffMap[v.driver] || v.driver || "").toLowerCase().includes(q),
    );
  }, [vehicles, search, staffMap]);

  const columns = useMemo(
    () => [
      {
        field: "vehicleNumber",
        headerName: t("vehicleList.vehicleNumber", "Vehicle No."),
        flex: 1,
        minWidth: 140,
      },
      {
        field: "driver",
        headerName: t("vehicleList.driver", "Driver"),
        flex: 1,
        minWidth: 160,
        valueGetter: (value) => staffMap[value] || value || "",
      },
      {
        field: "active",
        headerName: t("vehicleList.active", "Active"),
        width: 100,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <Chip
            label={
              params.value === 1 || params.value === true
                ? t("basic.true", "Yes")
                : t("basic.false", "No")
            }
            color={
              params.value === 1 || params.value === true
                ? "success"
                : "default"
            }
            size="small"
          />
        ),
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
    ],
    [t, handleEdit, handleDelete, staffMap],
  );

  if (loading) {
    return (
      <LoadingState message={t("vehicleList.loading", "Loading vehicles...")} />
    );
  }

  if (deleteVehicle) {
    return (
      <VehicleDelete
        vehicle={deleteVehicle}
        onCancel={() => setDeleteVehicle(null)}
        onDeleted={() => {
          setDeleteVehicle(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (editVehicle) {
    return (
      <VehicleEdit
        vehicle={editVehicle}
        onCancel={(saved) => {
          setEditVehicle(null);
          if (saved) setRefresh(true);
        }}
      />
    );
  }

  if (showAdd) {
    return (
      <VehicleAdd
        onCancel={(added) => {
          setShowAdd(false);
          if (added) setRefresh(true);
        }}
      />
    );
  }

  const blockColumnDefs = columns
    .filter((c) => c.field !== "actions")
    .map((c) => ({ field: c.field, label: c.headerName }));

  return (
    <Box>
      <PageHeader
        title={t("vehicleList.title", "Vehicles")}
        subtitle={t("vehicleList.subtitle", "Manage vehicles")}
        icon={CarIcon}
        onHelpClick={() => setHelpOpen(true)}
        actionLabel={t("vehicleList.addTitle", "Add Vehicle")}
        onActionClick={() => setShowAdd(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("vehicleList.helpTitle", "Vehicles — User Manual")}
        body={t(
          "vehicleList.helpBody",
          "Use this page to add, edit, and delete vehicle records.",
        )}
      />

      <Box sx={{ mb: 2, maxWidth: 400 }}>
        <TextField
          size="small"
          fullWidth
          placeholder={t("vehicleList.searchPlaceholder", "Search...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {shouldUseBlockLayout ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={CarIcon}
            title={t("vehicleList.noVehicles", "No vehicles found.")}
            description={t(
              "vehicleList.emptyDescription",
              "Add a vehicle to get started.",
            )}
            actionLabel={t("vehicleList.addTitle", "Add Vehicle")}
            onActionClick={() => setShowAdd(true)}
          />
        ) : (
          <LoadMoreBlockList
            items={filtered}
            getItemId={(v) => v.vehicleNumber}
            columnDefs={blockColumnDefs}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage={t("vehicleList.noVehicles", "No vehicles found.")}
            renderItem={(v) => (
              <BlockListItem
                key={v.vehicleNumber}
                item={v}
                columnDefs={blockColumnDefs}
                onEdit={() => handleEdit(v)}
                onDelete={() => handleDelete(v)}
              />
            )}
          />
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CarIcon}
          title={t("vehicleList.noVehicles", "No vehicles found.")}
          description={t(
            "vehicleList.emptyDescription",
            "Add a vehicle to get started.",
          )}
          actionLabel={t("vehicleList.addTitle", "Add Vehicle")}
          onActionClick={() => setShowAdd(true)}
        />
      ) : (
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={(row) => row.vehicleNumber}
          autoHeight
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={{
            border: "1px solid var(--color-gray-200)",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "background.default",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "action.hover",
            },
          }}
        />
      )}
    </Box>
  );
};

export default VehicleModern;
