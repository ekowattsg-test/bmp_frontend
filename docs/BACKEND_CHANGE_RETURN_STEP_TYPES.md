# Backend Change Request — Return Work-Order Step Types

## Objective

Add three new `WorkStepsType` entries to drive the frontend's returning-inventory flows.

## Affected file

`bmp_backend/src/main/resources/initData/workstepstype.json`

## New step type seed entries

Append the following three entries:

### 1. Worker Return — reverse of Drawing / stock-out

```json
{
  "workOrderType": "Return",
  "stepDescription": "Return stock from worker",
  "fromEntity": "worker",
  "toEntity": "location",
  "startAction": "",
  "scanData": 1,
  "checkQuantity": 0,
  "newStock": 0,
  "takePhoto": 1,
  "endAction": "stock-return",
  "noConfirm": 0
}
```

Frontend usage:

- `WorkOrder.workOrderType = "Return"`
- `WorkSteps.fromLocation = worker staffId` (the worker returning the stock)
- `WorkSteps.toLocation = destination location code`
- On execute, backend creates `StockMovement` with `movementType = "W"`, `location = toLocation`, `quantity = subQuantity`, `reference = workOrderId`, `actionBy = workOrder.issuedBy`.

### 2. Customer / Site Return In — reverse of Delivery transfer-out

```json
{
  "workOrderType": "ReturnIn",
  "stepDescription": "Receive returned stock from customer/site",
  "fromEntity": "location",
  "toEntity": "location",
  "startAction": "",
  "scanData": 1,
  "checkQuantity": 0,
  "newStock": 1,
  "takePhoto": 1,
  "endAction": "transfer-return-in",
  "noConfirm": 0
}
```

Frontend usage:

- `WorkOrder.workOrderType = "ReturnIn"`
- `WorkSteps.fromLocation = source location code` (the customer/site location the stock is coming from)
- `WorkSteps.toLocation = destination receiving location code`
- `WorkOrder.workDescription` must contain the `DeliveryReturn` id in the format `RETURN:{returnId}:DO:{doId}` so the handler can finalise the credit note.
- On execute, backend creates `StockMovement` with `movementType = "T"`, `location = toLocation`, `quantity = subQuantity`, `reference = DeliveryReturn.returnId`, `actionBy = workOrder.issuedBy`.
- The handler updates the linked `DeliveryReturn.returnStatus` to `CREDITED` and sets the DO status to `RETURNED` or `PARTIALLY_RETURNED` based on the total returned quantity.

### 3. Purchase Return — reverse of PO receipt

```json
{
  "workOrderType": "PurchaseReturn",
  "stepDescription": "Return stock to vendor",
  "fromEntity": "location",
  "toEntity": "PO",
  "startAction": "",
  "scanData": 1,
  "checkQuantity": 0,
  "newStock": 0,
  "takePhoto": 1,
  "endAction": "stock-return-to-vendor",
  "noConfirm": 0
}
```

Frontend usage:

- `WorkOrder.workOrderType = "PurchaseReturn"`
- `WorkSteps.fromLocation = source location code`
- `WorkSteps.toLocation = purchase order id`
- `WorkOrder.workDescription` must contain the `PurchaseReturn` id in the format `RETURN:{returnId}:PO:{poId}` so the handler can finalise the credit note.
- On execute, backend creates `StockMovement` with `movementType = "P"`, `location = fromLocation`, `quantity = subQuantity`, `reference = PurchaseReturn.returnId`, `actionBy = workOrder.issuedBy`.
- The handler updates the linked `PurchaseReturn.returnStatus` to `CREDITED`; the original PO remains `RECEIVED`.

## Verification

After seeding and restarting the backend, `GET /api/workstepstypes` must include `Return`, `ReturnIn`, and `PurchaseReturn` with the exact `endAction` strings above.
