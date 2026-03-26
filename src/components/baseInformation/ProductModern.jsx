import React, { useState, useEffect } from "react";
import { Box, TextField, InputAdornment, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory2 as InventoryIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  getDisplayImageInfo,
  ImageCarousel,
  ThumbnailImg,
} from "../../helpers/file_helper";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  BlockListItem,
  LoadMoreBlockList,
} from "../common";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import HelpDialog from "../common/HelpDialog";
import ProductAdd from "./ProductAdd";
import ProductEdit from "./ProductEdit";
import ProductDelete from "./ProductDelete";

const ProductModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [productData, setProductData] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState([]);
  const [carouselStart, setCarouselStart] = useState(0);
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/products")
      .then((response) => {
        setProductData(response.data || []);
      })
      .catch(() => {
        setProductData([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelectedProduct(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product?._raw || product);
    setAction("edit");
  };

  const handleDelete = (product) => {
    setSelectedProduct(product?._raw || product);
    setDeleteMode(true);
  };

  const buildImages = (pic) => {
    if (!pic) return [];
    let parsed = pic;
    if (typeof pic === "string") {
      try {
        parsed = JSON.parse(pic);
      } catch (e) {
        parsed = pic;
      }
    }

    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr
      .map((p) => getDisplayImageInfo(p))
      .filter((info) => info && (info.imageUrl || info.meta?.id))
      .map((info) => ({
        displayUrl: info.imageUrl || null,
        viewUrl: info.meta?.viewUrl || null,
        title: info.meta?.name || "",
        provider: info.meta?.provider || null,
        meta: info.meta || null,
      }));
  };

  const handleImageClick = (pic, startIndex = 0) => {
    const imgs = buildImages(pic);
    if (imgs.length === 0) return;
    setCarouselImages(imgs);
    setCarouselStart(startIndex);
    setCarouselOpen(true);
  };

  const mapCategory = (category) => {
    if (category === "A") return t("product.categoryA");
    if (category === "C") return t("product.categoryC");
    return category;
  };

  const rows = (productData || []).map((p) => ({
    ...p,
    _raw: p,
    displayProductName:
      p.productName || p.name || p.productNameEn || p.productCode || "-",
    displayProductCategory: mapCategory(p.productCategory),
  }));

  const filteredProducts = rows.filter((product) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      product.productCode?.toLowerCase().includes(searchLower) ||
      product.productDescription?.toLowerCase().includes(searchLower) ||
      product.productClass?.toLowerCase().includes(searchLower) ||
      product.displayProductName?.toLowerCase().includes(searchLower) ||
      product.displayProductCategory?.toLowerCase().includes(searchLower)
    );
  });

  const renderProductContent = (row) => {
    const name =
      row.displayProductName ||
      row.productName ||
      row.name ||
      row.productNameEn ||
      "";

    let thumb = null;
    if (row.productPicture) {
      const imgs = buildImages(row.productPicture);
      const firstImage = imgs[0] || null;
      let src = firstImage?.displayUrl || null;

      if (!src && typeof row.productPicture === "string") {
        const str = row.productPicture.trim();
        if (str.startsWith("data:")) src = str;
        else if (/^[A-Za-z0-9+\/=\r\n]+$/.test(str) && str.length > 100) {
          src = `data:image/png;base64,${str}`;
        }
      }

      if (firstImage?.meta?.id) {
        thumb = (
          <ThumbnailImg
            fileId={firstImage.meta.id}
            viewUrl={firstImage.meta.viewUrl || ""}
            provider={firstImage.meta.provider || null}
            width={40}
            height={40}
            alt={row.productDescription || row.productCode}
            style={{ borderRadius: 4, cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              handleImageClick(row.productPicture, 0);
            }}
          />
        );
      } else if (src) {
        thumb = (
          <img
            src={src}
            alt={row.productDescription || row.productCode}
            style={{
              width: 40,
              height: 40,
              objectFit: "cover",
              borderRadius: 4,
              cursor: "pointer",
            }}
            referrerPolicy="no-referrer"
            onClick={(e) => {
              e.stopPropagation();
              handleImageClick(row.productPicture, 0);
            }}
          />
        );
      }
    }

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {thumb || (
          <Box
            sx={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 1,
              backgroundColor: "background.alt",
            }}
          >
            <Box component="span" sx={{ fontSize: "1.1rem" }}>
              📦
            </Box>
          </Box>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Box sx={{ fontWeight: 500, color: "text.primary" }}>{name}</Box>
          <Box sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
            {row.productCode}
          </Box>
        </Box>
      </Box>
    );
  };

  const renderProductCell = (params) => renderProductContent(params.row);

  const columns = [
    {
      field: "displayProductName",
      headerName: t("product.productName", "Product"),
      flex: 1,
      minWidth: 260,
      renderCell: renderProductCell,
      sortable: false,
    },
    {
      field: "productDescription",
      headerName: t("product.productDescription", "Description"),
      flex: 1,
      minWidth: 220,
    },
    {
      field: "displayProductCategory",
      headerName: t("product.productCategory", "Category"),
      width: 140,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "productClass",
      headerName: t("product.productClass", "Class"),
      width: 140,
      headerAlign: "center",
      align: "center",
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
  ];

  if (loading) {
    return (
      <LoadingState message={t("product.loading", "Loading products...")} />
    );
  }

  if (deleteMode && selectedProduct) {
    return (
      <ProductDelete
        product={selectedProduct}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedProduct(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelectedProduct(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (action === "edit" && selectedProduct) {
    return (
      <ProductEdit product={selectedProduct} onCancel={handleEditCancel} />
    );
  }

  if (showAdd) {
    return <ProductAdd onCancel={handleAddCancel} />;
  }

  const blockColumnDefs = columns
    .filter((c) => c.field !== "actions")
    .map((c) => ({ field: c.field, label: c.headerName }));

  return (
    <Box>
      <PageHeader
        title={t("product.title", "Products")}
        subtitle={t("product.subtitle", "Manage products and inventory items")}
        onHelpClick={() => setHelpOpen(true)}
        icon={InventoryIcon}
        actionLabel={t("product.addTitle", "Add Product")}
        onActionClick={() => setShowAdd(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("product.helpTitle", "Product help")}
        content={t(
          "product.helpBody",
          "Manage products: add, edit, and remove products. Click a product to view or edit details.",
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
          placeholder={t("product.searchPlaceholder", "Search products...")}
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

      {filteredProducts.length === 0 && !loading ? (
        <EmptyState
          title={t("messages.noProducts", "No products found.")}
          description={
            search
              ? t("product.noSearchResults", "Try adjusting your search terms")
              : t(
                  "product.noProductsDescription",
                  "Get started by adding your first product",
                )
          }
          actionLabel={!search ? t("product.addTitle", "Add Product") : null}
          onActionClick={!search ? () => setShowAdd(true) : null}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={filteredProducts}
          renderItem={(item, idx) => (
            <BlockListItem
              key={item.productId || item.productCode || idx}
              columnDefs={blockColumnDefs}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              leadingMedia={{
                field: "productPicture",
                altFields: ["productDescription", "productCode"],
                placeholder: (
                  <InventoryIcon
                    sx={{ color: "text.secondary", fontSize: "1.1rem" }}
                  />
                ),
                onClick: (row) => handleImageClick(row.productPicture, 0),
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
            rows={filteredProducts}
            columns={columns}
            getRowId={(row) => row.productId || row.productCode}
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
            }}
          />
        </Box>
      )}

      {carouselOpen && (
        <ImageCarousel
          images={carouselImages}
          open={carouselOpen}
          onClose={() => setCarouselOpen(false)}
          startIndex={carouselStart}
        />
      )}
    </Box>
  );
};

export default ProductModern;
