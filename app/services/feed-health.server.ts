import type { Product } from "@prisma/client";
import type {
  FeedHealthReport,
  HealthIssue,
  HealthIssueType,
} from "../types/product";

function isBrokenImageUrl(imageUrl: string): boolean {
  if (!imageUrl.trim()) return false;
  try {
    const url = new URL(imageUrl);
    return !["http:", "https:"].includes(url.protocol);
  } catch {
    return true;
  }
}

const ISSUE_CHECKS: {
  type: HealthIssueType;
  message: string;
  check: (product: Product) => boolean;
}[] = [
  {
    type: "MISSING_IMAGE",
    message: "Missing product image URL",
    check: (product) => !product.imageUrl?.trim(),
  },
  {
    type: "MISSING_SKU",
    message: "Missing SKU",
    check: (product) => !product.sku?.trim(),
  },
  {
    type: "MISSING_BRAND",
    message: "Missing brand",
    check: (product) => !product.brand?.trim(),
  },
  {
    type: "MISSING_PRICE",
    message: "Missing or invalid price",
    check: (product) => {
      const price = Number(product.price);
      return Number.isNaN(price) || price <= 0;
    },
  },
  {
    type: "MISSING_PRODUCT_URL",
    message: "Missing product URL",
    check: (product) => !product.productUrl?.trim(),
  },
  {
    type: "MISSING_GTIN",
    message: "Missing GTIN",
    check: (product) => !product.gtin?.trim(),
  },
  {
    type: "MISSING_MPN",
    message: "Missing MPN (SKU is used as MPN in feeds)",
    check: (product) => !product.sku?.trim(),
  },
  {
    type: "BROKEN_IMAGE_URL",
    message: "Broken or invalid image URL format",
    check: (product) => isBrokenImageUrl(product.imageUrl),
  },
];

function emptyIssueCounts(): Record<HealthIssueType, number> {
  return {
    MISSING_IMAGE: 0,
    MISSING_SKU: 0,
    MISSING_BRAND: 0,
    MISSING_PRICE: 0,
    MISSING_PRODUCT_URL: 0,
    MISSING_GTIN: 0,
    MISSING_MPN: 0,
    DUPLICATE_SKU: 0,
    BROKEN_IMAGE_URL: 0,
  };
}

function findDuplicateSkus(products: Product[]): Map<string, Product[]> {
  const grouped = new Map<string, Product[]>();

  for (const product of products) {
    const key = product.sku.trim().toLowerCase();
    if (!key) continue;
    const existing = grouped.get(key) ?? [];
    existing.push(product);
    grouped.set(key, existing);
  }

  const duplicates = new Map<string, Product[]>();
  for (const [sku, items] of grouped.entries()) {
    if (items.length > 1) {
      duplicates.set(sku, items);
    }
  }

  return duplicates;
}

export function analyzeFeedHealth(products: Product[]): FeedHealthReport {
  const issues: HealthIssue[] = [];
  const issueCounts = emptyIssueCounts();
  const productsWithIssues = new Set<string>();
  const duplicateSkus = findDuplicateSkus(products);

  for (const product of products) {
    for (const rule of ISSUE_CHECKS) {
      if (rule.check(product)) {
        productsWithIssues.add(product.id);
        issueCounts[rule.type] += 1;
        issues.push({
          productId: product.id,
          productTitle: product.title,
          sku: product.sku,
          issue: rule.type,
          message: rule.message,
        });
      }
    }
  }

  for (const [, duplicateProducts] of duplicateSkus) {
    for (const product of duplicateProducts) {
      productsWithIssues.add(product.id);
      issueCounts.DUPLICATE_SKU += 1;
      issues.push({
        productId: product.id,
        productTitle: product.title,
        sku: product.sku,
        issue: "DUPLICATE_SKU",
        message: "Duplicate SKU detected in catalog",
      });
    }
  }

  const totalProducts = products.length;
  const healthyProducts = totalProducts - productsWithIssues.size;
  const score =
    totalProducts === 0
      ? 100
      : Math.round((healthyProducts / totalProducts) * 100);

  return {
    score,
    totalProducts,
    healthyProducts,
    issues,
    issueCounts,
  };
}

export function getHealthScore(products: Product[]): number {
  return analyzeFeedHealth(products).score;
}

export function getAdvancedHealthSummary(report: FeedHealthReport) {
  return [
    { label: "Missing GTIN", count: report.issueCounts.MISSING_GTIN },
    { label: "Missing MPN", count: report.issueCounts.MISSING_MPN },
    { label: "Duplicate SKU", count: report.issueCounts.DUPLICATE_SKU },
    { label: "Broken image URL", count: report.issueCounts.BROKEN_IMAGE_URL },
  ];
}
