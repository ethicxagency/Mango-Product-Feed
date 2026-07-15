import type { FeedChannel } from "~/types/feed";

export const FEED_CHANNEL_LABELS: Record<FeedChannel, string> = {
  GOOGLE: "Google Merchant Center",
  META: "Meta Commerce",
  TIKTOK: "TikTok Catalog",
  PINTEREST: "Pinterest",
  SNAPCHAT: "Snapchat",
  MICROSOFT: "Microsoft Shopping",
  CUSTOM: "Custom XML Feed",
};
