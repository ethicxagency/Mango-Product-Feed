import type { InventoryPolicy, ProductStatus } from "~/types/product";
import { resolveAvailability } from "./availability";
import type { SkipReason } from "./types";

export interface EligibilityProductInput {
  title: string;
  status: ProductStatus;
  publishedAt: Date | null;
  isHidden: boolean;
  isPasswordProtected: boolean;
  deletedAt: Date | null;
}

export interface EligibilityRuleInput {
  onlyActive: boolean;
  onlyPublished: boolean;
  includeOutOfStock: boolean;
  includeWithoutSku: boolean;
  includeWithoutGtin: boolean;
}

export interface EligibilityVariantInput {
  price: number | null;
  sku: string;
  barcode: string;
  inventoryQuantity: number;
  inventoryPolicy: InventoryPolicy;
}

export type EligibilityResult =
  { eligible: true } | { eligible: false; reason: SkipReason };

/**
 * Mandatory, non-negotiable exclusions (deleted/hidden/password-protected/no
 * title) always apply. Active/published status are the only product-level
 * checks a merchant can opt out of, via the corresponding feed rule toggles.
 */
export function evaluateProductEligibility(
  product: EligibilityProductInput,
  rule: EligibilityRuleInput,
): EligibilityResult {
  if (product.deletedAt !== null) return { eligible: false, reason: "DELETED" };
  if (product.isHidden) return { eligible: false, reason: "HIDDEN" };
  if (product.isPasswordProtected) {
    return { eligible: false, reason: "PASSWORD_PROTECTED" };
  }
  if (product.title.trim() === "") {
    return { eligible: false, reason: "MISSING_TITLE" };
  }
  if (rule.onlyActive && product.status !== "ACTIVE") {
    return { eligible: false, reason: "NOT_ACTIVE" };
  }
  if (rule.onlyPublished && product.publishedAt === null) {
    return { eligible: false, reason: "NOT_PUBLISHED" };
  }

  return { eligible: true };
}

/**
 * Variant-level rules. A missing price is always disqualifying (mandatory);
 * missing SKU/GTIN and out-of-stock are governed by their feed rule toggles.
 */
export function evaluateVariantEligibility(
  variant: EligibilityVariantInput,
  rule: EligibilityRuleInput,
): EligibilityResult {
  if (variant.price === null || variant.price <= 0) {
    return { eligible: false, reason: "MISSING_PRICE" };
  }
  if (!rule.includeWithoutSku && variant.sku.trim() === "") {
    return { eligible: false, reason: "MISSING_SKU" };
  }
  if (!rule.includeWithoutGtin && variant.barcode.trim() === "") {
    return { eligible: false, reason: "MISSING_GTIN" };
  }

  const availability = resolveAvailability(
    variant.inventoryQuantity,
    variant.inventoryPolicy,
  );
  if (!rule.includeOutOfStock && availability === "out of stock") {
    return { eligible: false, reason: "OUT_OF_STOCK" };
  }

  return { eligible: true };
}
