import type { ActionFunctionArgs } from "@remix-run/node";

import { authenticate } from "~/shopify.server";
import { webhookSyncService } from "~/services/shopify/webhook-sync.service.server";

export async function action({ request }: ActionFunctionArgs) {
  const { shop } = await authenticate.webhook(request);
  await webhookSyncService.handleAppUninstalled(shop);
  return new Response();
}
