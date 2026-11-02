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

/** A RUNNING sync with no Shop row activity for this long is assumed dead
 *  (e.g. the server restarted mid-sync) and may be restarted. */
export const STALE_SYNC_MS = 15 * 60 * 1000;

/**
 * Fast, awaited part of install: creates/updates the Shop row (and clears the
 * Phase 1 mock catalog on a shop's first real install — see prisma/seed.ts,
 * the mock shop is uniquely identified by its planName). One GraphQL call and
 * a couple of DB writes — safe to run inside OAuth's afterAuth.
 */
export async function registerShop(session: Session, admin: AdminApiContext) {
  const response = await admin.graphql(SHOP_INFO_QUERY);
  const body = (await response.json()) as ShopInfoQueryResponse;
  const shopInfo = body.data.shop;

  const isFirstRealSync =
    (await db.shop.findUnique({ where: { shopifyDomain: session.shop } })) ===
    null;

  if (isFirstRealSync) {
    await db.shop.deleteMany({ where: { planName: MOCK_SHOP_PLAN } });
  }

  return db.shop.upsert({
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
}

/**
 * Atomically claims the catalog sync for a shop. Returns false when another
 * sync is already RUNNING (and not stale) — this is what prevents duplicate
 * initial-sync jobs from reinstalls, double OAuth callbacks, or retry clicks.
 */
export async function claimCatalogSync(shopId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - STALE_SYNC_MS);
  const { count } = await db.shop.updateMany({
    where: {
      id: shopId,
      OR: [
        { lastSyncStatus: null },
        { lastSyncStatus: { not: "RUNNING" } },
        { updatedAt: { lt: staleBefore } },
      ],
    },
    data: { lastSyncStatus: "RUNNING", lastSyncError: null },
  });
  return count === 1;
}

/** Runs the full product + collection sync and records SUCCESS/FAILED on the
 *  Shop row. Never throws — failures are persisted for the dashboard to show
 *  and retry. Catalog rows already synced are upserts, so a retry never loses
 *  or duplicates product data. */
export async function runCatalogSync(
  shopId: string,
  admin: AdminApiContext,
): Promise<void> {
  try {
    await productSyncService.syncAll(admin, shopId);
    await collectionSyncService.syncAll(admin, shopId);
    await db.shop.update({
      where: { id: shopId },
      data: { lastSyncStatus: "SUCCESS", lastSyncError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[initial-sync] catalog sync failed:", message.split("\n")[0]);
    await db.shop
      .update({
        where: { id: shopId },
        data: { lastSyncStatus: "FAILED", lastSyncError: message.slice(0, 500) },
      })
      .catch((updateError) =>
        console.error("[initial-sync] could not record failure:", updateError),
      );
  }
}

/**
 * Claims the sync and runs it in the background (not awaited by callers), so
 * the merchant reaches the dashboard immediately regardless of catalog size.
 * Returns "already-running" without doing anything if a sync is in flight.
 */
export async function startCatalogSync(
  shopId: string,
  admin: AdminApiContext,
): Promise<"started" | "already-running"> {
  if (!(await claimCatalogSync(shopId))) return "already-running";
  void runCatalogSync(shopId, admin);
  return "started";
}

/** afterAuth entry point: register the shop, then kick off the catalog sync
 *  in the background. Resolves as soon as the shop row exists. */
export async function runInitialSync(
  session: Session,
  admin: AdminApiContext,
): Promise<void> {
  const shop = await registerShop(session, admin);
  await startCatalogSync(shop.id, admin);
}
