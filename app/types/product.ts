import type { Availability, FeedType } from "@prisma/client";

export type { Availability, FeedType };

export interface ProductInput {
  title: string;
  description: string;
  sku: string;
  gtin?: string;
  brand: string;
  category: string;
  productType: string;
  price: string;
  salePrice?: string;
  availability: Availability;
  imageUrl: string;
  productUrl: string;
}

export interface ProductRecord extends ProductInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type HealthIssueType =
  | "MISSING_IMAGE"
  | "MISSING_SKU"
  | "MISSING_BRAND"
  | "MISSING_PRICE"
  | "MISSING_PRODUCT_URL"
  | "MISSING_GTIN"
  | "MISSING_MPN"
  | "DUPLICATE_SKU"
  | "BROKEN_IMAGE_URL";

export interface HealthIssue {
  productId: string;
  productTitle: string;
  sku: string;
  issue: HealthIssueType;
  message: string;
}

export interface FeedHealthReport {
  score: number;
  totalProducts: number;
  healthyProducts: number;
  issues: HealthIssue[];
  issueCounts: Record<HealthIssueType, number>;
}

export interface DashboardStats {
  totalProducts: number;
  totalFeeds: number;
  feedRequests: number;
  feedHealthScore: number;
}

export const FEED_TYPES: FeedType[] = [
  "GOOGLE",
  "META",
  "TIKTOK",
  "PINTEREST",
  "SNAPCHAT",
  "CUSTOM",
];

export const FEED_LABELS: Record<FeedType, string> = {
  GOOGLE: "Google Shopping",
  META: "Meta Catalog",
  TIKTOK: "TikTok Catalog",
  PINTEREST: "Pinterest Catalog",
  SNAPCHAT: "Snapchat Catalog",
  CUSTOM: "Custom XML",
};

export const FEED_PATHS: Record<FeedType, string> = {
  GOOGLE: "/feed/google.xml",
  META: "/feed/meta.xml",
  TIKTOK: "/feed/tiktok.xml",
  PINTEREST: "/feed/pinterest.xml",
  SNAPCHAT: "/feed/snapchat.xml",
  CUSTOM: "/feed/custom.xml",
};

export const AVAILABILITY_OPTIONS: { label: string; value: Availability }[] = [
  { label: "In stock", value: "IN_STOCK" },
  { label: "Out of stock", value: "OUT_OF_STOCK" },
  { label: "Preorder", value: "PREORDER" },
];

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  IN_STOCK: "In stock",
  OUT_OF_STOCK: "Out of stock",
  PREORDER: "Preorder",
};
