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

export const isShopifyEnabled = Boolean(
  process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET,
);

function createShopify() {
  return shopifyApp({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    apiVersion: ApiVersion.January25,
    scopes: process.env.SCOPES?.split(","),
    appUrl: process.env.SHOPIFY_APP_URL || process.env.APP_URL || "",
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

let shopify = isShopifyEnabled ? createShopify() : null;

function requireShopify() {
  if (!shopify) {
    throw new Response(
      "Shopify is not configured. Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET, or use npm run dev:local for standalone mode.",
      { status: 503 },
    );
  }
  return shopify;
}

export default shopify;
export const apiVersion = ApiVersion.January25;

export function addDocumentResponseHeaders(
  request: Request,
  responseHeaders: Headers,
) {
  if (shopify) {
    shopify.addDocumentResponseHeaders(request, responseHeaders);
  }
}

export const authenticate = {
  admin: (...args: Parameters<ReturnType<typeof createShopify>["authenticate"]["admin"]>) =>
    requireShopify().authenticate.admin(...args),
  get public() {
    return requireShopify().authenticate.public;
  },
  webhook: (...args: Parameters<ReturnType<typeof createShopify>["authenticate"]["webhook"]>) =>
    requireShopify().authenticate.webhook(...args),
};

export const unauthenticated = {
  admin: (...args: Parameters<ReturnType<typeof createShopify>["unauthenticated"]["admin"]>) =>
    requireShopify().unauthenticated.admin(...args),
};

export const login = (...args: Parameters<ReturnType<typeof createShopify>["login"]>) =>
  requireShopify().login(...args);

export const registerWebhooks = (
  ...args: Parameters<ReturnType<typeof createShopify>["registerWebhooks"]>
) => requireShopify().registerWebhooks(...args);

export const sessionStorage = isShopifyEnabled
  ? new PrismaSessionStorage(prisma)
  : null;

export async function handleAppUninstalled(shopDomain: string) {
  await markShopUninstalled(normalizeShopDomain(shopDomain));
}

function normalizeShopDomain(shop: string): string {
  const trimmed = shop.trim().toLowerCase();
  if (trimmed.endsWith(".myshopify.com")) return trimmed;
  return `${trimmed}.myshopify.com`;
}
