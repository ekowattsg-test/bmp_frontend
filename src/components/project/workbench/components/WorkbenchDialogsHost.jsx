import React from "react";
import InventoryPlanningDialog from "./InventoryPlanningDialog";
import InventoryOverviewDialog from "./InventoryOverviewDialog";
import ManpowerOverviewDialog from "./ManpowerOverviewDialog";
import ManpowerPlanningDialog from "./ManpowerPlanningDialog";
import TaskStatusUpdateDialog from "./TaskStatusUpdateDialog";
import SkillCreateDialog from "./SkillCreateDialog";
import SkillOverviewDialog from "./SkillOverviewDialog";
import SkillPlanningDialog from "./SkillPlanningDialog";
import WorkbenchHelpDialog from "./WorkbenchHelpDialog";
import WorkbenchSettingsDialog from "./WorkbenchSettingsDialog";
import WorkbenchSettingsMenu from "./WorkbenchSettingsMenu";

const WorkbenchDialogsHost = ({
  workbenchHelpOpen,
  setWorkbenchHelpOpen,
  settingsOpen,
  closeSettings,
  dialogMode,
  settingsTarget,
  settingsError,
  formData,
  setFormData,
  taskTypeMetaByCode,
  taskAssigneeOptions,
  parentCandidates,
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
  inventoryPlanningOpen,
  setInventoryPlanningOpen,
  inventoryPlanningTarget,
  inventoryPlanningError,
  inventoryPlanningTab,
  setInventoryPlanningTab,
  inventoryPlanningLoading,
  inventoryDraft,
  setInventoryDraft,
  setInventoryPlanningError,
  formatDate,
  getAvailableProductOptions,
  stockProductOptions,
  assetProductOptions,
  getInventoryRows,
  addPlanningProduct,
  removePlanningRow,
  getAvailableBundleOptions,
  getBundleId,
  getBundleName,
  addPlanningBundle,
  manpowerPlanningOpen,
  setManpowerPlanningOpen,
  manpowerPlanningTarget,
  manpowerPlanningError,
  manpowerPlanningDates,
  activeManpowerPlanningDate,
  setManpowerPlanningDate,
  manpowerProjectSkillFilters,
  manpowerSkillFilter,
  setManpowerSkillFilter,
  manpowerPlanningLoading,
  manpowerRowsForActiveDate,
  manpowerPlanningRows,
  manpowerDropdownOptionsForActiveDate,
  manpowerStaffNameById,
  manpowerStaffSkillsById,
  manpowerStaffOptions,
  manpowerStaffSkillMap,
  updateManpowerRow,
  saveManpowerDeploymentPlan,
  skillPlanningOpen,
  setSkillPlanningOpen,
  skillPlanningTarget,
  skillPlanningLoading,
  skillPlanningError,
  skillDraft,
  setSkillDraft,
  availableSkillOptions,
  toLongId,
  skillPlanningRows,
  setSkillPlanningError,
  skillSaveLockedByManpower,
  saveSkillAssignment,
  removeSkillAssignment,
  openCreateSkillDialog,
  skillById,
  skillCreateOpen,
  skillCreateLoading,
  skillCreateError,
  skillCreateForm,
  skillCategoryOptions,
  setSkillCreateOpen,
  setSkillCreateError,
  setSkillCreateForm,
  saveNewSkillDefinition,
  taskStatusUpdateOpen,
  taskStatusUpdateTarget,
  taskStatusUpdateDate,
  taskStatusUpdateError,
  taskStatusUpdateSaving,
  setTaskStatusUpdateDate,
  closeTaskStatusUpdateDialog,
  saveTaskStatusUpdate,
  menuAnchorEl,
  menuTarget,
  closeSettingsMenu,
  collapsedStreamIds,
  tasks,
  openAddTaskDialog,
  openStreamEditor,
  openReplicateStreamDialog,
  toggleStreamTasks,
  removeStream,
  openTaskEditor,
  openMilestoneDialog,
  startMoveMode,
  handleDeleteTaskFromMenu,
  taskDeleteBlockedReason,
  inventoryOverviewOpen,
  setInventoryOverviewOpen,
  setInventoryOverviewRowsReady,
  projectCode,
  inventoryOverviewViewMode,
  setInventoryOverviewViewMode,
  inventoryOverviewLoading,
  inventoryOverviewRowsReady,
  inventoryOverviewError,
  inventoryOverviewRows,
  inventoryOverviewTimelineWidth,
  inventoryOverviewUpperSegments,
  inventoryOverviewActiveCols,
  inventoryOverviewColWidth,
  isCurrentPeriodColumn,
  getUsageValue,
  getUsageDetailsTable,
  manpowerOverviewOpen,
  setManpowerOverviewOpen,
  setManpowerOverviewRowsReady,
  manpowerOverviewViewMode,
  setManpowerOverviewViewMode,
  manpowerOverviewLoading,
  manpowerOverviewRowsReady,
  manpowerOverviewError,
  manpowerOverviewRows,
  manpowerOverviewTimelineWidth,
  manpowerOverviewUpperSegments,
  manpowerOverviewActiveCols,
  manpowerOverviewColWidth,
  getManpowerUsageValue,
  getManpowerUsageDetailsTable,
  skillOverviewOpen,
  setSkillOverviewOpen,
  setSkillOverviewRowsReady,
  skillOverviewViewMode,
  setSkillOverviewViewMode,
  skillOverviewLoading,
  skillOverviewRowsReady,
  skillOverviewError,
  skillOverviewRows,
  skillOverviewTimelineWidth,
  skillOverviewUpperSegments,
  skillOverviewActiveCols,
  skillOverviewColWidth,
  getSkillUsageValue,
  getSkillUsageDetailsTable,
}) => {
  return (
    <>
      <WorkbenchHelpDialog
        open={workbenchHelpOpen}
        onClose={() => setWorkbenchHelpOpen(false)}
      />

      <TaskStatusUpdateDialog
        open={taskStatusUpdateOpen}
        task={taskStatusUpdateTarget}
        dateValue={taskStatusUpdateDate}
        error={taskStatusUpdateError}
        saving={taskStatusUpdateSaving}
        onDateChange={setTaskStatusUpdateDate}
        onClose={closeTaskStatusUpdateDialog}
        onConfirm={saveTaskStatusUpdate}
      />

      <WorkbenchSettingsDialog
        open={settingsOpen}
        onClose={closeSettings}
        dialogMode={dialogMode}
        settingsTarget={settingsTarget}
        settingsError={settingsError}
        formData={formData}
        setFormData={setFormData}
        taskTypeMetaByCode={taskTypeMetaByCode}
        taskAssigneeOptions={taskAssigneeOptions}
        parentCandidates={parentCandidates}
        milestoneCandidates={milestoneCandidates}
        childTaskData={childTaskData}
        setChildTaskData={setChildTaskData}
        streamCreatableTaskTypeOptions={streamCreatableTaskTypeOptions}
        taskCreatableTaskTypeOptions={taskCreatableTaskTypeOptions}
        saving={saving}
        createChildTask={createChildTask}
        addNewStream={addNewStream}
        replicateStream={replicateStream}
        saveStreamInfo={saveStreamInfo}
        saveTaskInfo={saveTaskInfo}
        removeMilestoneLink={removeMilestoneLink}
        saveMilestoneLink={saveMilestoneLink}
        addDays={addDays}
        toApiDate={toApiDate}
      />

      <InventoryPlanningDialog
        open={inventoryPlanningOpen}
        onClose={() => setInventoryPlanningOpen(false)}
        target={inventoryPlanningTarget}
        error={inventoryPlanningError}
        tab={inventoryPlanningTab}
        onTabChange={setInventoryPlanningTab}
        loading={inventoryPlanningLoading}
        draft={inventoryDraft}
        onDraftChange={(updates) =>
          setInventoryDraft((prev) => ({
            ...prev,
            ...updates,
          }))
        }
        onErrorChange={setInventoryPlanningError}
        formatDate={formatDate}
        getAvailableProductOptions={getAvailableProductOptions}
        stockProductOptions={stockProductOptions}
        assetProductOptions={assetProductOptions}
        getInventoryRows={getInventoryRows}
        addPlanningProduct={addPlanningProduct}
        removePlanningRow={removePlanningRow}
        getAvailableBundleOptions={getAvailableBundleOptions}
        getBundleId={getBundleId}
        getBundleName={getBundleName}
        addPlanningBundle={addPlanningBundle}
      />

      <ManpowerPlanningDialog
        open={manpowerPlanningOpen}
        onClose={() => setManpowerPlanningOpen(false)}
        target={manpowerPlanningTarget}
        error={manpowerPlanningError}
        dates={manpowerPlanningDates}
        activeDate={activeManpowerPlanningDate}
        onDateChange={setManpowerPlanningDate}
        projectSkillFilters={manpowerProjectSkillFilters}
        skillFilter={manpowerSkillFilter}
        onSkillFilterChange={setManpowerSkillFilter}
        loading={manpowerPlanningLoading}
        rowsForActiveDate={manpowerRowsForActiveDate}
        planningRows={manpowerPlanningRows}
        dropdownOptionsForActiveDate={manpowerDropdownOptionsForActiveDate}
        staffNameById={manpowerStaffNameById}
        staffSkillsById={manpowerStaffSkillsById}
        staffOptions={manpowerStaffOptions}
        staffSkillMap={manpowerStaffSkillMap}
        onUpdateRow={updateManpowerRow}
        onSave={saveManpowerDeploymentPlan}
      />

      <SkillPlanningDialog
        open={skillPlanningOpen}
        onClose={() => setSkillPlanningOpen(false)}
        target={skillPlanningTarget}
        loading={skillPlanningLoading}
        error={skillPlanningError}
        draft={skillDraft}
        onDraftChange={(updates) =>
          setSkillDraft((prev) => ({
            ...prev,
            ...updates,
          }))
        }
        availableSkillOptions={availableSkillOptions}
        toLongId={toLongId}
        rows={skillPlanningRows}
        onErrorChange={setSkillPlanningError}
        saveLockedByManpower={skillSaveLockedByManpower}
        onSave={saveSkillAssignment}
        onRemove={removeSkillAssignment}
        onOpenCreateSkillDialog={openCreateSkillDialog}
        skillById={skillById}
      />

      <SkillCreateDialog
        open={skillCreateOpen}
        loading={skillCreateLoading}
        error={skillCreateError}
        form={skillCreateForm}
        categoryOptions={skillCategoryOptions}
        onClose={() => {
          if (skillCreateLoading) return;
          setSkillCreateOpen(false);
          setSkillCreateError("");
        }}
        onFormChange={(updates) =>
          setSkillCreateForm((prev) => ({
            ...prev,
            ...updates,
          }))
        }
        onSave={saveNewSkillDefinition}
      />

      <WorkbenchSettingsMenu
        anchorEl={menuAnchorEl}
        menuTarget={menuTarget}
        onClose={closeSettingsMenu}
        collapsedStreamIds={collapsedStreamIds}
        tasks={tasks}
        onOpenAddTaskDialog={openAddTaskDialog}
        onOpenStreamEditor={openStreamEditor}
        onOpenReplicateStreamDialog={openReplicateStreamDialog}
        onToggleStreamTasks={toggleStreamTasks}
        onRemoveStream={removeStream}
        onOpenTaskEditor={openTaskEditor}
        onOpenMilestoneDialog={openMilestoneDialog}
        onStartMoveMode={startMoveMode}
        onDeleteTask={handleDeleteTaskFromMenu}
        taskDeleteBlockedReason={taskDeleteBlockedReason}
      />

      <InventoryOverviewDialog
        open={inventoryOverviewOpen}
        onClose={() => {
          setInventoryOverviewOpen(false);
          setInventoryOverviewRowsReady(false);
        }}
        projectCode={projectCode}
        viewMode={inventoryOverviewViewMode}
        onViewModeChange={setInventoryOverviewViewMode}
        loading={inventoryOverviewLoading}
        rowsReady={inventoryOverviewRowsReady}
        error={inventoryOverviewError}
        rows={inventoryOverviewRows}
        timelineWidth={inventoryOverviewTimelineWidth}
        upperSegments={inventoryOverviewUpperSegments}
        activeCols={inventoryOverviewActiveCols}
        colWidth={inventoryOverviewColWidth}
        isCurrentPeriodColumn={isCurrentPeriodColumn}
        getUsageValue={getUsageValue}
        getUsageDetailsTable={getUsageDetailsTable}
      />

      <ManpowerOverviewDialog
        open={manpowerOverviewOpen}
        onClose={() => {
          setManpowerOverviewOpen(false);
          setManpowerOverviewRowsReady(false);
        }}
        projectCode={projectCode}
        viewMode={manpowerOverviewViewMode}
        onViewModeChange={setManpowerOverviewViewMode}
        loading={manpowerOverviewLoading}
        rowsReady={manpowerOverviewRowsReady}
        error={manpowerOverviewError}
        rows={manpowerOverviewRows}
        timelineWidth={manpowerOverviewTimelineWidth}
        upperSegments={manpowerOverviewUpperSegments}
        activeCols={manpowerOverviewActiveCols}
        colWidth={manpowerOverviewColWidth}
        isCurrentPeriodColumn={isCurrentPeriodColumn}
        getManpowerUsageValue={getManpowerUsageValue}
        getManpowerUsageDetailsTable={getManpowerUsageDetailsTable}
      />

      <SkillOverviewDialog
        open={skillOverviewOpen}
        onClose={() => {
          setSkillOverviewOpen(false);
          setSkillOverviewRowsReady(false);
        }}
        projectCode={projectCode}
        viewMode={skillOverviewViewMode}
        onViewModeChange={setSkillOverviewViewMode}
        loading={skillOverviewLoading}
        rowsReady={skillOverviewRowsReady}
        error={skillOverviewError}
        rows={skillOverviewRows}
        timelineWidth={skillOverviewTimelineWidth}
        upperSegments={skillOverviewUpperSegments}
        activeCols={skillOverviewActiveCols}
        colWidth={skillOverviewColWidth}
        isCurrentPeriodColumn={isCurrentPeriodColumn}
        getSkillUsageValue={getSkillUsageValue}
        getSkillUsageDetailsTable={getSkillUsageDetailsTable}
      />
    </>
  );
};

export default WorkbenchDialogsHost;
