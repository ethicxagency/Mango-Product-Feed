import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { generateFeedItems } from "~/services/feed-rules/feed-item-stream.server";
import { createEmptyStats } from "~/services/feed-rules/types";
import type { FeedRuleConfig } from "~/services/feed-rules/feed-item-stream.server";
import type { FeedTargeting } from "~/services/feed-rules/query-builder.server";

const prisma = new PrismaClient();

const ALL_TARGETING: FeedTargeting = {
  productSelectionType: "ALL",
  collectionIds: [],
  tagIds: [],
  vendors: [],
  productTypes: [],
  manualProductIds: [],
};

const DEFAULT_RULE: FeedRuleConfig = {
  onlyActive: true,
  onlyPublished: true,
  includeOutOfStock: false,
  includeVariants: true,
  includeWithoutGtin: true,
  includeWithoutSku: true,
  skipDuplicateProducts: true,
  skipDuplicateVariants: true,
  skipBrokenImages: true,
  priceMin: null,
  priceMax: null,
  createdAfter: null,
  createdBefore: null,
  updatedAfter: null,
  updatedBefore: null,
};

async function collect(rule: FeedRuleConfig) {
  const shop = await prisma.shop.findFirstOrThrow();
  const stats = createEmptyStats();
  const items = [];
  for await (const item of generateFeedItems({
    shopId: shop.id,
    currency: shop.currency,
    appUrl: "http://localhost:3000",
    targeting: ALL_TARGETING,
    rule,
    stats,
  })) {
    items.push(item);
  }
  return { items, stats };
}

describe("generateFeedItems (integration, against the seeded dev DB)", () => {
  beforeAll(async () => {
    const count = await prisma.product.count();
    if (count === 0) {
      throw new Error(
        "Seed the database first: npm run db:seed (this test runs against real seeded data).",
      );
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("scans every product and never yields an invalid item", async () => {
    const { items, stats } = await collect(DEFAULT_RULE);

    expect(stats.productsScanned).toBeGreaterThan(0);
    expect(stats.productsScanned).toBe(
      stats.productsIncluded + stats.productsExcluded,
    );
    expect(items.length).toBeGreaterThan(0);

    for (const item of items) {
      expect(item.price).toBeGreaterThan(0);
      expect(item.title.trim()).not.toBe("");
      expect(item.image).toBeTruthy();
      expect(["in stock", "out of stock", "preorder", "backorder"]).toContain(
        item.availability,
      );
      if (item.compareAtPrice !== null) {
        expect(item.compareAtPrice).toBeGreaterThan(item.price);
      }
    }
  });

  it("never includes an out-of-stock item when includeOutOfStock is off", async () => {
    const { items } = await collect(DEFAULT_RULE);
    expect(items.every((item) => item.availability !== "out of stock")).toBe(
      true,
    );
  });

  it("includes out-of-stock items when includeOutOfStock is on", async () => {
    const { items: withoutOOS } = await collect(DEFAULT_RULE);
    const { items: withOOS } = await collect({
      ...DEFAULT_RULE,
      includeOutOfStock: true,
    });

    expect(withOOS.length).toBeGreaterThanOrEqual(withoutOOS.length);
    expect(withOOS.some((item) => item.availability === "out of stock")).toBe(
      true,
    );
  });

  it("never yields the same non-empty SKU twice when skipDuplicateVariants is on", async () => {
    const { items } = await collect(DEFAULT_RULE);
    const skus = items.map((i) => i.sku).filter((sku) => sku !== "");
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("allows duplicate SKUs through when skipDuplicateVariants is off", async () => {
    const { items } = await collect({
      ...DEFAULT_RULE,
      skipDuplicateVariants: false,
    });
    const skus = items.map((i) => i.sku).filter((sku) => sku !== "");
    expect(new Set(skus).size).toBeLessThan(skus.length);
  });

  it("collapses to one item per product when includeVariants is off", async () => {
    const { items } = await collect({
      ...DEFAULT_RULE,
      includeVariants: false,
    });
    const groupIds = items.map((i) => i.groupId);
    expect(new Set(groupIds).size).toBe(groupIds.length);
  });

  it("excludes products without SKU when includeWithoutSku is off", async () => {
    const { items } = await collect({
      ...DEFAULT_RULE,
      includeWithoutSku: false,
    });
    expect(items.every((item) => item.sku.trim() !== "")).toBe(true);
  });

  it("excludes products without a barcode when includeWithoutGtin is off", async () => {
    const { items } = await collect({
      ...DEFAULT_RULE,
      includeWithoutGtin: false,
    });
    expect(items.every((item) => item.barcode.trim() !== "")).toBe(true);
  });
});
