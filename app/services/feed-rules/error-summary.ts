import type { FeedGenerationStats, SkipReason } from "./types";

export interface FeedGenerationError {
  code: SkipReason | "INVALID_XML" | "GENERATION_TIMEOUT" | "GENERATION_ERROR";
  message: string;
  count?: number;
}

const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  DELETED: "Deleted product",
  HIDDEN: "Hidden product",
  PASSWORD_PROTECTED: "Password-protected product",
  MISSING_TITLE: "Missing title",
  MISSING_IMAGE: "Missing or broken image",
  MISSING_PRICE: "Missing price",
  NOT_ACTIVE: "Not active",
  NOT_PUBLISHED: "Not published",
  DUPLICATE_PRODUCT: "Duplicate product",
  OUTSIDE_SELECTION: "Outside feed selection",
  MISSING_SKU: "Missing SKU",
  MISSING_GTIN: "Missing GTIN/barcode",
  OUT_OF_STOCK: "Out of stock",
  DUPLICATE_VARIANT: "Duplicate SKU",
};

/** Turns the rules engine's raw skip-reason tallies into the human-readable
 * error list shown in feed history and exported alongside each run. */
export function summarizeStatsErrors(
  stats: FeedGenerationStats,
): FeedGenerationError[] {
  return (Object.entries(stats.skipReasons) as [SkipReason, number][])
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => ({
      code: reason,
      message: `${SKIP_REASON_LABELS[reason]}: ${count} item(s) skipped`,
      count,
    }));
}
