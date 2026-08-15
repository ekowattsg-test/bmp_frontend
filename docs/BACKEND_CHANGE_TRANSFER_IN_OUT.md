# Backend Change Request — Transfer In / Transfer Out Movement Actions

## Objective

Add two new `endAction` handlers to `WorkStepsService.java` so the frontend can implement a two-step Delivery Order (DO) linked stock transfer:

- **Transfer Out** — move inventory out of a source location (`movementType = "G"`)
- **Transfer In** — move inventory into a destination location (`movementType = "C"`)

The two actions are linked by the same Delivery Order reference. The destination location (`toLocation`) for both Transfer Out and Transfer In is derived from `DeliveryOrder.projectCode`. The frontend only scans the source location and sets `toLocation` to the linked DO's `projectCode` when creating the step. The DO id is embedded in `WorkSteps.fromLocation` using the format `DO_ID|locationCode` so the backend can identify the linked DO.

## Affected files

1. `bmp_backend/src/main/java/com/hcteol/jwt/backend/services/WorkStepsService.java`
2. `bmp_backend/src/main/resources/initData/workstepstype.json`
3. `bmp_backend/src/main/resources/initData/movement.json` (verify only — codes `G` and `C` already exist)

## Movement codes (already seeded)

```json
{
  "movement": "G",
  "holdModifier": 0,
  "movementDescription": "Transferred Out",
  "stockModifier": -1
},
{
  "movement": "C",
  "holdModifier": 0,
  "movementDescription": "Transferred In",
  "stockModifier": 1
}
```

## New step type seed entries

Add to `workstepstype.json`:

```json
{
  "workOrderType": "TransferOut",
  "stepDescription": "Transfer stock out to remote warehouse",
  "fromEntity": "location",
  "toEntity": "location",
  "startAction": "",
  "scanData": 1,
  "checkQuantity": 0,
  "newStock": 0,
  "takePhoto": 1,
  "endAction": "transfer-out",
  "noConfirm": 0
},
{
  "workOrderType": "TransferIn",
  "stepDescription": "Receive transferred stock at remote warehouse",
  "fromEntity": "location",
  "toEntity": "location",
  "startAction": "",
  "scanData": 1,
  "checkQuantity": 0,
  "newStock": 1,
  "takePhoto": 1,
  "endAction": "transfer-in",
  "noConfirm": 0
}
```

## Delivery Order status lifecycle and gating

The frontend gates the DO selection list so each transfer step can only operate on DOs in the correct state. Use the existing `orderStatus` field on `DeliveryOrder`.

| Step         | Eligible DO status | Status set on success |
| ------------ | ------------------ | --------------------- |
| Transfer Out | `ISSUED`           | `IN_TRANSIT`          |
| Transfer In  | `IN_TRANSIT`       | `DELIVERED`           |

`IN_TRANSIT` is a new status introduced between `ISSUED` and `DELIVERED`. The frontend filters eligible DOs client-side; the backend may optionally enforce the same rules.

## Frontend DO linkage format

When a Transfer Out/In step is linked to a DO, the frontend stores the source location as `DO_ID|locationCode` in `WorkSteps.fromLocation`. The Java handler must split this value to obtain the actual location code and the DO reference.

## Required Java changes

Locate the switch block in `WorkStepsService.performCurrentStep(String workOrderId)` around:

```java
switch (trimmedAction.toLowerCase()) {
    case "stock-in": { ... }
    case "stock-out": { ... }
    case "stock-tx": { ... }
    case "stock-loc": { ... }
}
```

### 1. Add `case "transfer-out":`

Insert after the `case "stock-out":` block.

Behaviour:

- Requires `fromLocation` on the step.
- Iterates `WorkOrderData` → `WorkOrderSubData`.
- Requires the `Stock` row to exist (same as stock-out).
- Creates one `StockMovement` per sub-data row with:
  - `movementType = "G"`
  - `quantity = subQuantity`
  - `location = fromLocation`
  - `reference = DO id if step is linked to a DO, otherwise workOrderId`
  - `actionBy = workOrder.issuedBy` (operator username)
  - `workOrderId = current workOrderId`
- If the step is linked to a DO, update the DO status to `"IN_TRANSIT"`.
- The destination location is not scanned by the frontend; it is passed in `toLocation` as the linked DO's `projectCode`.

Suggested code (based on the existing `stock-out` handler):

```java
case "transfer-out": {
    String fromLocation = inProgress.getFromLocation();
    if (!ignoreFromLocation && (fromLocation == null || fromLocation.isBlank())) {
        throw new IllegalStateException("Source location (fromLocation) not set on step record for transfer-out action");
    }

    String actionedByOut = wo.getIssuedBy();
    if (actionedByOut == null || actionedByOut.isBlank()) {
        actionedByOut = "unknown";
    }

    String refCandidate = workOrderId;
    String doCandidate = null;

    // Frontend stores a DO-linked location as "DO_ID|locationCode"
    String fromLocationRaw = inProgress.getFromLocation();
    if (fromLocationRaw != null && !fromLocationRaw.isBlank() && fromLocationRaw.contains("|")) {
        String[] parts = fromLocationRaw.split("\\|", 2);
        doCandidate = parts[0];
        fromLocation = parts[1];
    }

    if (doCandidate != null && !doCandidate.isBlank()) {
        doCandidate = doCandidate.trim();
        refCandidate = doCandidate;
    }

    java.util.List<com.hcteol.jwt.backend.entities.WorkOrderData> wodListOut = workOrderDataRepository.findByWorkOrderId(workOrderId);
    for (com.hcteol.jwt.backend.entities.WorkOrderData wod : wodListOut) {
        java.util.List<com.hcteol.jwt.backend.entities.WorkOrderSubData> subListOut = workOrderSubDataRepository.findByWorkOrderDataId(wod.getWorkOrderDataId());
        for (com.hcteol.jwt.backend.entities.WorkOrderSubData sub : subListOut) {
            Long productId = sub.getProductId();
            String stockCode = sub.getStockId();
            Long qtyLong = sub.getSubQuantity();
            int qty = qtyLong != null ? qtyLong.intValue() : 0;

            com.hcteol.jwt.backend.entities.Stock stock = stockRepository.findByProductIdAndStockCode(productId, stockCode);
            if (stock == null) {
                throw new IllegalStateException("Stock not found for product " + productId + " and code " + stockCode + " during transfer-out for workOrder " + workOrderId);
            }

            com.hcteol.jwt.backend.entities.StockMovement mv = new com.hcteol.jwt.backend.entities.StockMovement();
            mv.setStockId(stock.getStockId());
            mv.setMovementType("G");
            mv.setQuantity(qty);
            if (!ignoreFromLocation && hasText(fromLocation)) {
                mv.setLocation(fromLocation);
            }
            mv.setReference(refCandidate);
            mv.setWorkOrderId(workOrderId);
            mv.setRecordDate(LocalDateTime.now().toString());
            mv.setActionBy(actionedByOut);
            stockMovementRepository.save(mv);
            logger.info("Created transfer-out movement {} for stock {} qty {}", mv.getMovementId(), stock.getStockId(), qty);
        }
    }

    if (doCandidate != null && !doCandidate.isBlank()) {
        if (deliveryOrderRepository.existsById(doCandidate)) {
            var doOpt = deliveryOrderRepository.findById(doCandidate);
            if (doOpt.isPresent()) {
                var d = doOpt.get();
                d.setOrderStatus("IN_TRANSIT");
                deliveryOrderRepository.save(d);
                logger.info("Marked DeliveryOrder {} as IN_TRANSIT", doCandidate);
            }
        } else {
            logger.warn("Candidate delivery order id '{}' not found, skipping DO status update", doCandidate);
        }
    }
    break;
}
```

### 2. Add `case "transfer-in":`

Insert after the `case "transfer-out":` block.

Behaviour:

- Iterates `WorkOrderData` → `WorkOrderSubData`.
- Creates the `Stock` row if it does not exist (same as stock-in).
- Creates one `StockMovement` per sub-data row with:
  - `movementType = "C"`
  - `quantity = subQuantity`
  - `location = toLocation` (the frontend sets this to the linked DO's `projectCode`)
  - `reference = DO id if step is linked to a DO, otherwise workOrderId`
  - `actionBy = workOrder.issuedBy` (operator username)
  - `workOrderId = current workOrderId`
- If the step is linked to a DO, update the DO status to `"DELIVERED"` and set `deliveredDate`.
- The destination location is not scanned by the frontend; it is passed in `toLocation` as the linked DO's `projectCode`.

Suggested code (based on the existing `stock-in` handler):

```java
case "transfer-in": {
    String targetLocation = inProgress.getToLocation();
    if (!ignoreToLocation && (targetLocation == null || targetLocation.isBlank())) {
        throw new IllegalStateException("Target location not set on step record for transfer-in action");
    }

    String actionedBy = wo.getIssuedBy();
    if (actionedBy == null || actionedBy.isBlank()) {
        actionedBy = "unknown";
    }

    String refCandidate = workOrderId;
    String doCandidate = null;

    // Frontend stores a DO-linked location as "DO_ID|locationCode"
    String fromLocationRaw = inProgress.getFromLocation();
    if (fromLocationRaw != null && !fromLocationRaw.isBlank() && fromLocationRaw.contains("|")) {
        String[] parts = fromLocationRaw.split("\\|", 2);
        doCandidate = parts[0];
    }

    if (doCandidate != null && !doCandidate.isBlank()) {
        doCandidate = doCandidate.trim();
        refCandidate = doCandidate;
    }

    java.util.List<com.hcteol.jwt.backend.entities.WorkOrderData> wodList = workOrderDataRepository.findByWorkOrderId(workOrderId);
    for (com.hcteol.jwt.backend.entities.WorkOrderData wod : wodList) {
        java.util.List<com.hcteol.jwt.backend.entities.WorkOrderSubData> subList = workOrderSubDataRepository.findByWorkOrderDataId(wod.getWorkOrderDataId());
        for (com.hcteol.jwt.backend.entities.WorkOrderSubData sub : subList) {
            Long productId = sub.getProductId();
            String stockCode = sub.getStockId();
            Long qtyLong = sub.getSubQuantity();
            int qty = qtyLong != null ? qtyLong.intValue() : 0;

            com.hcteol.jwt.backend.entities.Stock stock = stockRepository.findByProductIdAndStockCode(productId, stockCode);
            if (stock == null) {
                stock = new com.hcteol.jwt.backend.entities.Stock();
                stock.setProductId(productId);
                stock.setStockCode(stockCode);
                stock.setCreateDate(LocalDateTime.now().toString());
                stock = stockRepository.save(stock);
                logger.info("Created stock {} for product {} during transfer-in", stock.getStockId(), productId);
            }

            com.hcteol.jwt.backend.entities.StockMovement mv = new com.hcteol.jwt.backend.entities.StockMovement();
            mv.setStockId(stock.getStockId());
            mv.setMovementType("C");
            mv.setQuantity(qty);
            if (!ignoreToLocation && hasText(targetLocation)) {
                mv.setLocation(targetLocation);
            }
            mv.setReference(refCandidate);
            mv.setWorkOrderId(workOrderId);
            mv.setRecordDate(LocalDateTime.now().toString());
            mv.setActionBy(actionedBy);
            stockMovementRepository.save(mv);
            logger.info("Created transfer-in movement {} for stock {} qty {}", mv.getMovementId(), stock.getStockId(), qty);
        }
    }

    if (doCandidate != null && !doCandidate.isBlank()) {
        if (deliveryOrderRepository.existsById(doCandidate)) {
            var doOpt = deliveryOrderRepository.findById(doCandidate);
            if (doOpt.isPresent()) {
                var d = doOpt.get();
                d.setOrderStatus("DELIVERED");
                d.setDeliveredDate(new java.sql.Date(System.currentTimeMillis()));
                deliveryOrderRepository.save(d);
                logger.info("Marked DeliveryOrder {} as DELIVERED", doCandidate);
            }
        } else {
            logger.warn("Candidate delivery order id '{}' not found, skipping DO status update", doCandidate);
        }
    }
    break;
}
```

## Notes on existing `stock-tx`

The existing `stock-tx` handler creates both `G` and `C` movements in a single step. The new `transfer-out` and `transfer-in` actions are split-step equivalents:

- `transfer-out` creates only the `G` movement.
- `transfer-in` creates only the `C` movement.
- This supports the operational custody handover: driver dispatches, site leader receives.

## Verification

After applying the change, executing a `TransferOut` work order should produce `StockMovement` rows where:

- `movementType = "G"`
- `location` equals the source location (`fromLocation`)
- `reference` equals the linked DO id or work order id
- `actionBy` equals `WorkOrder.issuedBy`

Executing a `TransferIn` work order should produce rows where:

- `movementType = "C"`
- `location` equals the destination location (`toLocation`)
- `reference` equals the linked DO id or work order id
- `actionBy` equals `WorkOrder.issuedBy`

## Frontend assumptions

- `WorkOrder.workOrderType` will be `"TransferOut"` or `"TransferIn"`.
- `WorkOrder.issuedBy` is the operator's login username.
- `WorkSteps.fromLocation` is either the plain source location string (when no DO is linked) or `DO_ID|sourceLocationCode` (when a DO is linked). The backend must split on `|` to extract the DO id and the actual location code.
- `WorkSteps.toLocation` is set to the linked DO's `projectCode` when a DO is selected. The backend may use this value directly as the destination location.
- `WorkOrderData` and `WorkOrderSubData` are created exactly as for Receive PO stock.
- The frontend will not prompt the user to scan the destination location; only the source location is scanned.
