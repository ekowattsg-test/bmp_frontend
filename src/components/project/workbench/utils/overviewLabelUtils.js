const normalizeText = (value) => String(value || "").trim();

const formatTaskLabel = (taskName, taskId) => {
  if (taskName) return taskName;
  if (taskId) return `Task ${taskId}`;
  return "";
};

const joinStreamTask = (streamName, taskLabel) => {
  if (streamName && taskLabel) return `${streamName} / ${taskLabel}`;
  return streamName || taskLabel || "-";
};

export const buildOverviewResourceLabel = ({
  item,
  taskById,
  streamNameById,
  fallbackLabel,
}) => {
  const taskId = normalizeText(item?.projectTaskId || item?.taskId);
  const streamId = normalizeText(item?.projectStreamId || item?.streamId);

  const task = taskId ? taskById?.[taskId] : null;
  const hasResolvedTask = Boolean(task);

  const taskName =
    normalizeText(item?.taskName) ||
    normalizeText(task?.taskName) ||
    normalizeText(item?.activityName);

  const inferredStreamId =
    streamId || normalizeText(task?.projectStreamId || task?.streamId);

  const streamName =
    normalizeText(item?.streamName) ||
    normalizeText(task?.streamName) ||
    normalizeText(streamNameById?.[inferredStreamId]);

  const taskLabel = formatTaskLabel(taskName, taskId);

  // API does not return parent type; infer parent from IDs.
  if (hasResolvedTask) {
    return joinStreamTask(streamName, taskLabel);
  }

  if (inferredStreamId || streamName) {
    return streamName || normalizeText(fallbackLabel) || "-";
  }

  return normalizeText(fallbackLabel) || "-";
};
