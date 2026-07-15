import type { Availability, InventoryPolicy } from "~/types/product";

/**
 * Inventory rule from the spec: continue-selling variants at 0 stock are
 * "preorder"; everything else at 0 stock is "out of stock". Positive stock
 * is always "in stock". "backorder" has no automated trigger today — it's
 * reserved for a future manual override.
 */
export function resolveAvailability(
  inventoryQuantity: number,
  inventoryPolicy: InventoryPolicy,
): Availability {
  if (inventoryQuantity > 0) return "in stock";
  return inventoryPolicy === "CONTINUE" ? "preorder" : "out of stock";
}
