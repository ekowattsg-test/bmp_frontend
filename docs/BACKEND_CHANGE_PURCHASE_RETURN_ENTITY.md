# Backend Change Request — Purchase Return Entity

## Objective

Provide a clean audit trail when inventory is returned to a vendor by creating a dedicated `PurchaseReturn` credit-note record, instead of only changing the `PurchaseOrder.orderStatus` to `RETURNED`.

## Status

**Required.** This approach has been selected for the purchase return flow.

## Proposed new entities

### 1. `PurchaseReturn` header

```java
@Entity
@Table(name = "purchase_return")
public class PurchaseReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "return_id")
    private Long returnId;

    @Column(name = "po_id", nullable = false)
    private String poId;

    @Column(name = "return_date")
    private LocalDateTime returnDate;

    @Column(name = "return_status")
    private String returnStatus; // NEW, APPROVED, CREDITED

    @Column(name = "returned_by")
    private String returnedBy;

    @Column(name = "vendor_id")
    // Use the same type as PurchaseOrder.vendorId in your codebase (String or Long)
    private String vendorId;

    @Column(name = "location")
    private String location;

    @Column(name = "total_quantity")
    private Integer totalQuantity;

    @Column(name = "credit_amount")
    private BigDecimal creditAmount;

    // getters and setters
}
```

### 2. `PurchaseReturnItem` lines

```java
@Entity
@Table(name = "purchase_return_item")
public class PurchaseReturnItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long itemId;

    @Column(name = "return_id", nullable = false)
    private Long returnId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "product_code")
    private String productCode;

    @Column(name = "stock_code")
    private String stockCode;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "unit_price")
    private BigDecimal unitPrice;

    @Column(name = "line_total")
    private BigDecimal lineTotal;

    // getters and setters
}
```

## Required endpoints (minimum)

| Method | Endpoint                                     | Purpose                                                                                |
| ------ | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| POST   | `/api/purchaseReturns`                       | Create a return header                                                                 |
| GET    | `/api/purchaseReturns`                       | List returns                                                                           |
| GET    | `/api/purchaseReturns/{returnId}`            | Get one return                                                                         |
| GET    | `/api/purchaseReturns/po/{poId}`             | Get returns for a PO                                                                   |
| PUT    | `/api/purchaseReturns/{returnId}`            | Update return status and totals only (`returnStatus`, `totalQuantity`, `creditAmount`) |
| POST   | `/api/purchaseReturnItems`                   | Add return line items                                                                  |
| GET    | `/api/purchaseReturnItems/return/{returnId}` | Get items for a return                                                                 |

## Frontend integration point

The frontend `purchase_return_service.js` will:

1. Call `POST /api/purchaseReturns` to create the header **before** creating the work order.
2. Call `POST /api/purchaseReturnItems` for each returned line (price and totals come from the original PO item).
3. Create the `PurchaseReturn` work order with `workDescription` set to:
   ```
   RETURN:{returnId}:PO:{poId}
   ```
   Example: `RETURN:42:PO:PO-2026-00123`
4. The work-order execution handler extracts `returnId` from `workDescription`, creates the `StockMovement` rows, and finalises `PurchaseReturn` status to `CREDITED`.

The handler in `WorkStepsService` updates the linked `PurchaseReturn` record instead of modifying `PurchaseOrder.orderStatus` directly. The `PUT /api/purchaseReturns/{returnId}` endpoint should reject or ignore changes to immutable header fields (`poId`, `vendorId`, `location`, `returnDate`).

## Purchase order status policy

`PurchaseOrder.orderStatus` should **not** be set to `RETURNED`. Instead:

- The original PO remains `RECEIVED` so the full receipt history is preserved.
- The new `PurchaseReturn` record documents the credit event.
- Optionally, the PO can expose a derived `hasReturns` flag or a child `purchaseReturns` list if the UI needs to warn users.

## Database migration

Add a Flyway migration in `src/main/resources/db/migration/` to create `purchase_return` and `purchase_return_item` tables. Do not rely solely on Hibernate `ddl-auto`.

## Related frontend file

[PurchaseReturn.jsx](src/components/stock/PurchaseReturn.jsx) — to be implemented after these backend changes are in place.
