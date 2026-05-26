import { request } from "./axios_helper";

/**
 * Markup applied on top of the latest purchase price to derive the suggested selling price.
 * Change this value to adjust the default margin for delivery order items.
 * e.g. 20 = 20% markup → selling price = cost × 1.20
 */
export const PRICE_MARKUP_PERCENT = 20;

/**
 * Fetches the suggested unit price and available stock quantity for a product.
 *
 * Price  → GET /api/purchaseOrders/product/{productId}/stats
 *           Uses the latest unit price field available, then applies PRICE_MARKUP_PERCENT.
 *
 * Stock  → GET /api/stockviews/product/{productId}
 *           Sums stockMoved across all movement rows for the product.
 */
export const fetchProductInfo = async (productId) => {
  if (!productId) return { suggestedPrice: null, availableQty: null };
  try {
    const [statsRes, stockRes] = await Promise.allSettled([
      request(
        "GET",
        `/api/purchaseOrders/product/${encodeURIComponent(productId)}/stats`,
      ),
      request(
        "GET",
        `/api/stockviews/product/${encodeURIComponent(productId)}`,
      ),
    ]);

    let suggestedPrice = null;
    if (statsRes.status === "fulfilled" && statsRes.value?.data) {
      const s = statsRes.value.data;
      const latest = s.latestCost ?? s.averageCost ?? null;
      if (latest != null && Number(latest) > 0) {
        const multiplier = 1 + PRICE_MARKUP_PERCENT / 100;
        suggestedPrice = parseFloat((Number(latest) * multiplier).toFixed(2));
      }
    }

    let availableQty = null;
    if (
      stockRes.status === "fulfilled" &&
      Array.isArray(stockRes.value?.data)
    ) {
      availableQty = stockRes.value.data.reduce((sum, row) => {
        return sum + Number(row.stockMoved || 0);
      }, 0);
    }

    return { suggestedPrice, availableQty };
  } catch {
    return { suggestedPrice: null, availableQty: null };
  }
};
