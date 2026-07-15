import { describe, expect, it } from "vitest";

import { resolveImages } from "~/services/feed-rules/images";

describe("resolveImages", () => {
  it("returns null when there are no images", () => {
    expect(resolveImages([], true)).toBeNull();
  });

  it("picks the lowest-position image as main and orders the rest", () => {
    const result = resolveImages(
      [
        { url: "https://a/2.jpg", position: 2, isBroken: false },
        { url: "https://a/1.jpg", position: 1, isBroken: false },
        { url: "https://a/3.jpg", position: 3, isBroken: false },
      ],
      true,
    );

    expect(result).toEqual({
      main: "https://a/1.jpg",
      additional: ["https://a/2.jpg", "https://a/3.jpg"],
    });
  });

  it("drops empty URLs unconditionally", () => {
    const result = resolveImages(
      [
        { url: "", position: 1, isBroken: false },
        { url: "https://a/2.jpg", position: 2, isBroken: false },
      ],
      true,
    );

    expect(result).toEqual({ main: "https://a/2.jpg", additional: [] });
  });

  it("drops broken images when skipBrokenImages is on", () => {
    const result = resolveImages(
      [
        { url: "https://a/1.jpg", position: 1, isBroken: true },
        { url: "https://a/2.jpg", position: 2, isBroken: false },
      ],
      true,
    );

    expect(result).toEqual({ main: "https://a/2.jpg", additional: [] });
  });

  it("keeps broken images when skipBrokenImages is off", () => {
    const result = resolveImages(
      [{ url: "https://a/1.jpg", position: 1, isBroken: true }],
      false,
    );

    expect(result).toEqual({ main: "https://a/1.jpg", additional: [] });
  });

  it("returns null when every image is broken and skipBrokenImages is on", () => {
    const result = resolveImages(
      [{ url: "https://a/1.jpg", position: 1, isBroken: true }],
      true,
    );

    expect(result).toBeNull();
  });
});
