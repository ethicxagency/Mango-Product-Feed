import type { FeedRule, Product } from "@prisma/client";

export interface RuleEvaluationResult {
  include: boolean;
  product: Product;
}

function getStockValue(product: Product): string {
  return product.availability === "OUT_OF_STOCK" ? "0" : "1";
}

function getFieldValue(product: Product, field: FeedRule["conditionField"]): string {
  switch (field) {
    case "STOCK":
      return getStockValue(product);
    case "CATEGORY":
      return product.category;
    case "PRICE":
      return String(Number(product.price));
    case "BRAND":
      return product.brand;
    case "PRODUCT_TYPE":
      return product.productType;
    case "SKU":
      return product.sku;
    case "COUNTRY":
      return product.countryCode ?? "";
    default:
      return "";
  }
}

function compareValues(
  left: string,
  operator: FeedRule["conditionOperator"],
  right: string,
): boolean {
  const numericLeft = Number.parseFloat(left);
  const numericRight = Number.parseFloat(right);
  const canCompareNumbers =
    !Number.isNaN(numericLeft) && !Number.isNaN(numericRight);

  switch (operator) {
    case "EQ":
      return canCompareNumbers
        ? numericLeft === numericRight
        : left.toLowerCase() === right.toLowerCase();
    case "NEQ":
      return canCompareNumbers
        ? numericLeft !== numericRight
        : left.toLowerCase() !== right.toLowerCase();
    case "LT":
      return canCompareNumbers ? numericLeft < numericRight : left < right;
    case "LTE":
      return canCompareNumbers ? numericLeft <= numericRight : left <= right;
    case "GT":
      return canCompareNumbers ? numericLeft > numericRight : left > right;
    case "GTE":
      return canCompareNumbers ? numericLeft >= numericRight : left >= right;
    case "CONTAINS":
      return left.toLowerCase().includes(right.toLowerCase());
    default:
      return false;
  }
}

function matchesRule(product: Product, rule: FeedRule): boolean {
  const fieldValue = getFieldValue(product, rule.conditionField);
  return compareValues(fieldValue, rule.conditionOperator, rule.conditionValue);
}

export function applyFeedRules(
  product: Product,
  rules: FeedRule[],
): RuleEvaluationResult {
  let currentProduct = product;
  let excluded = false;

  const activeRules = [...rules]
    .filter((rule) => rule.isActive)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of activeRules) {
    if (!matchesRule(currentProduct, rule)) continue;

    if (rule.action === "EXCLUDE") {
      excluded = true;
    }

    if (rule.action === "APPEND_TEXT" && rule.actionValue?.trim()) {
      currentProduct = {
        ...currentProduct,
        description: `${currentProduct.description} ${rule.actionValue}`.trim(),
      };
    }
  }

  return {
    include: !excluded,
    product: currentProduct,
  };
}

export function applyFeedRulesToProducts(
  products: Product[],
  rules: FeedRule[],
): Product[] {
  return products
    .map((product) => applyFeedRules(product, rules))
    .filter((result) => result.include)
    .map((result) => result.product);
}
