import { describe, expect, it } from "vitest";

import { summarizeStatsErrors } from "~/services/feed-rules/error-summary";
import { createEmptyStats, recordSkip } from "~/services/feed-rules/types";

describe("summarizeStatsErrors", () => {
  it("returns an empty list when nothing was skipped", () => {
    const stats = createEmptyStats();
    expect(summarizeStatsErrors(stats)).toEqual([]);
  });

  it("summarizes each non-zero skip reason with a human-readable message and count", () => {
    const stats = createEmptyStats();
    recordSkip(stats, "MISSING_PRICE");
    recordSkip(stats, "MISSING_PRICE");
    recordSkip(stats, "DUPLICATE_VARIANT");

    const summary = summarizeStatsErrors(stats);
    expect(summary).toHaveLength(2);

    const priceError = summary.find((e) => e.code === "MISSING_PRICE");
    expect(priceError?.count).toBe(2);
    expect(priceError?.message).toContain("Missing price");
    expect(priceError?.message).toContain("2 item(s)");

    const duplicateError = summary.find((e) => e.code === "DUPLICATE_VARIANT");
    expect(duplicateError?.count).toBe(1);
    expect(duplicateError?.message).toContain("Duplicate SKU");
  });
});
