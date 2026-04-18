Fallbacks Report

This report lists files that implement "fallback" behavior (client-side guessing, multi-key probing, or using `/api/products` as a fallback lookup). Use this as the canonical todo for removing fallbacks.

- src/components/stock/StockIn.jsx: uses multi-key probing (`readFirst(..., [ ... ])`) across many fields and explicitly issues `GET /api/products` as a fallback to resolve productId. Representative locations:
  - Multi-key probe example: [src/components/stock/StockIn.jsx](src/components/stock/StockIn.jsx#L103)
  - Product-list fallback call: [src/components/stock/StockIn.jsx](src/components/stock/StockIn.jsx#L1098)
  - Comment about removed UI fallback helper: [src/components/stock/StockIn.jsx](src/components/stock/StockIn.jsx#L169)

- src/components/stock/StockTakeOn.jsx: similar pattern to `StockIn.jsx` — multi-key probes and `GET /api/products` fallback for resolving product candidates.
  - Product-list fallback call: [src/components/stock/StockTakeOn.jsx](src/components/stock/StockTakeOn.jsx#L1080)
  - Candidate-by-id usage: [src/components/stock/StockTakeOn.jsx](src/components/stock/StockTakeOn.jsx#L977)

- src/components/stock/StockAdjustment.jsx: multi-key probing and fallback stock id usage (falls back to a base stock id when row lacks one).
  - readFirst probes: [src/components/stock/StockAdjustment.jsx](src/components/stock/StockAdjustment.jsx#L60)
  - Fallback stock id use: [src/components/stock/StockAdjustment.jsx](src/components/stock/StockAdjustment.jsx#L194)
  - Product candidate id usage: [src/components/stock/StockAdjustment.jsx](src/components/stock/StockAdjustment.jsx#L337)

- src/components/stock/StockOut.jsx: uses product candidate id pattern for lookups (may be used as fallback).
  - Candidate-by-id usage: [src/components/stock/StockOut.jsx](src/components/stock/StockOut.jsx#L333)

- src/components/stock/ProductDialog.jsx: queries `/api/products` for product search/list; UI contains fallback-icon uses.
  - Product list request: [src/components/stock/ProductDialog.jsx](src/components/stock/ProductDialog.jsx#L107)
  - Search URL building: [src/components/stock/ProductDialog.jsx](src/components/stock/ProductDialog.jsx#L371)

- src/components/stock/StockTransfer.jsx: candidate product usage for lookups.
  - Candidate-by-id usage: [src/components/stock/StockTransfer.jsx](src/components/stock/StockTransfer.jsx#L364)

- src/components/stock/UOMHierarchy.jsx, UOMHierarchyAdd.jsx, UOMHierarchyEdit.jsx: call `/api/products` when building selection lists.
  - Example: [src/components/stock/UOMHierarchy.jsx](src/components/stock/UOMHierarchy.jsx#L43)

- Other product-list consumers (may be legitimate list pages but worth reviewing):
  - src/components/baseInformation/ProductModern.jsx: [src/components/baseInformation/ProductModern.jsx](src/components/baseInformation/ProductModern.jsx#L48)
  - src/components/baseInformation/Product.jsx: [src/components/baseInformation/Product.jsx](src/components/baseInformation/Product.jsx#L33)
  - src/components/information/ProductBundleAdd.jsx / ProductBundleEdit.jsx / ProductBundleModern.jsx: [src/components/information/ProductBundleAdd.jsx](src/components/information/ProductBundleAdd.jsx#L29)

Notes and guidance

- Status: `readFirst` runtime probing has been removed from active stock components. Remaining references are only in backup files and documentation.
- Two classes of risky patterns originally found:
  1. Runtime "probing" with `readFirst(..., ["alt1", "alt2", ...])` which silently accepted alternate field names. This has been removed from `StockIn.jsx`, `StockAdjustment.jsx`, and `StockEnquiry.jsx`.
  2. Using `GET /api/products` as a fallback to resolve `productId` when the primary source lacks it. These calls remain in some components used for legitimate product lists (e.g., product management pages), but any usage that acted as a fallback to guess `productId` in stock flows has been removed.

- Next recommended steps (short-term):
  - Replace `GET /api/products` fallback flows with explicit failure handling and a visible error / user guidance.
  - Add runtime validation in the central request helper for critical endpoints (e.g., require `productId` on `/api/stockviews/product/{productId}` results) so components fail-fast instead of guessing.
  - Add an ESLint rule to flag `readFirst(..., [`) and `request("GET", "/api/products"` uses in non-list contexts.

If you'd like, I can:

- Open PR that replaces `GET /api/products` fallbacks in `StockIn.jsx` and `StockTakeOn.jsx` with explicit errors and UI messages.
- Implement a small ESLint rule to detect `readFirst(..., [`) and `request("GET", "/api/products"` fallback patterns and add rule tests.
