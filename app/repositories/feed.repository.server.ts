import type { Prisma } from "@prisma/client";

import { db } from "~/lib/db.server";

export const feedWithRuleInclude = {
  rule: true,
  collections: { select: { collectionId: true } },
  tags: { select: { tagId: true } },
  vendors: { select: { vendor: true } },
  productTypes: { select: { productType: true } },
  manualProducts: { select: { productId: true } },
} satisfies Prisma.FeedInclude;

export type FeedWithRule = Prisma.FeedGetPayload<{
  include: typeof feedWithRuleInclude;
}>;

export const feedRepository = {
  async count(shopId: string): Promise<number> {
    return db.feed.count({ where: { shopId } });
  },

  async findMostRecentlyGenerated(shopId: string) {
    return db.feed.findFirst({
      where: { shopId, lastGeneratedAt: { not: null } },
      orderBy: { lastGeneratedAt: "desc" },
    });
  },

  async listByShop(shopId: string) {
    return db.feed.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(shopId: string, feedId: string): Promise<FeedWithRule | null> {
    return db.feed.findFirst({
      where: { id: feedId, shopId },
      include: feedWithRuleInclude,
    });
  },

  /** Unauthenticated lookup for the public/private feed-serving route —
   * there's no merchant session on that request, so this intentionally
   * isn't scoped by shopId. publicToken is a unique, unguessable id. */
  async findByPublicToken(publicToken: string): Promise<FeedWithRule | null> {
    return db.feed.findUnique({
      where: { publicToken },
      include: feedWithRuleInclude,
    });
  },

  async delete(shopId: string, feedId: string): Promise<void> {
    await db.feed.deleteMany({ where: { id: feedId, shopId } });
  },

  async setStatus(
    shopId: string,
    feedId: string,
    status: "ENABLED" | "DISABLED",
  ): Promise<void> {
    await db.feed.updateMany({
      where: { id: feedId, shopId },
      data: { status },
    });
  },
};
