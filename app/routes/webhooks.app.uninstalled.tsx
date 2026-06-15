import type { ActionFunctionArgs } from "react-router";
import { authenticate, handleAppUninstalled } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  if (topic === "APP_UNINSTALLED") {
    await handleAppUninstalled(shop);
  }

  return new Response();
};
