import type { ActionFunctionArgs } from "@remix-run/node";

import { authenticate } from "~/shopify.server";

/** Mandatory Shopify compliance webhook: a merchant's customer has
 * requested their data. authenticate.webhook(request) verifies the HMAC
 * signature before this handler ever runs — an invalid signature never
 * reaches this code.
 *
 * This app never requests customer-scoped access (see shopify.app.toml —
 * scopes are read_products,read_inventory only) and has no Customer model
 * anywhere in its schema (prisma/schema.prisma). There is no customer data
 * to compile or return, so acknowledging with 200 and no further action is
 * the correct, complete response — not a stub standing in for missing
 * logic. */
export async function action({ request }: ActionFunctionArgs) {
  await authenticate.webhook(request);
  return new Response();
}
