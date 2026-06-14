import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SearchIcon from "@mui/icons-material/Search";
import { DataGrid } from "@mui/x-data-grid";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { request } from "../../helpers/axios_helper";
import {
  BlockListItem,
  EmptyState,
  LoadMoreBlockList,
  LoadingState,
  PageHeader,
} from "../common";
import HelpDialog from "../common/HelpDialog";
import { AuthContext } from "../../context/authContext";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";

const ACTIVE_PROJECT_STATUSES = new Set(["PLAN", "ACTIVE"]);

const toRoleCode = (row) => {
  const raw = String(
    row?.projectRole || row?.role || row?.roleName || row?.leaderRole || "",
  )
    .trim()
    .toUpperCase();

  if (raw === "M" || raw === "L" || raw === "C") return raw;
  if (raw === "MANAGER") return "M";
  if (raw === "LEADER") return "L";
  if (raw === "CO-LEADER" || raw === "COLEADER") return "C";
  return "";
};

const getLeaderStaffId = (row) =>
  row?.projectLeaderStaffId ||
  row?.staffId ||
  row?.leaderId ||
  row?.staffID ||
  "";

const normalizeMobile = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .trim();

const mobilesMatch = (a, b) => {
  const left = normalizeMobile(a);
  const right = normalizeMobile(b);

  if (!left || !right) return false;
  if (left === right) return true;

  // Handle country-code differences (e.g. +65xxxxxxxx vs xxxxxxxx).
  return (
    (left.length >= 8 && right.length >= 8 && left.endsWith(right)) ||
    (left.length >= 8 && right.length >= 8 && right.endsWith(left))
  );
};

const isLeaderAssignmentActive = (row) =>
  !row?.roleEndDate && String(row?.active ?? 1) !== "0";

const isActiveProject = (project) =>
  ACTIVE_PROJECT_STATUSES.has(String(project?.status || "").toUpperCase());

const fetchAllProjectLeaders = async (projects) => {
  try {
    const res = await request("GET", "/api/projectleaders");
    return Array.isArray(res?.data) ? res.data : [];
  } catch {
    // Fallback for deployments that only expose project-scoped endpoint.
    const leaderChunks = await Promise.all(
      (projects || []).map((project) =>
        request("GET", `/api/projectleaders/project/${project.projectCode}`)
          .then((res) => (Array.isArray(res?.data) ? res.data : []))
          .catch(() => []),
      ),
    );

    return leaderChunks.flat();
  }
};

const ProjectPlanningModern = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userInfo } = useContext(AuthContext);
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const [helpOpen, setHelpOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedProjectCode, setSelectedProjectCode] = useState("");
  const [eligibleProjects, setEligibleProjects] = useState([]);

  const selectedProject = useMemo(
    () =>
      eligibleProjects.find(
        (project) =>
          String(project?.projectCode || "") ===
          String(selectedProjectCode || ""),
      ) || null,
    [eligibleProjects, selectedProjectCode],
  );

  const currentUserMobile =
    userInfo?.mobileNumber || userInfo?.mobile || userInfo?.phoneNumber || "";

  useEffect(() => {
    let mounted = true;

    const loadPlanningProjects = async () => {
      setLoading(true);
      setError("");

      try {
        const [projectsRes, staffRes] = await Promise.all([
          request("GET", "/api/projects"),
          request("GET", "/api/staffs"),
        ]);

        const projects = Array.isArray(projectsRes?.data)
          ? projectsRes.data
          : [];
        const activeProjects = projects.filter(isActiveProject);

        const staffRows = Array.isArray(staffRes?.data) ? staffRes.data : [];
        const matchedStaffIds = new Set(
          staffRows
            .filter((row) => mobilesMatch(row?.mobileNumber, currentUserMobile))
            .map((row) => String(row?.staffId || "").trim())
            .filter(Boolean),
        );

        const allLeaders = await fetchAllProjectLeaders(activeProjects);
        const leaderProjectCodes = new Set(
          allLeaders
            .filter(isLeaderAssignmentActive)
            .filter((row) => ["M", "L", "C"].includes(toRoleCode(row)))
            .filter((row) =>
              matchedStaffIds.has(String(getLeaderStaffId(row) || "").trim()),
            )
            .map((row) => String(row?.projectCode || "").trim())
            .filter(Boolean),
        );

        const leaderProjects = activeProjects.filter((project) =>
          leaderProjectCodes.has(String(project?.projectCode || "").trim()),
        );

        if (!mounted) return;
        setEligibleProjects(leaderProjects);
      } catch {
        if (!mounted) return;
        setError(
          t(
            "projectPlanning.loadFailed",
            "Failed to load projects for planning.",
          ),
        );
        setEligibleProjects([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    loadPlanningProjects();

    return () => {
      mounted = false;
    };
  }, [currentUserMobile, t]);

  const filteredProjects = useMemo(() => {
    const q = String(search || "")
      .trim()
      .toLowerCase();
    if (!q) return eligibleProjects;

    return eligibleProjects.filter((project) =>
      [
        project.projectCode,
        project.projectName,
        project.projectLocation,
        project.status,
      ]
        .map((item) => String(item || "").toLowerCase())
        .some((item) => item.includes(q)),
    );
  }, [eligibleProjects, search]);

  const blockColumnDefs = [
    { field: "projectCode", label: t("project.projectCode", "Project Code") },
    { field: "projectName", label: t("project.projectName", "Project Name") },
    {
      field: "projectLocation",
      label: t("project.projectLocation", "Location"),
    },
    { field: "status", label: t("project.status", "Status") },
  ];

  const columns = [
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
      field: "projectLocation",
      headerName: t("project.projectLocation", "Location"),
      width: 180,
    },
    {
      field: "status",
      headerName: t("project.status", "Status"),
      width: 120,
      renderCell: (params) => (
        <Chip
          label={
            {
              PLAN: t("project.statusPlan", "Planning"),
              ACTIVE: t("project.statusActive", "Active"),
            }[String(params.value || "").toUpperCase()] || params.value
          }
          size="small"
          color={
            String(params.value || "").toUpperCase() === "ACTIVE"
              ? "success"
              : "info"
          }
        />
      ),
    },
    {
      field: "actions",
      headerName: t("basic.actions", "Actions"),
      width: 170,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          onClick={(event) => {
            event.stopPropagation();
            openWorkbench(params.row);
          }}
        >
          {t("projectPlanning.openWorkbench", "Open Workbench")}
        </Button>
      ),
    },
  ];

  const openWorkbench = (project) => {
    const projectCode = String(project?.projectCode || "").trim();
    if (!projectCode) return;

    navigate(`/projectplanning/${projectCode}/workbench`, {
      state: { project },
    });
  };

  if (loading) {
    return (
      <Box>
        <PageHeader
          title={t("projectPlanning.title")}
          subtitle={t("projectPlanning.subtitle")}
          icon={AccountTreeIcon}
          onHelpClick={() => setHelpOpen(true)}
        />

        <HelpDialog
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          title={t("projectPlanning.helpTitle")}
          content={t("projectPlanning.helpBody")}
        />

        <LoadingState
          message={t(
            "projectPlanning.loadingEligibleProjects",
            "Loading eligible projects...",
          )}
        />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={t("projectPlanning.title")}
        subtitle={t("projectPlanning.subtitle")}
        icon={AccountTreeIcon}
        onHelpClick={() => setHelpOpen(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("projectPlanning.helpTitle")}
        content={t("projectPlanning.helpBody")}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!currentUserMobile && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t(
            "projectPlanning.mobileMissing",
            "Your user profile does not have a mobile number. Please update it before using project planning.",
          )}
        </Alert>
      )}

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
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t(
            "projectPlanning.searchPlaceholder",
            "Search project code, name, location...",
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
      </Box>

      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={AccountTreeIcon}
          title={t(
            "projectPlanning.noEligibleProjects",
            "No eligible active projects",
          )}
          description={
            search
              ? t(
                  "projectPlanning.noSearchResults",
                  "No projects match your search.",
                )
              : t(
                  "projectPlanning.noLeaderAssignments",
                  "You are not assigned as Manager, Leader, or Co-Leader for any active project.",
                )
          }
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={filteredProjects}
          renderItem={(item, idx) => (
            <Box key={item.projectCode || idx} sx={{ mb: 1.5 }}>
              <Box
                onClick={() =>
                  setSelectedProjectCode(String(item.projectCode || ""))
                }
                sx={{ cursor: "pointer" }}
              >
                <BlockListItem columnDefs={blockColumnDefs} item={item} t={t} />
              </Box>
              <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => openWorkbench(item)}
                >
                  {t("projectPlanning.openWorkbench", "Open Workbench")}
                </Button>
              </Box>
            </Box>
          )}
        />
      ) : (
        <Box
          sx={{
            height: 560,
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
            disableRowSelectionOnClick
            onRowClick={(params) =>
              setSelectedProjectCode(String(params?.row?.projectCode || ""))
            }
            sx={{
              border: 0,
              "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
              "& .MuiDataGrid-cell:focus": { outline: "none" },
            }}
          />
        </Box>
      )}

      {selectedProjectCode && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 1,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t("projectPlanning.selectedProject", "Selected project")}:{" "}
            <strong>{selectedProjectCode}</strong>
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => openWorkbench(selectedProject)}
          >
            {t("projectPlanning.openWorkbench", "Open Workbench")}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ProjectPlanningModern;
