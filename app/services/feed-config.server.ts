import { randomBytes } from "crypto";
import type { FeedType, Prisma } from "@prisma/client";
import prisma from "../db.server";
import { LOCAL_SHOP_ID } from "../constants/shop";
import { resolveShopId } from "./shop.server";
import {
  parseFilterValues,
  type FeedConfigInput,
  type FeedRuleInput,
} from "../types/feed";

function createToken(): string {
  return randomBytes(16).toString("hex");
}

export async function listFeedConfigs(feedType?: FeedType, shopId?: string | null) {
  const resolvedShopId = await resolveShopId(shopId);
  return prisma.feedConfig.findMany({
    where: {
      shopId: resolvedShopId,
      ...(feedType ? { feedType } : {}),
    },
    include: {
      rules: { orderBy: [{ priority: "asc" }, { createdAt: "asc" }] },
      _count: { select: { logs: true, rules: true } },
      template: true,
    },
    orderBy: [{ feedType: "asc" }, { isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getFeedConfigById(id: string) {
  return prisma.feedConfig.findUnique({
    where: { id },
    include: {
      rules: { orderBy: [{ priority: "asc" }, { createdAt: "asc" }] },
    },
  });
}

export async function getFeedConfigByToken(token: string) {
  return prisma.feedConfig.findUnique({
    where: { token },
    include: {
      rules: {
        where: { isActive: true },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      },
      template: true,
    },
  });
}

export async function getDefaultFeedConfig(
  feedType: FeedType,
  shopId?: string | null,
) {
  const resolvedShopId = await resolveShopId(shopId);
  return prisma.feedConfig.findFirst({
    where: {
      shopId: resolvedShopId,
      feedType,
      isDefault: true,
      isActive: true,
    },
    include: {
      rules: {
        where: { isActive: true },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      },
      template: true,
    },
  });
}

export async function resolveFeedConfig(
  feedType: FeedType,
  token?: string | null,
  shopId?: string | null,
) {
  if (token) {
    const config = await getFeedConfigByToken(token);
    if (!config || config.feedType !== feedType || !config.isActive) {
      return null;
    }
    return config;
  }

  return getDefaultFeedConfig(feedType, shopId);
}

export async function createFeedConfig(
  input: FeedConfigInput,
  shopId?: string | null,
) {
  const resolvedShopId = await resolveShopId(shopId);
  return prisma.feedConfig.create({
    data: {
      shopId: resolvedShopId,
      name: input.name,
      feedType: input.feedType,
      token: createToken(),
      filterMode: input.filterMode,
      filterValues: JSON.stringify(input.filterValues),
      schedule: input.schedule,
      isActive: input.isActive,
      currencyCode: input.currencyCode ?? "USD",
      targetCountry: input.targetCountry ?? null,
      templateId: input.templateId ?? null,
      customXmlTemplate: input.customXmlTemplate ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
    include: { rules: true },
  });
}

export async function updateFeedConfig(id: string, input: FeedConfigInput) {
  return prisma.feedConfig.update({
    where: { id },
    data: {
      name: input.name,
      feedType: input.feedType,
      filterMode: input.filterMode,
      filterValues: JSON.stringify(input.filterValues),
      schedule: input.schedule,
      isActive: input.isActive,
      currencyCode: input.currencyCode ?? "USD",
      targetCountry: input.targetCountry ?? null,
      templateId: input.templateId ?? null,
      customXmlTemplate: input.customXmlTemplate ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
    include: { rules: true },
  });
}

export async function deleteFeedConfig(id: string) {
  const config = await prisma.feedConfig.findUnique({ where: { id } });
  if (!config || config.isDefault) {
    throw new Error("Default feeds cannot be deleted.");
  }
  await prisma.feedConfig.delete({ where: { id } });
}

export async function regenerateFeedToken(id: string) {
  return prisma.feedConfig.update({
    where: { id },
    data: { token: createToken() },
  });
}

export async function replaceFeedRules(
  feedConfigId: string,
  rules: FeedRuleInput[],
) {
  await prisma.feedRule.deleteMany({ where: { feedConfigId } });

  if (rules.length === 0) return [];

  await prisma.feedRule.createMany({
    data: rules.map((rule) => ({
      feedConfigId,
      name: rule.name,
      conditionField: rule.conditionField,
      conditionOperator: rule.conditionOperator,
      conditionValue: rule.conditionValue,
      action: rule.action,
      actionValue: rule.actionValue ?? null,
      priority: rule.priority,
      isActive: rule.isActive,
    })),
  });

  return prisma.feedRule.findMany({
    where: { feedConfigId },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
}

export function buildFeedConfigWhere(
  filterMode: FeedConfigInput["filterMode"],
  filterValues: string[],
): Prisma.ProductWhereInput {
  switch (filterMode) {
    case "PRODUCTS":
      return filterValues.length > 0 ? { id: { in: filterValues } } : { id: { in: [] } };
    case "CATEGORIES":
      return filterValues.length > 0
        ? { category: { in: filterValues } }
        : { id: { in: [] } };
    case "BRANDS":
      return filterValues.length > 0
        ? { brand: { in: filterValues } }
        : { id: { in: [] } };
    case "PRODUCT_TYPES":
      return filterValues.length > 0
        ? { productType: { in: filterValues } }
        : { id: { in: [] } };
    case "ALL":
    default:
      return {};
  }
}

export function getFeedConfigFilterValues(config: {
  filterValues: string;
}): string[] {
  return parseFilterValues(config.filterValues);
}

export async function countActiveFeedConfigs(shopId?: string | null): Promise<number> {
  const resolvedShopId = await resolveShopId(shopId);
  return prisma.feedConfig.count({
    where: { isActive: true, shopId: resolvedShopId },
  });
}

export async function createDefaultFeedConfigsForShop(shopId: string) {
  const feedTypes: FeedType[] = [
    "GOOGLE",
    "META",
    "TIKTOK",
    "PINTEREST",
    "SNAPCHAT",
  ];

  for (const feedType of feedTypes) {
    const existing = await prisma.feedConfig.findFirst({
      where: { shopId, feedType, isDefault: true },
    });

    if (existing) continue;

    await prisma.feedConfig.create({
      data: {
        shopId,
        name: `Default ${feedType} Feed`,
        feedType,
        token: createToken(),
        isDefault: true,
        filterMode: "ALL",
        schedule: "DAILY",
      },
    });
  }
}

export async function touchFeedGenerated(id: string, productCount: number) {
  await prisma.feedConfig.update({
    where: { id },
    data: {
      lastGeneratedAt: new Date(),
      requestCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  });

  return productCount;
}

export async function touchFeedAccess(
  id: string,
  options: { isDownload?: boolean } = {},
) {
  await prisma.feedConfig.update({
    where: { id },
    data: {
      lastAccessedAt: new Date(),
      requestCount: { increment: 1 },
      ...(options.isDownload ? { downloadCount: { increment: 1 } } : {}),
    },
  });
}
