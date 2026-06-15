import prisma from "../db.server";
import type { FeedType } from "@prisma/client";
import { countActiveFeedConfigs } from "./feed-config.server";
import { countFeedLogs } from "./feed-log.server";

export async function logFeedRequest(
  feedType: FeedType,
  productCount: number,
  status: "SUCCESS" | "ERROR" = "SUCCESS",
  errorMessage?: string,
) {
  return prisma.feedRequest.create({
    data: {
      feedType,
      productCount,
      status,
      errorMessage,
    },
  });
}

export async function countFeedRequests(): Promise<number> {
  return prisma.feedRequest.count();
}

export async function getRecentFeedRequests(limit = 10) {
  return prisma.feedRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getTotalFeedCount(shopId?: string | null): Promise<number> {
  return countActiveFeedConfigs(shopId);
}

export async function getDashboardStats(
  productCount: number,
  healthScore: number,
  shopId?: string | null,
) {
  const [feedRequests, totalFeeds] = await Promise.all([
    countFeedRequests(),
    getTotalFeedCount(shopId),
  ]);
  const feedLogs = await countFeedLogs();

  return {
    totalProducts: productCount,
    totalFeeds,
    feedRequests: feedRequests + feedLogs,
    feedHealthScore: healthScore,
  };
}
