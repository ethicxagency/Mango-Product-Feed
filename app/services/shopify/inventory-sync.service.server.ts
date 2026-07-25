import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

import { db } from "~/lib/db.server";
import { PRODUCT_SYNC_QUERY } from "./graphql/product-queries";
import type { ProductSyncQueryResponse } from "./graphql/product-queries";

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

  /** Refreshes inventory quantity/policy for every variant without
   * touching product/image/tag data — reuses the same product query
   * ProductSyncService uses (it already carries per-variant inventory
   * fields) so there's one query shape to keep in sync with Shopify's
   * schema, but only writes the inventory-specific columns. */
  async syncFromShopify(
    admin: AdminApiContext,
    shopId: string,
  ): Promise<{ variantCount: number }> {
    let cursor: string | undefined;
    let variantCount = 0;

    do {
      const response = await admin.graphql(PRODUCT_SYNC_QUERY, {
        variables: { cursor },
      });
      const body = (await response.json()) as ProductSyncQueryResponse;

      const updates: InventoryUpdate[] = body.data.products.edges.flatMap(
        (edge) =>
          edge.node.variants.edges.map((v) => ({
            shopifyInventoryItemId: v.node.inventoryItem.id,
            inventoryQuantity: v.node.inventoryQuantity ?? 0,
            inventoryPolicy: v.node.inventoryPolicy,
          })),
      );
      variantCount += await this.applyUpdates(updates);

      cursor = body.data.products.pageInfo.hasNextPage
        ? (body.data.products.pageInfo.endCursor ?? undefined)
        : undefined;
    } while (cursor);

    await db.shop.update({
      where: { id: shopId },
      data: { lastInventorySyncAt: new Date() },
    });

    return { variantCount };
  },
};
