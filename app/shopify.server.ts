import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";

import { db } from "~/lib/db.server";
import { isMockModeEnabled } from "~/lib/mock-mode.server";
import { runInitialSync } from "~/services/shopify/initial-sync.server";

// The Shopify API client validates its config eagerly at import time, so
// this module must always produce *something* usable even before real
// Partner app credentials are configured. In mock mode none of this is
// ever actually exercised (see app.tsx and getCurrentShop, which skip real
// authentication entirely), so a harmless placeholder is fine here.
const apiKey =
  process.env.SHOPIFY_API_KEY || (isMockModeEnabled() ? "mock-api-key" : "");
const apiSecretKey =
  process.env.SHOPIFY_API_SECRET ||
  (isMockModeEnabled() ? "mock-api-secret" : "");

const WEBHOOK_TOPICS = {
  PRODUCTS_CREATE: "/webhooks/products/create",
  PRODUCTS_UPDATE: "/webhooks/products/update",
  PRODUCTS_DELETE: "/webhooks/products/delete",
  COLLECTIONS_CREATE: "/webhooks/collections/create",
  COLLECTIONS_UPDATE: "/webhooks/collections/update",
  COLLECTIONS_DELETE: "/webhooks/collections/delete",
  APP_UNINSTALLED: "/webhooks/app/uninstalled",
} as const;

const shopify = shopifyApp({
  apiKey,
  apiSecretKey,
  apiVersion: ApiVersion.January25,
  // Least-privilege: only what ProductSyncService/CollectionSyncService
  // actually query (products, variants, images, collections, inventory
  // quantity/policy). Keep this list in sync with shopify.app.toml.
  scopes: process.env.SCOPES?.split(",") ?? ["read_products", "read_inventory"],
  appUrl: process.env.SHOPIFY_APP_URL ?? process.env.APP_URL ?? "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(db),
  distribution: AppDistribution.AppStore,
  webhooks: Object.fromEntries(
    Object.entries(WEBHOOK_TOPICS).map(([topic, callbackUrl]) => [
      topic,
      { deliveryMethod: DeliveryMethod.Http, callbackUrl },
    ]),
  ),
  hooks: {
    afterAuth: async ({ session, admin }) => {
      await shopify.registerWebhooks({ session });
      await runInitialSync(session, admin);
    },
  },
});

export default shopify;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const sessionStorage = shopify.sessionStorage;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const registerWebhooks = shopify.registerWebhooks;
export const apiVersion = ApiVersion.January25;
