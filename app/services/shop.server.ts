import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { Session } from "@shopify/shopify-api";
import type { SubscriptionPlan, SyncMode } from "@prisma/client";
import prisma from "../db.server";
import { LOCAL_SHOP_DOMAIN, LOCAL_SHOP_ID, normalizeShopDomain } from "../constants/shop";
import { createDefaultFeedConfigsForShop } from "./feed-config.server";
import { activateFreePlan } from "./billing.server";
import { runInitialProductSync } from "./shopify-sync.server";

export async function getShopByDomain(shopDomain: string) {
  return prisma.shop.findUnique({
    where: { shopDomain: normalizeShopDomain(shopDomain) },
  });
}

export async function getShopById(shopId: string) {
  return prisma.shop.findUnique({ where: { id: shopId } });
}

export async function getLocalShop() {
  return prisma.shop.findUnique({ where: { id: LOCAL_SHOP_ID } });
}

export async function resolveShopId(shopId?: string | null) {
  if (shopId) return shopId;
  return LOCAL_SHOP_ID;
}

export async function handleShopInstalled(
  session: Session,
  admin: AdminApiContext,
) {
  const shopDomain = normalizeShopDomain(session.shop);
  const shop = await prisma.shop.upsert({
    where: { shopDomain },
    create: {
      shopDomain,
      name: shopDomain,
      email: null,
      installedAt: new Date(),
      uninstalledAt: null,
      syncStatus: "RUNNING",
    },
    update: {
      uninstalledAt: null,
      installedAt: new Date(),
      syncStatus: "RUNNING",
    },
  });

  await activateFreePlan(shop.id);
  await createDefaultFeedConfigsForShop(shop.id);
  await runInitialProductSync(shop.id, admin);

  return shop;
}

export async function markShopUninstalled(shopDomain: string) {
  const shop = await getShopByDomain(shopDomain);
  if (!shop) return;

  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      uninstalledAt: new Date(),
      syncStatus: "IDLE",
    },
  });
}

export async function updateShopSyncMode(shopId: string, syncMode: SyncMode) {
  return prisma.shop.update({
    where: { id: shopId },
    data: { syncMode },
  });
}

export async function updateShopPlan(shopId: string, plan: SubscriptionPlan) {
  return prisma.shop.update({
    where: { id: shopId },
    data: { plan },
  });
}

export async function ensureLocalShopExists() {
  return prisma.shop.upsert({
    where: { id: LOCAL_SHOP_ID },
    create: {
      id: LOCAL_SHOP_ID,
      shopDomain: LOCAL_SHOP_DOMAIN,
      name: "Local Mango Feed",
      initialSyncDone: true,
      syncStatus: "SUCCESS",
    },
    update: {},
  });
}

export async function getShopSyncSummary(shopId: string) {
  const shop = await getShopById(shopId);
  if (!shop) return null;

  const productCount = await prisma.product.count({ where: { shopId } });

  return {
    shopDomain: shop.shopDomain,
    syncMode: shop.syncMode,
    syncStatus: shop.syncStatus,
    lastSyncedAt: shop.lastSyncedAt?.toISOString() ?? null,
    initialSyncDone: shop.initialSyncDone,
    productCount,
    plan: shop.plan,
  };
}
