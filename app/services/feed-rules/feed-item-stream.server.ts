import {
  feedProductRepository,
  type FeedProductRow,
} from "~/repositories/feed-product.repository.server";
import type { InventoryPolicy, ProductStatus } from "~/types/product";
import { resolveAvailability } from "./availability";
import {
  evaluateProductEligibility,
  evaluateVariantEligibility,
} from "./eligibility";
import { resolveImages } from "./images";
import { resolvePricing } from "./pricing";
import { buildProductWhereClause } from "./query-builder.server";
import type { FeedRuleFilters, FeedTargeting } from "./query-builder.server";
import type { FeedGenerationStats, FeedItem } from "./types";
import { recordSkip } from "./types";

export interface FeedRuleConfig extends FeedRuleFilters {
  includeOutOfStock: boolean;
  includeVariants: boolean;
  includeWithoutGtin: boolean;
  includeWithoutSku: boolean;
  skipDuplicateProducts: boolean;
  skipDuplicateVariants: boolean;
  skipBrokenImages: boolean;
}

export interface GenerateFeedItemsParams {
  shopId: string;
  currency: string;
  appUrl: string;
  targeting: FeedTargeting;
  rule: FeedRuleConfig;
  stats: FeedGenerationStats;
}

function buildProductLink(appUrl: string, handle: string): string {
  return `${appUrl.replace(/\/$/, "")}/products/${handle}`;
}

export async function* generateFeedItems({
  shopId,
  currency,
  appUrl,
  targeting,
  rule,
  stats,
}: GenerateFeedItemsParams): AsyncGenerator<FeedItem> {
  const where = buildProductWhereClause(shopId, targeting, rule);

  const seenProductKeys = new Set<string>();
  const seenVariantSkus = new Set<string>();

  for await (const page of feedProductRepository.stream(where)) {
    for (const product of page as FeedProductRow[]) {
      stats.productsScanned += 1;

      const productEligibility = evaluateProductEligibility(
        { ...product, status: product.status as ProductStatus },
        rule,
      );
      if (!productEligibility.eligible) {
        stats.productsExcluded += 1;
        recordSkip(stats, productEligibility.reason);
        continue;
      }

      if (rule.skipDuplicateProducts) {
        const key = product.title.trim().toLowerCase();
        if (seenProductKeys.has(key)) {
          stats.productsExcluded += 1;
          recordSkip(stats, "DUPLICATE_PRODUCT");
          continue;
        }
        seenProductKeys.add(key);
      }

      const images = resolveImages(product.images, rule.skipBrokenImages);
      if (!images) {
        stats.productsExcluded += 1;
        recordSkip(stats, "MISSING_IMAGE");
        continue;
      }

      const link = buildProductLink(appUrl, product.handle);
      let includedAnyVariant = false;

      for (const variant of product.variants) {
        const variantEligibility = evaluateVariantEligibility(
          {
            ...variant,
            inventoryPolicy: variant.inventoryPolicy as InventoryPolicy,
          },
          rule,
        );
        if (!variantEligibility.eligible) {
          stats.variantsExcluded += 1;
          recordSkip(stats, variantEligibility.reason);
          continue;
        }

        if (rule.skipDuplicateVariants && variant.sku.trim() !== "") {
          if (seenVariantSkus.has(variant.sku)) {
            stats.variantsExcluded += 1;
            recordSkip(stats, "DUPLICATE_VARIANT");
            continue;
          }
          seenVariantSkus.add(variant.sku);
        }

        const { price, compareAtPrice } = resolvePricing(
          variant.price!,
          variant.compareAtPrice,
        );
        const availability = resolveAvailability(
          variant.inventoryQuantity,
          variant.inventoryPolicy as InventoryPolicy,
        );
        const variantImage =
          product.images.find((img) => img.id === variant.imageId)?.url ??
          images.main;

        stats.variantsIncluded += 1;
        includedAnyVariant = true;

        yield {
          itemId: `${product.id}-${variant.id}`,
          groupId: product.id,
          title: product.title,
          description: product.descriptionHtml,
          link,
          vendor: product.vendor,
          productType: product.productType,
          image: variantImage,
          additionalImages: images.additional,
          price,
          compareAtPrice,
          currency,
          availability,
          sku: variant.sku,
          barcode: variant.barcode,
          inventoryQuantity: variant.inventoryQuantity,
          option1: variant.option1,
          option2: variant.option2,
          option3: variant.option3,
          weight: variant.weight,
          weightUnit: variant.weightUnit as FeedItem["weightUnit"],
        };

        if (!rule.includeVariants) break;
      }

      if (includedAnyVariant) {
        stats.productsIncluded += 1;
      } else {
        stats.productsExcluded += 1;
      }
    }
  }
}
