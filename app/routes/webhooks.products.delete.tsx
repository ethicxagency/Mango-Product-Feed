import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getShopByDomain } from "../services/shop.server";
import { deleteShopifyProductFromShop } from "../services/shopify-sync.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const shopRecord = await getShopByDomain(shop);
  if (!shopRecord) return new Response();

  const productId = payload?.admin_graphql_api_id as string | undefined;
  if (!productId) return new Response();

  if (topic === "PRODUCTS_DELETE") {
    await deleteShopifyProductFromShop(shopRecord.id, productId);
  }

  return new Response();
};
