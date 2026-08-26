import React, { useEffect, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { useTranslation } from "react-i18next";
import { request } from "../../../helpers/axios_helper";
import { getProgressColor, getProgressLabel } from "./progressColors";
import {
  buildStreamById,
  buildStreamByNumber,
  collectDescendantStreamIds,
  isDescendantOf,
  streamHasDescendants,
} from "./streamHierarchyUtils";

const formatDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString();
};

const InfoRow = ({ label, value }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 500 }}>
      {value || "-"}
    </Typography>
  </Box>
);

const UnitDetailDialog = ({
  open,
  onClose,
  unit,
  storey,
  block,
  stack,
  streams,
}) => {
  const { t } = useTranslation();
  const [works, setWorks] = useState([]);
  const [loadingWorks, setLoadingWorks] = useState(false);

  useEffect(() => {
    if (!open || !unit?.projectStreamId) {
      setWorks([]);
      return undefined;
    }

    const aggregateWorks = Array.isArray(unit?.works) ? unit.works : [];

    let mounted = true;

    const loadWorks = async () => {
      setLoadingWorks(true);
      try {
        const streamIds = collectDescendantStreamIds(
          streams,
          unit.projectStreamId,
        );
        const streamByIdMap = buildStreamById(streams);

        const tasksResList = await Promise.all(
          streamIds.map((streamId) =>
            request("GET", `/api/projecttasks/stream/${streamId}`).catch(
              () => ({ data: [] }),
            ),
          ),
        );

        const taskToStream = new Map();
        tasksResList.forEach((res, index) => {
          const streamId = streamIds[index];
          const stream = streamByIdMap[streamId];
          const list = Array.isArray(res?.data) ? res.data : [];
          if (stream) stream._tasks = list;
          list.forEach((task) => {
            const taskId = String(task?.projectTaskId || "").trim();
            if (taskId && !taskToStream.has(taskId)) {
              taskToStream.set(taskId, stream);
            }
          });
        });

        const streamByNumber = buildStreamByNumber(streams);

        const enrichedWorks = aggregateWorks.map((work) => {
          const workTaskId = String(work?.projectTaskId || "").trim();

          // Prefer explicit projectStreamId on the work
          let sourceStream = streamByIdMap[String(work?.projectStreamId || "")];

          // Fall back to matching against descendant stream tasks
          if (!sourceStream && workTaskId) {
            sourceStream = taskToStream.get(workTaskId);
          }

          // Final fallback: infer by task number uniqueness against descendant streams
          if (!sourceStream && workTaskId && work?.workName) {
            const candidates = [];
            taskToStream.forEach((stream, taskId) => {
              const task = stream?._tasks?.find(
                (t) => String(t?.projectTaskId || "").trim() === taskId,
              );
              if (
                task &&
                (task.workName === work.workName ||
                  task.taskName === work.workName)
              ) {
                candidates.push(stream);
              }
            });
            if (candidates.length === 1) sourceStream = candidates[0];
          }

          return {
            ...work,
            projectStreamId:
              work?.projectStreamId || sourceStream?.projectStreamId || "",
            streamName: sourceStream?.streamName || work?.streamName || "",
            streamType: sourceStream?.streamType || work?.streamType || "",
          };
        });

        if (!mounted) return;
        setWorks(enrichedWorks);
      } catch {
        if (!mounted) return;
        setWorks(aggregateWorks);
      } finally {
        if (!mounted) return;
        setLoadingWorks(false);
      }
    };

    loadWorks();

    return () => {
      mounted = false;
    };
  }, [open, unit?.projectStreamId, unit?.works, streams]);

  if (!unit) return null;

  const streamByIdMap = buildStreamById(streams);
  const mappedStream = streamByIdMap[String(unit?.projectStreamId || "")];
  const streamType = mappedStream?.streamType || unit?.streamType || "";
  const hasSubStreams = streamHasDescendants(streams, mappedStream);

  const color = getProgressColor(unit.progress, unit.plannedEndDate);
  const statusLabel = getProgressLabel(unit.progress, unit.plannedEndDate, t);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {unit.unitName || unit.unitNumber || ""}
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <InfoRow
          label={t("buildingProgress.block", "Block")}
          value={block?.blockName || block?.blockNumber}
        />
        <InfoRow
          label={t("buildingProgress.storey", "Storey")}
          value={storey?.storeyName || storey?.storeyNumber}
        />
        <InfoRow
          label={t("buildingProgress.stack", "Stack")}
          value={stack?.stackName || stack?.stackNumber}
        />
        <InfoRow
          label={t("buildingProgress.stream", "Stream")}
          value={unit.streamName || unit.projectStreamId}
        />

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t("buildingProgress.progress", "Progress")}
            </Typography>
            <Chip
              size="small"
              sx={{ bgcolor: color, color: "common.white" }}
              label={statusLabel}
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, Number(unit.progress ?? 0)))}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography variant="body2" sx={{ mt: 0.5, textAlign: "right" }}>
            {unit.progress ?? 0}%
          </Typography>
        </Box>

        <InfoRow
          label={t("buildingProgress.plannedStartDate", "Planned Start")}
          value={formatDate(unit.plannedStartDate)}
        />
        <InfoRow
          label={t("buildingProgress.plannedEndDate", "Planned End")}
          value={formatDate(unit.plannedEndDate)}
        />
        <InfoRow
          label={t("buildingProgress.actualStartDate", "Actual Start")}
          value={formatDate(unit.actualStartDate)}
        />
        <InfoRow
          label={t("buildingProgress.actualEndDate", "Actual End")}
          value={formatDate(unit.actualEndDate)}
        />

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t("buildingProgress.works", "Works")}
        </Typography>

        {loadingWorks ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} />
            <Typography color="text.secondary">
              {t("basic.loading", "Loading...")}
            </Typography>
          </Box>
        ) : works.length === 0 ? (
          <Typography color="text.secondary">
            {t("buildingProgress.noWorks", "No works mapped to this unit.")}
          </Typography>
        ) : (
          <List dense disablePadding>
            {works.map((task) => {
              const plannedStart =
                task.plannedStartDate ?? task.taskStartDate ?? task.startDate;
              const plannedEnd =
                task.plannedEndDate ?? task.taskEndDate ?? task.endDate;
              const actualStart =
                task.actualStartDate ?? task.actualTaskStartDate;
              const actualEnd = task.actualEndDate ?? task.actualTaskEndDate;
              const progress = task.progress ?? 0;
              const workColor = getProgressColor(progress, plannedEnd);
              const taskName =
                task.workName ?? task.taskName ?? `Task ${task.projectTaskId}`;
              const sourceStream =
                streamByIdMap[String(task?.projectStreamId || "")];
              const sourceStreamName =
                task.streamName || sourceStream?.streamName || "";
              const isFromDescendantStream =
                String(task?.projectStreamId || "") !==
                  String(unit?.projectStreamId || "") &&
                isDescendantOf(streams, sourceStream, mappedStream);

              const status =
                progress === 0
                  ? "notStarted"
                  : progress >= 100
                    ? "completed"
                    : "started";

              const dateLabel =
                status === "notStarted"
                  ? t("buildingProgress.plannedStartDate", "Planned Start")
                  : status === "completed"
                    ? t("buildingProgress.actualEndDate", "Actual End")
                    : t("buildingProgress.plannedEndDate", "Planned End");

              const dateValue =
                status === "notStarted"
                  ? plannedStart
                  : status === "completed"
                    ? actualEnd
                    : plannedEnd;

              return (
                <ListItem
                  key={task.projectTaskId}
                  sx={{
                    px: 0,
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        {taskName}
                        {isFromDescendantStream && sourceStreamName && (
                          <Chip
                            size="small"
                            label={sourceStreamName}
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <Chip
                          size="small"
                          sx={{ bgcolor: workColor, color: "common.white" }}
                          label={`${progress}%`}
                        />
                        <Typography variant="caption" color="text.secondary">
                          ({dateLabel}: {formatDate(dateValue)})
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UnitDetailDialog;
