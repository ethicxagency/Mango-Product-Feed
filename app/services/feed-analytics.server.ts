import prisma from "../db.server";
import type { FeedAnalyticsSummary } from "../types/feed";

export async function getFeedAnalyticsSummary(): Promise<FeedAnalyticsSummary> {
  const [totalRequests, totalDownloads, totalFeeds, activeFeeds, configs, recentLogs] =
    await Promise.all([
      prisma.feedLog.count(),
      prisma.feedLog.count({ where: { isDownload: true } }),
      prisma.feedConfig.count(),
      prisma.feedConfig.count({ where: { isActive: true } }),
      prisma.feedConfig.findMany({
        orderBy: [{ feedType: "asc" }, { name: "asc" }],
      }),
      prisma.feedLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  return {
    totalRequests,
    totalDownloads,
    totalFeeds,
    activeFeeds,
    feedUsage: configs.map((config) => ({
      feedConfigId: config.id,
      feedName: config.name,
      feedType: config.feedType,
      requestCount: config.requestCount,
      downloadCount: config.downloadCount,
      lastAccessedAt: config.lastAccessedAt?.toISOString() ?? null,
      lastGeneratedAt: config.lastGeneratedAt?.toISOString() ?? null,
      token: config.token,
    })),
    recentActivity: recentLogs.map((log) => ({
      id: log.id,
      feedName: log.feedName,
      feedType: log.feedType,
      status: log.status,
      responseTimeMs: log.responseTimeMs,
      productCount: log.productCount,
      isDownload: log.isDownload,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

export async function getFeedAnalyticsByType() {
  const logs = await prisma.feedLog.groupBy({
    by: ["feedType"],
    _count: { _all: true },
    _avg: { responseTimeMs: true },
  });

  return logs.map((row) => ({
    feedType: row.feedType,
    requests: row._count._all,
    avgResponseTimeMs: Math.round(row._avg.responseTimeMs ?? 0),
  }));
}
