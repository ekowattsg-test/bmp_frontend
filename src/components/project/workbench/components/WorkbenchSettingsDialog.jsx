import React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import { getTaskStatusLabel } from "../utils/workbenchUtils";

const WorkbenchSettingsDialog = ({
  open,
  onClose,
  dialogMode,
  settingsTarget,
  settingsError,
  formData,
  setFormData,
  taskTypeMetaByCode,
  taskAssigneeOptions,
  parentCandidates,
  streamParentCandidates,
  milestoneCandidates,
  childTaskData,
  setChildTaskData,
  streamCreatableTaskTypeOptions,
  taskCreatableTaskTypeOptions,
  saving,
  createChildTask,
  addNewStream,
  replicateStream,
  saveStreamInfo,
  saveTaskInfo,
  removeMilestoneLink,
  saveMilestoneLink,
  addDays,
  toApiDate,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {dialogMode === "add-stream"
          ? t("projectPlanning.addStream")
          : dialogMode === "replicate-stream"
            ? t("projectPlanning.replicateStream")
            : dialogMode === "add-task"
              ? t("projectPlanning.createTask")
              : settingsTarget?.type === "stream"
                ? t("projectPlanning.streamSettings")
                : t("projectPlanning.taskSettings")}
      </DialogTitle>
      <DialogContent dividers>
        {settingsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {settingsError}
          </Alert>
        )}

        {dialogMode === "add-stream" && (
          <Stack spacing={2}>
            <TextField
              label={t("projectstream.streamName")}
              value={formData.streamName || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  streamName: e.target.value,
                }))
              }
              size="small"
              fullWidth
              autoFocus
              required
            />
            <TextField
              label={t("projectstream.streamDescription")}
              value={formData.streamDescription || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  streamDescription: e.target.value,
                }))
              }
              size="small"
              fullWidth
              multiline
              minRows={2}
            />
            {String(formData.streamType || "")
              .trim()
              .toUpperCase() !== "P" && (
              <FormControl size="small" fullWidth>
                <InputLabel>{t("projectstream.parentStream")}</InputLabel>
                <Select
                  label={t("projectstream.parentStream")}
                  value={String(formData.parentStreamNumber ?? "")}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      parentStreamNumber: e.target.value,
                    }))
                  }
                >
                  {streamParentCandidates.map((stream) => (
                    <MenuItem
                      key={stream?.projectStreamId || stream?.streamNumber}
                      value={String(stream?.streamNumber ?? "")}
                    >
                      {stream?.streamName
                        ? `${stream.streamName} (#${stream.streamNumber})`
                        : `Stream #${stream?.streamNumber}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        )}

        {dialogMode === "replicate-stream" &&
          settingsTarget?.type === "stream" && (
            <Stack spacing={2}>
              <TextField
                label={t("projectstream.streamName")}
                value={formData.streamName || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    streamName: e.target.value,
                  }))
                }
                size="small"
                fullWidth
                autoFocus
                required
              />
            </Stack>
          )}

        {dialogMode === "edit-stream" && settingsTarget?.type === "stream" && (
          <Stack spacing={2}>
            <TextField
              label={t("projectstream.streamName")}
              value={formData.streamName || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  streamName: e.target.value,
                }))
              }
              size="small"
              fullWidth
            />
            <TextField
              label={t("projectstream.streamDescription")}
              value={formData.streamDescription || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  streamDescription: e.target.value,
                }))
              }
              size="small"
              fullWidth
              multiline
              minRows={2}
            />
            {String(formData.streamType || "")
              .trim()
              .toUpperCase() !== "P" && (
              <FormControl size="small" fullWidth>
                <InputLabel>{t("projectstream.parentStream")}</InputLabel>
                <Select
                  label={t("projectstream.parentStream")}
                  value={String(formData.parentStreamNumber ?? "")}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      parentStreamNumber: e.target.value,
                    }))
                  }
                >
                  {streamParentCandidates.map((stream) => (
                    <MenuItem
                      key={stream?.projectStreamId || stream?.streamNumber}
                      value={String(stream?.streamNumber ?? "")}
                    >
                      {stream?.streamName
                        ? `${stream.streamName} (#${stream.streamNumber})`
                        : `Stream #${stream?.streamNumber}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        )}

        {dialogMode === "edit-task" && settingsTarget?.type === "task" && (
          <Stack spacing={2}>
            <TextField
              label={t("projecttask.taskName")}
              value={formData.taskName || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  taskName: e.target.value,
                }))
              }
              size="small"
              fullWidth
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField
                label={t("projecttask.taskType")}
                value={(() => {
                  const taskType =
                    taskTypeMetaByCode[String(formData.taskType || "").trim()];
                  if (!taskType) return formData.taskType || "";
                  return `${taskType.projectTaskCode}${taskType.projectTaskDescription ? ` - ${taskType.projectTaskDescription}` : ""}`;
                })()}
                size="small"
                fullWidth
                disabled
              />
              <FormControl size="small" fullWidth>
                <InputLabel>{t("projecttask.taskStatus")}</InputLabel>
                <Select
                  label={t("projecttask.taskStatus")}
                  value={formData.taskStatus || "Not Started"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      taskStatus: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="Not Started">
                    {getTaskStatusLabel("Not Started", t)}
                  </MenuItem>
                  <MenuItem value="In Progress">
                    {getTaskStatusLabel("In Progress", t)}
                  </MenuItem>
                  <MenuItem value="Completed">
                    {getTaskStatusLabel("Completed", t)}
                  </MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField
                type="date"
                size="small"
                label={t("projecttask.taskStartDate")}
                value={formData.taskStartDate || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    taskStartDate: e.target.value,
                  }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
                disabled={
                  String(
                    taskTypeMetaByCode[String(formData.taskType || "").trim()]
                      ?.editStartDate ?? "",
                  ).trim() !== "1"
                }
              />
              <TextField
                type="number"
                size="small"
                label={t("projecttask.taskDuration")}
                value={formData.taskDuration || 1}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    taskDuration: e.target.value,
                  }))
                }
                fullWidth
                inputProps={{
                  min:
                    Number(
                      taskTypeMetaByCode[String(formData.taskType || "").trim()]
                        ?.minimumDays || 1,
                    ) || 1,
                  max:
                    Number(
                      taskTypeMetaByCode[String(formData.taskType || "").trim()]
                        ?.maximumDays || 0,
                    ) || undefined,
                }}
                helperText={(() => {
                  const typeMeta =
                    taskTypeMetaByCode[String(formData.taskType || "").trim()];
                  const minDays = Number(typeMeta?.minimumDays || 0);
                  const maxDays = Number(typeMeta?.maximumDays || 0);
                  if (minDays > 0 && maxDays > 0)
                    return `${minDays}-${maxDays} days`;
                  if (minDays > 0) return `Min ${minDays} days`;
                  if (maxDays > 0) return `Max ${maxDays} days`;
                  return "";
                })()}
              />
              <TextField
                type="date"
                size="small"
                label={t("projecttask.taskEndDate")}
                value={(() => {
                  const endDate = addDays(
                    formData.taskStartDate ||
                      settingsTarget?.raw?.taskStartDate ||
                      "",
                    formData.taskDuration || 1,
                  );
                  return toApiDate(endDate);
                })()}
                fullWidth
                InputLabelProps={{ shrink: true }}
                disabled
              />
            </Stack>

            <FormControl size="small" fullWidth>
              <InputLabel>{t("projecttask.staffId")}</InputLabel>
              <Select
                label={t("projecttask.staffId")}
                value={String(
                  formData.staffId || taskAssigneeOptions[0]?.staffId || "",
                )}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    staffId: e.target.value,
                  }))
                }
              >
                {taskAssigneeOptions.map((option) => (
                  <MenuItem key={option.staffId} value={option.staffId}>
                    {option.name} ({option.roleLabel})
                  </MenuItem>
                ))}
                {String(formData.staffId || "") &&
                  !taskAssigneeOptions.some(
                    (option) =>
                      String(option.staffId) === String(formData.staffId || ""),
                  ) && (
                    <MenuItem value={String(formData.staffId || "")}>
                      {String(formData.staffId || "")}
                    </MenuItem>
                  )}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>{t("projecttask.parentTask")}</InputLabel>
              <Select
                label={t("projecttask.parentTask")}
                value={String(formData.parentTaskId || "")}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    parentTaskId: e.target.value,
                  }))
                }
                disabled={String(formData.taskType || "D") !== "D"}
              >
                <MenuItem value="">-</MenuItem>
                {parentCandidates.map((task) => (
                  <MenuItem
                    key={task.projectTaskId}
                    value={String(task.projectTaskId)}
                  >
                    {task.taskName} ({task.projectStreamId})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label={t("projecttask.remarks")}
              value={formData.remarks || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  remarks: e.target.value,
                }))
              }
              size="small"
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        )}

        {dialogMode === "edit-milestone" && (
          <Stack spacing={1.5}>
            <Alert severity="info">
              {t("projectPlanning.milestoneDialogHelp")}
            </Alert>
            {milestoneCandidates.length === 0 ? (
              <Alert severity="warning">
                {t("projectPlanning.noMilestoneTaskAvailable")}
              </Alert>
            ) : (
              <FormControl size="small" fullWidth>
                <InputLabel>{t("projecttask.milestoneTask")}</InputLabel>
                <Select
                  label={t("projecttask.milestoneTask")}
                  value={String(formData.milestoneTaskId || "")}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      milestoneTaskId: e.target.value,
                    }))
                  }
                >
                  {milestoneCandidates.map((task) => (
                    <MenuItem
                      key={task.projectTaskId}
                      value={String(task.projectTaskId)}
                    >
                      {task.taskName} ({task.projectStreamId})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        )}

        {dialogMode === "add-task" && (
          <Box
            sx={{
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 1,
              p: 1.5,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {settingsTarget?.type === "task"
                ? t("projectPlanning.createChildTask")
                : t("projectPlanning.createTask")}
            </Typography>
            <Stack spacing={1.25}>
              <TextField
                label={t("projecttask.childTaskName")}
                size="small"
                value={childTaskData.taskName}
                onChange={(e) =>
                  setChildTaskData((prev) => ({
                    ...prev,
                    taskName: e.target.value,
                  }))
                }
                fullWidth
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t("projecttask.taskType")}</InputLabel>
                  <Select
                    label={t("projecttask.taskType")}
                    value={childTaskData.taskType}
                    onChange={(e) =>
                      setChildTaskData((prev) => ({
                        ...prev,
                        taskType: e.target.value,
                      }))
                    }
                  >
                    {(settingsTarget?.type === "stream"
                      ? streamCreatableTaskTypeOptions
                      : taskCreatableTaskTypeOptions
                    ).map((taskType) => (
                      <MenuItem
                        key={taskType.projectTaskCode}
                        value={taskType.projectTaskCode}
                      >
                        {taskType.projectTaskCode}
                        {taskType.projectTaskDescription
                          ? ` - ${taskType.projectTaskDescription}`
                          : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  type="date"
                  size="small"
                  label={t("projecttask.taskStartDate")}
                  value={childTaskData.taskStartDate || ""}
                  onChange={(e) =>
                    setChildTaskData((prev) => ({
                      ...prev,
                      taskStartDate: e.target.value,
                    }))
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  disabled={
                    String(
                      taskTypeMetaByCode[
                        String(childTaskData.taskType || "").trim()
                      ]?.editStartDate ?? "",
                    ).trim() !== "1"
                  }
                />
                <TextField
                  type="number"
                  label={t("projecttask.taskDuration")}
                  size="small"
                  value={childTaskData.durationDays}
                  onChange={(e) =>
                    setChildTaskData((prev) => ({
                      ...prev,
                      durationDays: e.target.value,
                    }))
                  }
                  inputProps={{
                    min:
                      Number(
                        taskTypeMetaByCode[
                          String(childTaskData.taskType || "").trim()
                        ]?.minimumDays || 1,
                      ) || 1,
                    max:
                      Number(
                        taskTypeMetaByCode[
                          String(childTaskData.taskType || "").trim()
                        ]?.maximumDays || 0,
                      ) || undefined,
                  }}
                  helperText={(() => {
                    const typeMeta =
                      taskTypeMetaByCode[
                        String(childTaskData.taskType || "").trim()
                      ];
                    const minDays = Number(typeMeta?.minimumDays || 0);
                    const maxDays = Number(typeMeta?.maximumDays || 0);
                    if (minDays > 0 && maxDays > 0)
                      return `${minDays}-${maxDays} days`;
                    if (minDays > 0) return `Min ${minDays} days`;
                    if (maxDays > 0) return `Max ${maxDays} days`;
                    return "";
                  })()}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t("projecttask.staffId")}</InputLabel>
                  <Select
                    label={t("projecttask.staffId")}
                    value={String(
                      childTaskData.staffId ||
                        taskAssigneeOptions[0]?.staffId ||
                        "",
                    )}
                    onChange={(e) =>
                      setChildTaskData((prev) => ({
                        ...prev,
                        staffId: e.target.value,
                      }))
                    }
                  >
                    {taskAssigneeOptions.map((option) => (
                      <MenuItem key={option.staffId} value={option.staffId}>
                        {option.name} ({option.roleLabel})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {settingsTarget?.type === "task" ? (
                  <TextField
                    size="small"
                    fullWidth
                    label={t("projectPlanning.attachNewParent")}
                    value={
                      settingsTarget?.raw?.taskName ||
                      t(
                        "projectPlanning.currentTaskAsParent",
                        "Current task as parent",
                      )
                    }
                    InputLabelProps={{ shrink: true }}
                    disabled
                  />
                ) : (
                  <FormControl size="small" fullWidth>
                    <InputLabel>
                      {t("projectPlanning.attachNewParent")}
                    </InputLabel>
                    <Select
                      label={t("projectPlanning.attachNewParent")}
                      value={String(childTaskData.attachToParentTaskId || "")}
                      onChange={(e) =>
                        setChildTaskData((prev) => ({
                          ...prev,
                          attachToParentTaskId: e.target.value,
                        }))
                      }
                    >
                      <MenuItem value="">
                        {t("projectPlanning.currentTaskAsParent")}
                      </MenuItem>
                      {parentCandidates.map((task) => (
                        <MenuItem
                          key={task.projectTaskId}
                          value={String(task.projectTaskId)}
                        >
                          {task.taskName} ({task.projectStreamId})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>

              <Button
                variant="contained"
                color="primary"
                size="medium"
                startIcon={<AddIcon fontSize="small" />}
                onClick={createChildTask}
                disabled={saving}
                sx={{
                  alignSelf: "flex-end",
                  minWidth: 180,
                  fontWeight: 600,
                }}
              >
                {settingsTarget?.type === "task"
                  ? t("projectPlanning.createChildTask")
                  : t("projectPlanning.createTask")}
              </Button>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          disabled={saving}
          variant="outlined"
          sx={{
            color: "text.primary",
            borderColor: "divider",
            backgroundColor: "background.default",
            "&:hover": { backgroundColor: "action.hover" },
          }}
        >
          {t("basic.cancel")}
        </Button>
        {dialogMode === "add-stream" ? (
          <Button
            variant="contained"
            onClick={addNewStream}
            disabled={saving}
            sx={{ minWidth: 120, fontWeight: 600 }}
          >
            {t("basic.save")}
          </Button>
        ) : dialogMode === "replicate-stream" ? (
          <Button
            variant="contained"
            onClick={replicateStream}
            disabled={saving}
            sx={{ minWidth: 120, fontWeight: 600 }}
          >
            {t("basic.save")}
          </Button>
        ) : dialogMode === "edit-stream" ? (
          <Button
            variant="contained"
            onClick={saveStreamInfo}
            disabled={saving}
            sx={{ minWidth: 120, fontWeight: 600 }}
          >
            {t("basic.save")}
          </Button>
        ) : dialogMode === "edit-task" ? (
          <Button
            variant="contained"
            onClick={saveTaskInfo}
            disabled={saving}
            sx={{ minWidth: 120, fontWeight: 600 }}
          >
            {t("basic.save")}
          </Button>
        ) : dialogMode === "edit-milestone" ? (
          <>
            <Button
              variant="outlined"
              color="error"
              onClick={removeMilestoneLink}
              disabled={
                saving || !String(formData.milestoneTaskId || "").trim()
              }
            >
              {t("basic.remove")}
            </Button>
            <Button
              variant="contained"
              onClick={saveMilestoneLink}
              disabled={saving || milestoneCandidates.length === 0}
              sx={{ minWidth: 120, fontWeight: 600 }}
            >
              {t("basic.save")}
            </Button>
          </>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};

export default WorkbenchSettingsDialog;
