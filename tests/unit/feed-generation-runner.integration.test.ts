import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { feedRepository } from "~/repositories/feed.repository.server";
import { runFeedGeneration } from "~/services/feed-generation-runner.service.server";
import { validateXml } from "~/services/xml/validate-xml";

const prisma = new PrismaClient();

async function createTestFeed(channel: string) {
  const shop = await prisma.shop.findFirstOrThrow();
  const feed = await prisma.feed.create({
    data: {
      shopId: shop.id,
      name: `Runner Test Feed (${channel})`,
      channel,
      currency: shop.currency,
      rule: { create: {} },
    },
  });
  return feedRepository.findById(shop.id, feed.id);
}

describe("runFeedGeneration (integration, against the seeded dev DB)", () => {
  beforeAll(async () => {
    const count = await prisma.product.count();
    if (count === 0) {
      throw new Error("Seed the database first: npm run db:seed");
    }
  });

  afterAll(async () => {
    await prisma.feed.deleteMany({
      where: { name: { startsWith: "Runner Test Feed" } },
    });
    await prisma.$disconnect();
  });

  it("produces a valid, non-empty feed and reports PARTIAL when some items were skipped", async () => {
    const feed = await createTestFeed("GOOGLE");
    expect(feed).not.toBeNull();

    const result = await runFeedGeneration(feed!, "http://localhost:3000");

    expect(["SUCCESS", "PARTIAL"]).toContain(result.status);
    expect(result.productCount).toBeGreaterThan(0);
    expect(result.variantCount).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.fileSizeBytes).toBe(Buffer.byteLength(result.xml, "utf8"));

    const validation = validateXml(result.xml);
    expect(validation.valid, validation.error).toBe(true);
  });

  it("reports FAILED with no products when the selection matches nothing", async () => {
    const shop = await prisma.shop.findFirstOrThrow();
    const feed = await prisma.feed.create({
      data: {
        shopId: shop.id,
        name: "Runner Test Feed (empty)",
        channel: "GOOGLE",
        currency: shop.currency,
        rule: { create: { productSelectionType: "VENDOR" } },
        vendors: { create: [{ vendor: "Definitely Not A Real Vendor" }] },
      },
    });
    const feedWithRule = await feedRepository.findById(shop.id, feed.id);

    const result = await runFeedGeneration(
      feedWithRule!,
      "http://localhost:3000",
    );

    expect(result.status).toBe("FAILED");
    expect(result.productCount).toBe(0);
    expect(result.errors.some((e) => e.code === "GENERATION_ERROR")).toBe(true);
  });
});
