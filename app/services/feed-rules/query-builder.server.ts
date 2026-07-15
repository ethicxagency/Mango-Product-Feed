import type { Prisma } from "@prisma/client";

import type { ProductSelectionType } from "~/types/feed";

export interface FeedTargeting {
  productSelectionType: ProductSelectionType;
  collectionIds: string[];
  tagIds: string[];
  vendors: string[];
  productTypes: string[];
  manualProductIds: string[];
}

export interface FeedRuleFilters {
  onlyActive: boolean;
  onlyPublished: boolean;
  priceMin: number | null;
  priceMax: number | null;
  createdAfter: Date | null;
  createdBefore: Date | null;
  updatedAfter: Date | null;
  updatedBefore: Date | null;
}

/**
 * Pushes every filter that's cheaply expressible in SQL down to the
 * database — selection targeting, date ranges, and a coarse price-range
 * pre-filter — so the eligibility engine only has to do row-by-row work
 * (image/duplicate/availability checks) on a already-narrowed candidate
 * set instead of the whole catalog.
 */
export function buildProductWhereClause(
  shopId: string,
  targeting: FeedTargeting,
  filters: FeedRuleFilters,
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    shopId,
    deletedAt: null,
    isHidden: false,
    isPasswordProtected: false,
    title: { not: "" },
  };

  if (filters.onlyActive) {
    where.status = "ACTIVE";
  }
  if (filters.onlyPublished) {
    where.publishedAt = { not: null };
  }

  if (filters.createdAfter || filters.createdBefore) {
    where.createdAt = {
      ...(filters.createdAfter ? { gte: filters.createdAfter } : {}),
      ...(filters.createdBefore ? { lte: filters.createdBefore } : {}),
    };
  }
  if (filters.updatedAfter || filters.updatedBefore) {
    where.updatedAt = {
      ...(filters.updatedAfter ? { gte: filters.updatedAfter } : {}),
      ...(filters.updatedBefore ? { lte: filters.updatedBefore } : {}),
    };
  }

  if (filters.priceMin !== null || filters.priceMax !== null) {
    where.variants = {
      some: {
        price: {
          ...(filters.priceMin !== null ? { gte: filters.priceMin } : {}),
          ...(filters.priceMax !== null ? { lte: filters.priceMax } : {}),
        },
      },
    };
  }

  switch (targeting.productSelectionType) {
    case "COLLECTIONS":
      where.collections = {
        some: { collectionId: { in: targeting.collectionIds } },
      };
      break;
    case "TAGS":
      where.tags = { some: { tagId: { in: targeting.tagIds } } };
      break;
    case "VENDOR":
      where.vendor = { in: targeting.vendors };
      break;
    case "PRODUCT_TYPE":
      where.productType = { in: targeting.productTypes };
      break;
    case "MANUAL":
      where.id = { in: targeting.manualProductIds };
      break;
    case "ALL":
    default:
      break;
  }

  return where;
}
