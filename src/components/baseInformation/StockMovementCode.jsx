import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, TextField, InputAdornment, Chip } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  People as PeopleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { PageHeader, EmptyState, LoadingState } from "../common";
import HelpDialog from "../common/HelpDialog";
import StockMovementCodeAdd from "./StockMovementCodeAdd";
import StockMovementCodeEdit from "./StockMovementCodeEdit";
import StockMovementCodeDelete from "./StockMovementCodeDelete";

const StockMovementCode = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const enableActions = true;

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/stockmovementcodes")
      .then((res) => {
        setData(res.data || []);
      })
      .catch(() => setData([]))
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelected(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleEdit = useCallback((item) => {
    setSelected(item);
    setAction("edit");
  }, []);

  const handleDelete = useCallback((item) => {
    setSelected(item);
    setDeleteMode(true);
  }, []);

  const filtered = useMemo(() => {
    return data.filter((item) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        String(item.movementType).toLowerCase().includes(q) ||
        (item.movementDescription || "").toLowerCase().includes(q)
      );
    });
  }, [data, search]);

  const columns = useMemo(
    () => [
      {
        field: "movementType",
        headerName: t("stockMovementCode.movementType"),
        width: 120,
      },
      {
        field: "movementDescription",
        headerName: t("stockMovementCode.movementDescription"),
        flex: 1,
        minWidth: 200,
      },
      {
        field: "stockModifier",
        headerName: t("stockMovementCode.stockModifier"),
        width: 150,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "holdModifier",
        headerName: t("stockMovementCode.holdModifier"),
        width: 150,
        headerAlign: "center",
        align: "center",
      },
      ...(enableActions
        ? [
            {
              field: "actions",
              headerName: t("basic.actions"),
              width: 120,
              sortable: false,
              filterable: false,
              headerAlign: "center",
              align: "center",
              renderCell: (params) => (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                  }}
                >
                  <Box
                    component="span"
                    onClick={() => handleEdit(params.row)}
                    sx={{ cursor: "pointer" }}
                    title={t("basic.edit")}
                  >
                    <EditIcon fontSize="small" />
                  </Box>
                  <Box
                    component="span"
                    onClick={() => handleDelete(params.row)}
                    sx={{ cursor: "pointer" }}
                    title={t("basic.delete")}
                  >
                    <DeleteIcon fontSize="small" color="error" />
                  </Box>
                </Box>
              ),
            },
          ]
        : []),
    ],
    [t, enableActions, handleEdit, handleDelete],
  );

  if (loading)
    return (
      <LoadingState message={t("stockMovementCode.loading", "Loading...")} />
    );

  if (deleteMode && selected) {
    return (
      <StockMovementCodeDelete
        item={selected}
        onClose={() => {
          setDeleteMode(false);
          setSelected(null);
        }}
        onSuccess={() => {
          setDeleteMode(false);
          setSelected(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (action === "edit" && selected) {
    return (
      <StockMovementCodeEdit item={selected} onCancel={handleEditCancel} />
    );
  }

  if (showAdd) return <StockMovementCodeAdd onCancel={handleAddCancel} />;

  return (
    <Box>
      <PageHeader
        title={t("stockMovementCode.title")}
        subtitle={t(
          "stockMovementCode.subtitle",
          "Manage stock movement codes",
        )}
        onHelpClick={() => setHelpOpen(true)}
        icon={PeopleIcon}
        actionLabel={t("stockMovementCode.add")}
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
          placeholder={t("stockMovementCode.searchPlaceholder", "Search...")}
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
        {filtered.length === 0 ? (
          <EmptyState
            title={t("stockMovementCode.noItems", "No codes found")}
            description={t(
              "stockMovementCode.noItemsDesc",
              "Add a new stock movement code to get started.",
            )}
            actionLabel={t("stockMovementCode.add")}
            onActionClick={() => setShowAdd(true)}
          />
        ) : (
          <DataGrid
            rows={filtered}
            columns={columns}
            getRowId={(row) => row.movementType}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            pageSizeOptions={[5, 10, 25, 50]}
            disableRowSelectionOnClick
            autoHeight={false}
            sx={{
              border: 0,
              "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
            }}
          />
        )}
      </Box>
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("stockMovementCode.helpTitle", "Stock movement codes help")}
        content={t(
          "stockMovementCode.helpBody",
          "This page lets you manage stock movement codes used to record inventory changes. Use Add to create new codes, Edit to modify, and Delete to remove codes.",
        )}
      />
    </Box>
  );
};

export default StockMovementCode;
// Cleared for clean re-implementation
