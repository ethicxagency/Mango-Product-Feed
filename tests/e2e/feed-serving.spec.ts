import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const prisma = new PrismaClient();

async function createTestFeed(status: "ENABLED" | "DISABLED") {
  const shop = await prisma.shop.findFirstOrThrow();
  return prisma.feed.create({
    data: {
      shopId: shop.id,
      name: "E2E Serving Test Feed",
      channel: "GOOGLE",
      currency: shop.currency,
      status,
      rule: { create: {} },
    },
  });
}

test.describe.serial("feed serving route (/feeds/:publicToken.xml)", () => {
  test.beforeEach(async () => {
    await prisma.feed.deleteMany({
      where: { name: "E2E Serving Test Feed" },
    });
  });

  test.afterAll(async () => {
    await prisma.feed.deleteMany({ where: { name: "E2E Serving Test Feed" } });
    await prisma.$disconnect();
  });

  test("serves valid XML on the public URL when the feed is enabled", async ({
    request,
  }) => {
    const feed = await createTestFeed("ENABLED");

    const response = await request.get(`/feeds/${feed.publicToken}.xml`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/xml");

    const body = await response.text();
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(body).toContain("<rss");
    expect(body).toContain("<g:id>");
  });

  test("rejects the public URL (no token) when the feed is disabled", async ({
    request,
  }) => {
    const feed = await createTestFeed("DISABLED");

    const response = await request.get(`/feeds/${feed.publicToken}.xml`);
    expect(response.status()).toBe(403);
  });

  test("serves the private URL (correct token) even when disabled", async ({
    request,
  }) => {
    const feed = await createTestFeed("DISABLED");

    const response = await request.get(
      `/feeds/${feed.publicToken}.xml?token=${feed.secretToken}`,
    );
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("<rss");
  });

  test("rejects an incorrect token even when the feed is enabled", async ({
    request,
  }) => {
    const feed = await createTestFeed("ENABLED");

    const response = await request.get(
      `/feeds/${feed.publicToken}.xml?token=not-the-real-token`,
    );
    expect(response.status()).toBe(403);
  });

  test("returns 404 for an unknown public token", async ({ request }) => {
    const response = await request.get("/feeds/does-not-exist.xml");
    expect(response.status()).toBe(404);
  });
});
