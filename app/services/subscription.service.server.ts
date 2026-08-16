import {
  BillingError,
  HttpResponseError,
  type AppSubscription,
} from "@shopify/shopify-api";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

import { db } from "~/lib/db.server";
import { isMockModeEnabled } from "~/lib/mock-mode.server";
import type { BillingCycle, PlanDefinition, PlanId } from "~/lib/plans";
import { getPlan, resolvePlan } from "~/lib/plans";
import { appUrl, authenticate } from "~/shopify.server";

/**
 * Shopify Managed Billing helpers — the only place in this app that talks
 * to Shopify's AppSubscription API (via authenticate.admin(request).billing)
 * or writes to the Subscription table. Every route that touches billing
 * goes through these functions rather than calling billing.request/check/
 * cancel or db.subscription directly, so the "never trust frontend state,
 * always verify from Shopify" rule has exactly one enforcement point.
 *
 * Mock mode (no real Shopify session) simulates the same state machine
 * entirely in Postgres, matching the rest of this app's mock-mode pattern —
 * see shopify.server.ts and getCurrentShop.
 */

/** Dev stores must charge in test mode (Shopify rejects/never bills real
 * charges on dev stores otherwise). No hardcoding — driven by env var:
 * .env: SHOPIFY_BILLING_TEST=true. Render prod: SHOPIFY_BILLING_TEST=false. */
const isBillingTestMode = () => process.env.SHOPIFY_BILLING_TEST === "true";

/**
 * Turns a raw billing.request/check/cancel failure into an actionable log
 * hint. A 403 Forbidden specifically on a Billing API GraphQL call (while
 * every other authenticated call — sync, webhooks — succeeds) is Shopify's
 * documented signature for "this app has Shopify Managed Pricing enabled
 * in the Partner Dashboard", which disables custom appSubscriptionCreate/
 * currentAppInstallation billing calls entirely in favor of Shopify's own
 * pricing UI. Anything else just gets its raw HTTP status/body surfaced.
 */
/** Dev store detection — shop.plan.partnerDevelopment true for Partner
 * dev stores. Logging only; does NOT drive isTest (that's env-var only,
 * per spec — never hardcode). Fails soft (undefined) so a query hiccup
 * never blocks the actual billing call. */
async function detectDevStore(admin: AdminApiContext): Promise<boolean | undefined> {
  try {
    const res = await admin.graphql(
      `#graphql
      query ShopPlan { shop { plan { partnerDevelopment } } }`,
    );
    const { data } = (await res.json()) as {
      data?: { shop?: { plan?: { partnerDevelopment?: boolean } } };
    };
    return data?.shop?.plan?.partnerDevelopment;
  } catch {
    return undefined;
  }
}

/** Full GraphQL error body on a billing failure — not just "GraphQL
 * Client: Forbidden". HttpResponseError.response.body carries Shopify's
 * actual errors array; log it whole. */
async function logBillingGraphQLError(
  op: string,
  shop: string,
  error: unknown,
): Promise<void> {
  if (error instanceof HttpResponseError) {
    console.error(`[billing] ${op} failed`, {
      shop,
      status: error.response.code,
      statusText: error.response.statusText,
      body: JSON.stringify(error.response.body),
      hint: describeBillingError(error),
    });
  } else if (error instanceof BillingError) {
    // Thrown when appSubscriptionCreate/appPurchaseOneTimeCreate executed
    // and Shopify returned real GraphQL userErrors (not a transport/403
    // failure) — error.errorData IS that userErrors array.
    console.error(`[billing] ${op} failed`, {
      shop,
      message: error.message,
      userErrors: JSON.stringify(error.errorData),
    });
  } else {
    console.error(`[billing] ${op} failed`, {
      shop,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

export function describeBillingError(error: unknown): string | undefined {
  if (!(error instanceof HttpResponseError)) return undefined;

  if (error.response.code === 403) {
    return (
      "403 Forbidden from Shopify's Billing API. This is Shopify's " +
      "documented signature for 'Managed Pricing' being enabled for this " +
      "app in the Partner Dashboard (App setup > Pricing), which disables " +
      "custom billing.request()/billing.check() calls — check that " +
      "setting before assuming this is a code bug."
    );
  }

  return `HTTP ${error.response.code} ${error.response.statusText} from Shopify's Billing API.`;
}

/**
 * Builds the absolute URL Shopify's Billing API requires for `returnUrl`.
 * appSubscriptionCreate's $returnUrl variable is typed `URL!` in Shopify's
 * GraphQL schema — a relative path like "/app/plans" is not a valid value
 * for that scalar and is rejected with "was provided invalid value" before
 * the mutation even runs. This always resolves against the same `appUrl`
 * shopify.server.ts registers with Shopify for OAuth, so the returnUrl's
 * host is guaranteed to be the one Shopify already trusts for this app.
 */
function buildBillingReturnUrl(path: string): string {
  if (!appUrl) {
    throw new Response(
      "Cannot build a billing returnUrl: SHOPIFY_APP_URL/APP_URL is not set.",
      { status: 500 },
    );
  }

  const base = appUrl.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const returnUrl = `${base}${suffix}`;

  let parsed: URL;
  try {
    parsed = new URL(returnUrl);
  } catch {
    throw new Response(
      `Cannot build a billing returnUrl: "${returnUrl}" is not a valid absolute URL.`,
      { status: 500 },
    );
  }

  if (parsed.protocol !== "https:") {
    if (process.env.NODE_ENV === "production" || parsed.hostname !== "localhost") {
      throw new Response(
        `Refusing to send a non-HTTPS billing returnUrl to Shopify: "${returnUrl}". ` +
          "Check SHOPIFY_APP_URL/APP_URL — Shopify requires an https:// URL.",
        { status: 500 },
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[billing] returnUrl: ${returnUrl}`);

  return returnUrl;
}

export interface CurrentPlanSummary {
  plan: PlanDefinition;
  billingCycle: BillingCycle | null;
  status: string;
  isTest: boolean;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  isTrialActive: boolean;
}

/** True only when a real, unexpired trial end date is on record — never
 * inferred from plan metadata alone, since Shopify (not this app) is the
 * source of truth for whether a trial was already consumed. */
export function isTrialActive(trialEndsAt: Date | null): boolean {
  return trialEndsAt !== null && trialEndsAt.getTime() > Date.now();
}

export const subscriptionService = {
  /** Reads the shop's current plan + subscription state straight from the
   * database, which is kept in sync by verifySubscription() (called on
   * every Plans page load) and the app_subscriptions/update webhook — never
   * trust a value the client claims, always resolve it here. */
  async getCurrentPlan(shopId: string): Promise<CurrentPlanSummary> {
    const [shop, subscription] = await Promise.all([
      db.shop.findUniqueOrThrow({ where: { id: shopId } }),
      db.subscription.findUnique({ where: { shopId } }),
    ]);

    const plan = resolvePlan(subscription?.planId ?? shop.planName);
    const trialEndsAt = subscription?.trialEndsAt ?? null;

    return {
      plan,
      billingCycle: (subscription?.billingCycle as BillingCycle | null) ?? null,
      status: subscription?.status ?? "ACTIVE",
      isTest: subscription?.isTest ?? false,
      trialEndsAt,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      isTrialActive: isTrialActive(trialEndsAt),
    };
  },

  /** Starts a Shopify Managed Billing subscription for a paid plan. Always
   * ends by throwing a redirect — either straight to Shopify's approval
   * page (real mode) — never by writing the subscription to the database
   * before Shopify has actually confirmed it. Mock mode has no real
   * confirmation page to redirect through, so it writes the equivalent
   * "approved" state directly via mockApproveSubscription and returns
   * normally instead of redirecting. */
  async createSubscription({
    request,
    shopId,
    planId,
    billingCycle,
  }: {
    request: Request;
    shopId: string;
    planId: PlanId;
    billingCycle: BillingCycle;
  }): Promise<void> {
    const plan = getPlan(planId);
    if (!plan?.billing) {
      throw new Response("Unknown or non-billable plan", { status: 400 });
    }

    if (isMockModeEnabled()) {
      await subscriptionService.mockApproveSubscription(shopId, planId, billingCycle);
      return;
    }

    const billingKey =
      billingCycle === "MONTHLY" ? plan.billing.monthlyKey : plan.billing.yearlyKey;
    const returnUrl = buildBillingReturnUrl("/app/plans");
    const { billing, session, admin } = await authenticate.admin(request);
    const isTest = isBillingTestMode();

    console.log("[billing] requesting subscription", {
      shop: session.shop,
      plan: billingKey,
      returnUrl,
      isTest,
      sessionType: session.isOnline ? "online" : "offline",
      accessTokenPresent: Boolean(session.accessToken),
      isDevStore: await detectDevStore(admin),
    });

    try {
      await billing.request({
        plan: billingKey,
        isTest,
        returnUrl,
      });
    } catch (error) {
      await logBillingGraphQLError("billing.request", session.shop, error);
      throw error;
    }
  },

  /** Cancels the shop's active Shopify subscription (if any) and reverts
   * the shop to the Free plan. Mirrors createSubscription: real mode calls
   * the Shopify Admin API first and only updates the database with what
   * Shopify actually confirmed. */
  async cancelSubscription({
    request,
    shopId,
  }: {
    request: Request;
    shopId: string;
  }): Promise<void> {
    const subscription = await db.subscription.findUnique({
      where: { shopId },
    });

    if (!subscription?.shopifySubscriptionId) {
      // Nothing to cancel with Shopify (e.g. already Free) — just make
      // sure the local row agrees.
      await downgradeToFree(shopId);
      return;
    }

    if (!isMockModeEnabled()) {
      const { billing } = await authenticate.admin(request);
      await billing.cancel({
        subscriptionId: subscription.shopifySubscriptionId,
        prorate: true,
        isTest: subscription.isTest,
      });
    }

    await downgradeToFree(shopId);
  },

  /** Re-checks the shop's billing state against Shopify's Admin GraphQL API
   * (billing.check) and writes whatever Shopify reports into the
   * Subscription/Shop tables. This is the "never trust frontend state"
   * enforcement point — call it on every Plans page load and right after
   * returning from Shopify's approval page, in addition to the webhook. */
  async verifySubscription({
    request,
    shopId,
  }: {
    request: Request;
    shopId: string;
  }): Promise<CurrentPlanSummary> {
    if (isMockModeEnabled()) {
      // Mock mode has no real Shopify billing API to check against — the
      // database row created by the mock-approve redirect (see the
      // mockApprove branch in app.plans.tsx) is already the source of
      // truth, so just read it back.
      return subscriptionService.getCurrentPlan(shopId);
    }

    const { billing, session, admin } = await authenticate.admin(request);
    const isTest = isBillingTestMode();

    console.log("[billing] checking subscription", {
      shop: session.shop,
      isTest,
      sessionType: session.isOnline ? "online" : "offline",
      accessTokenPresent: Boolean(session.accessToken),
      isDevStore: await detectDevStore(admin),
    });

    let appSubscriptions;
    try {
      ({ appSubscriptions } = await billing.check({ isTest }));
    } catch (error) {
      await logBillingGraphQLError("billing.check", session.shop, error);
      throw error;
    }

    const active = appSubscriptions.find(
      (sub) => sub.status === "ACTIVE" || sub.status === "ACCEPTED",
    );

    if (active) {
      await syncSubscriptionFromShopify(shopId, active);
    } else {
      // No active subscription — Shopify's the source of truth, so
      // downgrade locally rather than trusting stale local state.
      const current = await db.subscription.findUnique({ where: { shopId } });
      if (current?.shopifySubscriptionId) {
        await downgradeToFree(shopId);
      }
    }

    return subscriptionService.getCurrentPlan(shopId);
  },

  /** Thin wrapper around authenticate.admin(request).billing.require — for
   * gating a specific route/feature behind an active paid plan. Not
   * currently wired into any route (this app's Free tier is fully
   * functional on its own; billing gates usage limits, not access), but
   * provided as the reusable primitive the rest of this service is built
   * on, exactly as named in the task spec. */
  async requireBilling({
    request,
    plans,
    onFailure,
  }: {
    request: Request;
    plans: string[];
    onFailure: (error: unknown) => Promise<Response>;
  }) {
    const { billing } = await authenticate.admin(request);
    return billing.require({
      plans,
      isTest: isBillingTestMode(),
      onFailure,
    });
  },

  /** Mock-mode-only counterpart to a merchant approving the Shopify
   * confirmation page — writes the same Subscription shape
   * syncSubscriptionFromShopify would, with a synthesized subscription id
   * and dates, so the Plans page behaves identically to real mode without a
   * live Shopify session. Called from app.plans.tsx's loader after the
   * mockApprove redirect createSubscription() issues in mock mode. */
  async mockApproveSubscription(
    shopId: string,
    planId: PlanId,
    billingCycle: BillingCycle,
  ): Promise<void> {
    if (!isMockModeEnabled()) {
      throw new Response("mockApproveSubscription is mock-mode only", {
        status: 403,
      });
    }

    const plan = getPlan(planId);
    if (!plan?.billing) {
      throw new Response("Unknown or non-billable plan", { status: 400 });
    }

    const now = Date.now();
    const periodDays = billingCycle === "MONTHLY" ? 30 : 365;

    await db.$transaction([
      db.shop.update({ where: { id: shopId }, data: { planName: plan.id } }),
      db.subscription.upsert({
        where: { shopId },
        create: {
          shopId,
          planId: plan.id,
          billingCycle,
          shopifySubscriptionId: `gid://shopify/AppSubscription/mock-${shopId}-${now}`,
          status: "ACTIVE",
          isTest: true,
          trialEndsAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: new Date(now + periodDays * 24 * 60 * 60 * 1000),
        },
        update: {
          planId: plan.id,
          billingCycle,
          shopifySubscriptionId: `gid://shopify/AppSubscription/mock-${shopId}-${now}`,
          status: "ACTIVE",
          isTest: true,
          trialEndsAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: new Date(now + periodDays * 24 * 60 * 60 * 1000),
        },
      }),
    ]);
  },
};

export async function downgradeToFree(shopId: string): Promise<void> {
  await db.$transaction([
    db.shop.update({ where: { id: shopId }, data: { planName: "FREE" } }),
    db.subscription.upsert({
      where: { shopId },
      create: { shopId, planId: "FREE", status: "ACTIVE" },
      update: {
        planId: "FREE",
        billingCycle: null,
        shopifySubscriptionId: null,
        status: "ACTIVE",
        isTest: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
      },
    }),
  ]);
}

/** Maps a confirmed Shopify AppSubscription back to one of this app's plan
 * ids/billing cycles by matching the subscription name against the plan
 * keys configured in shopify.server.ts (Shopify's own AppSubscription.name
 * is exactly the config key we passed to billing.request). */
function resolvePlanFromSubscriptionName(
  name: string,
): { planId: PlanId; billingCycle: BillingCycle } | null {
  const match = /^(STARTER|GROWTH|PRO)_(MONTHLY|YEARLY)$/.exec(name);
  if (!match) return null;
  return {
    planId: match[1] as PlanId,
    billingCycle: match[2] as BillingCycle,
  };
}

export async function syncSubscriptionFromShopify(
  shopId: string,
  subscription: AppSubscription,
): Promise<void> {
  const resolved = resolvePlanFromSubscriptionName(subscription.name);
  if (!resolved) return;

  const trialEndsAt =
    subscription.trialDays > 0
      ? new Date(
          new Date(subscription.createdAt).getTime() +
            subscription.trialDays * 24 * 60 * 60 * 1000,
        )
      : null;

  await db.$transaction([
    db.shop.update({
      where: { id: shopId },
      data: { planName: resolved.planId },
    }),
    db.subscription.upsert({
      where: { shopId },
      create: {
        shopId,
        planId: resolved.planId,
        billingCycle: resolved.billingCycle,
        shopifySubscriptionId: subscription.id,
        status: subscription.status,
        isTest: subscription.test,
        trialEndsAt,
        currentPeriodEnd: new Date(subscription.currentPeriodEnd),
      },
      update: {
        planId: resolved.planId,
        billingCycle: resolved.billingCycle,
        shopifySubscriptionId: subscription.id,
        status: subscription.status,
        isTest: subscription.test,
        trialEndsAt,
        currentPeriodEnd: new Date(subscription.currentPeriodEnd),
      },
    }),
  ]);
}

const ACTIVE_SUBSCRIPTIONS_QUERY = `#graphql
  query ActiveSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        test
        status
        trialDays
        createdAt
        currentPeriodEnd
      }
    }
  }
`;

/** Called from the app_subscriptions/update webhook, where there's no
 * authenticate.admin(request) session to build a billing.check() call from
 * — only the admin GraphQL client the webhook handler already has. Queries
 * the same underlying data billing.check() would and syncs it the same way
 * verifySubscription() does. */
export async function syncSubscriptionFromWebhook(
  shopId: string,
  admin: AdminApiContext,
): Promise<void> {
  const response = await admin.graphql(ACTIVE_SUBSCRIPTIONS_QUERY);
  const { data } = (await response.json()) as {
    data?: {
      currentAppInstallation?: {
        activeSubscriptions: AppSubscription[];
      };
    };
  };

  const active = data?.currentAppInstallation?.activeSubscriptions.find(
    (sub) => sub.status === "ACTIVE" || sub.status === "ACCEPTED",
  );

  if (active) {
    await syncSubscriptionFromShopify(shopId, active);
  } else {
    const current = await db.subscription.findUnique({ where: { shopId } });
    if (current?.shopifySubscriptionId) {
      await downgradeToFree(shopId);
    }
  }
}
