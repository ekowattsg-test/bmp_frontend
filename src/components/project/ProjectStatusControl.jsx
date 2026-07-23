import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  PlaylistAddCheck as PlaylistAddCheckIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { EmptyState, LoadingState, PageHeader } from "../common";

const PROJECT_FIELDS = [
  "projectCode",
  "projectName",
  "projectDescription",
  "customerId",
  "startDate",
  "endDate",
  "projectLocation",
  "status",
  "streamCount",
];

const buildProjectPayload = (project, nextStatus) => {
  const payload = {};
  PROJECT_FIELDS.forEach((field) => {
    payload[field] = project?.[field] ?? null;
  });
  payload.status = nextStatus;
  return payload;
};

const getStatusLabel = (status, t) => {
  switch (String(status || "").trim()) {
    case "PLAN":
      return t("project.statusPlan", "Planning");
    case "ACTIVE":
      return t("project.statusActive", "Active");
    case "COMPLETE":
      return t("project.statusComplete", "Completed");
    case "CLOSE":
      return t("project.statusClose", "Closed");
    default:
      return String(status || "").trim() || "-";
  }
};

const getStatusColor = (status) => {
  switch (String(status || "").trim()) {
    case "PLAN":
      return "info";
    case "ACTIVE":
      return "success";
    case "COMPLETE":
      return "primary";
    case "CLOSE":
      return "default";
    default:
      return "default";
  }
};

export default function ProjectStatusControl() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [updatingCode, setUpdatingCode] = useState("");
  const [projects, setProjects] = useState([]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await request("GET", "/api/projects");
      const rows = Array.isArray(res?.data) ? res.data : [];
      const openRows = rows
        .filter((row) => String(row?.status || "").trim() !== "COMPLETE")
        .sort((a, b) =>
          String(a?.projectCode || "").localeCompare(
            String(b?.projectCode || ""),
            undefined,
            { numeric: true },
          ),
        );
      setProjects(openRows);
    } catch {
      setProjects([]);
      setErrorMsg(
        t(
          "projectStatusControl.loadFailed",
          "Failed to load project status records.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const changeStatus = async (project, nextStatus) => {
    const projectCode = String(project?.projectCode || "").trim();
    if (!projectCode || !nextStatus) return;

    setUpdatingCode(projectCode);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = buildProjectPayload(project, nextStatus);
      await request(
        "PUT",
        `/api/projects/${encodeURIComponent(projectCode)}`,
        payload,
      );

      if (nextStatus === "COMPLETE") {
        setProjects((prev) =>
          prev.filter(
            (row) => String(row?.projectCode || "").trim() !== projectCode,
          ),
        );
      } else {
        setProjects((prev) =>
          prev.map((row) =>
            String(row?.projectCode || "").trim() === projectCode
              ? { ...row, status: nextStatus }
              : row,
          ),
        );
      }

      setSuccessMsg(
        t("projectStatusControl.updateSuccess", "Project status updated."),
      );
    } catch {
      setErrorMsg(
        t(
          "projectStatusControl.updateFailed",
          "Failed to update project status.",
        ),
      );
    } finally {
      setUpdatingCode("");
    }
  };

  const filteredProjects = useMemo(() => {
    const q = String(search || "")
      .trim()
      .toLowerCase();
    if (!q) return projects;
    return projects.filter((row) => {
      return (
        String(row?.projectCode || "")
          .toLowerCase()
          .includes(q) ||
        String(row?.projectName || "")
          .toLowerCase()
          .includes(q) ||
        String(row?.status || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [projects, search]);

  const columns = useMemo(
    () => [
      {
        field: "projectCode",
        headerName: t("project.projectCode", "Project Code"),
        width: 150,
      },
      {
        field: "projectName",
        headerName: t("project.projectName", "Project Name"),
        flex: 1,
        minWidth: 220,
      },
      {
        field: "status",
        headerName: t("project.status", "Status"),
        width: 140,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <Chip
            size="small"
            color={getStatusColor(params?.row?.status)}
            label={getStatusLabel(params?.row?.status, t)}
          />
        ),
      },
      {
        field: "actions",
        headerName: t("basic.actions", "Actions"),
        width: 260,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row;
          const status = String(row?.status || "").trim();
          const isUpdating =
            String(updatingCode || "") ===
            String(row?.projectCode || "").trim();

          if (status === "PLAN") {
            return (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={isUpdating}
                  onClick={() => changeStatus(row, "ACTIVE")}
                >
                  {t("projectStatusControl.active", "ACTIVE")}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  disabled={isUpdating}
                  onClick={() => changeStatus(row, "CLOSE")}
                >
                  {t("projectStatusControl.close", "CLOSE")}
                </Button>
              </Box>
            );
          }

          if (status === "ACTIVE") {
            return (
              <Button
                size="small"
                variant="contained"
                color="success"
                disabled={isUpdating}
                onClick={() => changeStatus(row, "COMPLETE")}
              >
                {t("projectStatusControl.complete", "COMPLETE")}
              </Button>
            );
          }

          return null;
        },
      },
    ],
    [t, updatingCode],
  );

  if (loading) {
    return (
      <LoadingState
        message={t(
          "projectStatusControl.loading",
          "Loading project status records...",
        )}
      />
    );
  }

  return (
    <Box>
      <PageHeader
        title={t("projectStatusControl.title", "Project Status Control")}
        subtitle={t(
          "projectStatusControl.subtitle",
          "Manage status transitions for non-completed projects",
        )}
        icon={PlaylistAddCheckIcon}
      />

      <Box
        sx={{
          mb: 2,
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(
            "projectStatusControl.searchPlaceholder",
            "Search project code or name",
          )}
          size="small"
          sx={{ minWidth: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <IconButton
          onClick={loadProjects}
          aria-label={t("projectStatusControl.reload", "Reload")}
        >
          <SearchIcon fontSize="small" />
        </IconButton>
      </Box>

      {successMsg ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      ) : null}
      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      ) : null}

      {filteredProjects.length === 0 ? (
        <EmptyState
          title={t("projectStatusControl.noData", "No non-completed projects")}
          description={
            search
              ? t(
                  "projectStatusControl.noSearchResults",
                  "No matching project records found.",
                )
              : t(
                  "projectStatusControl.noDataDescription",
                  "All projects are currently completed.",
                )
          }
        />
      ) : (
        <Box
          sx={{
            height: 620,
            width: "100%",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <DataGrid
            rows={filteredProjects}
            columns={columns}
            getRowId={(row) => row.projectCode}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            pageSizeOptions={[10, 25, 50]}
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
}
