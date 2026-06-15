import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import {
  handleShopInstalled,
  markShopUninstalled,
} from "./services/shop.server";
import { getShopifyEnv } from "./utils/shopify-env.server";

type ShopifyApp = ReturnType<typeof shopifyApp>;

let shopifyInstance: ShopifyApp | null | undefined;

function createShopify() {
  const env = getShopifyEnv();
  return shopifyApp({
    apiKey: env.apiKey,
    apiSecretKey: env.apiSecret,
    apiVersion: ApiVersion.January25,
    scopes: env.scopes,
    appUrl: env.appUrl,
    authPathPrefix: "/auth",
    sessionStorage: new PrismaSessionStorage(prisma),
    distribution: AppDistribution.AppStore,
    hooks: {
      afterAuth: async ({ session, admin }) => {
        await handleShopInstalled(session, admin);
      },
    },
  });
}

function getShopifyApp(): ShopifyApp | null {
  const env = getShopifyEnv();
  if (!env.isConfigured) {
    shopifyInstance = null;
    return null;
  }
  if (shopifyInstance === undefined) {
    shopifyInstance = createShopify();
  }
  return shopifyInstance;
}

export function isShopifyEnabled(): boolean {
  return getShopifyEnv().isConfigured;
}

function requireShopify() {
  const app = getShopifyApp();
  if (!app) {
    const missing = [
      !process.env.SHOPIFY_API_KEY?.trim() && "SHOPIFY_API_KEY",
      !process.env.SHOPIFY_API_SECRET?.trim() &&
        !process.env.SHOPIFY_API_SECRET_KEY?.trim() &&
        "SHOPIFY_API_SECRET",
      !process.env.SHOPIFY_APP_URL?.trim() &&
        !process.env.APP_URL?.trim() &&
        "SHOPIFY_APP_URL",
    ]
      .filter(Boolean)
      .join(", ");

    throw new Response(
      `Shopify is not configured. Missing: ${missing || "unknown"}. Add them in Render → Environment and redeploy.`,
      { status: 503 },
    );
  }
  return app;
}

export default null;
export const apiVersion = ApiVersion.January25;

export function addDocumentResponseHeaders(
  request: Request,
  responseHeaders: Headers,
) {
  const app = getShopifyApp();
  if (app) {
    app.addDocumentResponseHeaders(request, responseHeaders);
  }
}

export const authenticate = {
  admin: (...args: Parameters<ShopifyApp["authenticate"]["admin"]>) =>
    requireShopify().authenticate.admin(...args),
  get public() {
    return requireShopify().authenticate.public;
  },
  webhook: (...args: Parameters<ShopifyApp["authenticate"]["webhook"]>) =>
    requireShopify().authenticate.webhook(...args),
};

export const unauthenticated = {
  admin: (...args: Parameters<ShopifyApp["unauthenticated"]["admin"]>) =>
    requireShopify().unauthenticated.admin(...args),
};

export const login = (...args: Parameters<ShopifyApp["login"]>) =>
  requireShopify().login(...args);

export const registerWebhooks = (
  ...args: Parameters<ShopifyApp["registerWebhooks"]>
) => requireShopify().registerWebhooks(...args);

export function getSessionStorage() {
  return isShopifyEnabled() ? new PrismaSessionStorage(prisma) : null;
}

export const sessionStorage = getSessionStorage();

export async function handleAppUninstalled(shopDomain: string) {
  await markShopUninstalled(normalizeShopDomain(shopDomain));
}

function normalizeShopDomain(shop: string): string {
  const trimmed = shop.trim().toLowerCase();
  if (trimmed.endsWith(".myshopify.com")) return trimmed;
  return `${trimmed}.myshopify.com`;
}
