# Backend Change Request — Stock-Out Movement Traceability

## Affected file

`bmp_backend/src/main/java/com/hcteol/jwt/backend/services/WorkStepsService.java`

## Target block

The `case "stock-out":` branch inside `performCurrentStep(String workOrderId)`.

Current behaviour (around lines 305–374):

- `actionedByOut` is resolved from `workOrder.workBy` via staff lookup.
- `refCandidate` is resolved from `inProgress.getToLocation()` (worker) via staff lookup.
- Each created `StockMovement` gets:
  - `reference = refCandidate` (currently the worker name)
  - `actionBy = actionedByOut` (currently the worker name)

This is incorrect for the Stock Issue (Drawing) flow. The worker is the recipient; the operator running the function is the person who actioned the movement, and the movement should be traceable to the work order document.

## Required change

Replace the `actionedByOut` and `refCandidate` computation with values taken directly from the work order and step context:

1. **`StockMovement.reference`** must be set to the created `workOrderId`.
   - This links every generated movement record to its originating work order / issue document.
2. **`StockMovement.actionBy`** must be set to `workOrder.issuedBy`.
   - The frontend sends the operator's login username in `WorkOrder.issuedBy`.
   - This field should record the user who actually ran the stock-out function.

The recipient worker information is still required elsewhere (work order header, PDF, toLocation), but it must **not** be written into these two movement fields.

## Suggested implementation

Locate the block starting at:

```java
            case "stock-out": {
                String fromLocation = inProgress.getFromLocation();
                if (!ignoreFromLocation && (fromLocation == null || fromLocation.isBlank())) {
                    throw new IllegalStateException("Source location (fromLocation) not set on step record for stock-out action");
                }
```

Replace everything from the `String actionedByOut = null;` line through the `if (refCandidate == null) { refCandidate = def.getToEntity(); }` block with:

```java
                // actionBy = the operator who created/issued the work order
                String actionedByOut = wo.getIssuedBy();
                if (actionedByOut == null || actionedByOut.isBlank()) {
                    actionedByOut = "unknown";
                }

                // reference = the work order that generated the movement
                String refCandidate = workOrderId;
```

Then update the movement creation lines:

```java
                        mv.setReference(refCandidate);
                        mv.setActionBy(actionedByOut);
```

These two lines are already present; they will simply use the corrected values.

## Verification

After the change, executing a Drawing work order should produce `StockMovement` rows where:

- `movementType = "O"`
- `reference` equals the generated `workOrderId`
- `actionBy` equals `WorkOrder.issuedBy` (the operator's username)
- `location` equals the source location (`fromLocation`)

## Frontend assumptions that depend on this change

- `WorkOrder.issuedBy` is the operator's login username.
- `WorkOrder.workBy` is the recipient worker's staff ID / mobile number (still used for work-order assignment and step `toLocation`).
- `WorkSteps.toLocation` is the recipient worker's staff ID.

No frontend changes are required once this backend change is in place.
