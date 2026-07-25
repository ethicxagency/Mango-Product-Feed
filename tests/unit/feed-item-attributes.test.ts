import { describe, expect, it } from "vitest";

import {
  isApparelCategory,
  isValidGtin,
  resolveFeedItemAttributes,
} from "~/services/feed-rules/attributes";

describe("isValidGtin", () => {
  it("accepts 8/12/13/14-digit numeric codes", () => {
    expect(isValidGtin("12345678")).toBe(true);
    expect(isValidGtin("012345678905")).toBe(true);
    expect(isValidGtin("0123456789012")).toBe(true);
    expect(isValidGtin("01234567890123")).toBe(true);
  });

  it("rejects anything that isn't a bare GTIN-length numeric code", () => {
    expect(isValidGtin("")).toBe(false);
    expect(isValidGtin("SKU-123")).toBe(false);
    expect(isValidGtin("123")).toBe(false);
    expect(isValidGtin("12345678901")).toBe(false); // 11 digits — not a valid length
  });
});

describe("isApparelCategory", () => {
  it("matches common apparel product types", () => {
    expect(isApparelCategory("Apparel > Shirts")).toBe(true);
    expect(isApparelCategory("Footwear")).toBe(true);
    expect(isApparelCategory("Jewelry")).toBe(true);
  });

  it("does not match unrelated product types", () => {
    expect(isApparelCategory("Home Goods")).toBe(false);
    expect(isApparelCategory("")).toBe(false);
  });
});

describe("resolveFeedItemAttributes", () => {
  it("falls back to a validated barcode when no metafield override exists", () => {
    const attrs = resolveFeedItemAttributes({
      barcode: "012345678905",
      sku: "SKU-1",
      productType: "Home",
      metafields: [],
    });
    expect(attrs.gtin).toBe("012345678905");
    expect(attrs.mpn).toBe("SKU-1");
  });

  it("never treats an invalid barcode as a GTIN", () => {
    const attrs = resolveFeedItemAttributes({
      barcode: "not-a-gtin",
      sku: "",
      productType: "Home",
      metafields: [],
    });
    expect(attrs.gtin).toBeNull();
    expect(attrs.mpn).toBeNull();
  });

  it("prefers a feed.gtin metafield override when present", () => {
    const attrs = resolveFeedItemAttributes({
      barcode: "012345678905",
      sku: "SKU-1",
      productType: "Home",
      metafields: [{ namespace: "feed", key: "gtin", value: "00012345678905" }],
    });
    expect(attrs.gtin).toBe("00012345678905");
  });

  it("resolves apparel fields only from real metafield values", () => {
    const attrs = resolveFeedItemAttributes({
      barcode: "",
      sku: "",
      productType: "Apparel",
      metafields: [
        { namespace: "feed", key: "color", value: "Blue" },
        { namespace: "other", key: "color", value: "Ignored" },
      ],
    });
    expect(attrs.isApparel).toBe(true);
    expect(attrs.color).toBe("Blue");
    expect(attrs.size).toBeNull();
  });

  it("splits multi-line product_highlight metafields into an array", () => {
    const attrs = resolveFeedItemAttributes({
      barcode: "",
      sku: "",
      productType: "Home",
      metafields: [
        {
          namespace: "feed",
          key: "product_highlight",
          value: "Waterproof\nLightweight\n",
        },
      ],
    });
    expect(attrs.productHighlights).toEqual(["Waterproof", "Lightweight"]);
  });

  it("resolves every optional attribute to null when no metafields exist", () => {
    const attrs = resolveFeedItemAttributes({
      barcode: "",
      sku: "",
      productType: "Home",
      metafields: [],
    });
    expect(attrs.adult).toBeNull();
    expect(attrs.multipack).toBeNull();
    expect(attrs.energyEfficiencyClass).toBeNull();
    expect(attrs.productHighlights).toEqual([]);
  });
});
