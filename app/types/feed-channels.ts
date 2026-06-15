import type { FeedType } from "@prisma/client";

export interface FeedRenderContext {
  feedType: FeedType;
  shopId?: string | null;
  targetCurrency?: string;
  targetCountry?: string | null;
  customTemplate?: string | null;
}

export const ALL_FEED_TYPES: FeedType[] = [
  "GOOGLE",
  "META",
  "TIKTOK",
  "PINTEREST",
  "SNAPCHAT",
  "CUSTOM",
];

export const FEED_TYPE_DESCRIPTIONS: Record<FeedType, string> = {
  GOOGLE: "Google Merchant Center product feed (RSS 2.0 + Google namespace)",
  META: "Meta Commerce catalog feed for Facebook and Instagram shops",
  TIKTOK: "TikTok Catalog feed for TikTok Shop advertising",
  PINTEREST: "Pinterest Catalog feed for Pinterest shopping ads",
  SNAPCHAT: "Snapchat Catalog feed for Snap Dynamic Ads",
  CUSTOM: "Custom XML feed using configurable item templates",
};
