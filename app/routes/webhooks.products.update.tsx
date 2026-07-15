import type { ActionFunctionArgs } from "@remix-run/node";

import { findShopForWebhook } from "~/lib/webhook-shop.server";
import { authenticate } from "~/shopify.server";
import { webhookSyncService } from "~/services/shopify/webhook-sync.service.server";

export async function action({ request }: ActionFunctionArgs) {
  const { shop, session, admin, payload } = await authenticate.webhook(request);
  if (!session || !admin) return new Response();

  const shopRecord = await findShopForWebhook(shop);
  if (!shopRecord) return new Response();

  await webhookSyncService.handleProductUpsert(admin, shopRecord.id, payload);
  return new Response();
}
