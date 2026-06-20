import { LOCAL_SHOP_ID } from "../constants/shop";
import { ensureLocalShopExists, getShopByDomain } from "../services/shop.server";
import { authenticate, isShopifyEnabled } from "../shopify.server";

/**
 * Resolves the shop ID for feed builder write operations.
 * Shopify embedded installs use the authenticated shop; standalone mode uses local-shop.
 */
export async function resolveFeedBuilderShopId(request: Request): Promise<string> {
  if (isShopifyEnabled()) {
    const { shopId } = await getEmbeddedShopContext(request);
    return shopId;
  }

  await ensureLocalShopExists();
  return LOCAL_SHOP_ID;
}

export async function getEmbeddedShopContext(request: Request) {
  const { session, admin } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);

  if (!shop) {
    throw new Response("Shop not registered", { status: 404 });
  }

  return {
    session,
    admin,
    shop,
    shopId: shop.id,
    shopDomain: shop.shopDomain,
  };
}
