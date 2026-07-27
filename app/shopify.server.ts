import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import type { BillingConfig } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";

import { db } from "~/lib/db.server";
import { isMockModeEnabled } from "~/lib/mock-mode.server";
import { PLANS } from "~/lib/plans";
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

export const WEBHOOK_TOPICS = {
  PRODUCTS_CREATE: "/webhooks/products/create",
  PRODUCTS_UPDATE: "/webhooks/products/update",
  PRODUCTS_DELETE: "/webhooks/products/delete",
  COLLECTIONS_CREATE: "/webhooks/collections/create",
  COLLECTIONS_UPDATE: "/webhooks/collections/update",
  COLLECTIONS_DELETE: "/webhooks/collections/delete",
  APP_UNINSTALLED: "/webhooks/app/uninstalled",
  APP_SUBSCRIPTIONS_UPDATE: "/webhooks/app-subscriptions/update",
} as const;

// Shopify Managed Billing plan catalog — one entry per paid plan × billing
// cycle (STARTER_MONTHLY, STARTER_YEARLY, GROWTH_MONTHLY, ...). Prices/trial
// days are read from the single source of truth in app/lib/plans.ts so they
// can never drift between the pricing page and what Shopify actually
// charges. The Free plan has no entry here — it's never billed.
const STARTER_BILLING = PLANS.find((plan) => plan.id === "STARTER")!.billing!;
const GROWTH_BILLING = PLANS.find((plan) => plan.id === "GROWTH")!.billing!;
const PRO_BILLING = PLANS.find((plan) => plan.id === "PRO")!.billing!;

const BILLING_PLANS: BillingConfig = {
  [STARTER_BILLING.monthlyKey]: {
    trialDays: 7,
    lineItems: [
      {
        amount: STARTER_BILLING.monthlyPrice,
        currencyCode: "USD",
        interval: BillingInterval.Every30Days,
      },
    ],
  },
  [STARTER_BILLING.yearlyKey]: {
    trialDays: 7,
    lineItems: [
      {
        amount: STARTER_BILLING.yearlyPrice,
        currencyCode: "USD",
        interval: BillingInterval.Annual,
      },
    ],
  },
  [GROWTH_BILLING.monthlyKey]: {
    trialDays: 7,
    lineItems: [
      {
        amount: GROWTH_BILLING.monthlyPrice,
        currencyCode: "USD",
        interval: BillingInterval.Every30Days,
      },
    ],
  },
  [GROWTH_BILLING.yearlyKey]: {
    trialDays: 7,
    lineItems: [
      {
        amount: GROWTH_BILLING.yearlyPrice,
        currencyCode: "USD",
        interval: BillingInterval.Annual,
      },
    ],
  },
  [PRO_BILLING.monthlyKey]: {
    trialDays: 7,
    lineItems: [
      {
        amount: PRO_BILLING.monthlyPrice,
        currencyCode: "USD",
        interval: BillingInterval.Every30Days,
      },
    ],
  },
  [PRO_BILLING.yearlyKey]: {
    trialDays: 7,
    lineItems: [
      {
        amount: PRO_BILLING.yearlyPrice,
        currencyCode: "USD",
        interval: BillingInterval.Annual,
      },
    ],
  },
};

// The exact app URL registered with Shopify (same precedence Shopify itself
// uses for OAuth's appUrl/redirect_urls) — exported so any other code that
// needs to build an absolute URL Shopify will accept (e.g. a Billing API
// returnUrl) uses this single resolved value instead of re-deriving it.
export const appUrl = process.env.SHOPIFY_APP_URL ?? process.env.APP_URL ?? "";

const shopify = shopifyApp({
  apiKey,
  apiSecretKey,
  apiVersion: ApiVersion.January25,
  // Least-privilege: only what ProductSyncService/CollectionSyncService
  // actually query (products, variants, images, collections, inventory
  // quantity/policy). Keep this list in sync with shopify.app.toml.
  scopes: process.env.SCOPES?.split(",") ?? ["read_products", "read_inventory"],
  appUrl,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(db),
  distribution: AppDistribution.AppStore,
  billing: BILLING_PLANS,
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
