import type { Feed, Prisma } from "@prisma/client";

import { db } from "~/lib/db.server";

export type FeedSortField =
  "name" | "channel" | "status" | "createdAt" | "updatedAt" | "lastGeneratedAt";

export interface ListFeedsOptions {
  /** Matched against feed name, case-insensitively (explicit
   * `mode: "insensitive"` — Postgres's `contains` is case-sensitive by
   * default, unlike SQLite's). */
  search?: string;
  channel?: string;
  /** Feed.status (ENABLED/DISABLED). Mutually exclusive with
   * generationStatus in practice — the list page's single Status filter
   * maps to one or the other depending on which option is chosen. */
  status?: string;
  /** Feed.lastGenerationStatus (RUNNING/SUCCESS/PARTIAL/FAILED). */
  generationStatus?: string;
  createdFrom?: Date;
  createdTo?: Date;
  updatedFrom?: Date;
  updatedTo?: Date;
  sortField?: FeedSortField;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PagedFeeds {
  feeds: Feed[];
  total: number;
}

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

  /** Options are all optional so this stays backward compatible with a
   * plain `listByShop(shopId)` call — the list page is currently the only
   * caller, but there's no reason to force every future one through the
   * paginated shape. */
  async listByShop(
    shopId: string,
    options: ListFeedsOptions = {},
  ): Promise<PagedFeeds> {
    const {
      search,
      channel,
      status,
      generationStatus,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      sortField = "createdAt",
      sortDirection = "desc",
      page = 1,
      pageSize = 20,
    } = options;

    const where: Prisma.FeedWhereInput = {
      shopId,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(channel ? { channel } : {}),
      ...(status ? { status } : {}),
      ...(generationStatus ? { lastGenerationStatus: generationStatus } : {}),
      ...(createdFrom || createdTo
        ? { createdAt: { gte: createdFrom, lte: createdTo } }
        : {}),
      ...(updatedFrom || updatedTo
        ? { updatedAt: { gte: updatedFrom, lte: updatedTo } }
        : {}),
    };

    const orderBy = {
      [sortField]: sortDirection,
    } as Prisma.FeedOrderByWithRelationInput;

    const [feeds, total] = await Promise.all([
      db.feed.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.feed.count({ where }),
    ]);

    return { feeds, total };
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

  /** Each feed needs its own fresh random token, so this can't be a
   * single updateMany — one query per feed, run inside a transaction so a
   * failure partway through can't leave some feeds rotated and others not. */
  async regenerateAllSecretTokens(
    shopId: string,
    tokenFor: (feedId: string) => string,
  ): Promise<number> {
    const feeds = await db.feed.findMany({
      where: { shopId },
      select: { id: true },
    });

    await db.$transaction(
      feeds.map((f) =>
        db.feed.update({
          where: { id: f.id },
          data: { secretToken: tokenFor(f.id) },
        }),
      ),
    );

    return feeds.length;
  },
};
