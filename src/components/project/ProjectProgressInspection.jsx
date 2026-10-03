import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Search as SearchIcon } from "@mui/icons-material";
import HistoryIcon from "@mui/icons-material/History";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { ImageCarousel, ThumbnailImg } from "../../helpers/file_helper";
import { EmptyState, LoadingState, PageHeader } from "../common";
import ProjectProgressHistoryDialog from "./ProjectProgressHistoryDialog";

const toApiDate = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const parseDateInput = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export default function ProjectProgressInspection() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [records, setRecords] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [streams, setStreams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState([]);
  const [carouselStart, setCarouselStart] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTask, setHistoryTask] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [progressRes, tasksRes, streamsRes, projectsRes, staffsRes] =
        await Promise.all([
          request("GET", "/api/projecttaskprogresses"),
          request("GET", "/api/projecttasks").catch(() => ({ data: [] })),
          request("GET", "/api/projectstreams").catch(() => ({ data: [] })),
          request("GET", "/api/projects").catch(() => ({ data: [] })),
          request("GET", "/api/staffs").catch(() => ({ data: [] })),
        ]);

      setRecords(Array.isArray(progressRes?.data) ? progressRes.data : []);
      setTasks(Array.isArray(tasksRes?.data) ? tasksRes.data : []);
      setStreams(Array.isArray(streamsRes?.data) ? streamsRes.data : []);
      setProjects(Array.isArray(projectsRes?.data) ? projectsRes.data : []);
      setStaffs(Array.isArray(staffsRes?.data) ? staffsRes.data : []);
    } catch {
      setErrorMsg(
        t(
          "projectProgressInspection.loadFailed",
          "Failed to load inspection records.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const taskById = useMemo(() => {
    return tasks.reduce((acc, task) => {
      acc[String(task.projectTaskId)] = task;
      return acc;
    }, {});
  }, [tasks]);

  const streamById = useMemo(() => {
    return streams.reduce((acc, stream) => {
      acc[String(stream.projectStreamId)] = stream;
      return acc;
    }, {});
  }, [streams]);

  const projectByCode = useMemo(() => {
    return projects.reduce((acc, project) => {
      acc[String(project.projectCode)] = project;
      return acc;
    }, {});
  }, [projects]);

  const staffNameById = useMemo(() => {
    return staffs.reduce((acc, staff) => {
      const id = String(staff.staffId || "").trim();
      const name = String(
        staff.staffName ||
          [staff.firstName, staff.lastName].filter(Boolean).join(" ") ||
          id,
      ).trim();
      acc[id] = name;
      return acc;
    }, {});
  }, [staffs]);

  const projectOptions = useMemo(() => {
    return projects
      .filter((p) => String(p?.projectCode || "").trim())
      .sort((a, b) =>
        String(a.projectCode).localeCompare(String(b.projectCode), undefined, {
          numeric: true,
        }),
      );
  }, [projects]);

  const taskOptions = useMemo(() => {
    if (!projectFilter) return [];
    return tasks
      .filter(
        (task) =>
          String(task?.projectCode || "").trim() === projectFilter &&
          String(task?.taskName || "").trim(),
      )
      .sort((a, b) =>
        String(a.taskName || "").localeCompare(String(b.taskName || ""), undefined, {
          numeric: true,
        }),
      );
  }, [tasks, projectFilter]);

  const filteredRows = useMemo(() => {
    const inspected = records.filter((r) => r.inspectionDate);

    const fromDate = dateFrom ? toApiDate(parseDateInput(dateFrom)) : "";
    const toDate = dateTo ? toApiDate(parseDateInput(dateTo)) : "";
    const searchLower = search.trim().toLowerCase();

    return inspected
      .map((record) => {
        const task = taskById[String(record.projectTaskId)] || {};
        const stream = streamById[String(task.projectStreamId)] || {};
        const project = projectByCode[String(task.projectCode || stream.projectCode)] || {};
        return {
          ...record,
          taskName: task.taskName || "",
          projectCode: task.projectCode || stream.projectCode || "",
          projectName: project.projectName || "",
          streamName: stream.streamName || "",
          executedByName: staffNameById[String(record.executedBy || "")] || record.executedBy || "",
          reportedByName: staffNameById[String(record.reportedBy || "")] || record.reportedBy || "",
          inspectedByName: staffNameById[String(record.inspectedBy || "")] || record.inspectedBy || "",
        };
      })
      .filter((row) => {
        if (fromDate && String(row.inspectionDate || "") < fromDate) return false;
        if (toDate && String(row.inspectionDate || "") > toDate) return false;
        if (projectFilter && row.projectCode !== projectFilter) return false;
        if (taskFilter && String(row.projectTaskId) !== taskFilter) return false;
        if (searchLower) {
          const haystack = [
            row.projectCode,
            row.projectName,
            row.taskName,
            row.streamName,
            row.executedByName,
            row.reportedByName,
            row.inspectedByName,
            row.inspectionRemark,
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(searchLower)) return false;
        }
        return true;
      })
      .sort((a, b) =>
        String(b.inspectionDate || "").localeCompare(String(a.inspectionDate || "")),
      );
  }, [
    records,
    taskById,
    streamById,
    projectByCode,
    staffNameById,
    dateFrom,
    dateTo,
    projectFilter,
    taskFilter,
    search,
  ]);

  const handleProjectChange = (value) => {
    setProjectFilter(value);
    setTaskFilter("");
  };

  const getPhotoInfos = (row) => {
    const raw = String(row?.inspectionPhotos || "").trim();
    if (!raw) return [];

    // New format: JSON array of metadata objects
    try {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr
        .filter(Boolean)
        .map((item) => ({
          id: item.id || null,
          viewUrl: item.viewUrl || item.url || "",
          provider: item.provider || null,
        }))
        .filter((item) => item.viewUrl);
    } catch {
      // Legacy fallback: comma-separated URLs
      return raw
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean)
        .map((url) => ({ id: null, viewUrl: url, provider: null }));
    }
  };

  const openPhotoCarousel = (row, startIndex = 0) => {
    const photos = getPhotoInfos(row);
    if (photos.length === 0) return;
    setCarouselImages(
      photos.map((photo) => ({
        displayUrl: photo.viewUrl,
        viewUrl: photo.viewUrl,
        title: "",
        provider: photo.provider,
        meta: photo,
      })),
    );
    setCarouselStart(startIndex);
    setCarouselOpen(true);
  };

  const columns = useMemo(
    () => [
      {
        field: "photoThumb",
        headerName: t("projectProgressInspection.photos", "Photos"),
        width: 60,
        sortable: false,
        renderCell: (params) => {
          const photos = getPhotoInfos(params.row);
          if (photos.length === 0) return "-";
          const first = photos[0];
          if (first.id) {
            return (
              <Box onClick={() => openPhotoCarousel(params.row, 0)}>
                <ThumbnailImg
                  fileId={first.id}
                  viewUrl={first.viewUrl}
                  provider={first.provider}
                  width={40}
                  height={40}
                  alt={t("projectProgressInspection.photos", "Photos")}
                  style={{
                    borderRadius: 4,
                    cursor: "pointer",
                    border: "1px solid var(--color-gray-300)",
                  }}
                />
              </Box>
            );
          }
          return (
            <Box
              component="img"
              src={first.viewUrl}
              alt={t("projectProgressInspection.photos", "Photos")}
              onClick={() => openPhotoCarousel(params.row, 0)}
              sx={{
                width: 40,
                height: 40,
                objectFit: "cover",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                cursor: "pointer",
              }}
              referrerPolicy="no-referrer"
            />
          );
        },
      },
      {
        field: "inspectionDate",
        headerName: t("projectProgressInspection.inspectionDate", "Inspect On"),
        width: 100,
      },
      {
        field: "projectCode",
        headerName: t("projectProgressInspection.projectCode", "Project"),
        width: 90,
      },
      {
        field: "streamName",
        headerName: t("projectProgressInspection.streamName", "Stream"),
        width: 110,
      },
      {
        field: "taskName",
        headerName: t("projectProgressInspection.taskName", "Task"),
        minWidth: 160,
        flex: 1,
      },
      {
        field: "progressDate",
        headerName: t("projectProgressInspection.progressDate", "Report On"),
        width: 100,
      },
      {
        field: "reportedProgress",
        headerName: t("projectProgressInspection.reportedProgress", "Progress"),
        width: 90,
        renderCell: (params) => (
          <Chip
            label={`${Number(params.row.reportedProgress || 0)}%`}
            size="small"
            color={Number(params.row.completed) ? "success" : "primary"}
          />
        ),
      },
      {
        field: "verifiedProgress",
        headerName: t("projectProgressInspection.verifiedProgress", "Verified"),
        width: 90,
        renderCell: (params) => (
          <Chip
            label={`${Number(params.row.verifiedProgress || 0)}%`}
            size="small"
            color="success"
          />
        ),
      },
      {
        field: "inspectedByName",
        headerName: t("projectProgressInspection.inspectedBy", "Inspector"),
        width: 110,
      },
      {
        field: "history",
        headerName: t("projectProgressInspection.history", "History"),
        width: 60,
        sortable: false,
        renderCell: (params) => {
          const task = taskById[String(params.row.projectTaskId)];
          return (
            <IconButton
              size="small"
              onClick={() => {
                setHistoryTask(task);
                setHistoryOpen(true);
              }}
              title={t("projectProgressInspection.viewHistory", "View progress history")}
            >
              <HistoryIcon />
            </IconButton>
          );
        },
      },
    ],
    [t, taskById],
  );

  return (
    <Box>
      <PageHeader
        title={t("projectProgressInspection.title", "Progress Inspection Records")}
      />

      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg("")}>
          {errorMsg}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          label={t("projectProgressInspection.search", "Search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />

        <TextField
          size="small"
          type="date"
          label={t("projectProgressInspection.dateFrom", "From")}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          type="date"
          label={t("projectProgressInspection.dateTo", "To")}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="project-filter-label">
            {t("projectProgressInspection.project", "Project")}
          </InputLabel>
          <Select
            labelId="project-filter-label"
            value={projectFilter}
            label={t("projectProgressInspection.project", "Project")}
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            <MenuItem value="">
              {t("projectProgressInspection.allProjects", "All projects")}
            </MenuItem>
            {projectOptions.map((p) => (
              <MenuItem key={p.projectCode} value={p.projectCode}>
                {p.projectCode}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }} disabled={!projectFilter}>
          <InputLabel id="task-filter-label">
            {t("projectProgressInspection.task", "Task")}
          </InputLabel>
          <Select
            labelId="task-filter-label"
            value={taskFilter}
            label={t("projectProgressInspection.task", "Task")}
            onChange={(e) => setTaskFilter(e.target.value)}
          >
            <MenuItem value="">
              {t("projectProgressInspection.allTasks", "All tasks")}
            </MenuItem>
            {taskOptions.map((task) => (
              <MenuItem
                key={task.projectTaskId}
                value={String(task.projectTaskId)}
              >
                {task.taskName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <LoadingState />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          message={t(
            "projectProgressInspection.noItems",
            "No inspection records found.",
          )}
        />
      ) : (
        <Box sx={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.projectTaskProgressId}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            disableRowSelectionOnClick
            density="compact"
          />
        </Box>
      )}

      <ImageCarousel
        images={carouselImages}
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
        startIndex={carouselStart}
      />

      <ProjectProgressHistoryDialog
        open={historyOpen}
        onClose={() => {
          setHistoryOpen(false);
          setHistoryTask(null);
        }}
        task={historyTask}
        staffNameById={staffNameById}
      />
    </Box>
  );
}
