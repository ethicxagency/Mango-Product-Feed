export interface ProductImageInput {
  url: string;
  position: number;
  isBroken: boolean;
}

export interface ResolvedImages {
  main: string;
  additional: string[];
}

/**
 * Image rules from the spec: empty URLs are always dropped; broken URLs are
 * dropped only when `skipBrokenImages` is on (the default). A product with
 * no valid image left after filtering has no image at all, and the caller
 * is expected to exclude it entirely per the "Products without Image" rule.
 */
export function resolveImages(
  images: ProductImageInput[],
  skipBrokenImages: boolean,
): ResolvedImages | null {
  const valid = images
    .filter((img) => img.url.trim() !== "")
    .filter((img) => !skipBrokenImages || !img.isBroken)
    .sort((a, b) => a.position - b.position);

  if (valid.length === 0) return null;

  const [main, ...rest] = valid;
  return { main: main!.url, additional: rest.map((img) => img.url) };
}
