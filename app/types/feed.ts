import type {
  FeedConfig,
  FeedFilterMode,
  FeedRule,
  FeedSchedule,
  FeedType,
  RuleAction,
  RuleConditionField,
  RuleConditionOperator,
} from "@prisma/client";

export type {
  FeedConfig,
  FeedFilterMode,
  FeedRule,
  FeedSchedule,
  RuleAction,
  RuleConditionField,
  RuleConditionOperator,
};

export interface FeedConfigInput {
  name: string;
  feedType: FeedType;
  filterMode: FeedFilterMode;
  filterValues: string[];
  schedule: FeedSchedule;
  isActive: boolean;
  currencyCode?: string;
  targetCountry?: string | null;
  expiresAt?: string | null;
  templateId?: string | null;
  customXmlTemplate?: string | null;
}

export interface FeedRuleInput {
  name: string;
  conditionField: RuleConditionField;
  conditionOperator: RuleConditionOperator;
  conditionValue: string;
  action: RuleAction;
  actionValue?: string;
  priority: number;
  isActive: boolean;
}

export interface FeedAnalyticsSummary {
  totalRequests: number;
  totalDownloads: number;
  totalFeeds: number;
  activeFeeds: number;
  feedUsage: FeedUsageRow[];
  recentActivity: FeedActivityRow[];
}

export interface FeedUsageRow {
  feedConfigId: string;
  feedName: string;
  feedType: FeedType;
  requestCount: number;
  downloadCount: number;
  lastAccessedAt: string | null;
  lastGeneratedAt: string | null;
  token: string;
}

export interface FeedActivityRow {
  id: string;
  feedName: string;
  feedType: FeedType;
  status: string;
  responseTimeMs: number;
  productCount: number;
  isDownload: boolean;
  createdAt: string;
}

export interface FeedLogRow {
  id: string;
  feedName: string;
  feedType: FeedType;
  status: string;
  responseTimeMs: number;
  productCount: number;
  isDownload: boolean;
  token: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AppSettingsMap {
  storeName: string;
  storeUrl: string;
  requireSecretTokens: boolean;
  streamingBatchSize: number;
  maxFeedLogs: number;
  enableScheduler: boolean;
}

export const FILTER_MODE_LABELS: Record<FeedFilterMode, string> = {
  ALL: "All products",
  PRODUCTS: "Specific products",
  CATEGORIES: "Specific categories",
  BRANDS: "Specific brands",
  PRODUCT_TYPES: "Specific product types",
};

export const SCHEDULE_LABELS: Record<FeedSchedule, string> = {
  MANUAL: "Manual",
  HOURLY: "Hourly",
  DAILY: "Daily",
  WEEKLY: "Weekly",
};

export const RULE_FIELD_LABELS: Record<RuleConditionField, string> = {
  STOCK: "Stock",
  CATEGORY: "Category",
  PRICE: "Price",
  BRAND: "Brand",
  PRODUCT_TYPE: "Product type",
  SKU: "SKU",
  COUNTRY: "Country",
};

export const RULE_OPERATOR_LABELS: Record<RuleConditionOperator, string> = {
  EQ: "equals",
  NEQ: "does not equal",
  LT: "is less than",
  LTE: "is less than or equal to",
  GT: "is greater than",
  GTE: "is greater than or equal to",
  CONTAINS: "contains",
};

export const RULE_ACTION_LABELS: Record<RuleAction, string> = {
  EXCLUDE: "Exclude product",
  APPEND_TEXT: "Append custom text",
};

export const DEFAULT_SETTINGS: AppSettingsMap = {
  storeName: "Mango Store",
  storeUrl: "https://mango-store.example.com",
  requireSecretTokens: false,
  streamingBatchSize: 500,
  maxFeedLogs: 10000,
  enableScheduler: true,
};

export function buildFeedUrl(
  appUrl: string,
  feedType: FeedType,
  token: string,
  legacyPath: string,
): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}${legacyPath}?token=${token}`;
}

export function buildTokenFeedUrl(appUrl: string, token: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/feeds/${token}.xml`;
}

export function describeSchedule(
  schedule: FeedSchedule,
  lastGeneratedAt: string | null,
): string {
  if (schedule === "MANUAL") {
    return "Runs manually when the feed URL is requested";
  }

  const intervals: Record<Exclude<FeedSchedule, "MANUAL">, number> = {
    HOURLY: 60 * 60 * 1000,
    DAILY: 24 * 60 * 60 * 1000,
    WEEKLY: 7 * 24 * 60 * 60 * 1000,
  };

  const interval = intervals[schedule];
  const base = lastGeneratedAt ? new Date(lastGeneratedAt).getTime() : 0;
  const nextRun = new Date(base + interval);

  return `Runs ${schedule.toLowerCase()}. Next run: ${nextRun.toLocaleString()}`;
}

export function parseFilterValues(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}
