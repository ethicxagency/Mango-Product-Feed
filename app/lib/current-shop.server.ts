import { db } from "~/lib/db.server";
import { isMockModeEnabled } from "~/lib/mock-mode.server";
import { authenticate } from "~/shopify.server";

/**
 * Resolves the Shop row for the current request.
 *
 * In mock mode (local dev without Shopify credentials yet, and the
 * Playwright/Vitest suites) there's no real session to authenticate, so
 * this falls back to "whatever shop is in the local DB" — the same
 * behavior the Phase 1 mock-only version had.
 *
 * Otherwise this authenticates the request against the real Shopify
 * session and looks up the Shop row created for that shop during
 * afterAuth (see services/shopify/initial-sync.server.ts).
 */
export async function getCurrentShop(request: Request) {
  if (isMockModeEnabled()) {
    const shop = await db.shop.findFirst();

    if (!shop) {
      throw new Response(
        "No shop found. Run `npm run db:seed` to create the mock store.",
        { status: 500 },
      );
    }

    return shop;
  }

  const { session } = await authenticate.admin(request);
  const shop = await db.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    throw new Response(
      "Shop not found — installation may not have completed. Try reinstalling the app.",
      { status: 500 },
    );
  }

  return shop;
}
