import { db } from "~/lib/db.server";
import type { FeedGenerationError } from "~/services/feed-rules/error-summary";
import type { FeedDownloadSource, FeedHistoryStatus } from "~/types/feed";

export interface CreateFeedHistoryInput {
  status: FeedHistoryStatus;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  productCount: number;
  variantCount: number;
  errors: FeedGenerationError[];
  fileSizeBytes: number;
}

export const feedHistoryRepository = {
  async listRecent(shopId: string, limit = 10) {
    return db.feedHistory.findMany({
      where: { feed: { shopId } },
      orderBy: { startedAt: "desc" },
      take: limit,
      include: { feed: { select: { name: true, channel: true } } },
    });
  },

  async create(feedId: string, input: CreateFeedHistoryInput) {
    return db.feedHistory.create({
      data: {
        feedId,
        status: input.status,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
        durationMs: input.durationMs,
        productCount: input.productCount,
        variantCount: input.variantCount,
        errorCount: input.errors.length,
        errorsJson: JSON.stringify(input.errors),
        fileSizeBytes: input.fileSizeBytes,
      },
    });
  },

  async listByFeed(feedId: string, limit = 20) {
    return db.feedHistory.findMany({
      where: { feedId },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  },

  async recordDownload(
    feedId: string,
    input: {
      feedHistoryId?: string;
      source: FeedDownloadSource;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
  ) {
    return db.feedDownload.create({
      data: {
        feedId,
        feedHistoryId: input.feedHistoryId,
        source: input.source,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  },

  async listDownloads(feedId: string, limit = 20) {
    return db.feedDownload.findMany({
      where: { feedId },
      orderBy: { downloadedAt: "desc" },
      take: limit,
    });
  },
};
