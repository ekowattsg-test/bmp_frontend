import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Button,
  MenuItem,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EmojiEvents as MeritIcon,
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
import { HeaderBar } from "../common";

const initialForm = {
  meritName: "",
  meritDescription: "",
  meritCategory: "M",
};

const toCategoryLabel = (category, t) => {
  const normalized = String(category || "")
    .trim()
    .toUpperCase();
  if (normalized === "D") return t("staffManagement.meritCategoryDemerit");
  return t("staffManagement.meritCategoryMerit");
};

const StaffMeritForm = ({ mode, merit, onCancel, onSaved }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (mode === "edit" && merit) {
      setForm({
        meritName: merit.meritName || "",
        meritDescription: merit.meritDescription || "",
        meritCategory: String(merit.meritCategory || "M").toUpperCase(),
      });
    } else {
      setForm(initialForm);
    }
  }, [mode, merit]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    if (!String(form.meritName || "").trim()) {
      setErrorMsg(t("staffMeritList.meritNameRequired"));
      return false;
    }
    const category = String(form.meritCategory || "")
      .trim()
      .toUpperCase();
    if (!["M", "D"].includes(category)) {
      setErrorMsg(t("staffMeritList.meritCategoryRequired"));
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        meritName: String(form.meritName || "").trim(),
        meritDescription: String(form.meritDescription || "").trim(),
        meritCategory: String(form.meritCategory || "M")
          .trim()
          .toUpperCase(),
      };

      if (mode === "edit" && merit?.staffMeritId) {
        await request("PUT", `/api/staffmerits/${merit.staffMeritId}`, {
          ...merit,
          ...payload,
        });
      } else {
        await request("POST", "/api/staffmerits", payload);
      }

      onSaved();
    } catch (error) {
      setErrorMsg(error?.response?.data?.message || t("basic.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: { xs: "100%", sm: 540 },
        mx: "auto",
        mt: 2,
        mb: 2,
        background: "var(--color-gray-100)",
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
      }}
    >
      <HeaderBar
        title={
          mode === "edit"
            ? t("staffMeritList.editTitle")
            : t("staffMeritList.addTitle")
        }
        sx={{ mb: 1 }}
      />

      <TextField
        label={t("staffMeritList.meritName")}
        name="meritName"
        value={form.meritName}
        onChange={handleChange}
        fullWidth
        required
        margin="normal"
      />

      <TextField
        label={t("staffMeritList.meritDescription")}
        name="meritDescription"
        value={form.meritDescription}
        onChange={handleChange}
        fullWidth
        margin="normal"
        multiline
        minRows={3}
      />

      <TextField
        select
        label={t("staffMeritList.meritCategory")}
        name="meritCategory"
        value={form.meritCategory}
        onChange={handleChange}
        fullWidth
        margin="normal"
      >
        <MenuItem value="M">{t("staffManagement.meritCategoryMerit")}</MenuItem>
        <MenuItem value="D">
          {t("staffManagement.meritCategoryDemerit")}
        </MenuItem>
      </TextField>

      {errorMsg ? (
        <Typography sx={{ mt: 1, color: "error.main" }}>{errorMsg}</Typography>
      ) : null}

      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <Button type="submit" variant="contained" disabled={loading}>
          {t("basic.save")}
        </Button>
        <Button
          variant="outlined"
          onClick={() => onCancel(false)}
          disabled={loading}
        >
          {t("basic.cancel")}
        </Button>
      </Box>
    </Box>
  );
};

const StaffMeritDelete = ({ merit, onCancel, onDeleted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDelete = async () => {
    if (!merit?.staffMeritId) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await request("DELETE", `/api/staffmerits/${merit.staffMeritId}`);
      onDeleted();
    } catch (error) {
      setErrorMsg(error?.response?.data?.message || t("basic.deleteFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: { xs: "100%", sm: 500 },
        mx: "auto",
        mt: 2,
        background: "var(--color-gray-100)",
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
      }}
    >
      <HeaderBar title={t("staffMeritList.deleteTitle")} sx={{ mb: 1 }} />
      <Typography sx={{ mb: 1 }}>
        {t("staffMeritList.confirmDelete")}
      </Typography>
      <Typography sx={{ mb: 2, color: "text.secondary" }}>
        {merit?.meritName || "-"}
      </Typography>
      {errorMsg ? (
        <Typography sx={{ mb: 2, color: "error.main" }}>{errorMsg}</Typography>
      ) : null}
      <Box sx={{ display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={loading}
        >
          {t("basic.delete")}
        </Button>
        <Button
          variant="outlined"
          onClick={() => onCancel(false)}
          disabled={loading}
        >
          {t("basic.cancel")}
        </Button>
      </Box>
    </Box>
  );
};

const StaffMeritList = ({ onBack }) => {
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMerit, setSelectedMerit] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [meritData, setMeritData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [checkingUsage, setCheckingUsage] = useState(false);

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/staffmerits")
      .then((response) => {
        setMeritData(response.data || []);
      })
      .catch(() => {
        setMeritData([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const filteredMerits = useMemo(() => {
    const q = String(search || "")
      .trim()
      .toLowerCase();
    if (!q) return meritData;
    return meritData.filter((merit) => {
      return (
        String(merit?.meritName || "")
          .toLowerCase()
          .includes(q) ||
        String(merit?.meritDescription || "")
          .toLowerCase()
          .includes(q) ||
        String(merit?.meritCategory || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [meritData, search]);

  const normalizedMerits = useMemo(
    () =>
      filteredMerits.map((merit) => ({
        ...merit,
        displayMeritCategory: toCategoryLabel(merit?.meritCategory, t),
      })),
    [filteredMerits, t],
  );

  const handleEdit = (merit) => {
    setSelectedMerit(merit);
    setAction("edit");
  };

  const handleDelete = async (merit) => {
    setCheckingUsage(true);
    setDeleteError("");
    try {
      const response = await request(
        "GET",
        `/api/staffmeritprofiles?staffMeritId=${encodeURIComponent(merit.staffMeritId)}`,
      );
      const usageRows = Array.isArray(response?.data) ? response.data : [];
      if (usageRows.length > 0) {
        setDeleteError(
          t("staffMeritList.meritInUse", {
            count: usageRows.length,
          }),
        );
        setSelectedMerit(null);
      } else {
        setSelectedMerit(merit);
        setDeleteMode(true);
      }
    } catch {
      setSelectedMerit(merit);
      setDeleteMode(true);
    } finally {
      setCheckingUsage(false);
    }
  };

  const handleSaved = () => {
    setAction("view");
    setSelectedMerit(null);
    setShowAdd(false);
    setDeleteMode(false);
    setRefresh(true);
  };

  if (loading) {
    return <LoadingState message={t("staffMeritList.loading")} />;
  }

  if (deleteMode && selectedMerit) {
    return (
      <StaffMeritDelete
        merit={selectedMerit}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedMerit(null);
        }}
        onDeleted={handleSaved}
      />
    );
  }

  if (action === "edit" && selectedMerit) {
    return (
      <StaffMeritForm
        mode="edit"
        merit={selectedMerit}
        onCancel={() => {
          setAction("view");
          setSelectedMerit(null);
        }}
        onSaved={handleSaved}
      />
    );
  }

  if (showAdd) {
    return (
      <StaffMeritForm
        mode="add"
        merit={null}
        onCancel={() => setShowAdd(false)}
        onSaved={handleSaved}
      />
    );
  }

  const columns = [
    {
      field: "meritName",
      headerName: t("staffMeritList.meritName"),
      flex: 1,
      minWidth: 180,
    },
    {
      field: "meritDescription",
      headerName: t("staffMeritList.meritDescription"),
      flex: 2,
      minWidth: 220,
    },
    {
      field: "displayMeritCategory",
      headerName: t("staffMeritList.meritCategory"),
      flex: 1,
      minWidth: 160,
    },
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
            title={t("basic.edit")}
            disabled={checkingUsage}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row)}
            title={t("basic.delete")}
            disabled={checkingUsage}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const blockColumnDefs = columns
    .filter((column) => column.field !== "actions")
    .map((column) => ({
      field: column.field,
      label: column.headerName,
    }));

  return (
    <Box>
      <PageHeader
        title={t("staffMeritList.title")}
        subtitle={t("staffMeritList.subtitle")}
        onHelpClick={() => setHelpOpen(true)}
        icon={MeritIcon}
        actionLabel={t("staffMeritList.addTitle")}
        onActionClick={() => setShowAdd(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("staffMeritList.helpTitle")}
        content={t("staffMeritList.helpBody")}
      />

      {onBack ? (
        <Box sx={{ mb: 2 }}>
          <Button variant="outlined" onClick={onBack}>
            {t("common.back")}
          </Button>
        </Box>
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
          placeholder={t("staffMeritList.searchPlaceholder")}
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

      {deleteError ? (
        <Box
          sx={{
            mb: 3,
            p: 2,
            backgroundColor: "var(--color-danger-bg)",
            color: "var(--color-danger-text)",
            border: "1px solid var(--color-danger-border)",
            borderRadius: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="body2">{deleteError}</Typography>
          <IconButton
            size="small"
            onClick={() => setDeleteError("")}
            sx={{ color: "var(--color-danger-text)" }}
          >
            x
          </IconButton>
        </Box>
      ) : null}

      {normalizedMerits.length === 0 ? (
        <EmptyState
          title={t("staffMeritList.noMerits")}
          description={
            search
              ? t("staffMeritList.noSearchResults")
              : t("staffMeritList.noMeritsDescription")
          }
          actionLabel={!search ? t("staffMeritList.addTitle") : null}
          onActionClick={!search ? () => setShowAdd(true) : null}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={normalizedMerits}
          renderItem={(item, index) => (
            <BlockListItem
              key={item.staffMeritId || index}
              columnDefs={blockColumnDefs}
              item={item}
              onEdit={checkingUsage ? undefined : handleEdit}
              onDelete={checkingUsage ? undefined : handleDelete}
              leadingMedia={{
                placeholder: (
                  <MeritIcon
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
            rows={normalizedMerits}
            columns={columns}
            getRowId={(row) => row.staffMeritId}
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
    </Box>
  );
};

export default StaffMeritList;
