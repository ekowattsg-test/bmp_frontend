import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import { request } from "../../../helpers/axios_helper";
import {
  buildStreamById,
  collectDescendantStreamIds,
} from "./streamHierarchyUtils";

const WorkMappingDialog = ({ open, onClose, unit, streams }) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !unit?.projectUnitId) return;

    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const streamIds = unit.projectStreamId
          ? collectDescendantStreamIds(streams, unit.projectStreamId)
          : [];

        const tasksResList = await Promise.all(
          streamIds.map((streamId) =>
            request("GET", `/api/projecttasks/stream/${streamId}`).catch(
              () => ({ data: [] }),
            ),
          ),
        );

        const streamById = buildStreamById(streams);
        const loadedTasks = tasksResList
          .flatMap((res, index) => {
            const streamId = streamIds[index];
            const stream = streamById[streamId];
            const list = Array.isArray(res?.data) ? res.data : [];
            return list.map((task) => ({
              ...task,
              _sourceStreamName: stream?.streamName || "",
              _sourceStreamType: stream?.streamType || "",
            }));
          })
          .filter((task) => task.projectTaskId != null);

        if (!mounted) return;
        setTasks(loadedTasks);
      } catch {
        if (!mounted) return;
        setError(
          t(
            "buildingProgress.loadMappingFailed",
            "Failed to load mapping data.",
          ),
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [open, unit, streams, t]);

  if (!unit) return null;

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {t("buildingProgress.workMappingTitle", "Map Works")} - {unit.unitName}
        <IconButton
          onClick={() => onClose(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!unit.projectStreamId ? (
          <Typography color="text.secondary">
            {t(
              "buildingProgress.noStreamMapped",
              "No stream mapped to this unit. Map a stream first.",
            )}
          </Typography>
        ) : tasks.length === 0 ? (
          <Typography color="text.secondary">
            {t(
              "buildingProgress.noTasksForStream",
              "No tasks found for the mapped stream.",
            )}
          </Typography>
        ) : (
          <List dense>
            {tasks.map((task) => (
              <ListItem key={task.projectTaskId}>
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
                      {task.taskName || `Task ${task.projectTaskId}`}
                      {task._sourceStreamName && (
                        <Chip
                          size="small"
                          label={task._sourceStreamName}
                          variant="outlined"
                          sx={{ height: 20, fontSize: "0.7rem" }}
                        />
                      )}
                    </Box>
                  }
                  secondary={`${t("buildingProgress.taskStatus", "Status")}: ${task.taskStatus || "-"}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={loading}>
          {t("basic.close", "Close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkMappingDialog;
