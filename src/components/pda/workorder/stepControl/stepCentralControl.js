import {
  STEP_SUBSTEP_MODULES,
  getEffectiveScanData,
} from "./stepSubstepModules";
import { resolveEntityModule } from "./entityModules";

export function getActiveStep(steps) {
  return (steps || []).find((step) => step.stepStatus !== "DONE") || null;
}

export function getActiveStepId(steps) {
  return getActiveStep(steps)?.workStepsId ?? null;
}

export function buildStepRuntimeModel({
  step,
  stepPhases,
  stepPhotos,
  contentType,
  workByStaffId,
  currentStaffId,
}) {
  const tc = step?._typeConfig || null;
  const phase = stepPhases?.[step?.workStepsId];
  const photos = stepPhotos?.[step?.workStepsId] || [];
  const scanData = Number(tc?.scanData ?? 0);
  const takePhoto = Number(tc?.takePhoto ?? 0);
  const noConfirm = Number(tc?.noConfirm ?? tc?.noconfirm ?? 0) === 1;
  const fromEntityModule = resolveEntityModule(tc?.fromEntity);
  const toEntityModule = resolveEntityModule(tc?.toEntity);
  const effectiveScanData = getEffectiveScanData({
    contentType,
    scanData,
    workByStaffId,
    currentStaffId,
  });

  return {
    tc,
    phase,
    photos,
    scanData,
    takePhoto,
    noConfirm,
    effectiveScanData,
    fromEntityModule,
    toEntityModule,
    activeSubstepModule: STEP_SUBSTEP_MODULES[phase] || null,
  };
}

export function createStepCentralControl({
  steps,
  stepPhases,
  stepPhotos,
  contentType,
  workByStaffId,
  currentStaffId,
}) {
  return {
    getActiveStep: () => getActiveStep(steps),
    getActiveStepId: () => getActiveStepId(steps),
    getRuntimeModel: (step) =>
      buildStepRuntimeModel({
        step,
        stepPhases,
        stepPhotos,
        contentType,
        workByStaffId,
        currentStaffId,
      }),
  };
}
