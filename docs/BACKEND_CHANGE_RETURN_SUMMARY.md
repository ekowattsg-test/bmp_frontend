# Backend Change Summary — Inventory Returning Flow

This document summarises all backend changes required before the frontend can implement the inventory returning flow.

## Background

The frontend has completed the outgoing inventory flow:

| Flow                   | Work order type | Movement type         | Document                                                                     |
| ---------------------- | --------------- | --------------------- | ---------------------------------------------------------------------------- |
| Purchase → Receive     | `Receive`       | `I` (stock-in)        | [stock-operations-design.md](stock-operations-design.md)                     |
| Deliver → Transfer out | `TransferOut`   | `G` (transferred out) | [BACKEND_CHANGE_TRANSFER_IN_OUT.md](BACKEND_CHANGE_TRANSFER_IN_OUT.md)       |
| Draw / Issue           | `Drawing`       | `O` (issued)          | [BACKEND_CHANGE_WORKSTEP_STOCK_OUT.md](BACKEND_CHANGE_WORKSTEP_STOCK_OUT.md) |

The returning flow is the mirror image of these three operations.

## Change checklist

### 1. Seed data changes

- [ ] Add movement codes `R`, `T`, `V` to `movement.json`  
      → See [BACKEND_CHANGE_RETURN_MOVEMENT_CODES.md](BACKEND_CHANGE_RETURN_MOVEMENT_CODES.md)

- [ ] Add work-step types `Return`, `ReturnIn`, `PurchaseReturn` to `workstepstype.json`  
      → See [BACKEND_CHANGE_RETURN_STEP_TYPES.md](BACKEND_CHANGE_RETURN_STEP_TYPES.md)

### 2. Java service changes

- [ ] Add three new `endAction` handlers in `WorkStepsService.java`:
  - `stock-return`
  - `transfer-return-in`
  - `stock-return-to-vendor`

  → See [BACKEND_CHANGE_WORKSTEP_RETURN_ACTIONS.md](BACKEND_CHANGE_WORKSTEP_RETURN_ACTIONS.md)

### 3. Required entity changes

- [ ] Create `PurchaseReturn` and `PurchaseReturnItem` entities and expose REST endpoints.  
      → See [BACKEND_CHANGE_PURCHASE_RETURN_ENTITY.md](BACKEND_CHANGE_PURCHASE_RETURN_ENTITY.md)

- [ ] Create `DeliveryReturn` and `DeliveryReturnItem` entities and expose REST endpoints.  
      → See [BACKEND_CHANGE_DELIVERY_RETURN_ENTITY.md](BACKEND_CHANGE_DELIVERY_RETURN_ENTITY.md)

- [ ] Add `PARTIALLY_RETURNED` to the Delivery Order status enum / allowed values and frontend mappings.

## Execution order

1. Create `PurchaseReturn` / `PurchaseReturnItem` and `DeliveryReturn` / `DeliveryReturnItem` entities, repositories, controllers, and endpoints.
2. Apply movement codes and step-type seeds.
3. Restart the backend so the new codes appear in `/api/stockmovementcodes` and `/api/workstepstypes`.
4. Implement the three new handlers in `WorkStepsService.java`.
5. Frontend created:
   - `StockReturn.jsx` + `useStockReturn.js` + `stock_return_service.js`
   - `TransferReturnIn.jsx` + `useTransferReturnIn.js` + `transfer_return_service.js`
   - `PurchaseReturn.jsx` + `usePurchaseReturn.js` + `purchase_return_service.js`
   - Routes added to `MainPage.jsx` and `AppContent.jsx`
   - Sidebar entries added to `Sidebar.jsx`
   - PDA bottom-nav entries added to `PdaBottomNav.jsx`
   - PDA inventory route detection updated in `PdaLayout.jsx`
   - English and Chinese translations added

## Verification checklist for backend team

- [ ] `GET /api/stockmovementcodes` returns `W`, `T`, and `P` with the modifiers documented in [BACKEND_CHANGE_RETURN_MOVEMENT_CODES.md](BACKEND_CHANGE_RETURN_MOVEMENT_CODES.md).
- [ ] `GET /api/workstepstypes` returns `Return`, `ReturnIn`, and `PurchaseReturn`.
- [ ] `PurchaseReturn` CRUD endpoints are available.
- [ ] `DeliveryReturn` CRUD endpoints are available.
- [ ] Flyway migrations for `purchase_return`, `purchase_return_item`, `delivery_return`, and `delivery_return_item` are present.
- [ ] Executing a `Return` work order creates `StockMovement.movementType = "W"` rows.
- [ ] Executing a `ReturnIn` work order creates `StockMovement.movementType = "T"` rows and sets the DO status to `RETURNED` or `PARTIALLY_RETURNED` based on total returned quantity.
- [ ] Executing a `PurchaseReturn` work order creates `StockMovement.movementType = "P"` rows and updates the linked `PurchaseReturn.returnStatus` to `CREDITED`.
