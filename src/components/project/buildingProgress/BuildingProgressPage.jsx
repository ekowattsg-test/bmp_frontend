import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import ApartmentIcon from "@mui/icons-material/Apartment";
import SettingsIcon from "@mui/icons-material/Settings";
import { useTranslation } from "react-i18next";
import { request } from "../../../helpers/axios_helper";
import { PageHeader } from "../../common";
import { AuthContext } from "../../../context/authContext";
import { EmptyState } from "../../common";
import StructureSetupPage from "./StructureSetupPage";
import BuildingProgress3D from "./BuildingProgress3D";
import UnitDetailDialog from "./UnitDetailDialog";
import useBuildingProgress from "./useBuildingProgress";

const normalizeMobile = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .trim();

const mobilesMatch = (a, b) => {
  const left = normalizeMobile(a);
  const right = normalizeMobile(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return (
    (left.length >= 8 && right.length >= 8 && left.endsWith(right)) ||
    (left.length >= 8 && right.length >= 8 && right.endsWith(left))
  );
};

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

const isLeaderAssignmentActive = (row) =>
  !row?.roleEndDate && String(row?.active ?? 1) !== "0";

const BuildingProgressPage = () => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
  const userLevel = Number(userInfo?.userLevel ?? userInfo?.level ?? 0);
  const currentUserMobile =
    userInfo?.mobileNumber || userInfo?.mobile || userInfo?.phoneNumber || "";

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProjectCode, setSelectedProjectCode] = useState("");
  const [detailContext, setDetailContext] = useState(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [canManageStructure, setCanManageStructure] = useState(false);
  const [projectStreams, setProjectStreams] = useState([]);
  const {
    data: progressData,
    loading: progressLoading,
    error: progressError,
    refresh: refreshProgress,
  } = useBuildingProgress(selectedProjectCode);

  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await request("GET", "/api/projects");
        const rows = Array.isArray(res?.data) ? res.data : [];
        const sorted = [...rows].sort((a, b) =>
          String(a?.projectCode || "").localeCompare(
            String(b?.projectCode || ""),
            undefined,
            { numeric: true },
          ),
        );
        if (!mounted) return;
        setProjects(sorted);
        setSelectedProjectCode(String(sorted[0]?.projectCode || ""));
      } catch {
        if (!mounted) return;
        setError(
          t("buildingProgress.loadProjectsFailed", "Failed to load projects."),
        );
        setProjects([]);
        setSelectedProjectCode("");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    loadProjects();

    return () => {
      mounted = false;
    };
  }, [t]);

  const selectedProject = useMemo(
    () =>
      projects.find(
        (project) =>
          String(project?.projectCode || "") ===
          String(selectedProjectCode || ""),
      ) || null,
    [projects, selectedProjectCode],
  );

  useEffect(() => {
    const normalizedCode = String(selectedProjectCode || "").trim();
    if (!normalizedCode) {
      setCanManageStructure(false);
      setProjectStreams([]);
      return undefined;
    }

    let mounted = true;

    const checkPermission = async () => {
      let streamRows = [];

      try {
        const streamsRes = await request(
          "GET",
          `/api/projectstreams/project/${encodeURIComponent(normalizedCode)}`,
        ).catch(() => ({ data: [] }));
        streamRows = Array.isArray(streamsRes?.data) ? streamsRes.data : [];
      } catch {
        streamRows = [];
      }

      if (!mounted) return;
      setProjectStreams(streamRows);

      if (userLevel >= 5) {
        setCanManageStructure(true);
        return;
      }

      try {
        const [staffRes, leadersRes] = await Promise.all([
          request("GET", "/api/staffs").catch(() => ({ data: [] })),
          request(
            "GET",
            `/api/projectleaders/project/${encodeURIComponent(normalizedCode)}`,
          ).catch(() => ({ data: [] })),
        ]);

        const staffRows = Array.isArray(staffRes?.data) ? staffRes.data : [];
        const leaderRows = Array.isArray(leadersRes?.data)
          ? leadersRes.data
          : [];

        const matchedStaffIds = new Set(
          staffRows
            .filter((row) => mobilesMatch(row?.mobileNumber, currentUserMobile))
            .map((row) => String(row?.staffId || "").trim())
            .filter(Boolean),
        );

        const isLeader = leaderRows
          .filter(isLeaderAssignmentActive)
          .filter((row) => ["M", "L", "C"].includes(toRoleCode(row)))
          .some((row) =>
            matchedStaffIds.has(String(getLeaderStaffId(row) || "").trim()),
          );

        if (!mounted) return;
        setCanManageStructure(isLeader);
      } catch {
        if (!mounted) return;
        setCanManageStructure(false);
      }
    };

    checkPermission();

    return () => {
      mounted = false;
    };
  }, [selectedProjectCode, userLevel, currentUserMobile]);

  const handleUnitClick = (unit, storey, block, stack) => {
    setDetailContext({ unit, storey, block, stack });
  };

  const handleCloseDetail = () => setDetailContext(null);

  const blocks = progressData?.blocks || [];

  const streamHierarchyConflicts = useMemo(() => {
    if (!projectStreams.length || !blocks.length) return [];

    const streamById = new Map(
      projectStreams.map((s) => [String(s?.projectStreamId || ""), s]),
    );

    const childrenByNumber = new Map();
    projectStreams.forEach((stream) => {
      const number = String(stream?.streamNumber ?? "").trim();
      const parent = String(stream?.parentStreamNumber ?? "").trim();
      if (!parent || !number) return;
      if (!childrenByNumber.has(parent))
        childrenByNumber.set(parent, new Set());
      childrenByNumber.get(parent).add(number);
    });

    const collectDescendantNumbers = (number, seen = new Set()) => {
      const children = childrenByNumber.get(number);
      if (!children) return seen;
      children.forEach((child) => {
        if (seen.has(child)) return;
        seen.add(child);
        collectDescendantNumbers(child, seen);
      });
      return seen;
    };

    const unitStreamPairs = [];
    blocks.forEach((block) => {
      (block?.storeys || []).forEach((storey) => {
        (storey?.units || []).forEach((unit) => {
          const streamId = String(unit?.projectStreamId || "");
          const stream = streamById.get(streamId);
          if (!stream) return;
          const number = String(stream?.streamNumber ?? "").trim();
          if (!number) return;
          unitStreamPairs.push({
            unit,
            block,
            storey,
            stream,
            number,
            descendants: collectDescendantNumbers(number),
          });
        });
      });
    });

    const conflictingUnitIds = new Set();
    const conflicts = [];
    for (let i = 0; i < unitStreamPairs.length; i += 1) {
      const a = unitStreamPairs[i];
      if (conflictingUnitIds.has(a.unit?.projectUnitId)) continue;
      for (let j = i + 1; j < unitStreamPairs.length; j += 1) {
        const b = unitStreamPairs[j];
        if (conflictingUnitIds.has(b.unit?.projectUnitId)) continue;
        const aIsAncestorOfB =
          a.number === b.number || b.descendants.has(a.number);
        const bIsAncestorOfA = a.descendants.has(b.number);
        if (aIsAncestorOfB || bIsAncestorOfA) {
          conflicts.push({ a, b });
          conflictingUnitIds.add(a.unit?.projectUnitId);
          conflictingUnitIds.add(b.unit?.projectUnitId);
        }
      }
    }

    return { conflicts, conflictingUnitIds };
  }, [blocks, projectStreams]);

  const filteredBlocks = useMemo(() => {
    const conflictingIds = streamHierarchyConflicts?.conflictingUnitIds;
    if (!conflictingIds || conflictingIds.size === 0) return blocks;
    return blocks.map((block) => ({
      ...block,
      storeys: (block?.storeys || []).map((storey) => ({
        ...storey,
        units: (storey?.units || []).filter(
          (unit) => !conflictingIds.has(unit?.projectUnitId),
        ),
      })),
    }));
  }, [blocks, streamHierarchyConflicts]);

  return (
    <Box>
      <PageHeader
        title={t("buildingProgress.title", "Building Progress")}
        subtitle={t(
          "buildingProgress.subtitle",
          "Monitor project progress by block, storey, and unit.",
        )}
        icon={ApartmentIcon}
        action={
          canManageStructure && !setupOpen ? (
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setSetupOpen(true)}
            >
              {t("buildingProgress.structureSetup", "Structure Setup")}
            </Button>
          ) : null
        }
      />

      {setupOpen ? (
        <StructureSetupPage
          project={selectedProject}
          onBack={() => {
            setSetupOpen(false);
            refreshProgress();
          }}
        />
      ) : (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {progressError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {progressError}
            </Alert>
          )}

          <Box
            sx={{
              mb: 3,
              display: "flex",
              gap: 2,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <FormControl
              fullWidth
              size="small"
              disabled={loading || projects.length === 0}
              sx={{ maxWidth: 400 }}
            >
              <InputLabel>
                {t("buildingProgress.projectCode", "Project")}
              </InputLabel>
              <Select
                value={selectedProjectCode}
                label={t("buildingProgress.projectCode", "Project")}
                onChange={(event) => setSelectedProjectCode(event.target.value)}
                startAdornment={
                  loading || progressLoading ? (
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                  ) : null
                }
              >
                {projects.map((project) => (
                  <MenuItem
                    key={String(project?.projectCode || "")}
                    value={String(project?.projectCode || "")}
                  >
                    {project?.projectCode || ""} - {project?.projectName || ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
            >
              <Chip
                size="small"
                color="success"
                label={t("buildingProgress.legend.completed", "Completed")}
              />
              <Chip
                size="small"
                color="info"
                label={t("buildingProgress.legend.inProgress", "In Progress")}
              />
              <Chip
                size="small"
                color="warning"
                label={t("buildingProgress.legend.started", "Started")}
              />
              <Chip
                size="small"
                sx={{ bgcolor: "grey.400", color: "common.white" }}
                label={t("buildingProgress.legend.notStarted", "Not Started")}
              />
              <Chip
                size="small"
                color="error"
                label={t("buildingProgress.legend.overdue", "Overdue")}
              />
            </Stack>
          </Box>

          {streamHierarchyConflicts?.conflicts?.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t(
                "buildingProgress.streamHierarchyConflict",
                "Some units are hidden because their mapped streams overlap in a parent/child relationship (double counting). Go to Structure Setup to fix.",
                {
                  units: streamHierarchyConflicts.conflicts
                    .map(
                      ({ a, b }) =>
                        `${a.unit?.unitName || "?"} (${a.stream?.streamName || "?"}) ↔ ${b.unit?.unitName || "?"} (${b.stream?.streamName || "?"})`,
                    )
                    .join("; "),
                },
              )}
            </Alert>
          )}

          {selectedProject && blocks.length === 0 && !progressLoading ? (
            <EmptyState
              title={t("buildingProgress.noData", "No building progress data")}
              description={t(
                "buildingProgress.noDataDescription",
                "There are no blocks, storeys, or units configured for the selected project.",
              )}
              actionLabel={
                canManageStructure
                  ? t("buildingProgress.structureSetup", "Structure Setup")
                  : null
              }
              onActionClick={
                canManageStructure ? () => setSetupOpen(true) : null
              }
            />
          ) : selectedProject ? (
            <BuildingProgress3D
              blocks={filteredBlocks}
              onUnitClick={handleUnitClick}
              streams={projectStreams}
            />
          ) : null}

          <UnitDetailDialog
            open={!!detailContext}
            onClose={handleCloseDetail}
            unit={detailContext?.unit}
            storey={detailContext?.storey}
            block={detailContext?.block}
            stack={detailContext?.stack}
            streams={projectStreams}
          />
        </>
      )}
    </Box>
  );
};

export default BuildingProgressPage;
