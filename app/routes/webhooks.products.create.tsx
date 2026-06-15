import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getShopByDomain } from "../services/shop.server";
import {
  runAutomaticProductSync,
  syncSingleShopifyProductById,
} from "../services/shopify-sync.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, admin, payload } = await authenticate.webhook(request);
  const shopRecord = await getShopByDomain(shop);
  if (!shopRecord) return new Response();

  const productId = payload?.admin_graphql_api_id as string | undefined;
  if (!productId) return new Response();

  if (topic === "PRODUCTS_CREATE" || topic === "PRODUCTS_UPDATE") {
    if (shopRecord.syncMode === "AUTOMATIC" && admin) {
      await syncSingleShopifyProductById(shopRecord.id, admin, productId);
    }
  }

  if (topic === "PRODUCTS_CREATE" && shopRecord.syncMode === "AUTOMATIC" && admin) {
    await runAutomaticProductSync(shop, admin);
  }

  return new Response();
};
