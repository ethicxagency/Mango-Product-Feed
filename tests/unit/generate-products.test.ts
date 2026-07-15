import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it } from "vitest";

import { generateProducts } from "../../prisma/seed-data/generate-products";

describe("generateProducts", () => {
  // Edge-case injection is probability-based (e.g. 1% for password-protected
  // products), so tests need a fixed seed for deterministic, non-flaky runs.
  beforeEach(() => {
    faker.seed(42);
  });

  it("generates the requested number of products with unique ids and handles", () => {
    const products = generateProducts({ count: 200, duplicateSkuPool: [] });

    expect(products).toHaveLength(200);
    expect(new Set(products.map((p) => p.id)).size).toBe(200);
    expect(new Set(products.map((p) => p.handle)).size).toBe(200);
  });

  it("gives every variant a unique id scoped across the whole batch", () => {
    const products = generateProducts({ count: 200, duplicateSkuPool: [] });
    const variantIds = products.flatMap((p) => p.variants.map((v) => v.id));

    expect(new Set(variantIds).size).toBe(variantIds.length);
  });

  it("produces at least one variant per product", () => {
    const products = generateProducts({ count: 200, duplicateSkuPool: [] });

    for (const product of products) {
      expect(product.variants.length).toBeGreaterThan(0);
    }
  });

  it("reuses SKUs from the duplicate pool when provided", () => {
    const duplicateSkuPool = ["SKU-SHARED-0001"];
    const products = generateProducts({ count: 500, duplicateSkuPool });
    const skuCounts = new Map<string, number>();

    for (const product of products) {
      for (const variant of product.variants) {
        if (!variant.sku) continue;
        skuCounts.set(variant.sku, (skuCounts.get(variant.sku) ?? 0) + 1);
      }
    }

    expect(skuCounts.get("SKU-SHARED-0001") ?? 0).toBeGreaterThan(1);
  });

  it("includes the full range of edge cases needed by the feed rules", () => {
    const products = generateProducts({ count: 1000, duplicateSkuPool: [] });
    const allVariants = products.flatMap((p) => p.variants);
    const allImages = products.flatMap((p) => p.images);

    expect(products.some((p) => p.title === "")).toBe(true);
    expect(products.some((p) => p.status === "DRAFT")).toBe(true);
    expect(products.some((p) => p.status === "ARCHIVED")).toBe(true);
    expect(products.some((p) => p.deletedAt !== null)).toBe(true);
    expect(products.some((p) => p.isHidden)).toBe(true);
    expect(products.some((p) => p.isPasswordProtected)).toBe(true);
    expect(products.some((p) => p.images.length === 0)).toBe(true);
    expect(allImages.some((img) => img.isBroken)).toBe(true);
    expect(allVariants.some((v) => v.price === null)).toBe(true);
    expect(allVariants.some((v) => v.sku === "")).toBe(true);
    expect(allVariants.some((v) => v.barcode === "")).toBe(true);
    expect(
      allVariants.some(
        (v) => v.inventoryQuantity === 0 && v.inventoryPolicy === "DENY",
      ),
    ).toBe(true);
    expect(
      allVariants.some(
        (v) => v.inventoryQuantity === 0 && v.inventoryPolicy === "CONTINUE",
      ),
    ).toBe(true);
  });
});
