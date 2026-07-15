import type {
  AdminApiContext,
  Session,
} from "@shopify/shopify-app-remix/server";

import { db } from "~/lib/db.server";
import { collectionSyncService } from "./collection-sync.service.server";
import { SHOP_INFO_QUERY } from "./graphql/shop-query";
import type { ShopInfoQueryResponse } from "./graphql/shop-query";
import { productSyncService } from "./product-sync.service.server";

const MOCK_SHOP_PLAN = "mock-development";

/**
 * Runs once, right after a shop completes OAuth: creates/updates the Shop
 * row, clears out the Phase 1 mock catalog on a shop's first real sync
 * (see prisma/seed.ts — the mock shop is uniquely identified by its
 * planName), and performs a full product + collection sync.
 */
export async function runInitialSync(
  session: Session,
  admin: AdminApiContext,
): Promise<void> {
  const response = await admin.graphql(SHOP_INFO_QUERY);
  const body = (await response.json()) as ShopInfoQueryResponse;
  const shopInfo = body.data.shop;

  const isFirstRealSync =
    (await db.shop.findUnique({ where: { shopifyDomain: session.shop } })) ===
    null;

  if (isFirstRealSync) {
    await db.shop.deleteMany({ where: { planName: MOCK_SHOP_PLAN } });
  }

  const shop = await db.shop.upsert({
    where: { shopifyDomain: session.shop },
    create: {
      shopifyDomain: session.shop,
      name: shopInfo.name,
      email: shopInfo.email ?? "",
      currency: shopInfo.currencyCode,
      ianaTimezone: shopInfo.ianaTimezone,
      planName: "shopify",
      isActive: true,
      installedAt: new Date(),
      grantedScopes: session.scope ?? "",
    },
    update: {
      name: shopInfo.name,
      email: shopInfo.email ?? "",
      currency: shopInfo.currencyCode,
      ianaTimezone: shopInfo.ianaTimezone,
      isActive: true,
      grantedScopes: session.scope ?? "",
    },
  });

  try {
    await productSyncService.syncAll(admin, shop.id);
    await collectionSyncService.syncAll(admin, shop.id);
    await db.shop.update({
      where: { id: shop.id },
      data: { lastSyncStatus: "SUCCESS", lastSyncError: null },
    });
  } catch (error) {
    await db.shop.update({
      where: { id: shop.id },
      data: {
        lastSyncStatus: "FAILED",
        lastSyncError: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
