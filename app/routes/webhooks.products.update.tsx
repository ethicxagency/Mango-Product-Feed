import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getShopByDomain } from "../services/shop.server";
import { syncSingleShopifyProductById } from "../services/shopify-sync.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, admin, payload } = await authenticate.webhook(request);
  const shopRecord = await getShopByDomain(shop);
  if (!shopRecord || shopRecord.syncMode !== "AUTOMATIC") {
    return new Response();
  }

  const productId = payload?.admin_graphql_api_id as string | undefined;
  if (!productId) return new Response();

  if (topic === "PRODUCTS_UPDATE" && admin) {
    await syncSingleShopifyProductById(shopRecord.id, admin, productId);
  }

  return new Response();
};
