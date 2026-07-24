import React, { useContext, useEffect, useMemo, useState } from "react";
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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  AddCircleOutline as AddCircleOutlineIcon,
  ArrowBack as ArrowBackIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LibraryBooks as LibraryBooksIcon,
  Search as SearchIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { request } from "../../helpers/axios_helper";
import { AuthContext } from "../../context/authContext";
import {
  abort,
  commit,
  deleteFileFromDrive,
  getActiveStorageProviderConfig,
  normalizeFileMetadata,
  openStoredDocument,
  uploadFileToDrive,
} from "../../helpers/file_helper";
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
import { useRef } from "react";

const createInitialForm = (libraryCatelogId) => ({
  libraryCatelogId,
  libraryEntryName: "",
  libraryEntryType: "doc",
  libraryEntryKey: "",
  entryQuickSearchKey: "",
});

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const safeParseJson = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseDocumentMeta = (value) => {
  const parsed = safeParseJson(value, null);
  if (!parsed || typeof parsed !== "object") return null;
  const meta = normalizeFileMetadata(parsed);
  return meta.id || meta.url || meta.viewUrl ? meta : null;
};

const LibraryEntriesModern = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { libraryCatelogId } = useParams();
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const { userInfo } = useContext(AuthContext);
  const userLevel = normalizeUserLevel(userInfo?.level ?? userInfo?.userLevel);
  const canManage = canManageLibrary(userLevel);

  const [catalog, setCatalog] = useState(location.state?.catalog || null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [search, setSearch] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [deleteEntry, setDeleteEntry] = useState(null);
  const [form, setForm] = useState(createInitialForm(Number(libraryCatelogId)));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadedInEditor, setUploadedInEditor] = useState(false);
  const [pendingDeleteRefs, setPendingDeleteRefs] = useState([]);
  const [entryChipInput, setEntryChipInput] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const numericCatalogId = Number(libraryCatelogId);
    if (!Number.isFinite(numericCatalogId)) {
      setCatalog(null);
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      request("GET", `/api/librarycatelogs/${numericCatalogId}`),
      request(
        "GET",
        `/api/libraryentries?libraryCatelogId=${encodeURIComponent(numericCatalogId)}`,
      ),
    ])
      .then(([catalogResponse, entriesResponse]) => {
        const nextCatalog = catalogResponse.data || null;
        setCatalog(nextCatalog);
        if (nextCatalog && Number(nextCatalog.visibleLevel) <= userLevel) {
          setEntries(
            Array.isArray(entriesResponse.data) ? entriesResponse.data : [],
          );
        } else {
          setEntries([]);
          setErrorMsg(
            t(
              "libraryEntries.notVisible",
              "This library catalog is not visible for your user level.",
            ),
          );
        }
      })
      .catch(() => {
        setCatalog(null);
        setEntries([]);
        setErrorMsg(
          t("libraryEntries.loadFailed", "Failed to load library entries."),
        );
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [libraryCatelogId, refresh, t, userLevel]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const rows = entries.map((entry) => ({
      ...entry,
      documentMeta: parseDocumentMeta(entry.libraryEntryKey),
      displayLibraryEntryName: String(entry.libraryEntryName || ""),
      displayLibraryEntryType:
        entry.libraryEntryType === "doc"
          ? t("libraryEntries.types.doc", "Document")
          : entry.libraryEntryType === "link"
            ? t("libraryEntries.types.link", "Link")
            : String(entry.libraryEntryType || ""),
      displayLibraryEntryKey:
        parseDocumentMeta(entry.libraryEntryKey)?.name ||
        parseDocumentMeta(entry.libraryEntryKey)?.viewUrl ||
        String(entry.libraryEntryKey || ""),
      displayEntryQuickSearchKey: String(entry.entryQuickSearchKey || ""),
    }));

    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((entry) =>
      [
        entry.displayLibraryEntryName,
        entry.displayLibraryEntryType,
        entry.displayLibraryEntryKey,
        entry.displayEntryQuickSearchKey,
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [entries, search, t]);

  const catalogName = String(catalog?.libraryCatelogName || "").trim();
  const currentDocumentMeta = parseDocumentMeta(form.libraryEntryKey);
  const isLinkSaveDisabled =
    form.libraryEntryType === "link" &&
    (!safeString(form.libraryEntryName) || !safeString(form.libraryEntryKey));

  const openEntry = async (entry) => {
    if (!entry) return;

    if (String(entry.libraryEntryType || "") === "link") {
      const url = safeString(entry.libraryEntryKey);
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const documentMeta = parseDocumentMeta(entry.libraryEntryKey);
    if (!documentMeta?.id) return;

    try {
      await openStoredDocument(
        documentMeta.id,
        documentMeta.provider,
        documentMeta.viewUrl || documentMeta.url,
        documentMeta.mimeType,
      );
    } catch (error) {
      setErrorMsg(
        error?.message ||
          t("libraryEntries.openDocumentFailed", "Failed to open document."),
      );
    }
  };

  const columns = useMemo(() => {
    const baseColumns = [
      {
        field: "displayLibraryEntryName",
        headerName: t("libraryEntries.columns.name", "Entry Name"),
        flex: 1,
        minWidth: 220,
      },
      {
        field: "displayLibraryEntryType",
        headerName: t("libraryEntries.columns.type", "Entry Type"),
        width: 140,
      },
      {
        field: "displayLibraryEntryKey",
        headerName: t("libraryEntries.columns.key", "Entry Key"),
        flex: 1.4,
        minWidth: 260,
      },
      {
        field: "displayEntryQuickSearchKey",
        headerName: t(
          "libraryEntries.columns.quickSearchKey",
          "Quick Search Key",
        ),
        flex: 1,
        minWidth: 200,
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
    ];

    if (!canManage) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        field: "actions",
        headerName: t("basic.actions", "Actions"),
        width: 110,
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
              onClick={(event) => {
                event.stopPropagation();
                setSelectedEntry(params.row);
                setForm({
                  libraryCatelogId: params.row.libraryCatelogId,
                  libraryEntryName: params.row.libraryEntryName,
                  libraryEntryType: params.row.libraryEntryType,
                  libraryEntryKey: params.row.libraryEntryKey,
                  entryQuickSearchKey: params.row.entryQuickSearchKey,
                });
                setEntryChipInput("");
                setUploadedInEditor(false);
                setPendingDeleteRefs([]);
                setErrorMsg("");
                setEditorOpen(true);
              }}
              title={t("basic.edit", "Edit")}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={(event) => {
                event.stopPropagation();
                setDeleteEntry(params.row);
              }}
              title={t("basic.delete", "Delete")}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ];
  }, [canManage, t]);

  const blockColumnDefs = columns
    .filter((column) => column.field !== "actions")
    .map((column) => ({ field: column.field, label: column.headerName }));

  const openAdd = () => {
    setSelectedEntry(null);
    setForm(createInitialForm(Number(libraryCatelogId)));
    setUploadedInEditor(false);
    setPendingDeleteRefs([]);
    setEntryChipInput("");
    setErrorMsg("");
    setEditorOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const closeEditor = async () => {
    if (uploadedInEditor) {
      await abort().catch(() => {});
    }
    setEditorOpen(false);
    setSelectedEntry(null);
    setForm(createInitialForm(Number(libraryCatelogId)));
    setUploadedInEditor(false);
    setPendingDeleteRefs([]);
    setEntryChipInput("");
    setErrorMsg("");
  };

  const validateForm = () => {
    if (form.libraryEntryType === "link") {
      if (
        !safeString(form.libraryEntryName) ||
        !safeString(form.libraryEntryKey)
      ) {
        setErrorMsg(
          t(
            "libraryEntries.linkValidation",
            "Link entries require both Entry Name and Entry Key.",
          ),
        );
        return false;
      }
      return true;
    }

    if (!parseDocumentMeta(form.libraryEntryKey)) {
      setErrorMsg(
        t(
          "libraryEntries.docValidation",
          "Document entries require an uploaded document.",
        ),
      );
      return false;
    }

    return true;
  };

  const openDocumentPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const persistEntry = async ({
    nextForm,
    nextPendingDeleteRefs,
    commitUpload,
  }) => {
    const documentMeta = parseDocumentMeta(nextForm.libraryEntryKey);
    const payload = {
      ...nextForm,
      libraryEntryName:
        nextForm.libraryEntryType === "doc" &&
        !safeString(nextForm.libraryEntryName)
          ? safeString(documentMeta?.name)
          : nextForm.libraryEntryName,
    };

    if (selectedEntry) {
      await request(
        "PUT",
        `/api/libraryentries/${selectedEntry.libraryEntryId}`,
        payload,
      );
    } else {
      await request("POST", "/api/libraryentries", payload);
    }

    for (const ref of nextPendingDeleteRefs) {
      if (ref?.fileId) {
        await deleteFileFromDrive(ref.fileId, null, ref.provider);
      }
    }

    if (commitUpload) {
      await commit();
    }
  };

  const handleDocumentSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setErrorMsg("");
      setSaving(true);
      const previousMeta = parseDocumentMeta(form.libraryEntryKey);
      const activeCfg = getActiveStorageProviderConfig();
      const uploaded = await uploadFileToDrive(file, null, activeCfg.folderId);
      const normalized = normalizeFileMetadata(uploaded, {
        name: file.name,
        mimeType: file.type || "",
        provider: activeCfg.provider,
      });

      const nextPendingDeleteRefs = previousMeta?.id
        ? [
            ...pendingDeleteRefs,
            { fileId: previousMeta.id, provider: previousMeta.provider },
          ]
        : [...pendingDeleteRefs];

      const nextForm = {
        ...form,
        libraryEntryType: "doc",
        libraryEntryKey: JSON.stringify(normalized),
      };

      if (!safeString(nextForm.libraryEntryName)) {
        nextForm.libraryEntryName = file.name;
      }

      setForm(nextForm);
      setPendingDeleteRefs(nextPendingDeleteRefs);
      setUploadedInEditor(true);

      await persistEntry({
        nextForm,
        nextPendingDeleteRefs,
        commitUpload: true,
      });

      setEditorOpen(false);
      setSelectedEntry(null);
      setForm(createInitialForm(Number(libraryCatelogId)));
      setUploadedInEditor(false);
      setPendingDeleteRefs([]);
      setRefresh(true);
    } catch (error) {
      setErrorMsg(
        error?.message ||
          t("libraryEntries.uploadFailed", "Failed to upload document."),
      );
      if (uploadedInEditor) {
        await abort().catch(() => {});
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!canManage || saving) return;
    if (!validateForm()) return;

    setSaving(true);
    setErrorMsg("");
    try {
      await persistEntry({
        nextForm: form,
        nextPendingDeleteRefs: pendingDeleteRefs,
        commitUpload: uploadedInEditor,
      });

      setEditorOpen(false);
      setSelectedEntry(null);
      setForm(createInitialForm(Number(libraryCatelogId)));
      setUploadedInEditor(false);
      setPendingDeleteRefs([]);
      setRefresh(true);
    } catch (error) {
      setErrorMsg(
        String(error?.response?.data?.message || "").trim() ||
          t("libraryEntries.saveFailed", "Failed to save library entry."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canManage || !deleteEntry || saving) return;

    setSaving(true);
    setErrorMsg("");
    try {
      const deleteMeta = parseDocumentMeta(deleteEntry.libraryEntryKey);
      await request(
        "DELETE",
        `/api/libraryentries/${deleteEntry.libraryEntryId}`,
      );
      if (deleteMeta?.id) {
        await deleteFileFromDrive(deleteMeta.id, null, deleteMeta.provider);
        await commit();
      }
      setDeleteEntry(null);
      setRefresh(true);
    } catch (error) {
      setErrorMsg(
        String(error?.response?.data?.message || "").trim() ||
          t("libraryEntries.deleteFailed", "Failed to delete library entry."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        message={t("libraryEntries.loading", "Loading library entries...")}
      />
    );
  }

  if (!canManage) {
    // access silently restricted — no message shown
  }

  return (
    <Box>
      <PageHeader
        title={t("libraryEntries.title", "Library Entries")}
        subtitle={t(
          "libraryEntries.subtitle",
          "Maintain entries under the selected library catalog.",
        )}
        icon={LibraryBooksIcon}
        onHelpClick={() => setHelpOpen(true)}
        action={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(location.state?.backPath || "/library")}
            >
              {t("basic.back", "Back")}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddCircleOutlineIcon />}
              onClick={openAdd}
            >
              {t("libraryEntries.addEntry", "Add Entry")}
            </Button>
          </Box>
        }
      />

      {catalogName ? (
        <Box
          sx={{
            mb: 3,
            px: 2,
            py: 1.5,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            boxShadow: 1,
          }}
        >
          <Box sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 0.5 }}>
            {t("libraryEntries.catalogLabel", "Catalog")}
          </Box>
          <Box
            sx={{ fontSize: "1.25rem", fontWeight: 700, color: "text.primary" }}
          >
            {catalogName}
          </Box>
        </Box>
      ) : null}

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("libraryEntries.helpTitle", "Library Entries Help")}
        content={t(
          "libraryEntries.helpBody",
          "Maintain link or document entries under the selected library catalog.",
        )}
      />

      {errorMsg ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {errorMsg}
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
            "libraryEntries.searchPlaceholder",
            "Search library entries",
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

      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleDocumentSelected}
      />

      {filteredRows.length === 0 ? (
        <EmptyState
          title={
            search
              ? t("libraryEntries.noSearchResults", "No matching entries found")
              : t("libraryEntries.noData", "No library entries found")
          }
          description={
            search
              ? t(
                  "libraryEntries.noSearchResultsDescription",
                  "Try a different keyword for your search.",
                )
              : t(
                  "libraryEntries.noDataDescription",
                  "Add an entry to start building this library catalog.",
                )
          }
          actionLabel={
            !search ? t("libraryEntries.addEntry", "Add Entry") : null
          }
          onActionClick={!search ? openAdd : null}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={filteredRows}
          renderItem={(item) => (
            <BlockListItem
              key={item.libraryEntryId}
              columnDefs={blockColumnDefs}
              item={item}
              onView={openEntry}
              leadingMedia={{
                placeholder: (
                  <LibraryBooksIcon
                    sx={{ color: "text.secondary", fontSize: "1.1rem" }}
                  />
                ),
                width: 40,
                height: 40,
              }}
              onEdit={
                canManage
                  ? () => {
                      setSelectedEntry(item);
                      setForm({
                        libraryCatelogId: item.libraryCatelogId,
                        libraryEntryName: item.libraryEntryName,
                        libraryEntryType: item.libraryEntryType,
                        libraryEntryKey: item.libraryEntryKey,
                        entryQuickSearchKey: item.entryQuickSearchKey,
                      });
                      setEntryChipInput("");
                      setEditorOpen(true);
                    }
                  : undefined
              }
              onDelete={canManage ? () => setDeleteEntry(item) : undefined}
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
            getRowId={(row) => row.libraryEntryId}
            onRowClick={(params) => openEntry(params.row)}
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

      <Dialog open={editorOpen} onClose={closeEditor} fullWidth maxWidth="sm">
        <DialogTitle>
          {selectedEntry
            ? t("libraryEntries.editEntry", "Edit Entry")
            : t("libraryEntries.addEntry", "Add Entry")}
        </DialogTitle>
        <DialogContent>
          {catalogName ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              {t("libraryEntries.catalogLabel", "Catalog")}: {catalogName}
            </Alert>
          ) : null}
          <Box sx={{ mt: 2, mb: 1 }}>
            <Box
              sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 0.75 }}
            >
              {t("libraryEntries.fields.type", "Entry Type")}
            </Box>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={form.libraryEntryType}
              onChange={(_, nextType) => {
                if (!nextType) return;
                setForm((prev) => ({
                  ...prev,
                  libraryEntryType: nextType,
                  libraryEntryKey:
                    nextType === "link" ? "" : prev.libraryEntryKey,
                  libraryEntryName: prev.libraryEntryName,
                }));
                setErrorMsg("");
              }}
              sx={{
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  py: 1.25,
                },
              }}
            >
              <ToggleButton value="doc">
                {t("libraryEntries.types.doc", "Document")}
              </ToggleButton>
              <ToggleButton value="link">
                {t("libraryEntries.types.link", "Link")}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <TextField
            fullWidth
            margin="normal"
            label={t("libraryEntries.fields.name", "Entry Name")}
            name="libraryEntryName"
            value={form.libraryEntryName}
            onChange={handleFormChange}
          />

          {form.libraryEntryType === "link" ? (
            <TextField
              fullWidth
              margin="normal"
              label={t("libraryEntries.fields.key", "Entry Key")}
              name="libraryEntryKey"
              value={form.libraryEntryKey}
              onChange={handleFormChange}
              multiline
              minRows={3}
              placeholder={t(
                "libraryEntries.linkPlaceholder",
                "Paste URL here",
              )}
            />
          ) : (
            <Box
              sx={{
                mt: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <Button
                variant="outlined"
                startIcon={<AttachFileIcon />}
                onClick={openDocumentPicker}
                disabled={saving}
              >
                {t("libraryEntries.selectDocument", "Select Document")}
              </Button>
              {currentDocumentMeta?.viewUrl || currentDocumentMeta?.url ? (
                <Box>
                  <Button
                    size="small"
                    startIcon={<OpenInNewIcon />}
                    onClick={async () => {
                      try {
                        await openStoredDocument(
                          currentDocumentMeta.id,
                          currentDocumentMeta.provider,
                          currentDocumentMeta.viewUrl ||
                            currentDocumentMeta.url,
                          currentDocumentMeta.mimeType,
                        );
                      } catch (error) {
                        setErrorMsg(
                          error?.message ||
                            t(
                              "libraryEntries.openDocumentFailed",
                              "Failed to open document.",
                            ),
                        );
                      }
                    }}
                  >
                    {t("libraryEntries.openDocument", "Open Document")}
                  </Button>
                </Box>
              ) : null}
            </Box>
          )}
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={String(form.entryQuickSearchKey || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)}
            inputValue={entryChipInput}
            onChange={(_, newChips) => {
              setForm((prev) => ({
                ...prev,
                entryQuickSearchKey: newChips.join(", "),
              }));
            }}
            onInputChange={(_, newInput, reason) => {
              if (reason === "input" && newInput.endsWith(",")) {
                const chip = newInput.slice(0, -1).trim();
                if (chip) {
                  const existing = String(form.entryQuickSearchKey || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  if (!existing.includes(chip)) {
                    setForm((prev) => ({
                      ...prev,
                      entryQuickSearchKey: [...existing, chip].join(", "),
                    }));
                  }
                }
                setEntryChipInput("");
              } else {
                setEntryChipInput(newInput);
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
                label={t(
                  "libraryEntries.fields.quickSearchKey",
                  "Quick Search Key",
                )}
                placeholder={t(
                  "libraryEntries.fields.quickSearchKeyHint",
                  "Type keyword, comma to add",
                )}
                onBlur={() => {
                  const chip = entryChipInput.trim();
                  if (chip) {
                    const existing = String(form.entryQuickSearchKey || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (!existing.includes(chip)) {
                      setForm((prev) => ({
                        ...prev,
                        entryQuickSearchKey: [...existing, chip].join(", "),
                      }));
                    }
                    setEntryChipInput("");
                  }
                }}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditor} disabled={saving}>
            {t("basic.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={
              saving ||
              (!selectedEntry && form.libraryEntryType === "doc") ||
              isLinkSaveDisabled
            }
          >
            {t("basic.save", "Save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteEntry)}
        onClose={() => setDeleteEntry(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {t("libraryEntries.deleteTitle", "Delete Entry")}
        </DialogTitle>
        <DialogContent>
          {catalogName ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t("libraryEntries.catalogLabel", "Catalog")}: {catalogName}
            </Alert>
          ) : null}
          {t(
            "libraryEntries.deleteConfirm",
            "Are you sure you want to delete this library entry?",
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteEntry(null)} disabled={saving}>
            {t("basic.cancel", "Cancel")}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={saving}
          >
            {t("basic.delete", "Delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LibraryEntriesModern;
