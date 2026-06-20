import type { FeedConfig, FeedRule, Prisma, Product } from "@prisma/client";
import prisma from "../db.server";
import { applyFeedRules } from "./feed-rules.server";
import { isProductExcluded } from "./product-exclusion.server";
import {
  buildFeedConfigWhere,
  getFeedConfigFilterValues,
} from "./feed-config.server";
import { getAppSettings } from "./settings.server";

export async function getFilteredProductWhere(
  config: Pick<
    FeedConfig,
    "filterMode" | "filterValues" | "shopId" | "targetCountry"
  >,
): Promise<Prisma.ProductWhereInput> {
  const filterValues = getFeedConfigFilterValues(config);
  const baseWhere = buildFeedConfigWhere(config.filterMode, filterValues);
  const countryFilter = config.targetCountry
    ? { countryCode: config.targetCountry }
    : {};

  if (config.shopId) {
    return { ...baseWhere, ...countryFilter, shopId: config.shopId };
  }
  return { ...baseWhere, ...countryFilter };
}

export async function countFilteredProducts(
  config: Pick<
    FeedConfig,
    "filterMode" | "filterValues" | "shopId" | "targetCountry"
  >,
): Promise<number> {
  const where = await getFilteredProductWhere(config);
  return prisma.product.count({ where });
}

export async function* iterateFilteredProducts(
  config: FeedConfig & { rules?: FeedRule[] },
): AsyncGenerator<Product> {
  const settings = await getAppSettings();
  const where = await getFilteredProductWhere(config);
  const batchSize = settings.streamingBatchSize;
  let cursor: string | undefined;

  while (true) {
    const batch = await prisma.product.findMany({
      where,
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });

    if (batch.length === 0) break;

    for (const product of batch) {
      const rules = "rules" in config && config.rules ? config.rules : [];
      const result = applyFeedRules(product, rules);
      if (!result.include) continue;

      if (config.shopId && (await isProductExcluded(result.product, config.shopId))) {
        continue;
      }

      yield result.product;
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < batchSize) break;
  }
}

export async function listFilteredProductsForPreview(
  config: FeedConfig & { rules?: FeedRule[] },
  limit = 1000,
): Promise<Product[]> {
  const where = await getFilteredProductWhere(config);
  const products = await prisma.product.findMany({
    where,
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  const rules = config.rules ?? [];
  return products
    .map((product) => applyFeedRules(product, rules))
    .filter((result) => result.include)
    .map((result) => result.product);
}

export async function getProductFilterOptions(shopId?: string | null) {
  const { resolveShopId } = await import("./shop.server");
  const resolvedShopId = await resolveShopId(shopId);
  const shopFilter = { shopId: resolvedShopId };

  const [categories, brands, productTypes, products] = await Promise.all([
    prisma.product.findMany({
      where: shopFilter,
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.product.findMany({
      where: shopFilter,
      distinct: ["brand"],
      select: { brand: true },
      orderBy: { brand: "asc" },
    }),
    prisma.product.findMany({
      where: shopFilter,
      distinct: ["productType"],
      select: { productType: true },
      orderBy: { productType: "asc" },
    }),
    prisma.product.findMany({
      where: shopFilter,
      select: { id: true, title: true, sku: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return {
    categories: categories.map((row) => row.category).filter(Boolean),
    brands: brands.map((row) => row.brand).filter(Boolean),
    productTypes: productTypes.map((row) => row.productType).filter(Boolean),
    products,
  };
}
