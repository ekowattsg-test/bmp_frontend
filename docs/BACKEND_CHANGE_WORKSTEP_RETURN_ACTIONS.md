# Backend Change Request — WorkStepsService Return Action Handlers

## Objective

Add three new `endAction` handlers to `WorkStepsService.java` so the frontend can execute returning-inventory work orders.

## Affected file

`bmp_backend/src/main/java/com/hcteol/jwt/backend/services/WorkStepsService.java`

## Insert location

Locate the switch block inside `performCurrentStep(String workOrderId)`:

```java
switch (trimmedAction.toLowerCase()) {
    case "stock-in": { ... }
    case "stock-out": { ... }
    case "stock-tx": { ... }
    case "stock-loc": { ... }
    // new cases go here
}
```

## Required imports (verify already present)

- `com.hcteol.jwt.backend.entities.WorkOrder`
- `com.hcteol.jwt.backend.entities.WorkSteps`
- `com.hcteol.jwt.backend.entities.WorkOrderData`
- `com.hcteol.jwt.backend.entities.WorkOrderSubData`
- `com.hcteol.jwt.backend.entities.Stock`
- `com.hcteol.jwt.backend.entities.StockMovement`
- `com.hcteol.jwt.backend.entities.PurchaseReturn`
- `com.hcteol.jwt.backend.entities.PurchaseReturnItem`
- `com.hcteol.jwt.backend.entities.DeliveryReturn`
- `com.hcteol.jwt.backend.entities.DeliveryReturnItem`
- `com.hcteol.jwt.backend.repositories.WorkOrderRepository`
- `com.hcteol.jwt.backend.repositories.WorkStepsRepository`
- `com.hcteol.jwt.backend.repositories.WorkOrderDataRepository`
- `com.hcteol.jwt.backend.repositories.WorkOrderSubDataRepository`
- `com.hcteol.jwt.backend.repositories.StockRepository`
- `com.hcteol.jwt.backend.repositories.StockMovementRepository`
- `com.hcteol.jwt.backend.repositories.PurchaseReturnRepository`
- `com.hcteol.jwt.backend.repositories.PurchaseReturnItemRepository`
- `com.hcteol.jwt.backend.repositories.DeliveryReturnRepository`
- `com.hcteol.jwt.backend.repositories.DeliveryReturnItemRepository`
- `com.hcteol.jwt.backend.repositories.DeliveryOrderRepository`
- `com.hcteol.jwt.backend.repositories.DeliveryOrderItemRepository`

## 1. Handler: `case "stock-return"`

Mirror of `stock-out`, but stock moves **into** the destination location using movement type `W`.

````java
case "stock-return": {
    String toLocation = inProgress.getToLocation();
    if (toLocation == null || toLocation.isBlank()) {
        throw new IllegalStateException("Destination location (toLocation) not set on step record for stock-return action");
    }

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

            com.hcteol.jwt.backend.entities.Stock stock = stockRepository.findByProductIdAndStockCode(productId, stockCode);
            if (stock == null) {
                throw new IllegalStateException("Stock not found for product " + productId + " and code " + stockCode + " during stock-return for workOrder " + workOrderId);
            }

            com.hcteol.jwt.backend.entities.StockMovement mv = new com.hcteol.jwt.backend.entities.StockMovement();
            mv.setStockId(stock.getStockId());
            mv.setMovementType("W");
            mv.setQuantity(qty);
            mv.setLocation(toLocation);
            mv.setReference(refCandidate);
            mv.setActionBy(actionedByOut);
            mv.setWorkOrderId(workOrderId);
            // Use the same type/pattern as existing handlers for recordDate
            // (String or LocalDateTime depending on StockMovement entity)
            mv.setRecordDate(resolveRecordDateNow());
            stockMovementRepository.save(mv);
        }
    }
    break;
}

## 2. Handler: `case "transfer-return-in"`

Mirror of `transfer-in`, but stock moves **into** the receiving location using movement type `T`. The frontend creates a `DeliveryReturn` header and items before the work order, and stores the `returnId` in `WorkOrder.workDescription` using the format `RETURN:{returnId}:DO:{doId}`.

```java
case "transfer-return-in": {
    String toLocation = inProgress.getToLocation();
    if (toLocation == null || toLocation.isBlank()) {
        throw new IllegalStateException("Destination location (toLocation) not set on step record for transfer-return-in action");
    }

    String actionedByOut = wo.getIssuedBy();
    if (actionedByOut == null || actionedByOut.isBlank()) {
        actionedByOut = "unknown";
    }

    // Resolve the DeliveryReturn id and DO id from the work-order description.
    // Frontend format: "RETURN:{returnId}:DO:{doId}"
    Long returnId = null;
    String doId = null;
    String woDescription = wo.getWorkDescription();
    if (woDescription != null) {
        String[] parts = woDescription.split(":", 4);
        if (parts.length >= 4 && "RETURN".equalsIgnoreCase(parts[0]) && "DO".equalsIgnoreCase(parts[2])) {
            try {
                returnId = Long.valueOf(parts[1]);
                doId = parts[3];
            } catch (NumberFormatException ignored) {
            }
        }
    }

    if (returnId == null || doId == null || doId.isBlank()) {
        throw new IllegalStateException("DeliveryReturn id and DO id not found in work order description for transfer-return-in action on workOrder " + workOrderId);
    }

    com.hcteol.jwt.backend.entities.DeliveryReturn deliveryReturn = deliveryReturnRepository.findById(returnId).orElse(null);
    if (deliveryReturn == null) {
        throw new IllegalStateException("DeliveryReturn " + returnId + " not found for transfer-return-in action on workOrder " + workOrderId);
    }

    String refCandidate = deliveryReturn.getReturnId().toString();

    int totalQuantity = 0;

    java.util.List<com.hcteol.jwt.backend.entities.WorkOrderData> wodListIn = workOrderDataRepository.findByWorkOrderId(workOrderId);
    for (com.hcteol.jwt.backend.entities.WorkOrderData wod : wodListIn) {
        java.util.List<com.hcteol.jwt.backend.entities.WorkOrderSubData> subListIn = workOrderSubDataRepository.findByWorkOrderDataId(wod.getWorkOrderDataId());
        for (com.hcteol.jwt.backend.entities.WorkOrderSubData sub : subListIn) {
            Long productId = sub.getProductId();
            String stockCode = sub.getStockId();
            Long qtyLong = sub.getSubQuantity();
            int qty = qtyLong != null ? qtyLong.intValue() : 0;

            com.hcteol.jwt.backend.entities.Stock stock = stockRepository.findByProductIdAndStockCode(productId, stockCode);
            if (stock == null) {
                stock = new com.hcteol.jwt.backend.entities.Stock();
                stock.setProductId(productId);
                stock.setStockCode(stockCode);
                stock.setLocation(toLocation);
                stock = stockRepository.save(stock);
            }

            com.hcteol.jwt.backend.entities.StockMovement mv = new com.hcteol.jwt.backend.entities.StockMovement();
            mv.setStockId(stock.getStockId());
            mv.setMovementType("T");
            mv.setQuantity(qty);
            mv.setLocation(toLocation);
            mv.setReference(refCandidate);
            mv.setActionBy(actionedByOut);
            mv.setWorkOrderId(workOrderId);
            // Use the same type/pattern as existing handlers for recordDate
            mv.setRecordDate(resolveRecordDateNow());
            stockMovementRepository.save(mv);

            totalQuantity += qty;
        }
    }

    // Finalise the DeliveryReturn
    deliveryReturn.setReturnStatus("CREDITED");
    deliveryReturn.setTotalQuantity(totalQuantity);
    deliveryReturnRepository.save(deliveryReturn);

    // Update DO status based on total returned vs total delivered
    com.hcteol.jwt.backend.entities.DeliveryOrder deliveryOrder = deliveryOrderRepository.findById(doId).orElse(null);
    if (deliveryOrder != null) {
        long totalReturned = deliveryReturnItemRepository.findByReturnId(returnId).stream()
            .mapToLong(item -> item.getQuantity() != null ? item.getQuantity() : 0)
            .sum();

        java.util.List<com.hcteol.jwt.backend.entities.DeliveryOrderItem> doItems = deliveryOrderItemRepository.findByOrderId(doId);
        long totalDelivered = doItems.stream()
            .mapToLong(item -> item.getQuantity() != null ? item.getQuantity() : 0)
            .sum();

        if (totalReturned >= totalDelivered) {
            deliveryOrder.setOrderStatus("RETURNED");
        } else {
            deliveryOrder.setOrderStatus("PARTIALLY_RETURNED");
        }
        deliveryOrderRepository.save(deliveryOrder);
    }
    break;
}
````

> **Note:** Add `DeliveryReturnRepository`, `DeliveryReturnItemRepository`, and `DeliveryOrderItemRepository` to the required imports. Add `PARTIALLY_RETURNED` to the DO status enum / allowed values and to the frontend status mapping.

## 3. Handler: `case "stock-return-to-vendor"`

Mirror of `stock-in`, but stock moves **out of** the source location using movement type `P`. Instead of changing `PurchaseOrder.orderStatus`, the handler updates the linked `PurchaseReturn` record status to `CREDITED`.

The frontend creates the `PurchaseReturn` header and all `PurchaseReturnItem` rows before the work order, then stores the generated `returnId` in `WorkOrder.workDescription` using this format:

```
RETURN:{returnId}:PO:{poId}
```

Example: `RETURN:42:PO:PO-2026-00123`

The handler extracts `returnId` from this field and finalises the credit note.

```java
case "stock-return-to-vendor": {
    String fromLocation = inProgress.getFromLocation();
    if (fromLocation == null || fromLocation.isBlank()) {
        throw new IllegalStateException("Source location (fromLocation) not set on step record for stock-return-to-vendor action");
    }

    String poId = inProgress.getToLocation();
    if (poId == null || poId.isBlank()) {
        throw new IllegalStateException("Purchase order id (toLocation) not set on step record for stock-return-to-vendor action");
    }

    // Resolve the PurchaseReturn id from the work-order description.
    // Frontend format: "RETURN:{returnId}:PO:{poId}"
    Long returnId = null;
    String woDescription = wo.getWorkDescription();
    if (woDescription != null) {
        String[] parts = woDescription.split(":", 4);
        if (parts.length >= 2 && "RETURN".equalsIgnoreCase(parts[0])) {
            try {
                returnId = Long.valueOf(parts[1]);
            } catch (NumberFormatException ignored) {
            }
        }
    }

    if (returnId == null) {
        throw new IllegalStateException("PurchaseReturn id not found in work order description for stock-return-to-vendor action on workOrder " + workOrderId);
    }

    com.hcteol.jwt.backend.entities.PurchaseReturn purchaseReturn = purchaseReturnRepository.findById(returnId).orElse(null);
    if (purchaseReturn == null) {
        throw new IllegalStateException("PurchaseReturn " + returnId + " not found for stock-return-to-vendor action on workOrder " + workOrderId);
    }

    String actionedByOut = wo.getIssuedBy();
    if (actionedByOut == null || actionedByOut.isBlank()) {
        actionedByOut = "unknown";
    }

    String refCandidate = purchaseReturn.getReturnId().toString();

    int totalQuantity = 0;
    java.math.BigDecimal creditAmount = java.math.BigDecimal.ZERO;

    java.util.List<com.hcteol.jwt.backend.entities.WorkOrderData> wodListReturn = workOrderDataRepository.findByWorkOrderId(workOrderId);
    for (com.hcteol.jwt.backend.entities.WorkOrderData wod : wodListReturn) {
        java.util.List<com.hcteol.jwt.backend.entities.WorkOrderSubData> subListReturn = workOrderSubDataRepository.findByWorkOrderDataId(wod.getWorkOrderDataId());
        for (com.hcteol.jwt.backend.entities.WorkOrderSubData sub : subListReturn) {
            Long productId = sub.getProductId();
            String stockCode = sub.getStockId();
            Long qtyLong = sub.getSubQuantity();
            int qty = qtyLong != null ? qtyLong.intValue() : 0;

            com.hcteol.jwt.backend.entities.Stock stock = stockRepository.findByProductIdAndStockCode(productId, stockCode);
            if (stock == null) {
                throw new IllegalStateException("Stock not found for product " + productId + " and code " + stockCode + " during purchase return for workOrder " + workOrderId);
            }

            com.hcteol.jwt.backend.entities.StockMovement mv = new com.hcteol.jwt.backend.entities.StockMovement();
            mv.setStockId(stock.getStockId());
            mv.setMovementType("P");
            mv.setQuantity(qty);
            mv.setLocation(fromLocation);
            mv.setReference(refCandidate);
            mv.setActionBy(actionedByOut);
            mv.setWorkOrderId(workOrderId);
            // Use the same type/pattern as existing handlers for recordDate
            mv.setRecordDate(resolveRecordDateNow());
            stockMovementRepository.save(mv);

            totalQuantity += qty;
        }
    }

    // Aggregate line totals from existing PurchaseReturnItem rows
    java.util.List<com.hcteol.jwt.backend.entities.PurchaseReturnItem> items = purchaseReturnItemRepository.findByReturnId(returnId);
    for (com.hcteol.jwt.backend.entities.PurchaseReturnItem item : items) {
        creditAmount = creditAmount.add(
            item.getLineTotal() != null ? item.getLineTotal() : java.math.BigDecimal.ZERO
        );
    }

    purchaseReturn.setReturnStatus("CREDITED");
    purchaseReturn.setTotalQuantity(totalQuantity);
    purchaseReturn.setCreditAmount(creditAmount);
    purchaseReturnRepository.save(purchaseReturn);
    break;
}
```

> **Note:** The original `PurchaseOrder` status remains `RECEIVED`. The credit event is recorded entirely through `PurchaseReturn` + `PurchaseReturnItem` + `StockMovement` rows.

## Shared values

All three handlers must set:

| Field                       | Value source                                                           | Reason                                  |
| --------------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| `StockMovement.reference`   | `workOrderId`, `DeliveryReturn.returnId`, or `PurchaseReturn.returnId` | Links movement to originating document  |
| `StockMovement.actionBy`    | `WorkOrder.issuedBy`                                                   | Records the operator who ran the return |
| `StockMovement.workOrderId` | current `workOrderId`                                                  | Links movement to the work order        |
| `StockMovement.recordDate`  | current server time, using the same type as existing handlers          | Timestamp of the transaction            |

## Verification

After applying these changes, executing each work-order type from the frontend should produce `StockMovement` rows with:

| Work order type  | movementType | location                   | reference                 |
| ---------------- | ------------ | -------------------------- | ------------------------- |
| `Return`         | `W`          | `toLocation` (destination) | `workOrderId`             |
| `ReturnIn`       | `T`          | `toLocation` (destination) | `DeliveryReturn.returnId` |
| `PurchaseReturn` | `P`          | `fromLocation` (source)    | `PurchaseReturn.returnId` |

## Related documents

- [BACKEND_CHANGE_RETURN_MOVEMENT_CODES.md](BACKEND_CHANGE_RETURN_MOVEMENT_CODES.md)
- [BACKEND_CHANGE_RETURN_STEP_TYPES.md](BACKEND_CHANGE_RETURN_STEP_TYPES.md)
- [BACKEND_CHANGE_PURCHASE_RETURN_ENTITY.md](BACKEND_CHANGE_PURCHASE_RETURN_ENTITY.md)
- [BACKEND_CHANGE_DELIVERY_RETURN_ENTITY.md](BACKEND_CHANGE_DELIVERY_RETURN_ENTITY.md)
