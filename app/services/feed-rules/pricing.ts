export interface ResolvedPricing {
  price: number;
  compareAtPrice: number | null;
}

/**
 * Price rule from the spec: a compare-at price only makes sense as a
 * "was X, now Y" signal — if it's less than or equal to the actual price it
 * carries no information, so it's dropped rather than exported misleadingly.
 */
export function resolvePricing(
  price: number,
  compareAtPrice: number | null,
): ResolvedPricing {
  const validCompareAt =
    compareAtPrice !== null && compareAtPrice > price ? compareAtPrice : null;

  return { price, compareAtPrice: validCompareAt };
}
