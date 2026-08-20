# Backend Change Request — Delivery Return Entity

## Objective

Support **partial returns against a Delivery Order** by creating a dedicated `DeliveryReturn` credit-note record, instead of always marking the entire DO as `RETURNED`.

## Status

**Required.** This replaces the simple "always mark DO as RETURNED" behaviour for `ReturnIn` work orders.

## Proposed new entities

### 1. `DeliveryReturn` header

```java
@Entity
@Table(name = "delivery_return")
public class DeliveryReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "return_id")
    private Long returnId;

    @Column(name = "do_id", nullable = false)
    private String doId;

    @Column(name = "return_date")
    private LocalDateTime returnDate;

    @Column(name = "return_status")
    private String returnStatus; // NEW, CREDITED

    @Column(name = "returned_by")
    private String returnedBy;

    @Column(name = "location")
    private String location;

    @Column(name = "total_quantity")
    private Integer totalQuantity;

    // getters and setters
}
```

### 2. `DeliveryReturnItem` lines

```java
@Entity
@Table(name = "delivery_return_item")
public class DeliveryReturnItem {

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

    // getters and setters
}
```

## Required endpoints (minimum)

| Method | Endpoint                                     | Purpose                                                                |
| ------ | -------------------------------------------- | ---------------------------------------------------------------------- |
| POST   | `/api/deliveryReturns`                       | Create a return header                                                 |
| GET    | `/api/deliveryReturns`                       | List returns                                                           |
| GET    | `/api/deliveryReturns/{returnId}`            | Get one return                                                         |
| GET    | `/api/deliveryReturns/do/{doId}`             | Get returns for a DO                                                   |
| PUT    | `/api/deliveryReturns/{returnId}`            | Update return status and totals only (`returnStatus`, `totalQuantity`) |
| POST   | `/api/deliveryReturnItems`                   | Add return line items                                                  |
| GET    | `/api/deliveryReturnItems/return/{returnId}` | Get items for a return                                                 |

## Frontend integration point

The frontend `transfer_return_service.js` will:

1. Call `POST /api/deliveryReturns` to create the header **before** creating the work order.
2. Call `POST /api/deliveryReturnItems` for each returned line.
3. Create the `ReturnIn` work order with `workDescription` set to:
   ```
   RETURN:{returnId}:DO:{doId}
   ```
   Example: `RETURN:15:DO:DO-2026-00456`
4. The work-order execution handler extracts `returnId` from `workDescription`, creates the `StockMovement` rows, and finalises `DeliveryReturn` status to `CREDITED`.

The `PUT /api/deliveryReturns/{returnId}` endpoint should reject or ignore changes to immutable header fields (`doId`, `location`, `returnDate`).

## Delivery order status policy

After the handler credits a `DeliveryReturn`, it computes the total returned quantity for the DO by summing all credited `DeliveryReturnItem` rows. It then compares this to the total delivered quantity from `DeliveryOrderItem`.

| Condition                     | DO status            |
| ----------------------------- | -------------------- |
| Returned qty == Delivered qty | `RETURNED`           |
| Returned qty < Delivered qty  | `PARTIALLY_RETURNED` |
| Returned qty > Delivered qty  | Error / reject       |

The original DO line items remain unchanged; the credit event is recorded entirely through `DeliveryReturn` + `DeliveryReturnItem` + `StockMovement` rows.

## Required frontend status updates

Add `PARTIALLY_RETURNED` to [DeliveryOrderStatusAction.jsx](src/components/information/DeliveryOrderStatusAction.jsx):

- Status chip colour (suggested: `warning`)
- Translation key `deliveryOrderList.status.partially_returned`
- Eligible transitions from `PARTIALLY_RETURNED`: `RETURNED`, `CANCELLED`

## Database migration

Add a Flyway migration in `src/main/resources/db/migration/` to create `delivery_return` and `delivery_return_item` tables. Do not rely solely on Hibernate `ddl-auto`.

## Related frontend file

[TransferReturnIn.jsx](src/components/stock/TransferReturnIn.jsx) — to be implemented after these backend changes are in place.
