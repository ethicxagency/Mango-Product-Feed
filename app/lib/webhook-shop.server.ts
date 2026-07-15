import { db } from "~/lib/db.server";

/** Looks up the local Shop row for an incoming webhook's shop domain.
 * Returns null (rather than throwing) for a shop we don't recognize —
 * webhooks can arrive in odd orders around install/uninstall, and the
 * right response is just to no-op, not error. */
export async function findShopForWebhook(shopDomain: string) {
  return db.shop.findUnique({ where: { shopifyDomain: shopDomain } });
}
