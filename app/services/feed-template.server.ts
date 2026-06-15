import type { FeedType } from "@prisma/client";
import prisma from "../db.server";

const DEFAULT_ITEM_TEMPLATE = `    <item>
      <g:id>{{id}}</g:id>
      <title>{{title}}</title>
      <description>{{description}}</description>
      <link>{{link}}</link>
      <g:image_link>{{image}}</g:image_link>
      <g:availability>{{availability}}</g:availability>
      <g:price>{{price}}</g:price>
    </item>`;

export async function listFeedTemplates(feedType?: FeedType) {
  return prisma.feedTemplate.findMany({
    where: feedType ? { feedType } : undefined,
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

export async function getFeedTemplateById(id: string) {
  return prisma.feedTemplate.findUnique({ where: { id } });
}

export async function createFeedTemplate(input: {
  name: string;
  description?: string;
  feedType: FeedType;
  itemTemplate: string;
  headerTemplate?: string;
  footerTemplate?: string;
}) {
  return prisma.feedTemplate.create({
    data: {
      name: input.name,
      description: input.description,
      feedType: input.feedType,
      itemTemplate: input.itemTemplate,
      headerTemplate: input.headerTemplate ?? "",
      footerTemplate: input.footerTemplate ?? "",
    },
  });
}

export async function updateFeedTemplate(
  id: string,
  input: {
    name: string;
    description?: string;
    itemTemplate: string;
    headerTemplate?: string;
    footerTemplate?: string;
  },
) {
  return prisma.feedTemplate.update({
    where: { id },
    data: input,
  });
}

export async function deleteFeedTemplate(id: string) {
  const template = await prisma.feedTemplate.findUnique({ where: { id } });
  if (template?.isSystem) {
    throw new Error("System templates cannot be deleted.");
  }
  await prisma.feedTemplate.delete({ where: { id } });
}

export async function seedSystemFeedTemplates() {
  const templates = [
    {
      name: "Standard Google RSS",
      feedType: "GOOGLE" as FeedType,
      description: "Default Google Shopping RSS 2.0 item template",
    },
    {
      name: "Standard Custom XML",
      feedType: "CUSTOM" as FeedType,
      description: "Placeholder-driven custom XML item template",
    },
  ];

  for (const tpl of templates) {
    const existing = await prisma.feedTemplate.findFirst({
      where: { name: tpl.name, isSystem: true },
    });
    if (existing) continue;

    await prisma.feedTemplate.create({
      data: {
        name: tpl.name,
        description: tpl.description,
        feedType: tpl.feedType,
        itemTemplate: DEFAULT_ITEM_TEMPLATE,
        isSystem: true,
      },
    });
  }
}

export function resolveTemplateForConfig(config: {
  customXmlTemplate?: string | null;
  template?: { itemTemplate: string } | null;
}): string | null {
  if (config.customXmlTemplate?.trim()) return config.customXmlTemplate;
  if (config.template?.itemTemplate) return config.template.itemTemplate;
  return null;
}
