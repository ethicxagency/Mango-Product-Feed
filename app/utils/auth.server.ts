import { authenticate } from "../shopify.server";
import { getShopByDomain } from "../services/shop.server";

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
