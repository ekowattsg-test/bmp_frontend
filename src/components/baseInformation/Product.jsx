import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { Inventory2 as InventoryIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  getDisplayImageInfo,
  ImageCarousel,
  ThumbnailImg,
} from "../../helpers/file_helper";
import { ListContainer, PageHeader } from "../common";
import HelpDialog from "../common/HelpDialog";
import ProductAdd from "./ProductAdd";
import ProductEdit from "./ProductEdit";
import ProductDelete from "./ProductDelete";

const Product = () => {
  const [refresh, setRefresh] = useState(false);
  const [data, setData] = useState(null);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState([]);
  const [carouselStart, setCarouselStart] = useState(0);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(null);
  const [action, setAction] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    request("GET", "/api/products")
      .then((response) => setData(response.data))
      .catch(() => setData(null));
    setRefresh(false);
  }, [refresh]);

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleDeleted = () => {
    setDeleteMode(false);
    setSelectedForDelete(null);
    setRefresh(true);
  };

  if (deleteMode && selectedForDelete) {
    return (
      <ProductDelete
        product={selectedForDelete}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedForDelete(null);
        }}
        onDeleted={handleDeleted}
      />
    );
  }

  if (action === "edit" && selectedItem) {
    return (
      <ProductEdit
        product={selectedItem}
        onCancel={(edited) => {
          setAction(null);
          setSelectedItem(null);
          if (edited) setRefresh(true);
        }}
      />
    );
  }

  if (showAdd) {
    return <ProductAdd onCancel={handleAddCancel} />;
  }

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
    const imgs = arr
      .map((p) => getDisplayImageInfo(p))
      .filter((info) => info && (info.imageUrl || info.meta?.id))
      .map((info) => ({
        displayUrl: info.imageUrl || null,
        viewUrl: info.meta?.viewUrl || null,
        title: info.meta?.name || "",
        provider: info.meta?.provider || null,
        meta: info.meta || null,
      }));
    return imgs;
  };

  const handleImageClick = (pic, startIndex = 0) => {
    const imgs = buildImages(pic);
    if (imgs.length === 0) return;
    setCarouselImages(imgs);
    setCarouselStart(startIndex);
    setCarouselOpen(true);
  };

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

      <ListContainer
        searchPlaceholder={t("product.searchPlaceholder", "Search products...")}
        data={(data || []).map((p) => {
          const raw = p;
          const productName = p.productName || "";
          const cat =
            p.productCategory === "A"
              ? t("product.categoryA")
              : p.productCategory === "C"
                ? t("product.categoryC")
                : p.productCategory;
          // build thumbnail (if any) and always render name to the right
          let thumb = null;
          if (p.productPicture) {
            const imgs = buildImages(p.productPicture);
            const firstImage = imgs[0] || null;
            let src = firstImage?.displayUrl || null;
            if (!src && typeof p.productPicture === "string") {
              const str = p.productPicture.trim();
              if (str.startsWith("data:")) src = str;
              else if (/^[A-Za-z0-9+\/=\r\n]+$/.test(str) && str.length > 100)
                src = `data:image/png;base64,${str}`;
            }
            if (firstImage?.meta?.id) {
              thumb = (
                <ThumbnailImg
                  fileId={firstImage.meta.id}
                  viewUrl={firstImage.meta.viewUrl || ""}
                  provider={firstImage.meta.provider || null}
                  width={40}
                  height={40}
                  alt={p.productDescription || p.productCode}
                  style={{ borderRadius: 4, cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageClick(p.productPicture, 0);
                  }}
                />
              );
            } else if (src) {
              thumb = (
                <img
                  src={src}
                  alt={p.productDescription || p.productCode}
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
                    handleImageClick(p.productPicture, 0);
                  }}
                />
              );
            }
          }

          const displayCell = (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {thumb || (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 4,
                    background: "var(--color-bg-light)",
                  }}
                >
                  <span style={{ fontSize: 18 }}>📦</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontWeight: 500 }}>{productName}</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {p.productCode}
                </div>
              </div>
            </div>
          );

          return {
            ...p,
            _raw: raw,
            product: displayCell,
            productCategory: cat,
          };
        })}
        columns={[
          "product",
          "productCode",
          "productDescription",
          "productCategory",
          "productClass",
        ]}
        t={t}
        onEdit={(item) => {
          setSelectedItem(item?._raw || item);
          setAction("edit");
        }}
        onDelete={(item) => {
          setSelectedForDelete(item?._raw || item);
          setDeleteMode(true);
        }}
        searchValue={search}
        onSearchChange={setSearch}
        emptyMessage={t("messages.noProducts", "No products found.")}
      />
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

export default Product;
