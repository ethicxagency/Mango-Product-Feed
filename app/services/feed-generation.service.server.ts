import type { FeedWithRule } from "~/repositories/feed.repository.server";
import type { FeedFormInput } from "~/types/feed-form";
import { generateFeedItems } from "./feed-rules/feed-item-stream.server";
import type { FeedRuleConfig } from "./feed-rules/feed-item-stream.server";
import type { FeedTargeting } from "./feed-rules/query-builder.server";
import { createEmptyStats } from "./feed-rules/types";
import type { FeedGenerationStats } from "./feed-rules/types";
import { feedService } from "./feed.service.server";
import { renderFeedXml } from "./xml/render-feed-xml.server";
import { getFeedTemplate } from "./xml/templates/registry";

function toTargeting(input: FeedFormInput): FeedTargeting {
  return {
    productSelectionType: input.productSelectionType,
    collectionIds: input.collectionIds,
    tagIds: input.tagIds,
    vendors: input.vendors,
    productTypes: input.productTypes,
    manualProductIds: input.manualProductIds,
  };
}

function toRuleConfig(input: FeedFormInput): FeedRuleConfig {
  return {
    onlyActive: input.onlyActive,
    onlyPublished: input.onlyPublished,
    includeOutOfStock: input.includeOutOfStock,
    includeVariants: input.includeVariants,
    includeWithoutGtin: input.includeWithoutGtin,
    includeWithoutSku: input.includeWithoutSku,
    skipDuplicateProducts: input.skipDuplicateProducts,
    skipDuplicateVariants: input.skipDuplicateVariants,
    skipBrokenImages: input.skipBrokenImages,
    priceMin: input.priceMin,
    priceMax: input.priceMax,
    createdAfter: input.createdAfter,
    createdBefore: input.createdBefore,
    updatedAfter: input.updatedAfter,
    updatedBefore: input.updatedBefore,
  };
}

export interface StreamFeedXmlResult {
  chunks: AsyncGenerator<string>;
  stats: FeedGenerationStats;
}

/**
 * Ties the rules engine (feed-item-stream) to the XML renderer for one
 * feed record. `stats` is returned alongside the chunk generator (rather
 * than only being available after iteration) so a caller — like the
 * "Generate Feed" history-recording action — can read final counts once
 * the stream finishes without needing a second pass over the data.
 */
export function streamFeedXml(
  feed: FeedWithRule,
  appUrl: string,
): StreamFeedXmlResult {
  const input = feedService.toFormInput(feed);
  const template = getFeedTemplate(feed.channel as FeedFormInput["channel"]);
  const stats = createEmptyStats();

  const items = generateFeedItems({
    shopId: feed.shopId,
    currency: feed.currency,
    appUrl,
    targeting: toTargeting(input),
    rule: toRuleConfig(input),
    stats,
  });

  const chunks = renderFeedXml(
    items,
    template,
    {
      feedTitle: feed.name,
      feedDescription: `${feed.name} product feed`,
      feedLink: appUrl,
      rootNode:
        feed.channel === "CUSTOM" ? feed.rootNode : template.defaultRootNode,
      itemNode: feed.channel === "CUSTOM" ? feed.itemNode : "item",
    },
    { pretty: feed.prettyPrint, cdata: feed.useCdata },
  );

  return { chunks, stats };
}
