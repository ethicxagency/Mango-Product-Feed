export const LOCAL_SHOP_ID = process.env.LOCAL_SHOP_ID ?? "local-shop";
export const LOCAL_SHOP_DOMAIN = "local.mango-feed.app";

export function normalizeShopDomain(shop: string): string {
  const trimmed = shop.trim().toLowerCase();
  if (trimmed.endsWith(".myshopify.com")) return trimmed;
  return `${trimmed}.myshopify.com`;
}
