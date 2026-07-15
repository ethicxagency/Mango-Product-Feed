import { describe, expect, it } from "vitest";

import { buildProductWhereClause } from "~/services/feed-rules/query-builder.server";
import type {
  FeedRuleFilters,
  FeedTargeting,
} from "~/services/feed-rules/query-builder.server";

const baseTargeting: FeedTargeting = {
  productSelectionType: "ALL",
  collectionIds: [],
  tagIds: [],
  vendors: [],
  productTypes: [],
  manualProductIds: [],
};

const baseFilters: FeedRuleFilters = {
  onlyActive: true,
  onlyPublished: true,
  priceMin: null,
  priceMax: null,
  createdAfter: null,
  createdBefore: null,
  updatedAfter: null,
  updatedBefore: null,
};

describe("buildProductWhereClause", () => {
  it("always excludes deleted/hidden/password-protected/untitled products", () => {
    const where = buildProductWhereClause("shop_1", baseTargeting, baseFilters);
    expect(where.shopId).toBe("shop_1");
    expect(where.deletedAt).toEqual(null);
    expect(where.isHidden).toBe(false);
    expect(where.isPasswordProtected).toBe(false);
    expect(where.title).toEqual({ not: "" });
  });

  it("applies status/published filters only when the toggles are on", () => {
    const on = buildProductWhereClause("shop_1", baseTargeting, baseFilters);
    expect(on.status).toBe("ACTIVE");
    expect(on.publishedAt).toEqual({ not: null });

    const off = buildProductWhereClause("shop_1", baseTargeting, {
      ...baseFilters,
      onlyActive: false,
      onlyPublished: false,
    });
    expect(off.status).toBeUndefined();
    expect(off.publishedAt).toBeUndefined();
  });

  it("targets a collection selection type", () => {
    const where = buildProductWhereClause(
      "shop_1",
      {
        ...baseTargeting,
        productSelectionType: "COLLECTIONS",
        collectionIds: ["c1", "c2"],
      },
      baseFilters,
    );
    expect(where.collections).toEqual({
      some: { collectionId: { in: ["c1", "c2"] } },
    });
  });

  it("targets a vendor selection type", () => {
    const where = buildProductWhereClause(
      "shop_1",
      { ...baseTargeting, productSelectionType: "VENDOR", vendors: ["Acme"] },
      baseFilters,
    );
    expect(where.vendor).toEqual({ in: ["Acme"] });
  });

  it("targets manual product ids", () => {
    const where = buildProductWhereClause(
      "shop_1",
      {
        ...baseTargeting,
        productSelectionType: "MANUAL",
        manualProductIds: ["p1"],
      },
      baseFilters,
    );
    expect(where.id).toEqual({ in: ["p1"] });
  });

  it("applies a price range as a some-variant-in-range pre-filter", () => {
    const where = buildProductWhereClause("shop_1", baseTargeting, {
      ...baseFilters,
      priceMin: 10,
      priceMax: 50,
    });
    expect(where.variants).toEqual({
      some: { price: { gte: 10, lte: 50 } },
    });
  });

  it("applies created/updated date ranges", () => {
    const createdAfter = new Date("2026-01-01");
    const updatedBefore = new Date("2026-06-01");
    const where = buildProductWhereClause("shop_1", baseTargeting, {
      ...baseFilters,
      createdAfter,
      updatedBefore,
    });
    expect(where.createdAt).toEqual({ gte: createdAfter });
    expect(where.updatedAt).toEqual({ lte: updatedBefore });
  });
});
