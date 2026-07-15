import { db } from "~/lib/db.server";

export interface InventoryUpdate {
  shopifyInventoryItemId: string;
  inventoryQuantity: number;
  inventoryPolicy: string;
}

/**
 * Owns inventory-specific sync concerns, kept separate from
 * ProductSyncService so inventory refreshes can be triggered independently
 * of a full product sync (e.g. a future inventory_levels/update webhook)
 * without duplicating the update logic.
 */
export const inventorySyncService = {
  /** Applies a batch of inventory updates keyed by Shopify's inventory item
   * ID (stable even if a variant's own ID or SKU changes). */
  async applyUpdates(updates: InventoryUpdate[]): Promise<number> {
    let updated = 0;

    for (const update of updates) {
      const result = await db.variant.updateMany({
        where: { shopifyInventoryItemId: update.shopifyInventoryItemId },
        data: {
          inventoryQuantity: update.inventoryQuantity,
          inventoryPolicy: update.inventoryPolicy,
        },
      });
      updated += result.count;
    }

    return updated;
  },
};
