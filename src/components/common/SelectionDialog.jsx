import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import { getDisplayImageInfo } from "../../helpers/file_helper";
import Modal from "./Modal";

/**
 * Generic selection dialog.
 * Props:
 * - open, onClose
 * - title
 * - fetchItems: async (search, category) => items[]
 * - onSelect: item => void
 * - onCreate: optional callback when user wants to create a new item
 * - renderItem: optional (item) => { primary, secondary }
 */
const SelectionDialog = ({
  open,
  onClose,
  title,
  fetchItems,
  onSelect,
  onCreate,
  renderItem,
  inline = false,
  facetFields = [],
}) => {
  const [search, setSearch] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setFilters({});
    loadItems("", {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadItems = async (q, nextFilters) => {
    if (!fetchItems) return;
    setLoading(true);
    try {
      const res = await fetchItems(q || "", nextFilters || filters || {});
      const full = res || [];
      setAllItems(full);
      // apply client-side filtering so typing + chips combine responsively
      const filtered = full.filter((it) => {
        // apply facet filters
        for (const k of Object.keys(nextFilters || filters || {})) {
          const v = (nextFilters || filters || {})[k];
          if (!v) continue;
          if (!it[k] || String(it[k]) !== String(v)) return false;
        }
        // apply free-text search against common fields
        if (q && q.trim()) {
          const s = q.toLowerCase();
          const name = (
            it.productName ||
            it.name ||
            it.skillName ||
            it.code ||
            it.productCode ||
            ""
          )
            .toString()
            .toLowerCase();
          const desc = (
            it.productDescription ||
            it.description ||
            it.skillDescription ||
            ""
          )
            .toString()
            .toLowerCase();
          if (!name.includes(s) && !desc.includes(s)) return false;
        }
        return true;
      });
      setItems(filtered);
    } catch (e) {
      console.error("Error loading items in SelectionDialog", e);
      setAllItems([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const v = e.target.value;
    setSearch(v);
    loadItems(v, filters);
  };

  const { t } = useTranslation();

  // helper to make readable labels
  const humanize = (s) =>
    (s || "")
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^./, (c) => c.toUpperCase())
      .trim();

  // build facet values from current items
  const facets = {};
  facetFields.forEach((f) => {
    facets[f] = Array.from(
      new Set(items.map((it) => it[f]).filter(Boolean)),
    ).sort();
  });

  const body = (
    <Box sx={{ p: 2 }}>
      <TextField
        fullWidth
        placeholder="Search..."
        value={search}
        onChange={handleSearchChange}
        size="small"
        sx={{ mb: 2 }}
      />

      <Box sx={{ mb: 2 }}>
        {facetFields.length === 0 ? (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={t("common.all", "All")}
              size="small"
              clickable
              onClick={() => {
                setFilters({});
                loadItems(search, {});
              }}
              color={Object.keys(filters).length === 0 ? "primary" : "default"}
            />
          </Box>
        ) : (
          facetFields.map((field) => (
            <Box key={field} sx={{ mb: 1 }}>
              <Box sx={{ fontSize: 12, color: "text.secondary", mb: 0.5 }}>
                {field === "productCategory"
                  ? t("product.category", "Category")
                  : field === "productClass"
                    ? t("product.productClass", "Product Class")
                    : t(field, humanize(field))}
              </Box>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  label={t("common.all", "All")}
                  size="small"
                  clickable
                  onClick={() => {
                    setFilters({});
                    loadItems(search, {});
                  }}
                  color={filters[field] ? "default" : "primary"}
                />
                {facets[field].map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    size="small"
                    onClick={() => {
                      const next = {
                        ...filters,
                        [field]: filters[field] === c ? undefined : c,
                      };
                      // remove undefined keys
                      Object.keys(next).forEach(
                        (k) => next[k] === undefined && delete next[k],
                      );
                      setFilters(next);
                      loadItems(search, next);
                    }}
                    color={filters[field] === c ? "primary" : "default"}
                    clickable
                  />
                ))}
              </Box>
            </Box>
          ))
        )}
      </Box>

      <Box sx={{ maxHeight: 300, overflowY: "auto", mb: 2 }}>
        <List dense>
          {items.map((it) => {
            const r = renderItem
              ? renderItem(it)
              : {
                  primary:
                    it.skillName || it.productName || it.name || it.code || "-",
                  secondary:
                    it.skillDescription ||
                    it.productDescription ||
                    it.description ||
                    it.code ||
                    "",
                };
            // normalize potential productPicture JSON/objects into an image URL
            const rawPic =
              it.productPicture ||
              it.imageUrl ||
              it.productImage ||
              it.productPictureUrl ||
              it.picture ||
              null;
            let imgUrl = null;
            try {
              const info = getDisplayImageInfo(rawPic);
              if (info && info.imageUrl) imgUrl = info.imageUrl;
              else if (typeof rawPic === "string" && rawPic.startsWith("http")) imgUrl = rawPic;
            } catch (err) {
              // fallback to raw string if parse fails
              if (typeof rawPic === "string" && rawPic.startsWith("http")) imgUrl = rawPic;
            }

            return (
              <ListItem
                key={
                  it.id ||
                  it.staffSkillId ||
                  it.productId ||
                  it.staffId ||
                  JSON.stringify(r)
                }
                button
                onClick={() => onSelect(it)}
                sx={{ alignItems: "flex-start" }}
              >
                {imgUrl ? (
                  <Box
                    component="img"
                    src={imgUrl}
                    sx={{
                      width: 48,
                      height: 48,
                      objectFit: "cover",
                      borderRadius: 1,
                      mr: 1,
                    }}
                    referrerPolicy="no-referrer"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : null}
                <ListItemText primary={r.primary} secondary={r.secondary} />
              </ListItem>
            );
          })}

          {!loading && items.length === 0 && (
            <ListItem>
              <ListItemText primary="No items found" />
            </ListItem>
          )}
        </List>
      </Box>

      {/* Actions intentionally omitted: parent component should render Create/Cancel controls. */}
    </Box>
  );

  if (inline) return body;
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {body}
    </Modal>
  );
};

export default SelectionDialog;
