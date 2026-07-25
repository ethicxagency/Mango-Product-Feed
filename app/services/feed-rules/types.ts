import type { FeedItemAttributes } from "./attributes";
import type { Availability, WeightUnit } from "~/types/product";

/** One fully-resolved, XML-ready feed entry — one per exported variant
 * (or one per product when the feed's `includeVariants` rule is off). */
export interface FeedItem {
  itemId: string;
  groupId: string;
  title: string;
  description: string;
  link: string;
  vendor: string;
  productType: string;
  image: string;
  additionalImages: string[];
  price: number;
  compareAtPrice: number | null;
  currency: string;
  availability: Availability;
  sku: string;
  barcode: string;
  inventoryQuantity: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  weight: number;
  weightUnit: WeightUnit;
  taxable: boolean;
  /** Channel-agnostic enrichment (apparel fields, GTIN/MPN validity, the
   * long tail of optional Google attributes) — see feed-rules/attributes.ts.
   * Which of these a channel actually writes is that Generator's decision. */
  attributes: FeedItemAttributes;
}

export type SkipReason =
  | "DELETED"
  | "HIDDEN"
  | "PASSWORD_PROTECTED"
  | "MISSING_TITLE"
  | "MISSING_IMAGE"
  | "MISSING_PRICE"
  | "NOT_ACTIVE"
  | "NOT_PUBLISHED"
  | "DUPLICATE_PRODUCT"
  | "OUTSIDE_SELECTION"
  | "MISSING_SKU"
  | "MISSING_GTIN"
  | "OUT_OF_STOCK"
  | "DUPLICATE_VARIANT";

export interface FeedGenerationStats {
  productsScanned: number;
  productsIncluded: number;
  productsExcluded: number;
  variantsIncluded: number;
  variantsExcluded: number;
  skipReasons: Partial<Record<SkipReason, number>>;
}

export function createEmptyStats(): FeedGenerationStats {
  return {
    productsScanned: 0,
    productsIncluded: 0,
    productsExcluded: 0,
    variantsIncluded: 0,
    variantsExcluded: 0,
    skipReasons: {},
  };
}

export function recordSkip(
  stats: FeedGenerationStats,
  reason: SkipReason,
): void {
  stats.skipReasons[reason] = (stats.skipReasons[reason] ?? 0) + 1;
}
