import { describe, expect, it } from "vitest";

import { resolveAvailability } from "~/services/feed-rules/availability";

describe("resolveAvailability", () => {
  it("is in stock when quantity is positive, regardless of policy", () => {
    expect(resolveAvailability(5, "DENY")).toBe("in stock");
    expect(resolveAvailability(5, "CONTINUE")).toBe("in stock");
  });

  it("is preorder when out of stock but continue-selling is allowed", () => {
    expect(resolveAvailability(0, "CONTINUE")).toBe("preorder");
  });

  it("is out of stock when at zero and selling is denied", () => {
    expect(resolveAvailability(0, "DENY")).toBe("out of stock");
  });

  it("treats negative inventory the same as zero", () => {
    expect(resolveAvailability(-3, "DENY")).toBe("out of stock");
    expect(resolveAvailability(-3, "CONTINUE")).toBe("preorder");
  });
});
