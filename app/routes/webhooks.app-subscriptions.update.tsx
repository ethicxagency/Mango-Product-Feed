import type { ActionFunctionArgs } from "@remix-run/node";

import { findShopForWebhook } from "~/lib/webhook-shop.server";
import { authenticate } from "~/shopify.server";
import { syncSubscriptionFromWebhook } from "~/services/subscription.service.server";

/** Fires whenever a shop's AppSubscription changes status (approved,
 * declined, cancelled, expired, frozen) — the authoritative, async
 * counterpart to the synchronous verifySubscription() check that runs on
 * Plans page loads. Keeps the Subscription table correct even if the
 * merchant never revisits the Plans page after approving/cancelling. */
export async function action({ request }: ActionFunctionArgs) {
  const { shop, session, admin } = await authenticate.webhook(request);
  if (!session || !admin) return new Response();

  const shopRecord = await findShopForWebhook(shop);
  if (!shopRecord) return new Response();

  await syncSubscriptionFromWebhook(shopRecord.id, admin);
  return new Response();
}
