import type { Product, RuleConditionField, RuleConditionOperator } from "@prisma/client";
import prisma from "../db.server";

export interface ProductExclusionInput {
  name: string;
  conditionField: RuleConditionField;
  conditionOperator: RuleConditionOperator;
  conditionValue: string;
  isActive: boolean;
}

function getFieldValue(product: Product, field: RuleConditionField): string {
  switch (field) {
    case "STOCK":
      return product.availability;
    case "CATEGORY":
      return product.category;
    case "PRICE":
      return String(product.price);
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

function matchesCondition(
  product: Product,
  field: RuleConditionField,
  operator: RuleConditionOperator,
  value: string,
): boolean {
  const actual = getFieldValue(product, field);

  if (field === "PRICE") {
    const numActual = Number.parseFloat(actual);
    const numValue = Number.parseFloat(value);
    switch (operator) {
      case "EQ":
        return numActual === numValue;
      case "NEQ":
        return numActual !== numValue;
      case "LT":
        return numActual < numValue;
      case "LTE":
        return numActual <= numValue;
      case "GT":
        return numActual > numValue;
      case "GTE":
        return numActual >= numValue;
      default:
        return false;
    }
  }

  const lowerActual = actual.toLowerCase();
  const lowerValue = value.toLowerCase();

  switch (operator) {
    case "EQ":
      return lowerActual === lowerValue;
    case "NEQ":
      return lowerActual !== lowerValue;
    case "CONTAINS":
      return lowerActual.includes(lowerValue);
    default:
      return false;
  }
}

export async function listProductExclusions(shopId: string) {
  return prisma.productExclusion.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProductExclusion(
  shopId: string,
  input: ProductExclusionInput,
) {
  return prisma.productExclusion.create({
    data: { shopId, ...input },
  });
}

export async function updateProductExclusion(
  id: string,
  input: ProductExclusionInput,
) {
  return prisma.productExclusion.update({
    where: { id },
    data: input,
  });
}

export async function deleteProductExclusion(id: string) {
  await prisma.productExclusion.delete({ where: { id } });
}

export async function isProductExcluded(
  product: Product,
  shopId: string,
): Promise<boolean> {
  const exclusions = await prisma.productExclusion.findMany({
    where: { shopId, isActive: true },
  });

  return exclusions.some((rule) =>
    matchesCondition(
      product,
      rule.conditionField,
      rule.conditionOperator,
      rule.conditionValue,
    ),
  );
}
