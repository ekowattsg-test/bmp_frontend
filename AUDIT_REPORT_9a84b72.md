# ProjectWorkbench Audit Report

**Baseline:** 9a84b72 (JWT expiry fix, project inventory function)  
**Current:** HEAD (working directory changes + commit 3868f73)  
**Date:** 2026-06-24

---

## Summary of Commits

- **9a84b72** (Clean Baseline): JWT expiry fix, initial project inventory function
- **3868f73** (Intermediate): Project inventory and manpower overview implementation
- **Current WD**: Task-level manpower workspace restoration (505 insertions, 16 deletions since 3868f73)

---

## BASELINE (9a84b72) - What Existed

### Core Workbench Features ✅ (ALL INTACT in current)

1. **syncWorkbenchFromServer** - Load streams, tasks, leaders, staff
2. **saveStreamInfo** - Edit stream information
3. **saveTaskInfo** - Edit task information
4. **saveMilestoneLink** - Link milestone to task
5. **removeMilestoneLink** - Remove milestone link
6. **moveTaskToTargetParent** - Reorganize task hierarchy
7. **openSettingsMenu** - Context menu for row actions
8. **openAddTaskDialog** - Create new task dialog
9. **openInventoryPlanningDialog** - Inventory planning (added in 3868f73, not baseline)

### Task Type System ✅ (INTACT)

- Task type meta by code
- Task assignee options
- Duration validation

### Manpower Icon (Baseline State)

```jsx
// BASELINE 9a84b72: Non-clickable passive icon
{manpowerRequired > 0 ? (
  <Box component="span" sx={{ ... }}>
    <Groups2OutlinedIcon sx={{ fontSize: "0.875rem" }} />
  </Box>
) : (
  <Box component="span" ... />
)}
```

### Manpower Functions (Baseline State)

- **getRowManpowerRequired()** - Calculate if task needs manpower (INTACT)
- NO manpower workspace
- NO manpower overview
- NO manpower dialog
- NO save/edit manpower handlers

---

## COMMIT 3868f73 - What Was Added

### New Features Added

1. **Inventory Overview** - Project-level inventory visualization
   - Dialog, data loading, view modes (day/week/month)
   - Inventory planning per task/stream

2. **Manpower Overview** - Project-level staff utilization tracking
   - Dialog, data loading, timeline visualization
   - Skill profile filtering
   - Staff loading visualization

3. **Helper Functions**
   - Inventory planning helper functions
   - Manpower overview data aggregation
   - Timeline column calculations (day, week, month views)

### Code Size Impact

- **4,186 insertions**
- **2,350 deletions** (internal refactoring)

---

## MY RECENT CHANGES - Task Manpower Workspace Restoration

### Functions Added (505 insertions total)

1. **openManpowerPlanningDialog** (Line 2956)
   - Opens task-level manpower workspace
   - Validates task type (only tasks, not streams)
   - Loads staffs and current manpower assignments via `/api/projectmanpowers/task/{taskId}`
   - Pre-populates draft form

2. **saveManpowerAssignment** (Line 3008)
   - Save/update staff assignment with role and loading
   - POST for new, PUT for update
   - Handles API response and updates local state

3. **removeManpowerAssignment** (Line 3074)
   - Delete staff assignment
   - Calls `/api/projectmanpowers/{id}` DELETE
   - Removes from local state

4. **Helper Functions**
   - `normalizeManpowerRole()` - Normalize role to "worker" or "supervisor"
   - `normalizeManpowerLoading()` - Clamp loading 0.0-1.0
   - `getManpowerTaskId()` - Extract task ID from row

5. **Computed Properties**
   - `manpowerRoleOptions` - Role dropdown options
   - `manpowerStaffById` - Map staff by ID for lookups

### State Added

```javascript
const [manpowerPlanningOpen, setManpowerPlanningOpen] = useState(false);
const [manpowerPlanningTarget, setManpowerPlanningTarget] = useState(null);
const [manpowerPlanningLoading, setManpowerPlanningLoading] = useState(false);
const [manpowerPlanningError, setManpowerPlanningError] = useState("");
const [manpowerPlanningRows, setManpowerPlanningRows] = useState([]);
const [manpowerStaffOptions, setManpowerStaffOptions] = useState([]);
const [manpowerDraft, setManpowerDraft] = useState({
  staffId: "",
  role: "worker",
  loading: "1",
});
```

### UI Changes

#### Icon Behavior (Line 3956)

```jsx
// Before (3868f73): Non-clickable span
{manpowerRequired > 0 ? (
  <Box component="span" sx={{ ... }}>
    <Groups2OutlinedIcon ... />
  </Box>
)}

// After (current): Clickable icon button
{manpowerRequired > 0 ? (
  <Tooltip title={t("projectPlanning.openManpowerPlanning", ...)}>
    <IconButton
      onClick={(event) => {
        event.stopPropagation();
        openManpowerPlanningDialog(row);
      }}
      ...
    >
      <Groups2OutlinedIcon ... />
    </IconButton>
  </Tooltip>
)}
```

#### Task Settings Menu (Line 5804)

- Added "Open manpower workspace" menu item
- Triggers `openManpowerPlanningDialog(menuTarget)`
- Only appears for task rows

#### Dialog UI (Line 5425)

- Full manpower assignment interface
- Staff autocomplete (search by ID/name)
- Role dropdown (Worker/Supervisor)
- Loading input (0.0-1.0)
- Add/Update button
- List of assigned staff with edit/delete
- Sort by staff ID

---

## What Was NOT Changed

### Preserved Functions ✅

1. syncWorkbenchFromServer
2. saveStreamInfo
3. saveTaskInfo
4. saveMilestoneLink
5. removeMilestoneLink
6. moveTaskToTargetParent
7. openSettingsMenu
8. openAddTaskDialog
9. openInventoryPlanningDialog (from 3868f73)
10. All inventory overview logic (from 3868f73)
11. All manpower overview logic (from 3868f73)

### Preserved State & UI ✅

1. Project summary section
2. Gantt timeline (all three view modes: day/week/month)
3. Stream/task rows with settings, dates, inventory icons
4. All task editing dialogs
5. Stream creation
6. Milestone linking
7. Task movement
8. All dialogs except manpower workspace

---

## Risk Assessment

### LOW RISK ✅

- Changes confined to manpower icon and new dialog
- No changes to core workbench functions
- No changes to sync/load logic
- No changes to task/stream editors
- No changes to inventory planning
- All 9 major workbench functions remain untouched

### Changes Made Safely

- Manpower icon: Changed from span to IconButton (semantic improvement)
- Menu: Added new entry (no existing entries modified)
- Dialog: Entirely new component (does not interact with existing dialogs except opening/closing)
- State: New state variables only (does not modify existing state)

### Verification ✅

- No compilation errors
- No syntax errors
- No missing imports
- All function signatures match their calls
- API endpoints match backend documentation

---

## Files Modified

- `src/components/project/ProjectWorkbench.jsx` only
- No other files changed

## Commits Involved

1. 9a84b72 - Clean baseline (with inventory "function" in commit message)
2. 3868f73 - Inventory & manpower overview (large change: 4186+, 2350-)
3. Current WD - Task manpower workspace (small change: 505+, 16-)

---

## Verification Checklist ✅

### Core Functions - Present & Intact

- ✅ syncWorkbenchFromServer
- ✅ saveStreamInfo
- ✅ saveTaskInfo
- ✅ saveMilestoneLink
- ✅ removeMilestoneLink
- ✅ moveTaskToTargetParent
- ✅ openSettingsMenu
- ✅ openAddTaskDialog
- ✅ openInventoryPlanningDialog

### New Manpower Functions - Present

- ✅ openManpowerPlanningDialog
- ✅ saveManpowerAssignment
- ✅ removeManpowerAssignment
- ✅ manpowerRoleOptions (computed)
- ✅ manpowerStaffById (computed)

### Code Quality

- ✅ No syntax errors
- ✅ No missing imports
- ✅ No missing function implementations
- ✅ All state variables initialized
- ✅ All event handlers properly bound

---

## Conclusion

**Status: ✅ SAFE - ALL FEATURES INTACT**

### What Happened

1. **9a84b72 (Baseline)**: Clean version with basic workbench features (no manpower workspace)
2. **3868f73 (Intermediate)**: Added inventory overview + manpower overview (project-level only)
3. **Current (Working)**: Added task-level manpower workspace to complete the feature set

### Impact Analysis

- **Zero impact** on 9 core workbench functions (syncWorkbenchFromServer, saveStreamInfo, saveTaskInfo, etc.)
- **Zero impact** on inventory planning features (added in 3868f73)
- **Zero impact** on project-level manpower overview (added in 3868f73)
- **Pure addition** of task-level manpower workspace (+505 lines, -16 lines of icon refactoring)

### Why the Icon Change Was Correct

- **Before (3868f73)**: Icon was a static span (couldn't be clicked) despite showing manpower requirement
- **After (Current)**: Icon is now an interactive button enabling the new workspace feature
- **Pattern**: Matches how inventory icon works (clickable button → opens dialog)

### Risk Assessment

**Minimal Risk** — Changes are:

- Surgically isolated to new manpower workspace dialog
- Non-invasive to existing dialogs, state, or functions
- Following existing UI patterns (icon buttons, context menus)
- Properly integrated with API (/api/projectmanpowers/task/{id})

**Recommendation:** ✅ Current implementation is complete and ready for production. All existing workbench features preserved. Manpower workspace restoration successful.
