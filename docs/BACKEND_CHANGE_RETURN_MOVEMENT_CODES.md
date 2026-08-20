# Backend Change Request — Return Movement Codes

## Objective

Add three new stock movement codes to support the inventory **returning flow**:

- **Worker Return** (`W`) — reverse of Drawing / stock-out (`O`)
- **Customer / Site Return** (`T`) — reverse of Transfer-out (`G`)
- **Purchase Return to Vendor** (`P`) — reverse of Receipt (`I`)

> **Note on code selection:** The existing `movement.json` already uses `R` ("Stock Released") and `V` ("Stock Received") for other purposes, so these return-flow codes intentionally use currently-unused letters. Please verify `W`, `T`, and `P` are free in your seed data before implementing.

## Affected file

`bmp_backend/src/main/resources/initData/movement.json`

## Movement codes already used by the frontend

| Code | Description     | stockModifier | holdModifier | Used by                     |
| ---- | --------------- | ------------- | ------------ | --------------------------- |
| `I`  | Received        | +1            | 0            | Receive PO stock            |
| `O`  | Issued          | -1            | 0            | Stock issue / Drawing       |
| `G`  | Transferred Out | -1            | 0            | Delivery Order transfer-out |
| `C`  | Transferred In  | +1            | 0            | Delivery Order transfer-in  |
| `M`  | In Adjustment   | +1            | 0            | Stock adjustment in         |
| `L`  | Out Adjustment  | -1            | 0            | Stock adjustment out        |

## New movement codes to add

Insert the following entries into `movement.json`:

```json
{
  "movement": "W",
  "holdModifier": 0,
  "movementDescription": "Worker Return",
  "stockModifier": 1
},
{
  "movement": "T",
  "holdModifier": 0,
  "movementDescription": "Customer Return",
  "stockModifier": 1
},
{
  "movement": "P",
  "holdModifier": 0,
  "movementDescription": "Purchase Return",
  "stockModifier": -1
}
```

## Required REST endpoint shape

No new endpoints are required, but `/api/stockmovementcodes` must return the new codes so the frontend can:

- Display them in [StockCard.jsx](src/components/stock/StockCard.jsx) and [StockEnquiry.jsx](src/components/stock/StockEnquiry.jsx) movement-type filters.
- Use them in return documents.

Each entity returned by `/api/stockmovementcodes` must contain at least:

```json
{
  "movementType": "W",
  "movementDescription": "Worker Return",
  "stockModifier": 1,
  "holdModifier": 0
}
```

## Frontend assumptions

- `movementType` is the primary key / identifier string.
- `stockModifier` is used by `stock_view` to calculate current quantity.
- `holdModifier` is used by `stock_view` to calculate available quantity.

## Verification

After seeding and restarting the backend, a `GET /api/stockmovementcodes` response should include `W`, `T`, and `P` with the modifiers shown above.

If any of `W`, `T`, or `P` already exists with a different meaning, stop and report the conflict so the frontend docs can be updated with alternative codes.
