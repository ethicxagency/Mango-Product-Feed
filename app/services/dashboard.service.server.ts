import { feedHistoryRepository } from "~/repositories/feed-history.repository.server";
import { feedRepository } from "~/repositories/feed.repository.server";
import { productRepository } from "~/repositories/product.repository.server";
import type { DashboardSummary } from "~/types/dashboard";

export async function getDashboardSummary(
  shopId: string,
): Promise<DashboardSummary> {
  const [productCounts, feedCount, latestFeed, history] = await Promise.all([
    productRepository.getStatusCounts(shopId),
    feedRepository.count(shopId),
    feedRepository.findMostRecentlyGenerated(shopId),
    feedHistoryRepository.listRecent(shopId),
  ]);

  return {
    productCounts,
    feedCount,
    latestFeedName: latestFeed?.name ?? null,
    lastGeneratedAt: latestFeed?.lastGeneratedAt?.toISOString() ?? null,
    lastGenerationStatus: latestFeed?.lastGenerationStatus ?? null,
    recentActivity: history.map((entry) => ({
      id: entry.id,
      feedName: entry.feed.name,
      channel: entry.feed.channel,
      status: entry.status,
      productCount: entry.productCount,
      startedAt: entry.startedAt.toISOString(),
      durationMs: entry.durationMs,
    })),
  };
}
