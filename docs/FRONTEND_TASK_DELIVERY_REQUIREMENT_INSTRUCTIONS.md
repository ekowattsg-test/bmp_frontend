# Frontend Instructions: Task Inventory Delivery Order Generation

## Overview

Build a new frontend page that lets the user:

1. Extract project task inventory requirements for tasks starting **next week** (Mon–Sun, rolling).
2. Review each requirement with **required quantity** and **central warehouse available quantity**.
3. Adjust the **delivery quantity** and select lines.
4. Generate **Delivery Orders (DO)** for the selected lines, grouped by `projectCode + deliveryDate`.

This feature mirrors the existing **Inventory Requisition** page (`src/components/information/InventoryRequisitionModern.jsx`) and should be placed in the same module area.

---

## Backend endpoints (to be available after backend implementation)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET    | `/api/taskdeliveryrequirements` | List/filter extracted requirements |
| GET    | `/api/taskdeliveryrequirements/week/{weekStartDate}` | Get requirements for a specific week (YYYY-MM-DD) |
| POST   | `/api/taskdeliveryrequirements/extract?weekStartDate=YYYY-MM-DD` | Trigger extraction for a week |
| POST   | `/api/taskdeliveryrequirements/generate-do` | Generate DOs from selected rows |
| PUT    | `/api/taskdeliveryrequirements/{id}` | Update `deliveryQuantity` / `selected` |
| GET    | `/api/taskdeliveryrequirements/{id}` | Get single requirement |
| DELETE | `/api/taskdeliveryrequirements/{id}` | Delete requirement |

### Entity fields returned by the backend

```json
{
  "taskDeliveryRequirementId": 1,
  "projectCode": "P001",
  "projectTaskId": 123,
  "activityId": 123,
  "activityName": "Stream A / Task X",
  "inventoryType": "Stock",
  "inventoryId": 456,
  "productId": 789,
  "productCode": "PROD-001",
  "productName": "Product Name",
  "productUom": "pcs",
  "requiredQuantity": 100,
  "availableQuantity": 60,
  "deliveryQuantity": 60,
  "selected": 0,
  "status": "EXTRACTED",
  "weekStartDate": "2026-08-24",
  "extractionDate": "2026-08-20",
  "deliveryOrderId": null,
  "deliveryDate": null
}
```

- `status`: `EXTRACTED`, `SELECTED`, or `GENERATED`
- `selected`: `0` or `1`
- `deliveryDate` is user-editable before generation. Default to the task's `taskStartDate` (the Monday of the target week or the actual task start date). For the first version, default `deliveryDate` to `weekStartDate`.

---

## Page placement

1. Create the page at:

   ```
   src/components/information/TaskDeliveryRequirementModern.jsx
   ```

2. Register the route in `src/components/MainPage.jsx` under the authenticated routes:

   ```jsx
   import TaskDeliveryRequirementModern from "./information/TaskDeliveryRequirementModern.jsx";
   ```

   ```jsx
   <Route
     path="/task-delivery-requirements"
     element={<TaskDeliveryRequirementModern />}
   />
   ```

3. Add a menu item in `src/layouts/components/Sidebar.jsx` inside the **WorkOrders** section (same section as `requisitionOrders` and `deliveryOrders`):

   ```jsx
   {
     key: "taskDeliveryRequirements",
     label: t("menu.taskDeliveryRequirement", "Task Inventory Dispatch"),
     icon: <LocalShippingIcon fontSize="small" />,
     path: "/task-delivery-requirements",
   }
   ```

4. Add i18n keys in `src/locales/en/translation.json` and `src/locales/zh/translation.json`:

   ```json
   "menu": {
     "taskDeliveryRequirement": "Task Inventory Dispatch"
   },
   "taskDeliveryRequirement": {
     "title": "Task Inventory Dispatch",
     "subtitle": "Extract task inventory requirements for next week and generate delivery orders.",
     "loading": "Loading task inventory requirements...",
     "loadFailed": "Failed to load task inventory requirements.",
     "extract": "Extract Next Week",
     "extracting": "Extracting...",
     "extractFailed": "Failed to extract task inventory requirements.",
     "extractSuccess": "Extraction completed successfully.",
     "generateDo": "Generate Delivery Orders ({{count}} selected)",
     "generatingDo": "Generating Delivery Orders...",
     "generateDoSuccess": "Delivery orders generated successfully.",
     "generateDoFailed": "Failed to generate delivery orders.",
     "noData": "No task inventory requirements found.",
     "noSearchResults": "No requirements match your search.",
     "noDataDescription": "Click Extract Next Week to load requirements.",
     "searchPlaceholder": "Search project, task or product...",
     "cols": {
       "projectCode": "Project",
       "activityName": "Task / Stream",
       "inventoryType": "Type",
       "product": "Product",
       "requiredQuantity": "Required Qty",
       "availableQuantity": "Available Qty",
       "deliveryQuantity": "Delivery Qty",
       "deliveryDate": "Delivery Date",
       "selected": "Select",
       "status": "Status",
       "deliveryOrderId": "DO Id"
     }
   }
   ```

---

## UI behavior

### Page layout (follow existing list-page standards)

```jsx
return (
  <Box>
    <PageHeader
      title={t("taskDeliveryRequirement.title")}
      subtitle={t("taskDeliveryRequirement.subtitle")}
      icon={LocalShippingIcon}
      actionLabel={t("taskDeliveryRequirement.extract")}
      onActionClick={handleExtract}
    />

    <Box sx={{ mb: 3, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
      <TextField
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("taskDeliveryRequirement.searchPlaceholder")}
        size="small"
        sx={{ minWidth: 300 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      <Typography variant="body2" color="text.secondary">
        {t("taskDeliveryRequirement.weekLabel", "Week starting: {{date}}", {
          date: weekStartDate,
        })}
      </Typography>
    </Box>

    {filteredRows.length === 0 && !loading ? (
      <EmptyState
        title={t("taskDeliveryRequirement.noData")}
        description={
          search
            ? t("taskDeliveryRequirement.noSearchResults")
            : t("taskDeliveryRequirement.noDataDescription")
        }
        actionLabel={!search ? t("taskDeliveryRequirement.extract") : null}
        onActionClick={!search ? handleExtract : null}
      />
    ) : (
      <Box sx={{ height: 600, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        <DataGrid
          rows={normalizedRows}
          columns={columns}
          getRowId={(row) => row.taskDeliveryRequirementId}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          pageSizeOptions={[5, 10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight={false}
          checkboxSelection
          onRowSelectionModelChange={handleRowSelectionModelChange}
          rowSelectionModel={rowSelectionModel}
          sx={{
            border: 0,
            "& .MuiDataGrid-cell:focus": { outline: "none" },
            "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
            "& .MuiDataGrid-columnHeaders": { bgcolor: "grey.50", borderRadius: 0 },
          }}
        />
      </Box>
    )}

    {selectedCount > 0 && (
      <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          color="success"
          onClick={handleGenerateDo}
          disabled={saving}
        >
          {saving
            ? t("taskDeliveryRequirement.generatingDo")
            : t("taskDeliveryRequirement.generateDo", { count: selectedCount })}
        </Button>
      </Box>
    )}
  </Box>
);
```

### Key interactions

1. **Week computation on load**
   - Compute `weekStartDate` as the upcoming Monday from today.
   - Call `GET /api/taskdeliveryrequirements/week/{weekStartDate}` on mount.

2. **Extract button**
   - Calls `POST /api/taskdeliveryrequirements/extract?weekStartDate={weekStartDate}`.
   - After success, refresh the list for the same week.

3. **Delivery quantity editing**
   - Use `renderCell`/`renderEditCell` in DataGrid or inline `TextField`.
   - Call `PUT /api/taskdeliveryrequirements/{id}` with `{ deliveryQuantity, selected }` on blur or via a "Save" action.
   - Validate: `0 <= deliveryQuantity <= requiredQuantity` and `deliveryQuantity <= availableQuantity`.
   - If backend rejects, show the backend error.

4. **Selection**
   - Use DataGrid built-in checkbox selection.
   - On selection change, update `selected: 1` for checked rows and `selected: 0` for unchecked rows.
   - Alternatively, batch-update selected rows via PUT before generating DO.

5. **Generate DO button**
   - Build payload from selected rows:
     ```js
     const payload = selectedRows.map((row) => ({
       taskDeliveryRequirementId: row.taskDeliveryRequirementId,
       deliveryQuantity: row.deliveryQuantity,
       deliveryDate: row.deliveryDate,
       selected: 1,
     }));
     ```
   - Call `POST /api/taskdeliveryrequirements/generate-do`.
   - On success, refresh the list and show result summary (`createdDoCount`, `generatedOrderIds`).

6. **Search/filter**
   - Client-side filter by `projectCode`, `activityName`, `productName`, `productCode`, `inventoryType`.

7. **Row normalization**
   - Add `displayProductName`, `displayStatus`, etc. before passing to `DataGrid`.
   - Do not use `valueGetter`.

---

## Reusable components to use

- `PageHeader` from `src/components/common`
- `LoadingState` from `src/components/common`
- `EmptyState` from `src/components/common`
- `request` from `src/helpers/axios_helper`
- `useTranslation` from `react-i18next`
- MUI `DataGrid`, `Box`, `TextField`, `Button`, `InputAdornment`, `Alert`, `Typography`, `Chip`

---

## API integration notes

- Use the existing `request` helper for all HTTP calls.
- Central warehouse stock availability is computed by the backend using `param.mainWarehouse` (value `"central"`). The frontend does **not** need to pass the warehouse code.
- The backend sets `deliveryQuantity` default to `min(requiredQuantity, availableQuantity)`. The frontend should still allow the user to change it.
- `deliveryDate` default is the same as `weekStartDate` for the first version. Provide an inline date picker if UX requires it.

---

## DataGrid column suggestions

| Field | Header | Notes |
|-------|--------|-------|
| `projectCode` | Project | sortable |
| `activityName` | Task / Stream | sortable |
| `inventoryType` | Type | e.g. Asset, Stock, Bundle |
| `productName` + `productCode` | Product | combine as `displayProduct` |
| `requiredQuantity` | Required Qty | right-aligned |
| `availableQuantity` | Available Qty | right-aligned; color red if `< requiredQuantity` |
| `deliveryQuantity` | Delivery Qty | editable number field |
| `deliveryDate` | Delivery Date | editable date field (default `weekStartDate`) |
| `selected` | Select | checkbox |
| `status` | Status | Chip |
| `deliveryOrderId` | DO Id | link to `/deliveryorder` detail if available |

---

## Error handling

- Show `Alert severity="error"` for load/extract/generate errors.
- Show `Alert severity="success"` for successful generate.
- Disable action buttons while `loading` or `saving`.

---

## Files to modify/create

1. **Create** `src/components/information/TaskDeliveryRequirementModern.jsx`
2. **Modify** `src/components/MainPage.jsx` → add route
3. **Modify** `src/layouts/components/Sidebar.jsx` → add menu item
4. **Modify** `src/locales/en/translation.json` → add English keys
5. **Modify** `src/locales/zh/translation.json` → add Chinese keys (if maintained)

---

## Out of scope for frontend

- No scheduling/cron logic (handled by n8n calling the extract endpoint).
- No direct stock quantity calculation (handled by backend using `stock_view` filtered by `mainWarehouse`).
- No DO lifecycle management after generation (use existing Delivery Order pages).
