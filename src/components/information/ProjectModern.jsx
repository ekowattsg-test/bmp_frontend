import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
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
import ProjectDelete from "./ProjectDelete";

const ProjectModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [projectData, setProjectData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
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

  const handleDelete = useCallback((project) => {
    setSelectedProject(project);
    setDeleteMode(true);
  }, []);

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
        field: "mobileNumber",
        headerName: t("project.mobileNumber"),
        width: 130,
      },
      {
        field: "streamCount",
        headerName: t("project.streamCount"),
        width: 90,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "active",
        headerName: t("project.active"),
        width: 90,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <Chip
            label={params.value ? t("basic.true") : t("basic.false")}
            color={params.value ? "success" : "default"}
            size="small"
          />
        ),
      },
      {
        field: "actions",
        headerName: t("basic.actions"),
        width: 100,
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
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDelete(params.row)}
              title={t("basic.delete")}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ],
    [t, handleEdit, handleDelete],
  );

  if (loading) return <LoadingState message={t("project.loading")} />;

  if (deleteMode && selectedProject) {
    return (
      <ProjectDelete
        project={selectedProject}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedProject(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelectedProject(null);
          setRefresh(true);
        }}
      />
    );
  }

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
              onEdit={handleEdit}
              onDelete={handleDelete}
              enableActions
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
    </Box>
  );
};

export default ProjectModern;
