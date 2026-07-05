import React from "react";
import WorkbenchDialogsHost from "./WorkbenchDialogsHost";
import WorkbenchProjectSummary from "./WorkbenchProjectSummary";
import WorkbenchTimelinePanel from "./WorkbenchTimelinePanel";

const WorkbenchLoadedView = ({
  projectSummaryProps,
  timelinePanelProps,
  dialogsHostBaseProps,
  settingsDialogProps,
  inventoryPlanningDialogProps,
  manpowerPlanningDialogProps,
  skillPlanningDialogProps,
  skillCreateDialogProps,
  taskStatusUpdateDialogProps,
  settingsMenuProps,
  inventoryOverviewDialogProps,
  manpowerOverviewDialogProps,
  skillOverviewDialogProps,
}) => {
  const dialogsHostProps = {
    ...dialogsHostBaseProps,
    ...settingsDialogProps,
    ...inventoryPlanningDialogProps,
    ...manpowerPlanningDialogProps,
    ...skillPlanningDialogProps,
    ...skillCreateDialogProps,
    ...taskStatusUpdateDialogProps,
    ...settingsMenuProps,
    ...inventoryOverviewDialogProps,
    ...manpowerOverviewDialogProps,
    ...skillOverviewDialogProps,
  };

  return (
    <>
      <WorkbenchProjectSummary {...projectSummaryProps} />
      <WorkbenchTimelinePanel {...timelinePanelProps} />
      <WorkbenchDialogsHost {...dialogsHostProps} />
    </>
  );
};

export default WorkbenchLoadedView;
