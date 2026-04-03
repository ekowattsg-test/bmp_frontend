import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, TextField, InputAdornment, Chip, Stack } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory2 as BundleIcon,
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
import ProductBundleAdd from "./ProductBundleAdd";
import ProductBundleEdit from "./ProductBundleEdit";
import ProductBundleDelete from "./ProductBundleDelete";

const ProductBundleModern = () => {
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
  const [productMap, setProductMap] = useState({});

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      request("GET", "/api/productbundles"),
      request("GET", "/api/products"),
    ])
      .then(([bundleRes, prodRes]) => {
        const bundles =
          bundleRes.status === "fulfilled" ? bundleRes.value.data || [] : [];
        const products =
          prodRes.status === "fulfilled" ? prodRes.value.data || [] : [];
        const pmap = {};
        products.forEach((p) => {
          if (p.productId != null) pmap[String(p.productId)] = p;
        });
        setProductMap(pmap);
        setData(bundles);
      })
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

  const getMemberNames = useCallback(
    (bundleMembers) => {
      if (!Array.isArray(bundleMembers)) return [];
      return bundleMembers.map((bm) => {
        const id =
          bm && typeof bm === "object" ? String(bm.productId) : String(bm);
        const qty = bm && typeof bm === "object" ? Number(bm.quantity) || 1 : 1;
        const p = productMap[id];
        const name = p ? p.productName || p.productCode || id : id;
        return qty > 1 ? `${name} ×${qty}` : name;
      });
    },
    [productMap],
  );

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (item) =>
        String(item.bundleCode || "")
          .toLowerCase()
          .includes(q) ||
        String(item.bundleName || "")
          .toLowerCase()
          .includes(q),
    );
  }, [data, search]);

  const columns = useMemo(
    () => [
      {
        field: "bundleCode",
        headerName: t("productBundle.columns.bundleCode"),
        width: 160,
      },
      {
        field: "bundleName",
        headerName: t("productBundle.columns.bundleName"),
        flex: 1,
        minWidth: 180,
      },
      {
        field: "bundleMembers",
        headerName: t("productBundle.columns.members"),
        flex: 2,
        minWidth: 220,
        sortable: false,
        renderCell: (params) => {
          const names = getMemberNames(params.value);
          return (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {names.map((name, i) => (
                <Chip key={i} label={name} size="small" />
              ))}
            </Stack>
          );
        },
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
    [t, handleEdit, handleDelete, getMemberNames],
  );

  const blockColumnDefs = [
    { field: "bundleCode", label: t("productBundle.columns.bundleCode") },
    { field: "bundleName", label: t("productBundle.columns.bundleName") },
  ];

  if (loading) return <LoadingState message={t("productBundle.loading")} />;

  if (deleteMode && selected) {
    return (
      <ProductBundleDelete
        item={selected}
        productMap={productMap}
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
    return <ProductBundleEdit item={selected} onCancel={handleEditCancel} />;
  }

  if (showAdd) return <ProductBundleAdd onCancel={handleAddCancel} />;

  return (
    <Box>
      <PageHeader
        title={t("productBundle.title")}
        subtitle={t("productBundle.subtitle")}
        onHelpClick={() => setHelpOpen(true)}
        icon={BundleIcon}
        actionLabel={t("productBundle.add")}
        onActionClick={() => setShowAdd(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("productBundle.helpTitle")}
        content={t("productBundle.helpBody")}
      />

      <Box sx={{ mb: 3 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("productBundle.searchPlaceholder")}
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

      {filtered.length === 0 ? (
        <EmptyState
          title={t("productBundle.noItems")}
          description={t("productBundle.noItemsDesc")}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={filtered}
          columnDefs={blockColumnDefs}
          renderItem={(item) => (
            <BlockListItem
              key={item.bundleId}
              item={item}
              columnDefs={blockColumnDefs}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
              extraContent={
                <Stack
                  direction="row"
                  spacing={0.5}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mt: 0.5 }}
                >
                  {getMemberNames(item.bundleMembers).map((name, i) => (
                    <Chip key={i} label={name} size="small" />
                  ))}
                </Stack>
              }
            />
          )}
        />
      ) : (
        <Box sx={{ width: "100%" }}>
          <DataGrid
            rows={filtered}
            columns={columns}
            getRowId={(row) => row.bundleId}
            autoHeight
            getRowHeight={() => "auto"}
            disableRowSelectionOnClick
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            sx={{
              border: "1px solid var(--color-gray-200)",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "background.default",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "action.hover",
              },
              "& .MuiDataGrid-cell": {
                py: 1,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default ProductBundleModern;
