import type { FeedType } from "@prisma/client";
import type { CategoryMappingPlatform } from "@prisma/client";
import prisma from "../db.server";

const PLATFORM_MAP: Record<FeedType, CategoryMappingPlatform | null> = {
  GOOGLE: "GOOGLE",
  META: "META",
  TIKTOK: "TIKTOK",
  PINTEREST: "PINTEREST",
  SNAPCHAT: "SNAPCHAT",
  CUSTOM: null,
};

export async function listCategoryMappings(
  shopId: string,
  platform?: CategoryMappingPlatform,
) {
  return prisma.categoryMapping.findMany({
    where: {
      shopId,
      ...(platform ? { platform } : {}),
    },
    orderBy: [{ platform: "asc" }, { sourceCategory: "asc" }],
  });
}

export async function upsertCategoryMapping(input: {
  shopId: string;
  platform: CategoryMappingPlatform;
  sourceCategory: string;
  targetCategory: string;
}) {
  return prisma.categoryMapping.upsert({
    where: {
      shopId_platform_sourceCategory: {
        shopId: input.shopId,
        platform: input.platform,
        sourceCategory: input.sourceCategory,
      },
    },
    create: input,
    update: { targetCategory: input.targetCategory },
  });
}

export async function deleteCategoryMapping(id: string) {
  await prisma.categoryMapping.delete({ where: { id } });
}

export async function applyCategoryMapping(
  shopId: string,
  feedType: FeedType,
  sourceCategory: string,
): Promise<string> {
  const platform = PLATFORM_MAP[feedType];
  if (!platform || !sourceCategory) return sourceCategory;

  const mapping = await prisma.categoryMapping.findUnique({
    where: {
      shopId_platform_sourceCategory: {
        shopId,
        platform,
        sourceCategory,
      },
    },
  });

  return mapping?.targetCategory ?? sourceCategory;
}

export async function bulkImportCategoryMappings(
  shopId: string,
  platform: CategoryMappingPlatform,
  rows: { sourceCategory: string; targetCategory: string }[],
) {
  for (const row of rows) {
    await upsertCategoryMapping({
      shopId,
      platform,
      sourceCategory: row.sourceCategory,
      targetCategory: row.targetCategory,
    });
  }
}
