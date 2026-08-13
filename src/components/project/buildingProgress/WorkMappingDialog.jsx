import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
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

const WorkMappingDialog = ({ open, onClose, unit }) => {
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
        const tasksRes = unit.projectStreamId
          ? await request(
              "GET",
              `/api/projecttasks/stream/${unit.projectStreamId}`,
            ).catch(() => ({ data: [] }))
          : { data: [] };

        const loadedTasks = Array.isArray(tasksRes?.data) ? tasksRes.data : [];

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
  }, [open, unit, t]);

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
                  primary={task.taskName || `Task ${task.projectTaskId}`}
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
