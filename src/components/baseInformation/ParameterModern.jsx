import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Save as SaveIcon, Tune as TuneIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  LoadMoreBlockList,
} from "../common";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import HelpDialog from "../common/HelpDialog";

const ParameterModern = () => {
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [draftValues, setDraftValues] = useState({});
  const [savingByKey, setSavingByKey] = useState({});

  const isChangeable = (value) => Number(value ?? 0) === 1;

  useEffect(() => {
    let mounted = true;

    const loadParams = async () => {
      setLoading(true);
      setErrorMsg("");

      try {
        const response = await request("GET", "/api/params");
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];
        if (!mounted) return;

        setRows(
          list
            .filter((item) => isChangeable(item?.changeable))
            .map((item) => ({
              ...item,
              value_string: item?.value_string ?? "",
            })),
        );
      } catch (error) {
        if (!mounted) return;
        setRows([]);
        setErrorMsg(error?.message || t("parameter.loadFailed"));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadParams();

    return () => {
      mounted = false;
    };
  }, [t]);

  const getDisplayValue = (row) => {
    const key = row?.param_key;
    if (Object.prototype.hasOwnProperty.call(draftValues, key)) {
      return draftValues[key];
    }
    return row?.value_string ?? "";
  };

  const isChanged = (row) => {
    const key = row?.param_key;
    if (!Object.prototype.hasOwnProperty.call(draftValues, key)) {
      return false;
    }
    return String(draftValues[key] ?? "") !== String(row?.value_string ?? "");
  };

  const handleValueChange = (key, value) => {
    setDraftValues((prev) => ({ ...prev, [key]: value }));
    if (successMsg) setSuccessMsg("");
  };

  const handleUpdate = async (row) => {
    const key = row?.param_key;
    const nextValue = String(getDisplayValue(row) ?? "");

    setSavingByKey((prev) => ({ ...prev, [key]: true }));
    setErrorMsg("");

    try {
      await request("PUT", `/api/params/${encodeURIComponent(key)}`, {
        param_key: key,
        value_string: nextValue,
      });

      setRows((prev) =>
        prev.map((item) =>
          item.param_key === key ? { ...item, value_string: nextValue } : item,
        ),
      );
      setDraftValues((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      setSuccessMsg(t("parameter.updateSuccess", { key }));
    } catch (error) {
      setErrorMsg(error?.message || t("parameter.updateFailed"));
    } finally {
      setSavingByKey((prev) => ({ ...prev, [key]: false }));
    }
  };

  const normalizedRows = useMemo(
    () => rows.map((row) => ({ ...row, id: row.param_key })),
    [rows],
  );

  const columns = [
    {
      field: "param_key",
      headerName: t("parameter.keyLabel", "Key"),
      minWidth: 240,
      flex: 1,
      sortable: false,
      filterable: false,
    },
    {
      field: "value_string",
      headerName: t("parameter.valueLabel", "Value"),
      minWidth: 320,
      flex: 1.5,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const row = params.row;
        return (
          <TextField
            value={getDisplayValue(row)}
            onChange={(event) =>
              handleValueChange(row.param_key, event.target.value)
            }
            size="small"
            fullWidth
          />
        );
      },
    },
    {
      field: "actions",
      headerName: t("basic.actions", "Actions"),
      minWidth: 140,
      width: 160,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const row = params.row;
        const changed = isChanged(row);
        const saving = !!savingByKey[row.param_key];

        if (!changed) return null;

        return (
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveIcon />}
            onClick={() => handleUpdate(row)}
            disabled={saving}
          >
            {t("parameter.update", "Update")}
          </Button>
        );
      },
    },
  ];

  if (loading) {
    return (
      <LoadingState message={t("parameter.loading", "Loading parameters...")} />
    );
  }

  return (
    <Box>
      <PageHeader
        title={t("parameter.title", "Parameter")}
        subtitle={t("parameter.subtitle", "Maintain parameter values")}
        icon={TuneIcon}
        onHelpClick={() => setHelpOpen(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("parameter.helpTitle", "Parameter Help")}
        content={t(
          "parameter.helpBody",
          "Edit Value in each row. Update button appears when the value changes.",
        )}
      />

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}

      {normalizedRows.length === 0 ? (
        <EmptyState
          title={t("parameter.noData", "No parameters found")}
          description={t(
            "parameter.noDataDescription",
            "No parameter records are available.",
          )}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={normalizedRows}
          renderItem={(item) => {
            const changed = isChanged(item);
            const saving = !!savingByKey[item.param_key];

            return (
              <Paper
                key={item.param_key}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("parameter.keyLabel", "Key")}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.param_key}
                    </Typography>
                  </Box>

                  <TextField
                    label={t("parameter.valueLabel", "Value")}
                    value={getDisplayValue(item)}
                    onChange={(event) =>
                      handleValueChange(item.param_key, event.target.value)
                    }
                    size="small"
                    fullWidth
                  />

                  {changed && (
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<SaveIcon />}
                        onClick={() => handleUpdate(item)}
                        disabled={saving}
                      >
                        {t("parameter.update", "Update")}
                      </Button>
                    </Box>
                  )}
                </Stack>
              </Paper>
            );
          }}
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
            rows={normalizedRows}
            columns={columns}
            getRowId={(row) => row.param_key}
            disableRowSelectionOnClick
            autoHeight={false}
            rowHeight={64}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            sx={{
              border: 0,
              "& .MuiDataGrid-cell": {
                alignItems: "center",
                display: "flex",
              },
              "& .MuiDataGrid-cell:focus": { outline: "none" },
              "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "background.default",
                borderRadius: 0,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default ParameterModern;
