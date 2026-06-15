import type { ActionFunctionArgs } from "react-router";
import { authenticate, handleAppUninstalled } from "../shopify.server";
import { getShopByDomain, handleShopInstalled } from "../services/shop.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, admin, session } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  if (topic === "SHOP_UPDATE") {
    const existing = await getShopByDomain(shop);
    if (!existing && session && admin) {
      await handleShopInstalled(session, admin);
    }
  }

  return new Response();
};
