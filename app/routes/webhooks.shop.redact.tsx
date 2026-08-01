import type { ActionFunctionArgs } from "@remix-run/node";

import { authenticate } from "~/shopify.server";
import { webhookSyncService } from "~/services/shopify/webhook-sync.service.server";

/** Mandatory Shopify compliance webhook: fires ~48 hours after uninstall,
 * requiring the app to permanently erase the shop's data. Unlike
 * app/uninstalled (which deliberately keeps data in case of a quick
 * reinstall), this handler actually deletes it — see
 * webhookSyncService.handleShopRedact. authenticate.webhook(request)
 * verifies the HMAC signature before this handler ever runs. */
export async function action({ request }: ActionFunctionArgs) {
  const { shop } = await authenticate.webhook(request);
  await webhookSyncService.handleShopRedact(shop);
  return new Response();
}
