export const PHASE = {
  START: "START",
  FROM: "FROM",
  SCAN: "SCAN",
  PHOTO: "PHOTO",
  TO: "TO",
  CONFIRM: "CONFIRM",
};

export const STATUS_COLOR = {
  OPEN: "default",
  ISSUED: "info",
  INPROGRESS: "warning",
  CLOSED: "success",
  CANCELLED: "error",
};

export const STEP_SUBSTEP_MODULES = {
  [PHASE.FROM]: {
    key: "fromEntity",
    description: "Resolve and confirm fromLocation entity",
  },
  [PHASE.SCAN]: {
    key: "scanData",
    description: "Collect or confirm scan data",
  },
  [PHASE.PHOTO]: {
    key: "photo",
    description: "Capture and persist step photos",
  },
  [PHASE.TO]: {
    key: "toEntity",
    description: "Resolve and confirm toLocation entity",
  },
  [PHASE.CONFIRM]: {
    key: "confirmation",
    description: "Final step confirmation before execution",
  },
};

export function getPhaseFromStepStatus(stepStatus) {
  if (stepStatus === "OPEN") return PHASE.FROM;
  if (stepStatus === "INPROGRESS") return PHASE.SCAN;
  return null;
}

export function buildInitialStepPhases(steps) {
  const phases = {};
  (steps || []).forEach((step) => {
    const phase = getPhaseFromStepStatus(step.stepStatus);
    if (phase) {
      phases[step.workStepsId] = phase;
    }
  });
  return phases;
}

export function getNextPhaseAfterScan(typeConfig) {
  const takePhoto = Number(typeConfig?.takePhoto ?? 0);
  return takePhoto > 0 ? PHASE.PHOTO : PHASE.TO;
}

export function getNextPhaseAfterTo() {
  return PHASE.CONFIRM;
}

export function getEffectiveScanData({
  contentType,
  scanData,
  workByStaffId,
  currentStaffId,
}) {
  const normalizedScanData = Number(scanData ?? 0);
  const workerMismatch =
    contentType === "worker" &&
    normalizedScanData === 0 &&
    String(workByStaffId || "")
      .trim()
      .toLowerCase() !==
      String(currentStaffId || "")
        .trim()
        .toLowerCase();
  return workerMismatch ? 1 : normalizedScanData;
}
