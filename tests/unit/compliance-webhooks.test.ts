import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

// Real signature verification: authenticate.webhook() runs for real with this
// secret; only the DB-touching handler is mocked.
const SECRET = "test-webhook-secret";
process.env.SHOPIFY_API_KEY = "test-key";
process.env.SHOPIFY_API_SECRET = SECRET;
process.env.SHOPIFY_APP_URL = "https://app.mangofeed.nextupglobal.net";

const handleShopRedact = vi.fn();

vi.mock("~/lib/db.server", () => ({
  db: { session: { count: async () => 0, findUnique: async () => null } },
}));
vi.mock("~/services/shopify/webhook-sync.service.server", () => ({
  webhookSyncService: { handleShopRedact },
}));
vi.mock("~/services/shopify/initial-sync.server", () => ({
  runInitialSync: vi.fn(),
}));

function webhookRequest(
  topic: string,
  body: string,
  opts: { secret?: string; omitHmac?: boolean } = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Shopify-Topic": topic,
    "X-Shopify-Shop-Domain": "test-shop.myshopify.com",
    "X-Shopify-API-Version": "2026-07",
    "X-Shopify-Webhook-Id": "wh-1",
  };
  if (!opts.omitHmac) {
    headers["X-Shopify-Hmac-Sha256"] = createHmac("sha256", opts.secret ?? SECRET)
      .update(body, "utf8")
      .digest("base64");
  }
  return new Request("https://app.mangofeed.nextupglobal.net/webhooks/x", {
    method: "POST",
    headers,
    body,
  });
}

async function run(
  route: string,
  topic: string,
  body: string,
  opts?: { secret?: string; omitHmac?: boolean },
): Promise<Response> {
  const mod = (await import(`~/routes/${route}`)) as {
    action: (a: { request: Request; params: object; context: object }) => Promise<Response>;
  };
  try {
    return await mod.action({
      request: webhookRequest(topic, body, opts),
      params: {},
      context: {},
    });
  } catch (thrown) {
    if (thrown instanceof Response) return thrown; // library rejects by throwing
    throw thrown;
  }
}

beforeEach(() => handleShopRedact.mockReset());

const ROUTES = [
  ["webhooks.customers.data_request", "customers/data_request", '{"shop_domain":"test-shop.myshopify.com","customer":{"id":1}}'],
  ["webhooks.customers.redact", "customers/redact", '{"shop_domain":"test-shop.myshopify.com","customer":{"id":1}}'],
  ["webhooks.shop.redact", "shop/redact", '{"shop_domain":"test-shop.myshopify.com","shop_id":9}'],
] as const;

describe.each(ROUTES)("%s", (route, topic, body) => {
  it("accepts a correctly signed request with 200", async () => {
    const res = await run(route, topic, body);
    expect(res.status).toBe(200);
  });

  it("rejects a request signed with the wrong secret (401)", async () => {
    const res = await run(route, topic, body, { secret: "wrong-secret" });
    expect(res.status).toBe(401);
    expect(handleShopRedact).not.toHaveBeenCalled();
  });

  it("rejects a request with no HMAC header", async () => {
    const res = await run(route, topic, body, { omitHmac: true });
    expect([400, 401]).toContain(res.status);
    expect(handleShopRedact).not.toHaveBeenCalled();
  });
});

describe("shop/redact processing", () => {
  it("erases the shop's data only for a verified request", async () => {
    await run(ROUTES[2][0], ROUTES[2][1], ROUTES[2][2]);
    expect(handleShopRedact).toHaveBeenCalledWith("test-shop.myshopify.com");
  });

  it("is idempotent: a repeat delivery succeeds again", async () => {
    handleShopRedact.mockResolvedValue(undefined);
    const a = await run(ROUTES[2][0], ROUTES[2][1], ROUTES[2][2]);
    const b = await run(ROUTES[2][0], ROUTES[2][1], ROUTES[2][2]);
    expect([a.status, b.status]).toEqual([200, 200]);
  });
});
