import type { SystemLogLevel } from "@prisma/client";
import prisma from "../db.server";

export async function logSystemEvent(input: {
  level?: SystemLogLevel;
  category: string;
  message: string;
  metadata?: Record<string, unknown>;
  shopId?: string;
}) {
  return prisma.systemLog.create({
    data: {
      level: input.level ?? "INFO",
      category: input.category,
      message: input.message,
      metadata: JSON.stringify(input.metadata ?? {}),
      shopId: input.shopId,
    },
  });
}

export async function listSystemLogs(options: {
  level?: SystemLogLevel;
  category?: string;
  shopId?: string;
  limit?: number;
} = {}) {
  return prisma.systemLog.findMany({
    where: {
      ...(options.level ? { level: options.level } : {}),
      ...(options.category ? { category: options.category } : {}),
      ...(options.shopId ? { shopId: options.shopId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 100,
  });
}

export async function purgeOldSystemLogs(retentionDays = 30) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.systemLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
