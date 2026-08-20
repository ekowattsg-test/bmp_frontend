# Backend Change Request — Asset Return and Stock Disposal Handlers

## Objective

Add two new `endAction` handlers to `WorkStepsService.java`:

- `asset-return` — reverse of Asset Assignment
- `stock-disposal` — write off inventory

## Affected file

`bmp_backend/src/main/java/com/hcteol/jwt/backend/services/WorkStepsService.java`

## Insert location

Locate the switch block inside `performCurrentStep(String workOrderId)` and add the new cases alongside existing handlers.

## Required imports (verify already present)

- `com.hcteol.jwt.backend.entities.WorkOrder`
- `com.hcteol.jwt.backend.entities.WorkSteps`
- `com.hcteol.jwt.backend.entities.WorkOrderData`
- `com.hcteol.jwt.backend.entities.WorkOrderSubData`
- `com.hcteol.jwt.backend.entities.Stock`
- `com.hcteol.jwt.backend.entities.StockMovement`
- `com.hcteol.jwt.backend.entities.StockDisposal`
- `com.hcteol.jwt.backend.entities.StockDisposalItem`
- `com.hcteol.jwt.backend.entities.Product`
- `com.hcteol.jwt.backend.repositories.WorkOrderRepository`
- `com.hcteol.jwt.backend.repositories.WorkStepsRepository`
- `com.hcteol.jwt.backend.repositories.WorkOrderDataRepository`
- `com.hcteol.jwt.backend.repositories.WorkOrderSubDataRepository`
- `com.hcteol.jwt.backend.repositories.StockRepository`
- `com.hcteol.jwt.backend.repositories.StockMovementRepository`
- `com.hcteol.jwt.backend.repositories.StockDisposalRepository`
- `com.hcteol.jwt.backend.repositories.StockDisposalItemRepository`
- `com.hcteol.jwt.backend.repositories.ProductRepository`

---

## 1. Handler: `case "asset-return"`

Reverse of asset assignment. Assets (product category `A`) move from a worker back into a destination location. The handler must record **two** `StockMovement` rows that mirror the original asset-assignment transfer, keeping per-location balances in `stock_view` correct:

- A transfer-out from the worker location (movement type with `stockModifier = -1`).
- A transfer-in to the destination location (movement type with `stockModifier = +1`).

**All quantities remain positive.** Stock level changes are controlled only by the `stockModifier` defined for each movement type in the movement type configuration.

The existing asset-assignment flow already uses movement types `"G"` (Transferred Out) and `"C"` (Transferred In) for the worker assignment. Reuse those same codes for asset return unless the project requires a dedicated audit code.

> The frontend validates `fromLocation` and `toLocation` before creating the `WorkSteps` record, so the backend handler can read those values directly.

```java
case "asset-return": {
    String toLocation = inProgress.getToLocation();
    String fromLocation = inProgress.getFromLocation();

    String actionedByOut = wo.getIssuedBy();
    if (actionedByOut == null || actionedByOut.isBlank()) {
        actionedByOut = "unknown";
    }

    String refCandidate = workOrderId;

    java.util.List<com.hcteol.jwt.backend.entities.WorkOrderData> wodListOut = workOrderDataRepository.findByWorkOrderId(workOrderId);
    for (com.hcteol.jwt.backend.entities.WorkOrderData wod : wodListOut) {
        java.util.List<com.hcteol.jwt.backend.entities.WorkOrderSubData> subListOut = workOrderSubDataRepository.findByWorkOrderDataId(wod.getWorkOrderDataId());
        for (com.hcteol.jwt.backend.entities.WorkOrderSubData sub : subListOut) {
            Long productId = sub.getProductId();
            String stockCode = sub.getStockId();
            Long qtyLong = sub.getSubQuantity();
            int qty = qtyLong != null ? qtyLong.intValue() : 0;

            // Optional: verify product category is A
            com.hcteol.jwt.backend.entities.Product product = productRepository.findById(productId).orElse(null);
            if (product != null && !"A".equalsIgnoreCase(product.getProductCategory())) {
                throw new IllegalStateException("Asset return is only allowed for product category A for workOrder " + workOrderId);
            }

            com.hcteol.jwt.backend.entities.Stock stock = stockRepository.findByProductIdAndStockCode(productId, stockCode);
            if (stock == null) {
                stock = new com.hcteol.jwt.backend.entities.Stock();
                stock.setProductId(productId);
                stock.setStockCode(stockCode);
                stock.setLocation(toLocation);
                stock = stockRepository.save(stock);
            }

            // 1. Transfer out from the worker location.
            com.hcteol.jwt.backend.entities.StockMovement sourceMv = new com.hcteol.jwt.backend.entities.StockMovement();
            sourceMv.setStockId(stock.getStockId());
            sourceMv.setMovementType("G");
            sourceMv.setQuantity(qty);
            sourceMv.setLocation(fromLocation);
            sourceMv.setReference(refCandidate);
            sourceMv.setActionBy(actionedByOut);
            sourceMv.setWorkOrderId(workOrderId);
            // set recordDate using existing backend helper
            stockMovementRepository.save(sourceMv);

            // 2. Transfer in to the destination location.
            com.hcteol.jwt.backend.entities.StockMovement destMv = new com.hcteol.jwt.backend.entities.StockMovement();
            destMv.setStockId(stock.getStockId());
            destMv.setMovementType("C");
            destMv.setQuantity(qty);
            destMv.setLocation(toLocation);
            destMv.setReference(refCandidate);
            destMv.setActionBy(actionedByOut);
            destMv.setWorkOrderId(workOrderId);
            // set recordDate using existing backend helper
            stockMovementRepository.save(destMv);
        }
    }
    break;
}
```

---

## 2. Handler: `case "stock-disposal"`

Mirror of `stock-out`. Inventory moves out of the source location using movement type `D`. The frontend creates the `StockDisposal` header and items before the work order, then stores the generated `disposalId` in `WorkOrder.workDescription` using this format:

```
DISPOSAL:{disposalId}
```

The handler extracts `disposalId`, creates the stock-out movement, and updates the `StockDisposal` status to `DISPOSED`.

```java
case "stock-disposal": {
    String fromLocation = inProgress.getFromLocation();
    if (fromLocation == null || fromLocation.isBlank()) {
        throw new IllegalStateException("Source location (fromLocation) not set on step record for stock-disposal action");
    }

    // Resolve the StockDisposal id from the work-order description.
    // Frontend format: "DISPOSAL:{disposalId}"
    Long disposalId = null;
    String woDescription = wo.getWorkDescription();
    if (woDescription != null) {
        String[] parts = woDescription.split(":", 2);
        if (parts.length >= 2 && "DISPOSAL".equalsIgnoreCase(parts[0])) {
            try {
                disposalId = Long.valueOf(parts[1]);
            } catch (NumberFormatException ignored) {
            }
        }
    }

    if (disposalId == null) {
        throw new IllegalStateException("StockDisposal id not found in work order description for stock-disposal action on workOrder " + workOrderId);
    }

    com.hcteol.jwt.backend.entities.StockDisposal stockDisposal = stockDisposalRepository.findById(disposalId).orElse(null);
    if (stockDisposal == null) {
        throw new IllegalStateException("StockDisposal " + disposalId + " not found for stock-disposal action on workOrder " + workOrderId);
    }

    String actionedByOut = wo.getIssuedBy();
    if (actionedByOut == null || actionedByOut.isBlank()) {
        actionedByOut = "unknown";
    }

    String refCandidate = stockDisposal.getDisposalId().toString();
    int totalQuantity = 0;

    java.util.List<com.hcteol.jwt.backend.entities.WorkOrderData> wodListOut = workOrderDataRepository.findByWorkOrderId(workOrderId);
    for (com.hcteol.jwt.backend.entities.WorkOrderData wod : wodListOut) {
        java.util.List<com.hcteol.jwt.backend.entities.WorkOrderSubData> subListOut = workOrderSubDataRepository.findByWorkOrderDataId(wod.getWorkOrderDataId());
        for (com.hcteol.jwt.backend.entities.WorkOrderSubData sub : subListOut) {
            Long productId = sub.getProductId();
            String stockCode = sub.getStockId();
            Long qtyLong = sub.getSubQuantity();
            int qty = qtyLong != null ? qtyLong.intValue() : 0;

            // Optional: verify product category is C
            com.hcteol.jwt.backend.entities.Product product = productRepository.findById(productId).orElse(null);
            if (product != null && !"C".equalsIgnoreCase(product.getProductCategory())) {
                throw new IllegalStateException("Stock disposal is only allowed for product category C for workOrder " + workOrderId);
            }

            com.hcteol.jwt.backend.entities.Stock stock = stockRepository.findByProductIdAndStockCode(productId, stockCode);
            if (stock == null) {
                throw new IllegalStateException("Stock not found for product " + productId + " and code " + stockCode + " during stock-disposal for workOrder " + workOrderId);
            }

            com.hcteol.jwt.backend.entities.StockMovement mv = new com.hcteol.jwt.backend.entities.StockMovement();
            mv.setStockId(stock.getStockId());
            mv.setMovementType("D");
            mv.setQuantity(qty);
            mv.setLocation(fromLocation);
            mv.setReference(refCandidate);
            mv.setActionBy(actionedByOut);
            mv.setWorkOrderId(workOrderId);
            mv.setRecordDate(resolveRecordDateNow());
            stockMovementRepository.save(mv);

            totalQuantity += qty;
        }
    }

    stockDisposal.setDisposalStatus("DISPOSED");
    stockDisposal.setTotalQuantity(totalQuantity);
    stockDisposalRepository.save(stockDisposal);
    break;
}
```

---

## Notes

- Use the same `resolveRecordDateNow()` helper as the existing handlers for the `recordDate` field.
- Product category checks are optional but recommended to keep the flows aligned with frontend restrictions.
