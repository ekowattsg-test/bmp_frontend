import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { getTaskStatusLabel } from "../utils/workbenchUtils";

const getTaskStatusTransition = (status) => {
  const normalizedStatus = String(status || "").trim();
  if (normalizedStatus === "Not Started") {
    return {
      currentStatus: normalizedStatus,
      nextStatus: "In Progress",
    };
  }

  if (normalizedStatus === "In Progress") {
    return {
      currentStatus: normalizedStatus,
      nextStatus: "Completed",
    };
  }

  return null;
};

const formatDisplayDate = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString();
};

const TaskStatusUpdateDialog = ({
  open,
  task,
  dateValue,
  error,
  saving,
  onDateChange,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [ackOpen, setAckOpen] = useState(false);

  const transition = useMemo(
    () => getTaskStatusTransition(task?.raw?.taskStatus),
    [task],
  );

  useEffect(() => {
    if (!open) {
      setAckOpen(false);
    }
  }, [open, task?.raw?.projectTaskId]);

  if (!open || !transition) {
    return null;
  }

  const taskName =
    String(task?.name || task?.raw?.taskName || "").trim() || "-";
  const currentDate = String(dateValue || "").trim();
  const displayDate = formatDisplayDate(currentDate);
  const currentStatusLabel = getTaskStatusLabel(transition.currentStatus, t);
  const nextStatusLabel = getTaskStatusLabel(transition.nextStatus, t);
  const statusLabel =
    transition.nextStatus === "In Progress"
      ? t("projectPlanning.taskStatusUpdateStarted")
      : t("projectPlanning.taskStatusUpdateCompleted");
  const confirmationMessage = t("projectPlanning.taskStatusUpdateConfirmBody", {
    statusLabel,
    date: displayDate,
  });
  const handlePrimaryClose = () => {
    if (saving) return;
    onClose();
  };

  const handleRequestConfirm = () => {
    setAckOpen(true);
  };

  const handleConfirm = async () => {
    setAckOpen(false);
    await onConfirm({
      nextStatus: transition.nextStatus,
      statusDate: currentDate,
    });
  };

  return (
    <>
      <Dialog open={open} onClose={handlePrimaryClose} fullWidth maxWidth="sm">
        <DialogTitle>{t("projectPlanning.taskStatusUpdateTitle")}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                {t("projectPlanning.taskStatusUpdateTask")}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {taskName}
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label={t("projectPlanning.taskStatusUpdateCurrentStatus")}
                value={currentStatusLabel}
                size="small"
                fullWidth
                disabled
              />
              <TextField
                label={t("projectPlanning.taskStatusUpdateNewStatus")}
                value={nextStatusLabel}
                size="small"
                fullWidth
                disabled
              />
            </Stack>

            <TextField
              type="date"
              size="small"
              label={t("projectPlanning.taskStatusUpdateDate")}
              value={currentDate}
              onChange={(event) => onDateChange(event.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <Alert severity="info">
              {t("projectPlanning.taskStatusUpdateHint")}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            {t("basic.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleRequestConfirm}
            disabled={saving}
          >
            {t("projectPlanning.taskStatusUpdateAction", {
              status: nextStatusLabel,
            })}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={ackOpen}
        onClose={() => {
          if (saving) return;
          setAckOpen(false);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {t("projectPlanning.taskStatusUpdateConfirmTitle")}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Alert severity="info">{confirmationMessage}</Alert>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t("projectPlanning.taskStatusUpdateSummaryTask")}
              </Typography>
              <Typography variant="body2">{taskName}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t("projectPlanning.taskStatusUpdateSummaryStatus")}
              </Typography>
              <Typography variant="body2">{nextStatusLabel}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t("projectPlanning.taskStatusUpdateSummaryDate")}
              </Typography>
              <Typography variant="body2">{displayDate}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAckOpen(false)} disabled={saving}>
            {t("basic.back")}
          </Button>
          <Button variant="contained" onClick={handleConfirm} disabled={saving}>
            {t("basic.ok")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskStatusUpdateDialog;
