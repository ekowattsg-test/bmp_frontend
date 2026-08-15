# Stock Operations – Frontend Design Handoff

> **Scope:** Receive purchase-order stock, draw out stock, asset assignment, stock transfer, and stock adjustment.  
> **Constraint:** No changes to the Java/Spring backend in `bmp_backend`. All operations are implemented by orchestrating the existing REST APIs.  
> **Date:** 2026-08-14  
> **Source study:** Backend PO-receipt flow (`WorkOrderType = Receive`, `endAction = stock-in`) in `bmp_backend`.

---

## 1. Design decisions (confirmed)

| #   | Decision                                                     | Value                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Auto-amend PO quantity when received qty differs from PO qty | **Yes** – business flow requires user to confirm short/long quantity with vendor first. After confirmation, amend the PO via `PUT /api/purchaseOrders/{orderId}` before executing receipt.                         |
| 2   | Generated work order visibility                              | **Visible to user** – the frontend must create a real `WorkOrder` and show it in work-order lists/audit views.                                                                                                     |
| 3   | PDF copy for library storage                                 | **Required** – after the backend transaction completes and the PO status changes, generate a PDF document and store it in the document library. File name must include the PO’s latest status.                     |
| 4   | PO-to-location rule                                          | **One PO → one location** per receipt operation. Split-location receipts require separate operations.                                                                                                              |
| 5   | Stock adjustment                                             | Use direct `POST /api/stockmovements` (simplest, no work-order wrapper). `movementType` = `M` (In Adjustment) or `L` (Out Adjustment).                                                                             |
| 6   | Internal documents for other flows                           | **Generated and stored** – Transfer, Assign, Draw, and Adjustment must produce a document record. If the backend does not have a suitable document entity, add a new endpoint/entity in `bmp_backend` when needed. |

---

## 2. Backend receipt mechanism (no-code-change)

The backend records every stock movement through a `WorkOrder` workflow. The master step definition for receiving is seeded in:

- `bmp_backend/src/main/resources/initData/workstepstype.json`

```json
{
  "workOrderType": "Receive",
  "stepDescription": "Receive purchased stock 接收库存",
  "fromEntity": "PO",
  "toEntity": "location",
  "startAction": "",
  "scanData": 1,
  "checkQuantity": 0,
  "newStock": 1,
  "takePhoto": 1,
  "endAction": "stock-in",
  "noConfirm": 0
}
```

When a `Receive` work order is executed, `WorkStepsService.performCurrentStep`:

1. Reads the `INPROGRESS` `WorkSteps` row.
2. Extracts the PO id from the step (`fromLocation` when `fromEntity = PO`).
3. Iterates `WorkOrder` → `WorkOrderData` → `WorkOrderSubData`.
4. For each `WorkOrderSubData`:
   - Finds or creates a `Stock` row by `productId` + `stockCode` (the scanned code).
   - Creates a `StockMovement` with `movementType = "I"`, `quantity = subQuantity`, `location = toLocation`, `reference = PO id`.
5. Marks the purchase order `orderStatus = "RECEIVED"` and sets `receivedDate`.
6. Marks the step `DONE`; if all steps done, closes the work order.

Stock levels are derived from the `stock_view` view, where movement type `I` has `stock_modifier = +1`.

---

## 3. Standalone “Receive PO stock” flow

### 3.1 Step-by-step UX

1. **Open standalone receive screen**
2. **Select eligible PO**
   - Load `GET /api/purchaseOrders` (or a filtered/gated list if the backend provides one).
   - Display only POs whose status makes them available for receiving.
3. **Load PO lines**
   - `GET /api/purchaseOrders/{orderId}` returns the PO header + items.
4. **Select store/location**
   - Locations are free-text in the backend (`StockMovement.location`).
   - Frontend must aggregate known locations from `GET /api/stockviews` and present them in a dropdown; allow adding a new location only with explicit confirmation.
5. **Scan / enter received inventory**
   - For each PO line, user scans or types physical stock codes (`stockId`).
   - Each scan creates a received item entry:
     - `productId`
     - `stockId` (scanned code / batch / serial)
     - `subQuantity` (actual quantity received against that code)
6. **Amend quantities if needed**
   - Sum `subQuantity` per PO line.
   - If total ≠ PO item quantity:
     - Block execution.
     - Prompt user to confirm short/long quantity with vendor.
     - Provide action to amend the PO quantity via `PUT /api/purchaseOrders/{orderId}` and/or update `WorkOrderSubData` entries accordingly.
7. **Review and confirm**
   - Show PO id, location, lines, scanned items, and totals.
8. **Execute receipt (frontend orchestrates backend calls)**
9. **Generate PDF**
   - After successful execution, fetch the updated PO status.
   - Generate a PDF receipt document.
   - Store in document library; file name includes PO id and latest status (e.g. `PO-123_RECEIVED_2026-08-14.pdf`).

### 3.2 Backend API sequence

Call the following APIs in order. Treat the whole sequence as one user-initiated transaction; on failure, show a clear error and do not pretend success.

#### 3.2.1 Create the work order

```http
POST /api/workorders
Content-Type: application/json
```

```json
{
  "workOrderType": "Receive",
  "workDescription": "Receive stock for {poId}",
  "issuedBy": "{currentUserStaffId}",
  "workBy": "{currentUserMobileOrStaffId}",
  "workOrderStatus": "NEW"
}
```

Backend returns the generated `workOrderId` (e.g. `WO-12345`).

#### 3.2.2 Create the in-progress step

```http
POST /api/worksteps
Content-Type: application/json
```

```json
{
  "workOrderId": "WO-12345",
  "stepNumber": 1,
  "fromLocation": "{poId}",
  "toLocation": "{selectedLocation}",
  "photos": "",
  "stepStatus": "INPROGRESS"
}
```

`fromLocation` must be the PO id because the step type’s `fromEntity = PO`.  
`toLocation` must be the selected store/location because `toEntity = location`.

#### 3.2.3 Create WorkOrderData per PO line

```http
POST /api/workorder-data
Content-Type: application/json
```

```json
{
  "workOrderId": "WO-12345",
  "productId": {productIdFromPoItem},
  "quantity": {quantityFromPoItem},
  "staffId": "{currentUserStaffId}"
}
```

Store the returned `workOrderDataId` for each line.

#### 3.2.4 Create WorkOrderSubData per scanned item

```http
POST /api/workorder-subdata
Content-Type: application/json
```

```json
{
  "workOrderDataId": {workOrderDataIdForThisLine},
  "productId": {productIdFromPoItem},
  "stockId": "{scannedStockCode}",
  "subQuantity": {receivedQtyForThisScan}
}
```

Multiple `WorkOrderSubData` rows may exist under one `WorkOrderData` if the user scans the same product in multiple batches/codes.

#### 3.2.5 Execute the step

```http
POST /api/worksteps/execute/{workOrderId}
```

On success:

- Backend creates/finds `Stock` rows.
- Backend creates `StockMovement` rows with `movementType = "I"` into the selected location.
- Backend marks the PO as `RECEIVED` and sets `receivedDate`.
- Backend marks the work order step `DONE` and closes the work order.

On failure, inspect the error response and do not generate the PDF.

#### 3.2.6 Fetch updated PO and generate PDF

```http
GET /api/purchaseOrders/{poId}
```

Use the returned `orderStatus` in the PDF file name and body. Then store the PDF in the document library using the frontend document-library service.

---

## 4. Quantity amendment UX

Because the backend does **not** validate received quantity against PO quantity, the frontend must enforce the business rule.

### 4.1 Rule

- For each PO line, sum all `subQuantity` values entered/scanned.
- If the sum equals the PO item quantity → allow execution.
- If the sum differs:
  1. Disable the **Execute** button.
  2. Show a warning: “Received quantity for {productName} is {received} but PO quantity is {ordered}. Confirm with vendor before proceeding.”
  3. Offer actions:
     - **Amend PO quantity** → calls `PUT /api/purchaseOrders/{orderId}` with updated items (after vendor confirmation).
     - **Adjust scanned quantities** → return to scan screen.
  4. After amendment, refresh the PO and re-validate totals.

### 4.2 Amending the PO

```http
PUT /api/purchaseOrders/{orderId}
Content-Type: application/json
```

Send the full PO DTO including items with updated quantities. The backend deletes and re-creates items.

---

## 5. Document generation requirements

### 5.1 Receive PO document

Generated after successful execution. Minimum content:

- Document type: “Goods Receipt Note” / “Stock Receipt”
- PO id and vendor
- Location received into
- Received date/time
- Operator name
- Table of items: product code, product name, PO qty, received qty, stock code(s)
- PO status after receipt (included in file name)

File name pattern:

```
{poId}_{status}_{yyyy-MM-dd}.pdf
```

Example: `PO-123_RECEIVED_2026-08-14.pdf`

### 5.2 Library storage

- Store through the existing frontend document-library upload mechanism.
- Tag/document category = `STOCK_RECEIPT` or equivalent.

---

## 6. Other operations (future)

### 6.1 Stock draw out

Use work-order type `Drawing`:

```json
{
  "workOrderType": "Drawing",
  "fromEntity": "location",
  "toEntity": "worker",
  "endAction": "stock-out"
}
```

Flow:

1. Create `WorkOrder` (`workOrderType = Drawing`).
2. Create `WorkSteps`:
   - `fromLocation = source location`
   - `toLocation = worker id/mobile`
   - `stepStatus = INPROGRESS`
3. Create `WorkOrderData`/`WorkOrderSubData` for products/codes to draw.
4. `POST /api/worksteps/execute/{workOrderId}`.
5. Backend creates `StockMovement` type `O` (stock_modifier = -1).
6. Generate draw-out document for library.

### 6.2 Asset assignment

Use work-order type `Allocating`:

```json
{
  "workOrderType": "Allocating",
  "fromEntity": "location",
  "toEntity": "worker",
  "endAction": "stock-tx"
}
```

Backend writes transfer-out (`G`) and transfer-in (`C`) movements.  
Generate assignment document for library.

### 6.3 Stock transfer

Use work-order type `Collection` (two-step: `stock-in` then `stock-loc`) or a new dedicated flow.

Current seeded step types:

- `Collection` step 1: `PO` → `vehicle`, `endAction = stock-in`
- `Collection` step 2: `vehicle` → `location`, `endAction = stock-loc`

For a generic stock transfer (location A → location B), consider creating a new step type in the backend if the existing types do not fit cleanly. If no backend change is allowed, reuse `Collection` and treat `vehicle` as a transient transfer reference.

Generate transfer document for library.

### 6.4 Stock adjustment

Use direct `POST /api/stockmovements`:

```http
POST /api/stockmovements
Content-Type: application/json
```

```json
{
  "stockId": {stockId},
  "movementType": "M",
  "quantity": {positiveQty},
  "location": "{location}",
  "reference": "Adjustment note",
  "recordDate": "{isoDateTime}",
  "actionBy": "{staffName}"
}
```

- `M` = In Adjustment (stock_modifier +1)
- `L` = Out Adjustment (stock_modifier -1)

The public controller nulls out `workOrderId`, so do not rely on work-order linkage for adjustments.  
Generate adjustment document for library.

---

## 7. Error handling and UX guardrails

- **Do not locally append or synthesize backend state** after execution. Always refresh stock/PO data from the authoritative API before showing updated totals or status.
- **All-or-nothing feel:** If any API in the sequence fails, stop and show the error. Do not generate the PDF. Optionally offer “Retry” from the failed step.
- **Duplicate prevention:** Remove already-selected POs from the selection list; do not rely on backend uniqueness checks.
- **Loading states:** Show a single progress indicator covering the entire sequence so the user does not interact mid-transaction.

---

## 8. Key backend references

- Work step type seed: `bmp_backend/src/main/resources/initData/workstepstype.json`
- Stock-in handler: `bmp_backend/src/main/java/com/hcteol/jwt/backend/services/WorkStepsService.java` (around `case "stock-in"`)
- PO receipt status update: `bmp_backend/src/main/java/com/hcteol/jwt/backend/services/WorkStepsService.java` (sets `RECEIVED`)
- Stock view definition: `bmp_backend/src/main/resources/sqlView/stock_view.sql`
- Movement codes: `bmp_backend/src/main/resources/initData/movement.json`

---

## 9. Summary for frontend implementation

Build a **Stock Operations** module with:

1. A **Receive PO Stock** page that:
   - Selects a gated PO.
   - Selects a location.
   - Scans/enters received items per PO line.
   - Validates received vs PO quantity and supports PO amendment.
   - Orchestrates the 6 backend calls above.
   - Refreshes PO/stock state from APIs.
   - Generates and stores a PDF receipt.
2. A **Work Orders** view so users can see the generated `Receive` work order.
3. Reusable services for:
   - Creating a work order with steps and data/subdata.
   - Executing a work order step.
   - Generating PDFs from receipt data.
   - Uploading PDFs to the document library.

Start with Receive PO. Draw out, asset assignment, transfer, and adjustment follow the same orchestration pattern with different step types or direct `stockmovements`.
