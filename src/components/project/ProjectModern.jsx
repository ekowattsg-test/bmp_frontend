import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Assignment as AssignmentIcon,
  Visibility as ViewIcon,
  GpsFixed as GpsFixedIcon,
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
import HelpDialog from "../common/HelpDialog";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import ProjectAdd from "./ProjectAdd";
import ProjectEdit from "./ProjectEdit";
import ProjectView from "./ProjectView";

const ProjectModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [projectData, setProjectData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [gpsDialogOpen, setGpsDialogOpen] = useState(false);
  const [gpsTargetProject, setGpsTargetProject] = useState(null);
  const [gpsSaving, setGpsSaving] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();

  useEffect(() => {
    request("GET", "/api/customers")
      .then((res) => setCustomers(res.data || []))
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/projects")
      .then((response) => setProjectData(response.data || []))
      .catch(() => setProjectData([]))
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const customerMap = useMemo(() => {
    const map = {};
    customers.forEach((c) => {
      map[c.customerId] = c.customerName;
    });
    return map;
  }, [customers]);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelectedProject(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleEdit = useCallback((project) => {
    setSelectedProject(project);
    setAction("edit");
  }, []);

  const handleDetail = useCallback((project) => {
    setSelectedProject(project);
    setAction("detail");
  }, []);

  const handleViewCancel = (refreshNeeded) => {
    setAction("view");
    setSelectedProject(null);
    if (refreshNeeded) setRefresh(true);
  };

  const openGpsDialog = useCallback((project) => {
    setGpsTargetProject(project);
    setGpsError("");
    setGpsDialogOpen(true);
  }, []);

  const closeGpsDialog = useCallback(() => {
    if (gpsSaving) return;
    setGpsDialogOpen(false);
    setGpsTargetProject(null);
    setGpsError("");
  }, [gpsSaving]);

  const captureAndUpdateGps = useCallback(async () => {
    if (!gpsTargetProject?.projectCode) return;
    if (!navigator?.geolocation) {
      setGpsError(t("project.gpsNotSupported"));
      return;
    }

    setGpsSaving(true);
    setGpsError("");

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      const latitudeText = Number(latitude).toFixed(13);
      const longitudeText = Number(longitude).toFixed(13);
      const payload = {
        projectCode: gpsTargetProject.projectCode,
        projectName: gpsTargetProject.projectName,
        projectDescription: gpsTargetProject.projectDescription,
        customerId: gpsTargetProject.customerId,
        startDate: gpsTargetProject.startDate,
        endDate: gpsTargetProject.endDate,
        projectLocation: gpsTargetProject.projectLocation,
        latitude: latitudeText,
        longitude: longitudeText,
        status: gpsTargetProject.status,
        streamCount: gpsTargetProject.streamCount,
        briefingId: gpsTargetProject.briefingId,
      };

      await request(
        "PUT",
        `/api/projects/${gpsTargetProject.projectCode}`,
        payload,
      );

      setGpsDialogOpen(false);
      setGpsTargetProject(null);
      setRefresh(true);
    } catch {
      setGpsError(t("project.gpsUpdateFailed"));
    } finally {
      setGpsSaving(false);
    }
  }, [gpsTargetProject, t]);

  const enrichedProjects = useMemo(() => {
    const s = search.toLowerCase();
    return projectData
      .map((p) => ({
        ...p,
        customerName: customerMap[p.customerId] || "",
      }))
      .filter((p) => {
        if (!s) return true;
        return (
          p.projectCode?.toLowerCase().includes(s) ||
          p.projectName?.toLowerCase().includes(s) ||
          p.projectLocation?.toLowerCase().includes(s)
        );
      });
  }, [projectData, customerMap, search]);

  const columns = useMemo(
    () => [
      {
        field: "projectCode",
        headerName: t("project.projectCode"),
        width: 140,
      },
      {
        field: "projectName",
        headerName: t("project.projectName"),
        flex: 1,
        minWidth: 180,
      },
      {
        field: "customerName",
        headerName: t("project.customerId"),
        width: 160,
      },
      {
        field: "startDate",
        headerName: t("project.startDate"),
        width: 120,
      },
      {
        field: "endDate",
        headerName: t("project.endDate"),
        width: 120,
      },
      {
        field: "projectLocation",
        headerName: t("project.projectLocation"),
        width: 150,
      },
      {
        field: "status",
        headerName: t("project.status"),
        width: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const colorMap = {
            PLAN: "info",
            ACTIVE: "success",
            COMPLETE: "primary",
            CLOSE: "default",
          };
          const labelMap = {
            PLAN: t("project.statusPlan"),
            ACTIVE: t("project.statusActive"),
            COMPLETE: t("project.statusComplete"),
            CLOSE: t("project.statusClose"),
          };
          return (
            <Chip
              label={labelMap[params.value] || params.value}
              color={colorMap[params.value] || "default"}
              size="small"
            />
          );
        },
      },
      {
        field: "actions",
        headerName: t("basic.actions"),
        width: 150,
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
              color="info"
              onClick={() => handleDetail(params.row)}
              title={t("project.detail")}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleEdit(params.row)}
              title={t("basic.edit")}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="secondary"
              onClick={() => openGpsDialog(params.row)}
              title={t("project.captureGps")}
            >
              <GpsFixedIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ],
    [t, handleEdit, handleDetail, openGpsDialog],
  );

  if (loading) return <LoadingState message={t("project.loading")} />;

  if (action === "edit" && selectedProject) {
    return (
      <ProjectEdit
        project={selectedProject}
        customers={customers}
        onCancel={handleEditCancel}
      />
    );
  }

  if (showAdd) {
    return <ProjectAdd customers={customers} onCancel={handleAddCancel} />;
  }

  const blockColumnDefs = columns
    .filter((c) => c.field !== "actions")
    .map((c) => ({ field: c.field, label: c.headerName }));

  return (
    <Box>
      <PageHeader
        title={t("project.title")}
        subtitle={t("project.subtitle")}
        icon={AssignmentIcon}
        actionLabel={t("project.addTitle")}
        onActionClick={() => setShowAdd(true)}
        onHelpClick={() => setHelpOpen(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("project.helpTitle")}
        content={t("project.helpBody")}
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
          placeholder={t("project.searchPlaceholder")}
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

      {enrichedProjects.length === 0 ? (
        <EmptyState
          title={t("project.noProjects")}
          description={
            search
              ? t("project.noSearchResults")
              : t("project.noProjectsDescription")
          }
          actionLabel={!search ? t("project.addTitle") : null}
          onActionClick={!search ? () => setShowAdd(true) : null}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={enrichedProjects}
          renderItem={(item, idx) => (
            <BlockListItem
              key={item.projectCode || idx}
              columnDefs={blockColumnDefs}
              item={item}
              onView={handleDetail}
              onEdit={handleEdit}
              enableActions
              extraContent={
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<GpsFixedIcon fontSize="small" />}
                  onClick={(event) => {
                    event.stopPropagation();
                    openGpsDialog(item);
                  }}
                >
                  {t("project.captureGps")}
                </Button>
              }
              leadingMedia={{
                placeholder: (
                  <AssignmentIcon
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
            rows={enrichedProjects}
            columns={columns}
            getRowId={(row) => row.projectCode}
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
              "& .MuiDataGrid-footerContainer": {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                minHeight: "52px",
                gap: "12px",
              },
              "& .MuiTablePagination-root": {
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "16px",
              },
              "& .MuiTablePagination-displayedRows": {
                margin: 0,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
              },
              "& .MuiTablePagination-selectLabel": {
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              },
              "& .MuiTablePagination-select": {
                display: "flex",
                alignItems: "center",
              },
              "& .MuiTablePagination-actions": {
                display: "flex",
                alignItems: "center",
                marginLeft: 0,
              },
            }}
          />
        </Box>
      )}

      {action === "detail" && selectedProject && (
        <ProjectView
          project={selectedProject}
          customerName={
            selectedProject.customerName ||
            customerMap[selectedProject.customerId] ||
            t("project.noCustomer")
          }
          onClose={() => handleViewCancel(false)}
        />
      )}

      <Dialog
        open={gpsDialogOpen}
        onClose={closeGpsDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t("project.gpsDialogTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {gpsTargetProject?.projectName || gpsTargetProject?.projectCode}
          </Typography>
          <Typography variant="body2">{t("project.gpsDialogBody")}</Typography>
          {gpsError ? (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {gpsError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeGpsDialog} disabled={gpsSaving}>
            {t("basic.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={captureAndUpdateGps}
            disabled={gpsSaving}
            startIcon={<GpsFixedIcon fontSize="small" />}
          >
            {gpsSaving ? t("basic.loading") : t("project.captureGps")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectModern;
