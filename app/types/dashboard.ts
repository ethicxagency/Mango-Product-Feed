import type { ProductStatusCounts } from "~/repositories/product.repository.server";

export interface DashboardActivityItem {
  id: string;
  feedName: string;
  channel: string;
  status: string;
  productCount: number;
  startedAt: string;
  durationMs: number | null;
}

export interface DashboardSummary {
  productCounts: ProductStatusCounts;
  feedCount: number;
  latestFeedName: string | null;
  lastGeneratedAt: string | null;
  lastGenerationStatus: string | null;
  recentActivity: DashboardActivityItem[];
}
