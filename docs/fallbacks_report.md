Fallbacks Report

Last reviewed: 2026-04-20 (updated after readFirst removal)

This report tracks active fallback-style behavior (synthetic defaults and broad product-list recovery calls) in stock-related frontend code.

Completed

- ✓ readFirst multi-key probing fully removed from all active stock components (2026-04-20).
  Affected: StockOut.jsx, StockTransfer.jsx, StockTakeOn.jsx (this session);
  StockIn.jsx, StockAdjustment.jsx, StockEnquiry.jsx (prior sessions).
  All components now read exact backend field names directly (e.g. `row.stockId`, `row.location`, `row.quantity`).
  Tombstone comments remain in StockIn.jsx (L65), StockAdjustment.jsx (L35), StockEnquiry.jsx (L48).

- ✓ Recovery via broad product list fetch — fallback field probing removed from `loadProductCandidatesForMissingStock` (2026-04-20).
  Affected: StockIn.jsx, StockTakeOn.jsx.
  `key`, `productId`, `productCode`, `productName`, `productDescription`, `productPicture` now read exact backend field names.
  `GET /api/products` call retained — replacement with a search endpoint is a backend concern deferred to a later task.

- ✓ Stock id fallback-to-base-row behavior removed (2026-04-20).
  Affected: StockIn.jsx, StockTakeOn.jsx, StockOut.jsx, StockTransfer.jsx, StockAdjustment.jsx.
  Usage 1 (`buildLinkedRows`): `{ row, fallbackStockId }` tuple simplified to `{ row }`; `row.stockId || fallbackStockId` → `row.stockId` directly.
  Usage 2 (`mergeRowsWithProductTotals`, StockIn + StockTakeOn): `fallbackStockId` variable removed; synthetic new-location row now uses `stockId: ""` so the save handler correctly calls `POST /api/stocks` for that location.

Remaining patterns

- Legitimate product listing/search UI (not fallback violations):
  - [src/components/stock/ProductDialog.jsx](src/components/stock/ProductDialog.jsx#L107)
  - [src/components/stock/UOMHierarchy.jsx](src/components/stock/UOMHierarchy.jsx#L43)
  - [src/components/stock/UOMHierarchyAdd.jsx](src/components/stock/UOMHierarchyAdd.jsx#L28)
  - [src/components/stock/UOMHierarchyEdit.jsx](src/components/stock/UOMHierarchyEdit.jsx#L30)

- Candidate product fetch by explicit id (context-dependent, review per call site):
  - [src/components/stock/StockIn.jsx](src/components/stock/StockIn.jsx#L874)
  - [src/components/stock/StockTakeOn.jsx](src/components/stock/StockTakeOn.jsx#L977)
  - [src/components/stock/StockOut.jsx](src/components/stock/StockOut.jsx#L333)
  - [src/components/stock/StockTransfer.jsx](src/components/stock/StockTransfer.jsx#L364)
  - [src/components/stock/StockAdjustment.jsx](src/components/stock/StockAdjustment.jsx#L261)

Remaining cleanup sequence

1. Add lint protection to flag non-list-context `/api/products` usage in stock flows.

Notes

- This document is intentionally code-focused and does not include backup files.
- Re-run this report after each fallback-removal batch to keep references current.
