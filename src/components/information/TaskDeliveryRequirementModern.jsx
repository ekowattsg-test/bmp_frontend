import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  LocalShipping as LocalShippingIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { request } from "../../helpers/axios_helper";
import { EmptyState, LoadingState, PageHeader } from "../common";

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const statusColor = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "generated":
      return "success";
    case "selected":
      return "info";
    case "extracted":
      return "default";
    default:
      return "default";
  }
};

const toISODate = (date) => {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getNextMonday = (fromDate = new Date()) => {
  const date = new Date(fromDate);
  const day = date.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  date.setDate(date.getDate() + diff);
  return toISODate(date);
};

const TaskDeliveryRequirementModern = () => {
  const { t } = useTranslation();

  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [weekStartDate, setWeekStartDate] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [doResult, setDoResult] = useState(null);

  useEffect(() => {
    const nextMonday = getNextMonday();
    setWeekStartDate(nextMonday);
  }, []);

  const loadRequirements = useCallback(
    async (weekDate) => {
      if (!weekDate) return;
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");
      setDoResult(null);
      try {
        const response = await request(
          "GET",
          `/api/taskdeliveryrequirements/week/${encodeURIComponent(weekDate)}`,
        );
        const data = Array.isArray(response?.data) ? response.data : [];
        setRequirements(data);
      } catch (error) {
        setErrorMsg(
          String(error?.response?.data?.message || "").trim() ||
            t("taskDeliveryRequirement.loadFailed"),
        );
        setRequirements([]);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (weekStartDate) {
      loadRequirements(weekStartDate);
    }
  }, [weekStartDate, loadRequirements]);

  const normalizedRows = useMemo(() => {
    return requirements
      .filter((row) => row?.taskDeliveryRequirementId != null)
      .map((row) => ({
        ...row,
        id: row.taskDeliveryRequirementId,
        displayProduct:
          `${row.productCode || ""} - ${row.productName || ""}`.replace(
            /^ - /,
            "",
          ),
        displayStatus: row.status || "EXTRACTED",
        deliveryDate: row.deliveryDate || row.weekStartDate || weekStartDate,
      }));
  }, [requirements, weekStartDate]);

  const filteredRows = useMemo(() => {
    if (!search) return normalizedRows;
    const searchLower = search.toLowerCase();
    return normalizedRows.filter((row) => {
      return (
        String(row.projectCode || "")
          .toLowerCase()
          .includes(searchLower) ||
        String(row.activityName || "")
          .toLowerCase()
          .includes(searchLower) ||
        String(row.productName || "")
          .toLowerCase()
          .includes(searchLower) ||
        String(row.productCode || "")
          .toLowerCase()
          .includes(searchLower) ||
        String(row.inventoryType || "")
          .toLowerCase()
          .includes(searchLower)
      );
    });
  }, [normalizedRows, search]);

  const selectedRows = useMemo(() => {
    return normalizedRows.filter(
      (row) =>
        Number(row.selected) === 1 &&
        String(row.status || "").toLowerCase() !== "generated",
    );
  }, [normalizedRows]);

  const selectedCount = selectedRows.length;

  const validateDeliveryQuantity = (row, value) => {
    const qty = safeNum(value);
    if (qty === null) return t("taskDeliveryRequirement.validation.number");
    if (qty < 0) return t("taskDeliveryRequirement.validation.min");
    const required = safeNum(row.requiredQuantity);
    if (required !== null && qty > required) {
      return t("taskDeliveryRequirement.validation.exceedsRequired");
    }
    const available = safeNum(row.availableQuantity);
    if (available !== null && qty > available) {
      return t("taskDeliveryRequirement.validation.exceedsAvailable");
    }
    return "";
  };

  const persistRowUpdate = async (id, updates) => {
    const row = requirements.find((r) => r.taskDeliveryRequirementId === id);
    if (!row) return;
    const payload = { ...row, ...updates };
    try {
      await request("PUT", `/api/taskdeliveryrequirements/${id}`, payload);
    } catch (error) {
      const message =
        String(error?.response?.data?.message || "").trim() ||
        t("taskDeliveryRequirement.saveFailed");
      setErrorMsg(message);
      throw error;
    }
  };

  const handleDeliveryQuantityChange = (id, value) => {
    setRequirements((prev) =>
      prev.map((row) =>
        row.taskDeliveryRequirementId === id
          ? { ...row, deliveryQuantity: value }
          : row,
      ),
    );
  };

  const handleDeliveryQuantityBlur = async (id) => {
    const row = requirements.find((r) => r.taskDeliveryRequirementId === id);
    if (!row) return;
    const error = validateDeliveryQuantity(row, row.deliveryQuantity);
    if (error) {
      setErrorMsg(error);
      setRequirements((prev) =>
        prev.map((r) =>
          r.taskDeliveryRequirementId === id
            ? { ...r, deliveryQuantity: row.requiredQuantity }
            : r,
        ),
      );
      return;
    }
    await persistRowUpdate(id, {
      deliveryQuantity: Number(row.deliveryQuantity),
    });
  };

  const handleDeliveryDateChange = (id, value) => {
    setRequirements((prev) =>
      prev.map((row) =>
        row.taskDeliveryRequirementId === id
          ? { ...row, deliveryDate: value }
          : row,
      ),
    );
  };

  const handleDeliveryDateBlur = async (id) => {
    const row = requirements.find((r) => r.taskDeliveryRequirementId === id);
    if (!row) return;
    await persistRowUpdate(id, { deliveryDate: row.deliveryDate });
  };

  const handleToggleSelected = (id) => {
    setRequirements((prev) =>
      prev.map((row) => {
        if (row.taskDeliveryRequirementId !== id) return row;
        const status = String(row.status || "").toLowerCase();
        if (status === "generated") return row;
        const nextSelected = Number(row.selected) === 1 ? 0 : 1;
        return {
          ...row,
          selected: nextSelected,
          status: nextSelected ? "SELECTED" : "EXTRACTED",
        };
      }),
    );
  };

  const handleGenerateDo = async () => {
    if (saving || selectedCount === 0) return;
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    setDoResult(null);
    try {
      const payload = selectedRows.map((row) => ({
        taskDeliveryRequirementId: row.taskDeliveryRequirementId,
        deliveryQuantity: Number(row.deliveryQuantity),
        deliveryDate: row.deliveryDate,
        selected: 1,
      }));
      const response = await request(
        "POST",
        "/api/taskdeliveryrequirements/generate-do",
        payload,
      );
      setDoResult(response?.data || null);
      setSuccessMsg(t("taskDeliveryRequirement.generateDoSuccess"));
      await loadRequirements(weekStartDate);
    } catch (error) {
      setErrorMsg(
        String(error?.response?.data?.message || "").trim() ||
          t("taskDeliveryRequirement.generateDoFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "selected",
        headerName: t("taskDeliveryRequirement.cols.selected"),
        width: 70,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const status = String(params.row.status || "").toLowerCase();
          const disabled = status === "generated";
          return (
            <Checkbox
              size="small"
              checked={Number(params.row.selected) === 1}
              disabled={disabled}
              onChange={() =>
                handleToggleSelected(params.row.taskDeliveryRequirementId)
              }
              sx={{ p: 0 }}
            />
          );
        },
      },
      {
        field: "projectCode",
        headerName: t("taskDeliveryRequirement.cols.projectCode"),
        width: 120,
      },
      {
        field: "activityName",
        headerName: t("taskDeliveryRequirement.cols.activityName"),
        width: 180,
      },
      {
        field: "inventoryType",
        headerName: t("taskDeliveryRequirement.cols.inventoryType"),
        width: 100,
      },
      {
        field: "displayProduct",
        headerName: t("taskDeliveryRequirement.cols.product"),
        flex: 1,
        minWidth: 220,
      },
      {
        field: "requiredQuantity",
        headerName: t("taskDeliveryRequirement.cols.requiredQuantity"),
        width: 120,
        align: "right",
        headerAlign: "right",
      },
      {
        field: "availableQuantity",
        headerName: t("taskDeliveryRequirement.cols.availableQuantity"),
        width: 120,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const available = safeNum(params.value);
          const required = safeNum(params.row.requiredQuantity);
          const low =
            available !== null && required !== null && available < required;
          return (
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                color: low ? "error.main" : "success.main",
                fontWeight: low ? 600 : 400,
              }}
            >
              {params.value ?? "-"}
            </Box>
          );
        },
      },
      {
        field: "deliveryQuantity",
        headerName: t("taskDeliveryRequirement.cols.deliveryQuantity"),
        width: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const status = String(params.row.status || "").toLowerCase();
          const readOnly = status === "generated";
          return (
            <TextField
              type="number"
              size="small"
              value={params.row.deliveryQuantity ?? ""}
              disabled={readOnly}
              onChange={(e) =>
                handleDeliveryQuantityChange(
                  params.row.taskDeliveryRequirementId,
                  e.target.value,
                )
              }
              onBlur={() =>
                handleDeliveryQuantityBlur(params.row.taskDeliveryRequirementId)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.target.blur();
                }
              }}
              inputProps={{
                min: 0,
                style: { textAlign: "right" },
              }}
              sx={{ width: "100%" }}
            />
          );
        },
      },
      {
        field: "deliveryDate",
        headerName: t("taskDeliveryRequirement.cols.deliveryDate"),
        width: 150,
        renderCell: (params) => {
          const status = String(params.row.status || "").toLowerCase();
          const readOnly = status === "generated";
          return (
            <TextField
              type="date"
              size="small"
              value={toISODate(params.row.deliveryDate)}
              disabled={readOnly}
              onChange={(e) =>
                handleDeliveryDateChange(
                  params.row.taskDeliveryRequirementId,
                  e.target.value,
                )
              }
              onBlur={() =>
                handleDeliveryDateBlur(params.row.taskDeliveryRequirementId)
              }
              inputProps={{
                style: { textAlign: "center" },
              }}
              sx={{ width: "100%" }}
            />
          );
        },
      },
      {
        field: "displayStatus",
        headerName: t("taskDeliveryRequirement.cols.status"),
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value}
            color={statusColor(params.value)}
          />
        ),
      },
      {
        field: "deliveryOrderId",
        headerName: t("taskDeliveryRequirement.cols.deliveryOrderId"),
        width: 100,
        renderCell: (params) => {
          const doId = params.value;
          if (!doId) return "-";
          return (
            <Link component={RouterLink} to="/deliveryorder" underline="hover">
              {doId}
            </Link>
          );
        },
      },
    ],
    [t],
  );

  if (loading && requirements.length === 0) {
    return <LoadingState message={t("taskDeliveryRequirement.loading")} />;
  }

  return (
    <Box>
      <PageHeader
        title={t("taskDeliveryRequirement.title")}
        subtitle={t("taskDeliveryRequirement.subtitle")}
        icon={LocalShippingIcon}
      />

      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      ) : null}

      {successMsg ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
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
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("taskDeliveryRequirement.searchPlaceholder")}
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
        <Typography variant="body2" color="text.secondary">
          {t("taskDeliveryRequirement.weekLabel", {
            date: weekStartDate,
          })}
        </Typography>
      </Box>

      {filteredRows.length === 0 && !loading ? (
        <EmptyState
          title={t("taskDeliveryRequirement.noData")}
          description={
            search
              ? t("taskDeliveryRequirement.noSearchResults")
              : t("taskDeliveryRequirement.noDataDescription")
          }
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
            getRowId={(row) => row.taskDeliveryRequirementId}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[5, 10, 25, 50]}
            disableRowSelectionOnClick
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

      {selectedCount > 0 && (
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            color="success"
            onClick={handleGenerateDo}
            disabled={saving}
            startIcon={
              saving ? <CircularProgress size={18} color="inherit" /> : null
            }
          >
            {saving
              ? t("taskDeliveryRequirement.generatingDo")
              : t("taskDeliveryRequirement.generateDo", {
                  count: selectedCount,
                })}
          </Button>
        </Box>
      )}

      {doResult !== null && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            border: "1px solid",
            borderColor: "success.light",
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            {t("taskDeliveryRequirement.doResultTitle", "DO Generation Result")}
          </Typography>
          {typeof doResult === "object" && !Array.isArray(doResult) ? (
            Object.entries(doResult).map(([key, val]) => (
              <Box key={key} sx={{ display: "flex", gap: 2, mb: 0.5 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ minWidth: 180, flexShrink: 0 }}
                >
                  {key}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {Array.isArray(val) ? val.join(", ") : String(val ?? "-")}
                </Typography>
              </Box>
            ))
          ) : Array.isArray(doResult) ? (
            doResult.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t(
                  "taskDeliveryRequirement.doResultEmpty",
                  "No delivery orders were generated.",
                )}
              </Typography>
            ) : (
              <Typography variant="body2" fontWeight={600}>
                {String(doResult.join(", "))}
              </Typography>
            )
          ) : (
            <Typography variant="body2">{String(doResult)}</Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default TaskDeliveryRequirementModern;
