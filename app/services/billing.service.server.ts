import type { PlanDefinition } from "~/lib/plans";
import { resolvePlan } from "~/lib/plans";
import { feedRepository } from "~/repositories/feed.repository.server";
import { productRepository } from "~/repositories/product.repository.server";

export interface UsageCounts {
  products: number;
  variants: number;
  feeds: number;
}

export interface BillingSummary {
  plan: PlanDefinition;
  usage: UsageCounts;
}

/** Usage-limit reporting only — actual plan changes/billing go through
 * subscriptionService (Shopify Managed Billing), not this file. */
export const billingService = {
  async getSummary(shopId: string, planName: string): Promise<BillingSummary> {
    const [productCounts, variants, feeds] = await Promise.all([
      productRepository.getStatusCounts(shopId),
      productRepository.countVariants(shopId),
      feedRepository.count(shopId),
    ]);

    return {
      plan: resolvePlan(planName),
      usage: { products: productCounts.total, variants, feeds },
    };
  },
};
