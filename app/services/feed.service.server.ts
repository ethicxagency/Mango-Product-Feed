import { db } from "~/lib/db.server";
import type { FeedWithRule } from "~/repositories/feed.repository.server";
import { feedRepository } from "~/repositories/feed.repository.server";
import type { FeedFormInput } from "~/types/feed-form";
import type { FeedStatus } from "~/types/feed";

function ruleDataFor(input: FeedFormInput) {
  return {
    productSelectionType: input.productSelectionType,
    includeOutOfStock: input.includeOutOfStock,
    includeVariants: input.includeVariants,
    includeWithoutGtin: input.includeWithoutGtin,
    includeWithoutSku: input.includeWithoutSku,
    skipDuplicateProducts: input.skipDuplicateProducts,
    skipDuplicateVariants: input.skipDuplicateVariants,
    skipBrokenImages: input.skipBrokenImages,
    onlyPublished: input.onlyPublished,
    onlyActive: input.onlyActive,
    priceMin: input.priceMin,
    priceMax: input.priceMax,
    createdAfter: input.createdAfter,
    createdBefore: input.createdBefore,
    updatedAfter: input.updatedAfter,
    updatedBefore: input.updatedBefore,
  };
}

export const feedService = {
  async listFeeds(shopId: string) {
    return feedRepository.listByShop(shopId);
  },

  async getFeed(shopId: string, feedId: string) {
    return feedRepository.findById(shopId, feedId);
  },

  toFormInput(feed: FeedWithRule): FeedFormInput {
    const rule = feed.rule;
    return {
      name: feed.name,
      channel: feed.channel as FeedFormInput["channel"],
      rootNode: feed.rootNode,
      itemNode: feed.itemNode,
      prettyPrint: feed.prettyPrint,
      useCdata: feed.useCdata,
      productSelectionType:
        (rule?.productSelectionType as FeedFormInput["productSelectionType"]) ??
        "ALL",
      collectionIds: feed.collections.map((c) => c.collectionId),
      tagIds: feed.tags.map((t) => t.tagId),
      vendors: feed.vendors.map((v) => v.vendor),
      productTypes: feed.productTypes.map((p) => p.productType),
      manualProductIds: feed.manualProducts.map((p) => p.productId),
      includeOutOfStock: rule?.includeOutOfStock ?? false,
      includeVariants: rule?.includeVariants ?? true,
      includeWithoutGtin: rule?.includeWithoutGtin ?? true,
      includeWithoutSku: rule?.includeWithoutSku ?? true,
      skipDuplicateProducts: rule?.skipDuplicateProducts ?? true,
      skipDuplicateVariants: rule?.skipDuplicateVariants ?? true,
      skipBrokenImages: rule?.skipBrokenImages ?? true,
      onlyPublished: rule?.onlyPublished ?? true,
      onlyActive: rule?.onlyActive ?? true,
      priceMin: rule?.priceMin ?? null,
      priceMax: rule?.priceMax ?? null,
      createdAfter: rule?.createdAfter ?? null,
      createdBefore: rule?.createdBefore ?? null,
      updatedAfter: rule?.updatedAfter ?? null,
      updatedBefore: rule?.updatedBefore ?? null,
    };
  },

  async createFeed(shopId: string, currency: string, input: FeedFormInput) {
    return db.$transaction(async (tx) => {
      const feed = await tx.feed.create({
        data: {
          shopId,
          name: input.name,
          channel: input.channel,
          rootNode: input.rootNode,
          itemNode: input.itemNode,
          prettyPrint: input.prettyPrint,
          useCdata: input.useCdata,
          currency,
          rule: { create: ruleDataFor(input) },
          collections: {
            create: input.collectionIds.map((collectionId) => ({
              collectionId,
            })),
          },
          tags: {
            create: input.tagIds.map((tagId) => ({ tagId })),
          },
          vendors: {
            create: input.vendors.map((vendor) => ({ vendor })),
          },
          productTypes: {
            create: input.productTypes.map((productType) => ({
              productType,
            })),
          },
          manualProducts: {
            create: input.manualProductIds.map((productId) => ({
              productId,
            })),
          },
        },
      });
      return feed;
    });
  },

  async updateFeed(shopId: string, feedId: string, input: FeedFormInput) {
    return db.$transaction(async (tx) => {
      const existing = await tx.feed.findFirst({
        where: { id: feedId, shopId },
      });
      if (!existing) {
        throw new Response("Feed not found", { status: 404 });
      }

      await tx.feed.update({
        where: { id: feedId },
        data: {
          name: input.name,
          channel: input.channel,
          rootNode: input.rootNode,
          itemNode: input.itemNode,
          prettyPrint: input.prettyPrint,
          useCdata: input.useCdata,
          rule: {
            upsert: {
              create: ruleDataFor(input),
              update: ruleDataFor(input),
            },
          },
        },
      });

      await tx.feedCollection.deleteMany({ where: { feedId } });
      await tx.feedTag.deleteMany({ where: { feedId } });
      await tx.feedVendor.deleteMany({ where: { feedId } });
      await tx.feedProductType.deleteMany({ where: { feedId } });
      await tx.feedProduct.deleteMany({ where: { feedId } });

      if (input.collectionIds.length > 0) {
        await tx.feedCollection.createMany({
          data: input.collectionIds.map((collectionId) => ({
            feedId,
            collectionId,
          })),
        });
      }
      if (input.tagIds.length > 0) {
        await tx.feedTag.createMany({
          data: input.tagIds.map((tagId) => ({ feedId, tagId })),
        });
      }
      if (input.vendors.length > 0) {
        await tx.feedVendor.createMany({
          data: input.vendors.map((vendor) => ({ feedId, vendor })),
        });
      }
      if (input.productTypes.length > 0) {
        await tx.feedProductType.createMany({
          data: input.productTypes.map((productType) => ({
            feedId,
            productType,
          })),
        });
      }
      if (input.manualProductIds.length > 0) {
        await tx.feedProduct.createMany({
          data: input.manualProductIds.map((productId) => ({
            feedId,
            productId,
          })),
        });
      }

      return tx.feed.findFirstOrThrow({ where: { id: feedId } });
    });
  },

  async deleteFeed(shopId: string, feedId: string) {
    await feedRepository.delete(shopId, feedId);
  },

  async setStatus(shopId: string, feedId: string, status: FeedStatus) {
    await feedRepository.setStatus(shopId, feedId, status);
  },

  async duplicateFeed(shopId: string, feedId: string) {
    const source = await feedRepository.findById(shopId, feedId);
    if (!source) {
      throw new Response("Feed not found", { status: 404 });
    }

    const input = feedService.toFormInput(source);
    const duplicate = await feedService.createFeed(shopId, source.currency, {
      ...input,
      name: `${input.name} (copy)`,
    });
    return duplicate;
  },
};
