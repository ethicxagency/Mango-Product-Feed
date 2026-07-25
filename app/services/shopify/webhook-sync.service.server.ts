import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

import { db } from "~/lib/db.server";
import { collectionSyncService } from "./collection-sync.service.server";
import { productSyncService } from "./product-sync.service.server";

/** Shopify webhook payloads (REST-shaped, the default delivery format)
 * carry the plain numeric resource ID — our sync services key off GraphQL
 * GIDs, so every handler converts before delegating. */
function toGid(
  resource: "Product" | "Collection",
  id: number | string,
): string {
  return `gid://shopify/${resource}/${id}`;
}

async function touchWebhookSync(shopId: string): Promise<void> {
  await db.shop.update({
    where: { id: shopId },
    data: { lastWebhookSyncAt: new Date() },
  });
}

/**
 * Translates incoming webhook events into calls on ProductSyncService /
 * CollectionSyncService — this is the one place that knows how a webhook
 * payload maps to a sync operation, keeping the route handlers themselves
 * thin (auth + delegation only).
 */
export const webhookSyncService = {
  async handleProductUpsert(
    admin: AdminApiContext,
    shopId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await productSyncService.syncOne(
      admin,
      shopId,
      toGid("Product", payload.id as number | string),
    );
    await touchWebhookSync(shopId);
  },

  async handleProductDelete(
    shopId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await productSyncService.deleteOne(
      shopId,
      toGid("Product", payload.id as number | string),
    );
    await touchWebhookSync(shopId);
  },

  async handleCollectionUpsert(
    admin: AdminApiContext,
    shopId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await collectionSyncService.syncOne(
      admin,
      shopId,
      toGid("Collection", payload.id as number | string),
    );
    await touchWebhookSync(shopId);
  },

  async handleCollectionDelete(
    shopId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await collectionSyncService.deleteOne(
      shopId,
      toGid("Collection", payload.id as number | string),
    );
    await touchWebhookSync(shopId);
  },

  /** The shop's data is kept (not deleted) in case of a reinstall — only
   * marked inactive so the dashboard/feeds can reflect the uninstalled
   * state rather than erroring on missing data. */
  async handleAppUninstalled(shopDomain: string): Promise<void> {
    await db.shop.updateMany({
      where: { shopifyDomain: shopDomain },
      data: { isActive: false },
    });
  },
};
