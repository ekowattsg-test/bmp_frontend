Purpose

- Capture the canonical frontend/backend conventions and enforcement points for this repo.

Rules

- Exact field names: always use these product fields exactly as named by the backend: productId, productName, productDescription, uom, productCategory, productClass, productCode, productBrand, commonName, specification, productPicture.
- No fallback probing: do NOT read multiple possible keys (no arrays of fallback keys). If backend must change, update both backend and frontend together.
- Product code: generated format is `<companyPrefix>-<10char-uuid>` using `crypto.randomUUID()` and centralized generator in `src/helpers/itemcode_helper.js`.
- UI protection: `productCode` inputs must be read-only for create/edit flows; product edit receives canonical `productId`.
- Endpoints: use `/api/products` for product lookup/list/get-by-id; use `/api/stockviews/product/{productId}` for stock totals by product.

Enforcement

- Assistant will consult `/memories/repo/standards.json` before making code changes.
- Add grep/CI checks to flag patterns: `readFirst(..., [`, `row["altName"] || row["otherName"]`, or similar multi-key access patterns.

How to change this

- Update `/memories/repo/standards.json` for machine-readable rules and update this doc for human guidance.
