# Backend Change Summary — Asset Return and Stock Disposal

This document summarises the backend changes required before the frontend can implement the final two stock functions:

- **Asset Return** — reverse of Asset Assignment (category A products only)
- **Stock Disposal** — write off inventory (category C products only)

## Movement codes already used

See the current `movement.json` in the backend. The relevant codes are:

| Code | Description     | stockModifier | holdModifier |
| ---- | --------------- | ------------- | ------------ |
| `I`  | Stock In        | +1            | 0            |
| `O`  | Stock Out       | -1            | 0            |
| `N`  | Initial Stock   | +1            | 0            |
| `G`  | Transferred Out | -1            | 0            |
| `C`  | Transferred In  | +1            | 0            |
| `M`  | In Adjustment   | +1            | 0            |
| `L`  | Out Adjustment  | -1            | 0            |
| `W`  | Worker Return   | +1            | 0            |
| `T`  | Customer Return | +1            | 0            |
| `P`  | Purchase Return | -1            | 0            |
| `D`  | Stock Disposal  | -1            | 0            |
| `H`  | Stock On Hold   | 0             | -1           |
| `Q`  | Stock Requested | 0             | +1           |
| `R`  | Stock Released  | 0             | +1           |
| `V`  | Stock Received  | +1            | 0            |

## Required seed changes

### 1. Add movement code `A`

`A` is not currently used. Add to `movement.json`:

```json
{
  "movement": "A",
  "holdModifier": 0,
  "movementDescription": "Asset Return",
  "stockModifier": 1
}
```

`D` (Stock Disposal) already exists in `movement.json`.

### 2. Add work-step types

Add to `workstepstype.json`:

```json
{
  "workOrderType": "AssetReturn",
  "stepNumber": 1,
  "stepDescription": "Return asset to location",
  "fromEntity": "worker",
  "toEntity": "location",
  "endAction": "asset-return"
}
```

```json
{
  "workOrderType": "StockDisposal",
  "stepNumber": 1,
  "stepDescription": "Dispose stock from location",
  "fromEntity": "location",
  "toEntity": "noact",
  "endAction": "stock-disposal"
}
```

## Required Java handlers

Add two new `endAction` handlers in `WorkStepsService.java`:

- `asset-return` — mirror of `stock-return`, but restricted to product category `A` and movement type `A`.
- `stock-disposal` — mirror of `stock-out`, movement type `D`, and finalise a `StockDisposal` record.

→ See [BACKEND_CHANGE_WORKSTEP_ASSET_RETURN_DISPOSAL.md](BACKEND_CHANGE_WORKSTEP_ASSET_RETURN_DISPOSAL.md) for handler specs.

## Required entity (disposal only)

Create `StockDisposal` and `StockDisposalItem` entities and expose REST endpoints.

→ See [BACKEND_CHANGE_STOCK_DISPOSAL_ENTITY.md](BACKEND_CHANGE_STOCK_DISPOSAL_ENTITY.md) for entity specs.

## Frontend to be created

- `AssetReturn.jsx` + `useAssetReturn.js` + `asset_return_service.js`
- `StockDisposal.jsx` + `useStockDisposal.js` + `stock_disposal_service.js`
- Routes, sidebar entries, PDA nav entries, i18n keys, PDF helpers.

## Verification checklist

- [ ] `GET /api/stockmovementcodes` returns `A` with `stockModifier: 1`, `holdModifier: 0`.
- [ ] `GET /api/workstepstypes` returns `AssetReturn` and `StockDisposal`.
- [ ] `StockDisposal` CRUD endpoints are available.
- [ ] Executing an `AssetReturn` work order creates `StockMovement.movementType = "A"` rows.
- [ ] Executing a `StockDisposal` work order creates `StockMovement.movementType = "D"` rows and updates `StockDisposal.disposalStatus` to `DISPOSED`.
