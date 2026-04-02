import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, TextField, InputAdornment } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountTree as AccountTreeIcon,
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
import UOMHierarchyAdd from "./UOMHierarchyAdd";
import UOMHierarchyEdit from "./UOMHierarchyEdit";
import UOMHierarchyDelete from "./UOMHierarchyDelete";

const UOMHierarchy = () => {
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState("view");
  const [deleteMode, setDeleteMode] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      request("GET", "/api/producthierarchies"),
      request("GET", "/api/products"),
    ])
      .then(([hierRes, prodRes]) => {
        const hierarchies = hierRes.data || [];
        const products = prodRes.data || [];
        const productMap = {};
        products.forEach((p) => {
          if (p.productId != null) productMap[String(p.productId)] = p;
        });
        const enriched = hierarchies.map((h) => {
          const parent = productMap[String(h.parentProductId)] || {};
          const child = productMap[String(h.childProductId)] || {};
          return {
            ...h,
            parentProductCode: parent.productCode || h.parentProductId,
            parentProductName: parent.productName || "",
            childProductCode: child.productCode || h.childProductId,
            childProductName: child.productName || "",
          };
        });
        setData(enriched);
      })
      .catch(() => setData([]))
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const handleEdit = useCallback((item) => {
    setSelected(item);
    setAction("edit");
  }, []);

  const handleDelete = useCallback((item) => {
    setSelected(item);
    setDeleteMode(true);
  }, []);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelected(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (item) =>
        String(item.parentProductCode || "")
          .toLowerCase()
          .includes(q) ||
        String(item.parentProductName || "")
          .toLowerCase()
          .includes(q) ||
        String(item.childProductCode || "")
          .toLowerCase()
          .includes(q) ||
        String(item.childProductName || "")
          .toLowerCase()
          .includes(q),
    );
  }, [data, search]);

  const columns = useMemo(
    () => [
      {
        field: "parentProductCode",
        headerName: t("uomHierarchy.parentCode"),
        width: 140,
      },
      {
        field: "parentProductName",
        headerName: t("uomHierarchy.parentName"),
        flex: 1,
        minWidth: 160,
      },
      {
        field: "childProductCode",
        headerName: t("uomHierarchy.childCode"),
        width: 140,
      },
      {
        field: "childProductName",
        headerName: t("uomHierarchy.childName"),
        flex: 1,
        minWidth: 160,
      },
      {
        field: "numberOfChildren",
        headerName: t("uomHierarchy.quantity"),
        width: 110,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "actions",
        headerName: t("basic.actions"),
        width: 100,
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
    ],
    [t, handleEdit, handleDelete],
  );

  const blockColumnDefs = columns
    .filter((c) => c.field !== "actions")
    .map((c) => ({ field: c.field, label: c.headerName }));

  if (loading)
    return <LoadingState message={t("uomHierarchy.loading", "Loading...")} />;

  if (deleteMode && selected) {
    return (
      <UOMHierarchyDelete
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
    return <UOMHierarchyEdit item={selected} onCancel={handleEditCancel} />;
  }

  if (showAdd) return <UOMHierarchyAdd onCancel={handleAddCancel} />;

  return (
    <Box>
      <PageHeader
        title={t("uomHierarchy.title")}
        subtitle={t("uomHierarchy.subtitle")}
        onHelpClick={() => setHelpOpen(true)}
        icon={AccountTreeIcon}
        actionLabel={t("uomHierarchy.add")}
        onActionClick={() => setShowAdd(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("uomHierarchy.helpTitle")}
        content={t("uomHierarchy.helpBody")}
      />

      <Box sx={{ mb: 3 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("uomHierarchy.searchPlaceholder")}
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
            title={t("uomHierarchy.noItems")}
            description={t("uomHierarchy.noItemsDesc")}
            actionLabel={t("uomHierarchy.add")}
            onActionClick={() => setShowAdd(true)}
          />
        ) : shouldUseBlockLayout ? (
          <LoadMoreBlockList
            items={filtered}
            containerSx={{ p: 2 }}
            renderItem={(item, idx) => (
              <BlockListItem
                key={item.hierarchyId || idx}
                columnDefs={blockColumnDefs}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
                leadingMedia={{
                  placeholder: (
                    <AccountTreeIcon
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
          <DataGrid
            rows={filtered}
            columns={columns}
            getRowId={(row) => row.hierarchyId}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableRowSelectionOnClick
            sx={{
              border: "none",
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
    </Box>
  );
};

export default UOMHierarchy;
