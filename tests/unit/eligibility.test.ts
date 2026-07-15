import { describe, expect, it } from "vitest";

import {
  evaluateProductEligibility,
  evaluateVariantEligibility,
  type EligibilityProductInput,
  type EligibilityRuleInput,
  type EligibilityVariantInput,
} from "~/services/feed-rules/eligibility";

const baseProduct: EligibilityProductInput = {
  title: "A Product",
  status: "ACTIVE",
  publishedAt: new Date("2026-01-01"),
  isHidden: false,
  isPasswordProtected: false,
  deletedAt: null,
};

const permissiveRule: EligibilityRuleInput = {
  onlyActive: true,
  onlyPublished: true,
  includeOutOfStock: false,
  includeWithoutSku: true,
  includeWithoutGtin: true,
};

const baseVariant: EligibilityVariantInput = {
  price: 19.99,
  sku: "SKU-1",
  barcode: "012345678905",
  inventoryQuantity: 10,
  inventoryPolicy: "DENY",
};

describe("evaluateProductEligibility", () => {
  it("passes a normal, fully-populated active/published product", () => {
    expect(evaluateProductEligibility(baseProduct, permissiveRule)).toEqual({
      eligible: true,
    });
  });

  it("always excludes a soft-deleted product, no toggle can override it", () => {
    const product = { ...baseProduct, deletedAt: new Date() };
    expect(evaluateProductEligibility(product, permissiveRule)).toEqual({
      eligible: false,
      reason: "DELETED",
    });
  });

  it("always excludes a hidden product", () => {
    const product = { ...baseProduct, isHidden: true };
    expect(evaluateProductEligibility(product, permissiveRule)).toEqual({
      eligible: false,
      reason: "HIDDEN",
    });
  });

  it("always excludes a password-protected product", () => {
    const product = { ...baseProduct, isPasswordProtected: true };
    expect(evaluateProductEligibility(product, permissiveRule)).toEqual({
      eligible: false,
      reason: "PASSWORD_PROTECTED",
    });
  });

  it("always excludes a product with an empty title", () => {
    const product = { ...baseProduct, title: "   " };
    expect(evaluateProductEligibility(product, permissiveRule)).toEqual({
      eligible: false,
      reason: "MISSING_TITLE",
    });
  });

  it("excludes a draft product only when onlyActive is on", () => {
    const product = { ...baseProduct, status: "DRAFT" as const };
    expect(evaluateProductEligibility(product, permissiveRule)).toEqual({
      eligible: false,
      reason: "NOT_ACTIVE",
    });
    expect(
      evaluateProductEligibility(product, {
        ...permissiveRule,
        onlyActive: false,
      }),
    ).toEqual({ eligible: true });
  });

  it("excludes an unpublished product only when onlyPublished is on", () => {
    const product = { ...baseProduct, publishedAt: null };
    expect(evaluateProductEligibility(product, permissiveRule)).toEqual({
      eligible: false,
      reason: "NOT_PUBLISHED",
    });
    expect(
      evaluateProductEligibility(product, {
        ...permissiveRule,
        onlyPublished: false,
      }),
    ).toEqual({ eligible: true });
  });
});

describe("evaluateVariantEligibility", () => {
  it("passes a normal, fully-populated in-stock variant", () => {
    expect(evaluateVariantEligibility(baseVariant, permissiveRule)).toEqual({
      eligible: true,
    });
  });

  it("always excludes a variant with no price, regardless of toggles", () => {
    const variant = { ...baseVariant, price: null };
    expect(evaluateVariantEligibility(variant, permissiveRule)).toEqual({
      eligible: false,
      reason: "MISSING_PRICE",
    });
  });

  it("always excludes a variant with a zero or negative price", () => {
    expect(
      evaluateVariantEligibility({ ...baseVariant, price: 0 }, permissiveRule),
    ).toEqual({ eligible: false, reason: "MISSING_PRICE" });
  });

  it("excludes a variant without SKU only when includeWithoutSku is off", () => {
    const variant = { ...baseVariant, sku: "" };
    expect(evaluateVariantEligibility(variant, permissiveRule)).toEqual({
      eligible: true,
    });
    expect(
      evaluateVariantEligibility(variant, {
        ...permissiveRule,
        includeWithoutSku: false,
      }),
    ).toEqual({ eligible: false, reason: "MISSING_SKU" });
  });

  it("excludes a variant without a barcode only when includeWithoutGtin is off", () => {
    const variant = { ...baseVariant, barcode: "" };
    expect(evaluateVariantEligibility(variant, permissiveRule)).toEqual({
      eligible: true,
    });
    expect(
      evaluateVariantEligibility(variant, {
        ...permissiveRule,
        includeWithoutGtin: false,
      }),
    ).toEqual({ eligible: false, reason: "MISSING_GTIN" });
  });

  it("excludes a truly out-of-stock variant only when includeOutOfStock is off", () => {
    const variant = {
      ...baseVariant,
      inventoryQuantity: 0,
      inventoryPolicy: "DENY" as const,
    };
    expect(evaluateVariantEligibility(variant, permissiveRule)).toEqual({
      eligible: false,
      reason: "OUT_OF_STOCK",
    });
    expect(
      evaluateVariantEligibility(variant, {
        ...permissiveRule,
        includeOutOfStock: true,
      }),
    ).toEqual({ eligible: true });
  });

  it("never excludes a preorder (continue-selling) variant for stock reasons", () => {
    const variant = {
      ...baseVariant,
      inventoryQuantity: 0,
      inventoryPolicy: "CONTINUE" as const,
    };
    expect(evaluateVariantEligibility(variant, permissiveRule)).toEqual({
      eligible: true,
    });
  });
});
