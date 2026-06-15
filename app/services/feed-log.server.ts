import type { FeedRequestStatus, FeedType } from "@prisma/client";
import prisma from "../db.server";
import { getAppSettings } from "./settings.server";
import type { FeedLogRow } from "../types/feed";

interface LogFeedAccessInput {
  feedConfigId?: string | null;
  feedName: string;
  feedType: FeedType;
  status?: FeedRequestStatus;
  responseTimeMs: number;
  productCount?: number;
  isDownload?: boolean;
  token?: string | null;
  userAgent?: string | null;
  errorMessage?: string | null;
}

export async function logFeedAccess(input: LogFeedAccessInput) {
  const settings = await getAppSettings();
  const totalLogs = await prisma.feedLog.count();

  if (totalLogs >= settings.maxFeedLogs) {
    const overflow = totalLogs - settings.maxFeedLogs + 1;
    const oldestLogs = await prisma.feedLog.findMany({
      orderBy: { createdAt: "asc" },
      take: overflow,
      select: { id: true },
    });

    if (oldestLogs.length > 0) {
      await prisma.feedLog.deleteMany({
        where: { id: { in: oldestLogs.map((log) => log.id) } },
      });
    }
  }

  return prisma.feedLog.create({
    data: {
      feedConfigId: input.feedConfigId ?? null,
      feedName: input.feedName,
      feedType: input.feedType,
      status: input.status ?? "SUCCESS",
      responseTimeMs: input.responseTimeMs,
      productCount: input.productCount ?? 0,
      isDownload: input.isDownload ?? false,
      token: input.token ?? null,
      userAgent: input.userAgent ?? null,
      errorMessage: input.errorMessage ?? null,
    },
  });
}

export async function listFeedLogs(limit = 50, offset = 0): Promise<FeedLogRow[]> {
  const logs = await prisma.feedLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return logs.map((log) => ({
    id: log.id,
    feedName: log.feedName,
    feedType: log.feedType,
    status: log.status,
    responseTimeMs: log.responseTimeMs,
    productCount: log.productCount,
    isDownload: log.isDownload,
    token: log.token,
    errorMessage: log.errorMessage,
    createdAt: log.createdAt.toISOString(),
  }));
}

export async function countFeedLogs(): Promise<number> {
  return prisma.feedLog.count();
}

export function isDownloadRequest(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const agent = userAgent.toLowerCase();
  return (
    agent.includes("curl") ||
    agent.includes("wget") ||
    agent.includes("feed") ||
    agent.includes("bot") ||
    agent.includes("googlebot")
  );
}
