export const FEED_CHANNELS = [
  "GOOGLE",
  "META",
  "TIKTOK",
  "PINTEREST",
  "SNAPCHAT",
  "MICROSOFT",
  "CUSTOM",
] as const;
export type FeedChannel = (typeof FEED_CHANNELS)[number];

export const FEED_STATUSES = ["ENABLED", "DISABLED"] as const;
export type FeedStatus = (typeof FEED_STATUSES)[number];

export const PRODUCT_SELECTION_TYPES = [
  "ALL",
  "COLLECTIONS",
  "TAGS",
  "VENDOR",
  "PRODUCT_TYPE",
  "MANUAL",
] as const;
export type ProductSelectionType = (typeof PRODUCT_SELECTION_TYPES)[number];

export const FEED_HISTORY_STATUSES = [
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "PARTIAL",
] as const;
export type FeedHistoryStatus = (typeof FEED_HISTORY_STATUSES)[number];

export const FEED_TRIGGER_SOURCES = ["MANUAL", "SCHEDULED", "API"] as const;
export type FeedTriggerSource = (typeof FEED_TRIGGER_SOURCES)[number];

export const FEED_DOWNLOAD_SOURCES = [
  "PUBLIC_URL",
  "PRIVATE_URL",
  "MANUAL_DOWNLOAD",
] as const;
export type FeedDownloadSource = (typeof FEED_DOWNLOAD_SOURCES)[number];
