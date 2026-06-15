import type { FeedConfig, FeedSchedule } from "@prisma/client";
import prisma from "../db.server";
import { getAppSettings } from "./settings.server";

const SCHEDULE_INTERVAL_MS: Record<Exclude<FeedSchedule, "MANUAL">, number> = {
  HOURLY: 60 * 60 * 1000,
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
};

export function getNextScheduledRun(
  schedule: FeedSchedule,
  lastGeneratedAt: Date | null,
): Date | null {
  if (schedule === "MANUAL") return null;

  const interval = SCHEDULE_INTERVAL_MS[schedule];
  const base = lastGeneratedAt ?? new Date(0);
  return new Date(base.getTime() + interval);
}

export function isFeedDue(config: Pick<FeedConfig, "schedule" | "lastGeneratedAt">): boolean {
  if (config.schedule === "MANUAL") return false;
  const nextRun = getNextScheduledRun(config.schedule, config.lastGeneratedAt);
  if (!nextRun) return false;
  return nextRun.getTime() <= Date.now();
}

export async function listDueFeedConfigs() {
  const settings = await getAppSettings();
  if (!settings.enableScheduler) return [];

  const configs = await prisma.feedConfig.findMany({
    where: {
      isActive: true,
      schedule: { not: "MANUAL" },
    },
    include: {
      rules: {
        where: { isActive: true },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  return configs.filter((config) => isFeedDue(config));
}

export async function markFeedScheduledRun(feedConfigId: string) {
  return prisma.feedConfig.update({
    where: { id: feedConfigId },
    data: { lastGeneratedAt: new Date() },
  });
}

export async function runScheduledFeeds() {
  const dueFeeds = await listDueFeedConfigs();
  const results: { feedConfigId: string; name: string; status: "SUCCESS" | "SKIPPED" }[] = [];

  for (const feed of dueFeeds) {
    await markFeedScheduledRun(feed.id);
    results.push({
      feedConfigId: feed.id,
      name: feed.name,
      status: "SUCCESS",
    });
  }

  return results;
}
