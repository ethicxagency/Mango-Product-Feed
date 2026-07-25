import { db } from "~/lib/db.server";
import { isMockModeEnabled } from "~/lib/mock-mode.server";
import type { PlanDefinition } from "~/lib/plans";
import { getPlan, resolvePlan } from "~/lib/plans";
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

  /** Activates a plan for the shop. There's no Shopify Billing config on
   * the app yet (see shopify.server.ts — shopifyApp() has no `billing`
   * key), so this can't actually call admin.billing.request(...). Mock
   * mode simulates instant activation the same way the rest of this app
   * simulates Shopify elsewhere (sync, webhooks) so the upgrade flow is
   * fully exercisable in local dev/tests; the real-mode branch fails
   * loudly instead of pretending to charge the merchant. */
  async upgradePlan(shopId: string, planId: string): Promise<PlanDefinition> {
    const plan = getPlan(planId);
    if (!plan) {
      throw new Response("Unknown plan", { status: 400 });
    }

    if (!isMockModeEnabled()) {
      // TODO once real subscription plans are registered on shopifyApp()'s
      // `billing` config: call admin.billing.request({ plan: ..., ... })
      // here, redirect the merchant to Shopify's confirmation page, and
      // only persist planName from the afterAuth/webhook confirmation —
      // not directly from this action.
      throw new Response("Billing is not configured for this shop yet", {
        status: 501,
      });
    }

    await db.shop.update({
      where: { id: shopId },
      data: { planName: plan.id },
    });
    return plan;
  },
};
