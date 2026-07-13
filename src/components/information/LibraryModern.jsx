import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  AddCircleOutline as AddCircleOutlineIcon,
  Article as ArticleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LocalLibrary as LocalLibraryIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { request } from "../../helpers/axios_helper";
import { AuthContext } from "../../context/authContext";
import {
  canManageLibrary,
  LIBRARY_MANAGE_MIN_LEVEL,
  normalizeUserLevel,
} from "../../helpers/library_access_helper";
import {
  BlockListItem,
  EmptyState,
  LoadMoreBlockList,
  LoadingState,
  PageHeader,
} from "../common";
import HelpDialog from "../common/HelpDialog";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";

const createInitialForm = () => ({
  libraryCatelogName: "",
  active: 0,
  visibleLevel: 0,
  description: "",
  quicSearchKey: "",
});

const LibraryModern = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const { userInfo } = useContext(AuthContext);
  const userLevel = normalizeUserLevel(userInfo?.level ?? userInfo?.userLevel);
  const canManage = canManageLibrary(userLevel);

  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [search, setSearch] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(createInitialForm());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedCatalog, setSelectedCatalog] = useState(null);
  const [deleteCatalog, setDeleteCatalog] = useState(null);
  const [entryCounts, setEntryCounts] = useState({});
  const [allEntries, setAllEntries] = useState([]);
  const [catalogChipInput, setCatalogChipInput] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      request("GET", "/api/librarycatelogs"),
      request("GET", "/api/libraryentries"),
    ])
      .then(([catalogResponse, entryResponse]) => {
        const nextCatalogs = Array.isArray(catalogResponse.data)
          ? catalogResponse.data
          : [];
        const nextEntries = Array.isArray(entryResponse.data)
          ? entryResponse.data
          : [];
        const nextEntryCounts = {};

        nextEntries.forEach((entry) => {
          const catalogId = String(entry?.libraryCatelogId ?? "").trim();
          if (!catalogId) return;
          nextEntryCounts[catalogId] = (nextEntryCounts[catalogId] || 0) + 1;
        });

        setCatalogs(nextCatalogs);
        setEntryCounts(nextEntryCounts);
        setAllEntries(nextEntries);
      })
      .catch(() => {
        setCatalogs([]);
        setEntryCounts({});
        setAllEntries([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const visibleCatalogs = useMemo(() => {
    return catalogs.filter((catalog) => {
      const visibleLevel = Number(catalog.visibleLevel);
      return Number.isFinite(visibleLevel) && visibleLevel <= userLevel;
    });
  }, [catalogs, userLevel]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const rows = visibleCatalogs.map((catalog) => ({
      ...catalog,
      entryCount: entryCounts[String(catalog.libraryCatelogId)] || 0,
      displayLibraryCatelogName: String(catalog.libraryCatelogName || ""),
      displayDescription: String(catalog.description || ""),
      displayProjectCode: String(catalog.projectCode || ""),
      displayQuickSearchKey: String(catalog.quicSearchKey || ""),
      displayVisibleLevel: String(catalog.visibleLevel),
    }));

    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((catalog) => {
      const catalogMatches = [
        catalog.displayLibraryCatelogName,
        catalog.displayDescription,
        catalog.displayProjectCode,
        catalog.displayQuickSearchKey,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      if (catalogMatches) return true;

      return allEntries.some(
        (entry) =>
          String(entry?.libraryCatelogId ?? "").trim() ===
            String(catalog.libraryCatelogId ?? "").trim() &&
          String(entry?.entryQuickSearchKey || "")
            .toLowerCase()
            .includes(normalizedSearch),
      );
    });
  }, [allEntries, entryCounts, search, visibleCatalogs]);

  const canEditCatalog = useCallback(() => canManage, [canManage]);

  const canDeleteCatalog = useCallback(
    (catalog) =>
      canEditCatalog(catalog) && Number(catalog?.entryCount || 0) === 0,
    [canEditCatalog],
  );

  const handleFormChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "active" || name === "visibleLevel" ? Number(value) : value,
    }));
  }, []);

  const handleSaveCatalog = async () => {
    if (!canManage || saving) return;

    setSaving(true);
    setErrorMsg("");
    try {
      const payload = selectedCatalog
        ? {
            ...selectedCatalog,
            libraryCatelogName: form.libraryCatelogName,
            active: form.active,
            visibleLevel: form.visibleLevel,
            description: form.description,
            quicSearchKey: form.quicSearchKey,
          }
        : {
            ...form,
            visibleLevel: Number(form.visibleLevel),
          };

      if (selectedCatalog?.libraryCatelogId) {
        await request(
          "PUT",
          `/api/librarycatelogs/${selectedCatalog.libraryCatelogId}`,
          payload,
        );
      } else {
        await request("POST", "/api/librarycatelogs", payload);
      }

      setAddOpen(false);
      setForm(createInitialForm());
      setSelectedCatalog(null);
      setRefresh(true);
    } catch (error) {
      setErrorMsg(
        String(error?.response?.data?.message || "").trim() ||
          t("library.saveFailed", "Failed to save library catalog."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCatalog = async () => {
    if (!deleteCatalog || saving) return;

    if (!canDeleteCatalog(deleteCatalog)) {
      setErrorMsg(
        t(
          "library.deleteBlockedHasEntries",
          "This catalog cannot be deleted because it still has entries.",
        ),
      );
      setDeleteCatalog(null);
      return;
    }

    setSaving(true);
    setErrorMsg("");
    try {
      await request(
        "DELETE",
        `/api/librarycatelogs/${deleteCatalog.libraryCatelogId}`,
      );
      setDeleteCatalog(null);
      setRefresh(true);
    } catch (error) {
      setErrorMsg(
        String(error?.response?.data?.message || "").trim() ||
          t("library.deleteFailed", "Failed to delete library catalog."),
      );
    } finally {
      setSaving(false);
    }
  };

  const openEntries = useCallback(
    (catalog) => {
      navigate(`/library/${catalog.libraryCatelogId}/entries`, {
        state: { catalog },
      });
    },
    [navigate],
  );

  const columns = useMemo(() => {
    const baseColumns = [
      {
        field: "displayLibraryCatelogName",
        headerName: t("library.columns.name", "Catalog"),
        flex: 1,
        minWidth: 220,
      },
      {
        field: "displayDescription",
        headerName: t("library.columns.description", "Description"),
        flex: 1.4,
        minWidth: 240,
      },
      {
        field: "displayQuickSearchKey",
        headerName: t("library.columns.quickSearchKey", "Quick Search Key"),
        flex: 1,
        minWidth: 220,
        sortable: false,
        renderCell: (params) => {
          const chips = String(params.value || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (!chips.length)
            return (
              <Box sx={{ color: "text.secondary", lineHeight: "inherit" }}>
                -
              </Box>
            );
          return (
            <Box
              sx={{
                display: "flex",
                gap: 0.5,
                flexWrap: "wrap",
                alignItems: "center",
                height: "100%",
              }}
            >
              {chips.map((chip, i) => (
                <Chip key={i} size="small" label={chip} />
              ))}
            </Box>
          );
        },
      },
      {
        field: "entryCount",
        headerName: t("library.columns.entryCount", "Entries"),
        width: 100,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "active",
        headerName: t("library.columns.active", "Active"),
        width: 100,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <Chip
            size="small"
            label={
              Number(params.value) === 1
                ? t("basic.true", "Yes")
                : t("basic.false", "No")
            }
            color={Number(params.value) === 1 ? "success" : "default"}
          />
        ),
      },
    ];

    if (!canManage) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        field: "actions",
        headerName: t("basic.actions", "Actions"),
        width: 150,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const sameLevelEditable = canEditCatalog(params.row);
          const deleteAllowed = canDeleteCatalog(params.row);

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
                color="info"
                onClick={() => openEntries(params.row)}
                title={t("library.manageEntries", "Manage Entries")}
              >
                <ArticleIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="primary"
                disabled={!sameLevelEditable}
                onClick={() => {
                  setSelectedCatalog(params.row);
                  setForm({
                    libraryCatelogName: params.row.libraryCatelogName || "",
                    active: Number(params.row.active) === 1 ? 1 : 0,
                    visibleLevel: Number(params.row.visibleLevel) || 0,
                    description: params.row.description || "",
                    quicSearchKey: params.row.quicSearchKey || "",
                  });
                  setCatalogChipInput("");
                  setErrorMsg("");
                  setAddOpen(true);
                }}
                title={t("library.editCatalog", "Edit Catalog")}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                disabled={!deleteAllowed}
                onClick={() => setDeleteCatalog(params.row)}
                title={
                  deleteAllowed
                    ? t("library.deleteCatalog", "Delete Catalog")
                    : t(
                        "library.deleteBlockedHasEntries",
                        "This catalog cannot be deleted because it still has entries.",
                      )
                }
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        },
      },
    ];
  }, [canDeleteCatalog, canEditCatalog, canManage, openEntries, t]);

  const blockColumnDefs = columns
    .filter((column) => column.field !== "actions")
    .map((column) => ({ field: column.field, label: column.headerName }));

  if (loading) {
    return (
      <LoadingState
        message={t("library.loading", "Loading library catalogs...")}
      />
    );
  }

  return (
    <Box>
      <PageHeader
        title={t("library.title", "Library")}
        subtitle={t(
          "library.subtitle",
          "Browse library catalogs available for your user level.",
        )}
        icon={LocalLibraryIcon}
        onHelpClick={() => setHelpOpen(true)}
        actionLabel={canManage ? t("library.addCatalog", "Add Catalog") : null}
        onActionClick={canManage ? () => setAddOpen(true) : null}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("library.helpTitle", "Library Help")}
        content={t(
          "library.helpBody",
          "This page lists library catalogs filtered by visible level. Users at the configured library management level and above can add catalogs and manage their entries.",
        )}
      />

      {!canManage ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t(
            "library.manageThresholdInfo",
            "Library maintenance requires user level {{level}} or above.",
            { level: LIBRARY_MANAGE_MIN_LEVEL },
          )}
        </Alert>
      ) : null}

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
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t(
            "library.searchPlaceholder",
            "Search library catalogs",
          )}
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

      {filteredRows.length === 0 ? (
        <EmptyState
          title={
            search
              ? t("library.noSearchResults", "No matching catalogs found")
              : t("library.noData", "No library catalogs found")
          }
          description={
            search
              ? t(
                  "library.noSearchResultsDescription",
                  "Try a different keyword for your search.",
                )
              : t(
                  "library.noDataDescription",
                  "No library catalogs are currently visible for your user level.",
                )
          }
          actionLabel={
            canManage && !search ? t("library.addCatalog", "Add Catalog") : null
          }
          onActionClick={canManage && !search ? () => setAddOpen(true) : null}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={filteredRows}
          renderItem={(item) => (
            <BlockListItem
              key={item.libraryCatelogId}
              columnDefs={blockColumnDefs}
              item={item}
              leadingMedia={{
                placeholder: (
                  <LocalLibraryIcon
                    sx={{ color: "text.secondary", fontSize: "1.1rem" }}
                  />
                ),
                width: 40,
                height: 40,
              }}
              extraContent={
                canManage ? (
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => openEntries(item)}
                      title={t("library.manageEntries", "Manage Entries")}
                    >
                      <ArticleIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="primary"
                      disabled={!canEditCatalog(item)}
                      onClick={() => {
                        setSelectedCatalog(item);
                        setForm({
                          libraryCatelogName: item.libraryCatelogName || "",
                          active: Number(item.active) === 1 ? 1 : 0,
                          visibleLevel: Number(item.visibleLevel) || 0,
                          description: item.description || "",
                          quicSearchKey: item.quicSearchKey || "",
                        });
                        setCatalogChipInput("");
                        setErrorMsg("");
                        setAddOpen(true);
                      }}
                      title={t("library.editCatalog", "Edit Catalog")}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={!canDeleteCatalog(item)}
                      onClick={() => setDeleteCatalog(item)}
                      title={
                        canDeleteCatalog(item)
                          ? t("library.deleteCatalog", "Delete Catalog")
                          : t(
                              "library.deleteBlockedHasEntries",
                              "This catalog cannot be deleted because it still has entries.",
                            )
                      }
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : null
              }
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
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.libraryCatelogId}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
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

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {selectedCatalog
            ? t("library.editCatalog", "Edit Catalog")
            : t("library.addCatalog", "Add Catalog")}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label={t("library.fields.name", "Catalog Name")}
            name="libraryCatelogName"
            value={form.libraryCatelogName}
            onChange={handleFormChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label={t("library.fields.description", "Description")}
            name="description"
            value={form.description}
            onChange={handleFormChange}
            multiline
            minRows={3}
          />
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={String(form.quicSearchKey || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)}
            inputValue={catalogChipInput}
            onChange={(_, newChips) => {
              setForm((prev) => ({
                ...prev,
                quicSearchKey: newChips.join(", "),
              }));
            }}
            onInputChange={(_, newInput, reason) => {
              if (reason === "input" && newInput.endsWith(",")) {
                const chip = newInput.slice(0, -1).trim();
                if (chip) {
                  const existing = String(form.quicSearchKey || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  if (!existing.includes(chip)) {
                    setForm((prev) => ({
                      ...prev,
                      quicSearchKey: [...existing, chip].join(", "),
                    }));
                  }
                }
                setCatalogChipInput("");
              } else {
                setCatalogChipInput(newInput);
              }
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option}
                  size="small"
                  label={option}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                margin="normal"
                label={t("library.fields.quickSearchKey", "Quick Search Key")}
                placeholder={t(
                  "library.fields.quickSearchKeyHint",
                  "Type keyword, comma to add",
                )}
                onBlur={() => {
                  const chip = catalogChipInput.trim();
                  if (chip) {
                    const existing = String(form.quicSearchKey || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (!existing.includes(chip)) {
                      setForm((prev) => ({
                        ...prev,
                        quicSearchKey: [...existing, chip].join(", "),
                      }));
                    }
                    setCatalogChipInput("");
                  }
                }}
              />
            )}
          />
          <TextField
            fullWidth
            margin="normal"
            label={t("library.fields.visibleLevel", "Visible Level")}
            name="visibleLevel"
            type="number"
            value={form.visibleLevel}
            onChange={handleFormChange}
          />
          <TextField
            select
            fullWidth
            margin="normal"
            label={t("library.fields.active", "Active")}
            name="active"
            value={form.active}
            onChange={handleFormChange}
          >
            <MenuItem value={1}>{t("basic.true", "Yes")}</MenuItem>
            <MenuItem value={0}>{t("basic.false", "No")}</MenuItem>
          </TextField>
          {errorMsg ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {errorMsg}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddOpen(false);
              setSelectedCatalog(null);
              setForm(createInitialForm());
              setCatalogChipInput("");
              setErrorMsg("");
            }}
            disabled={saving}
          >
            {t("basic.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCatalog}
            disabled={saving}
            startIcon={<AddCircleOutlineIcon />}
          >
            {t("basic.save", "Save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteCatalog)}
        onClose={() => setDeleteCatalog(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {t("library.deleteCatalog", "Delete Catalog")}
        </DialogTitle>
        <DialogContent>
          {t(
            "library.deleteConfirm",
            "Are you sure you want to delete this library catalog?",
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCatalog(null)} disabled={saving}>
            {t("basic.cancel", "Cancel")}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteCatalog}
            disabled={saving}
          >
            {t("basic.delete", "Delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LibraryModern;
