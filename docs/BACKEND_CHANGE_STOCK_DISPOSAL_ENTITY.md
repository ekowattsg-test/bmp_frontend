# Backend Change Request — StockDisposal Entity

## Objective

Create a `StockDisposal` credit-note entity to record why, when, and how much inventory was written off.

## Tables

### `stock_disposal`

| Column            | Type                     | Notes                                                  |
| ----------------- | ------------------------ | ------------------------------------------------------ |
| `disposal_id`     | BIGINT PK auto-increment | Header ID                                              |
| `location`        | VARCHAR                  | Source location                                        |
| `disposed_by`     | VARCHAR                  | Operator display name                                  |
| `disposal_date`   | DATETIME / TIMESTAMP     | Date of disposal                                       |
| `disposal_reason` | VARCHAR                  | Reason for disposal (e.g., Damaged, Expired, Obsolete) |
| `disposal_method` | VARCHAR                  | Method of disposal (e.g., Destroy, Scrap, Donate)      |
| `disposal_status` | VARCHAR                  | `NEW` → `DISPOSED`                                     |
| `total_quantity`  | INT                      | Total units disposed                                   |

### `stock_disposal_item`

| Column                   | Type                                   | Notes             |
| ------------------------ | -------------------------------------- | ----------------- |
| `stock_disposal_item_id` | BIGINT PK auto-increment               | Line item ID      |
| `disposal_id`            | BIGINT FK → stock_disposal.disposal_id | Header reference  |
| `product_id`             | BIGINT                                 | Product ID        |
| `product_code`           | VARCHAR                                | Product code      |
| `stock_code`             | VARCHAR                                | Stock code        |
| `quantity`               | INT                                    | Disposed quantity |

## Required REST endpoints

### StockDisposal controller (`/api/stockDisposals`)

- `GET /api/stockDisposals` — list all disposal headers
- `GET /api/stockDisposals/{disposalId}` — get one header
- `POST /api/stockDisposals` — create header
- `PUT /api/stockDisposals/{disposalId}` — update header
- `DELETE /api/stockDisposals/{disposalId}` — delete header

### StockDisposalItem controller (`/api/stockDisposalItems`)

- `GET /api/stockDisposalItems/disposal/{disposalId}` — list items for a header
- `POST /api/stockDisposalItems` — create item
- `DELETE /api/stockDisposalItems/{itemId}` — delete item

## Frontend assumptions

- The frontend will create the `StockDisposal` header and all `StockDisposalItem` rows before creating the work order.
- The frontend will store the generated `disposalId` in `WorkOrder.workDescription` as `DISPOSAL:{disposalId}`.
- The backend handler will update `disposalStatus` from `NEW` to `DISPOSED` after stock movements are recorded.
