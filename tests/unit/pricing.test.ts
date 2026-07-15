import { describe, expect, it } from "vitest";

import { resolvePricing } from "~/services/feed-rules/pricing";

describe("resolvePricing", () => {
  it("keeps a compare-at price that is genuinely higher", () => {
    expect(resolvePricing(20, 30)).toEqual({ price: 20, compareAtPrice: 30 });
  });

  it("drops a compare-at price equal to the price", () => {
    expect(resolvePricing(20, 20)).toEqual({ price: 20, compareAtPrice: null });
  });

  it("drops a compare-at price lower than the price", () => {
    expect(resolvePricing(20, 15)).toEqual({ price: 20, compareAtPrice: null });
  });

  it("passes through a null compare-at price", () => {
    expect(resolvePricing(20, null)).toEqual({
      price: 20,
      compareAtPrice: null,
    });
  });
});
