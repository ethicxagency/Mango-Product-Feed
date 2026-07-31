import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Divider,
  Icon,
  InlineGrid,
  InlineStack,
  Modal,
  Page,
  SkeletonBodyText,
  Text,
  Toast,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";

import { getCurrentShop } from "~/lib/current-shop.server";
import type { BillingCycle, PlanDefinition, PlanId } from "~/lib/plans";
import {
  PLAN_RANK,
  PLANS,
  usagePercent,
  usageTone,
  usageWarning,
} from "~/lib/plans";
import { billingService } from "~/services/billing.service.server";
import {
  describeBillingError,
  subscriptionService,
} from "~/services/subscription.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);

  let current;
  try {
    current = await subscriptionService.verifySubscription({
      request,
      shopId: shop.id,
    });
  } catch (error) {
    // billing.check() only auto-recovers from an expired session (401 ->
    // redirect to reauth, which surfaces here as a low-status Response and
    // must propagate). Anything else — a network blip, a GraphQL error, a
    // Shopify-side hiccup — would otherwise crash this entire page with an
    // unhelpful "Application Error" and no way to diagnose it. Log full
    // detail and fall back to the last-known-good local state instead, so
    // a transient Shopify API failure doesn't lock the merchant out of the
    // Plans page entirely.
    if (error instanceof Response && error.status < 400) {
      throw error;
    }

    const billingErrorData =
      error && typeof error === "object" && "errorData" in error
        ? (error as { errorData: unknown }).errorData
        : undefined;

    console.error("[billing] verifySubscription failed on Plans page load", {
      shop: shop.shopifyDomain,
      status: error instanceof Response ? error.status : undefined,
      message: error instanceof Error ? error.message : String(error),
      hint: describeBillingError(error),
      billingErrorData,
      stack: error instanceof Error ? error.stack : undefined,
    });

    current = await subscriptionService.getCurrentPlan(shop.id);
  }

  const summary = await billingService.getSummary(shop.id, current.plan.id);

  return json({
    currentPlanId: current.plan.id,
    billingCycle: current.billingCycle,
    status: current.status,
    trialEndsAt: current.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: current.currentPeriodEnd?.toISOString() ?? null,
    isTrialActive: current.isTrialActive,
    usage: summary.usage,
    plans: PLANS,
  });
}

interface PlansActionResult {
  ok: boolean;
  message: string | null;
  error: string | null;
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  try {
    if (intent === "subscribe") {
      const planId = formData.get("planId")?.toString() as PlanId | undefined;
      const billingCycle = formData.get("billingCycle")?.toString() as
        | BillingCycle
        | undefined;

      if (!planId) {
        return json<PlansActionResult>(
          { ok: false, message: null, error: "Missing planId" },
          { status: 400 },
        );
      }

      if (planId === "FREE") {
        await subscriptionService.cancelSubscription({ request, shopId: shop.id });
        return json<PlansActionResult>({
          ok: true,
          message: "You're now on the Free plan.",
          error: null,
        });
      }

      if (!billingCycle) {
        return json<PlansActionResult>(
          { ok: false, message: null, error: "Missing billingCycle" },
          { status: 400 },
        );
      }

      // Real mode throws a redirect to Shopify's approval page and never
      // returns; mock mode writes the subscription directly and returns
      // normally, so the success response below is mock-mode-only.
      await subscriptionService.createSubscription({
        request,
        shopId: shop.id,
        planId,
        billingCycle,
      });
      return json<PlansActionResult>({
        ok: true,
        message: `You're now on the ${planId} plan.`,
        error: null,
      });
    }

    if (intent === "cancel") {
      await subscriptionService.cancelSubscription({ request, shopId: shop.id });
      return json<PlansActionResult>({
        ok: true,
        message: "Subscription cancelled — you're back on the Free plan.",
        error: null,
      });
    }

    return json<PlansActionResult>(
      { ok: false, message: null, error: "Unknown action" },
      { status: 400 },
    );
  } catch (error) {
    // Genuine redirects — authenticate.admin() re-triggering OAuth, or
    // billing.request()'s own redirect to Shopify's approval page — are
    // Response objects with a 3xx status and MUST propagate untouched for
    // Remix to actually perform the redirect. Anything >= 400 is a Response
    // our own code threw deliberately (buildBillingReturnUrl's validation,
    // the "unknown plan" check) and needs to become the same JSON error
    // shape as every other failure below, not a raw bodyless response the
    // fetcher can't show the merchant anything useful for.
    if (error instanceof Response && error.status < 400) {
      throw error;
    }

    const responseBody =
      error instanceof Response ? await error.text().catch(() => null) : null;
    // BillingError (thrown by @shopify/shopify-api when appSubscriptionCreate
    // returns GraphQL userErrors) carries the actual Shopify-side reason on
    // `errorData` — surface it in the logs, since error.message alone is
    // usually just "Error while billing the store".
    const billingErrorData =
      error && typeof error === "object" && "errorData" in error
        ? (error as { errorData: unknown }).errorData
        : undefined;
    const message =
      responseBody ?? (error instanceof Error ? error.message : "Something went wrong");

    console.error("[billing] Upgrade Plan action failed", {
      shop: shop.shopifyDomain,
      intent,
      planId: formData.get("planId")?.toString(),
      billingCycle: formData.get("billingCycle")?.toString(),
      status: error instanceof Response ? error.status : undefined,
      message,
      hint: describeBillingError(error),
      billingErrorData,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return json<PlansActionResult>(
      { ok: false, message: null, error: message },
      { status: error instanceof Response ? error.status : 500 },
    );
  }
}

const USAGE_BAR_COLOR: Record<ReturnType<typeof usageTone>, string> = {
  success: "var(--p-color-bg-fill-success)",
  warning: "var(--p-color-bg-fill-warning)",
  critical: "var(--p-color-bg-fill-critical)",
};

function UsageCard({
  label,
  used,
  max,
  isRefreshing,
}: {
  label: string;
  used: number;
  max: number | null;
  isRefreshing: boolean;
}) {
  const percent = usagePercent(used, max);
  const tone = usageTone(percent);
  const warning = max !== null ? usageWarning(percent, label) : null;

  return (
    <div
      style={{
        background: "var(--p-color-bg-surface)",
        border: "1px solid var(--p-color-border)",
        borderRadius: "var(--p-border-radius-300)",
        boxShadow: "var(--p-shadow-100)",
        padding: "var(--p-space-400)",
      }}
    >
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm" tone="subdued">
          {label}
        </Text>
        {isRefreshing ? (
          <SkeletonBodyText lines={2} />
        ) : (
          <>
            <InlineStack align="space-between" blockAlign="baseline">
              <Text as="span" variant="headingLg">
                {used.toLocaleString()}
                <Text as="span" tone="subdued" variant="bodyMd">
                  {max === null ? "" : ` / ${max.toLocaleString()}`}
                </Text>
              </Text>
              {max === null ? (
                <Badge tone="success">Unlimited</Badge>
              ) : (
                <Text as="span" variant="bodySm" fontWeight="medium" tone="subdued">
                  {percent}%
                </Text>
              )}
            </InlineStack>
            {max !== null ? (
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: "var(--p-color-bg-fill-tertiary)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${percent}%`,
                    background: USAGE_BAR_COLOR[tone],
                    borderRadius: 999,
                    transition: "width 250ms ease",
                  }}
                />
              </div>
            ) : null}
            {warning ? (
              <Text as="span" variant="bodySm" tone={percent >= 100 ? "critical" : "caution"}>
                {warning}
              </Text>
            ) : null}
          </>
        )}
      </BlockStack>
    </div>
  );
}

/** Two-button segmented toggle — Polaris has no native equivalent. */
function BillingCycleToggle({
  value,
  onChange,
}: {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  return (
    <div className="billing-cycle-toggle">
      <button
        type="button"
        className={value === "MONTHLY" ? "is-active" : ""}
        onClick={() => onChange("MONTHLY")}
        aria-pressed={value === "MONTHLY"}
      >
        Monthly
      </button>
      <button
        type="button"
        className={value === "YEARLY" ? "is-active" : ""}
        onClick={() => onChange("YEARLY")}
        aria-pressed={value === "YEARLY"}
      >
        Yearly
        <span className="billing-cycle-toggle__badge">Save 20%</span>
      </button>
    </div>
  );
}

interface PlanCardProps {
  plan: PlanDefinition;
  billingCycle: BillingCycle;
  isCurrent: boolean;
  currentRank: number;
  currentIsTrialActive: boolean;
  currentTrialEndsAt: string | null;
  isSubmitting: boolean;
  onSelect: (plan: PlanDefinition) => void;
  onCancel: () => void;
}

function PlanCard({
  plan,
  billingCycle,
  isCurrent,
  currentRank,
  currentIsTrialActive,
  currentTrialEndsAt,
  isSubmitting,
  onSelect,
  onCancel,
}: PlanCardProps) {
  const isRecommended = Boolean(plan.recommended) && !isCurrent;
  const isFree = plan.price === null;
  const cycleBilling = plan.billing;
  const displayPrice = isFree
    ? "Free"
    : billingCycle === "MONTHLY"
      ? `$${cycleBilling!.monthlyPrice.toFixed(2)}`
      : `$${cycleBilling!.yearlyPrice.toFixed(2)}`;
  const displayPeriod = isFree ? null : billingCycle === "MONTHLY" ? "/month" : "/year";

  const rank = PLAN_RANK[plan.id];
  const isUpgrade = rank > currentRank;

  const accentColor = isCurrent
    ? "var(--p-color-border-emphasis)"
    : isRecommended
      ? "var(--p-color-bg-fill-warning)"
      : "var(--p-color-border)";
  const emphasized = isCurrent || isRecommended;

  return (
    <div
      className="plan-card"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--p-color-bg-surface)",
        border: `${emphasized ? 2 : 1}px solid ${accentColor}`,
        borderRadius: "var(--p-border-radius-300)",
        boxShadow: emphasized ? "var(--p-shadow-200)" : "var(--p-shadow-100)",
        padding: "var(--p-space-500)",
      }}
    >
      <BlockStack gap="150">
        <InlineStack gap="150" wrap>
          {isCurrent ? <Badge tone="success">Current plan</Badge> : null}
          {isCurrent && currentIsTrialActive ? (
            <Badge tone="info">Trial active</Badge>
          ) : null}
          {isRecommended ? <Badge tone="attention">Most popular</Badge> : null}
          {!isFree && billingCycle === "YEARLY" ? (
            <Badge tone="magic">{`Save ${cycleBilling!.yearlyDiscountPercent}%`}</Badge>
          ) : null}
        </InlineStack>
        <Text as="h3" variant="headingMd">
          {plan.name}
        </Text>
        <InlineStack gap="100" blockAlign="baseline">
          <Text as="p" variant="heading2xl">
            {displayPrice}
          </Text>
          {displayPeriod ? (
            <Text as="span" variant="bodyMd" tone="subdued">
              {displayPeriod}
            </Text>
          ) : null}
        </InlineStack>
        <Text as="span" variant="bodySm" tone="subdued">
          {isCurrent && currentIsTrialActive && currentTrialEndsAt
            ? `Trial ends ${new Date(currentTrialEndsAt).toLocaleDateString()}`
            : plan.trialDays
              ? `${plan.trialDays}-day free trial`
              : isFree
                ? "No credit card required"
                : "Billed through Shopify · cancel anytime"}
        </Text>
      </BlockStack>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          marginTop: "var(--p-space-400)",
        }}
      >
        <Box paddingBlockEnd="400">
          <Divider />
        </Box>

        <BlockStack gap="200">
          {plan.features.map((feature) => (
            <InlineStack key={feature} gap="200" blockAlign="start" wrap={false}>
              <span style={{ flexShrink: 0 }}>
                <Icon source={CheckIcon} tone="success" />
              </span>
              <Text as="span" variant="bodySm">
                {feature}
              </Text>
            </InlineStack>
          ))}
        </BlockStack>

        {plan.overage ? (
          <div
            style={{
              marginTop: "var(--p-space-300)",
              padding: "var(--p-space-300)",
              background: "var(--p-color-bg-surface-secondary)",
              borderRadius: "var(--p-border-radius-200)",
            }}
          >
            <Text as="span" variant="bodySm" tone="subdued">
              {`+${plan.overage.products} products & +${plan.overage.variants} variants for $${plan.overage.price.toFixed(2)} per block`}
            </Text>
          </div>
        ) : null}
      </div>

      <Box paddingBlockStart="400">
        {isCurrent ? (
          isFree ? (
            <Button disabled fullWidth>
              Current Plan
            </Button>
          ) : (
            <Button
              variant="secondary"
              tone="critical"
              loading={isSubmitting}
              onClick={onCancel}
              fullWidth
            >
              Cancel plan
            </Button>
          )
        ) : (
          <Button
            variant="primary"
            loading={isSubmitting}
            onClick={() => onSelect(plan)}
            fullWidth
          >
            {isFree ? "Downgrade to Free" : isUpgrade ? "Upgrade" : "Downgrade"}
          </Button>
        )}
      </Box>
    </div>
  );
}

export default function PlansPage() {
  const {
    currentPlanId,
    billingCycle: currentBillingCycle,
    trialEndsAt,
    currentPeriodEnd,
    isTrialActive,
    usage,
    plans,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    currentBillingCycle ?? "MONTHLY",
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanDefinition | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isSubmitting = fetcher.state !== "idle";
  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const currentRank = PLAN_RANK[currentPlanId as PlanId];

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.ok) {
      setToastMessage(fetcher.data.message ?? "Updated");
      setSelectedPlan(null);
      setCancelPending(false);
    } else {
      setToastMessage(fetcher.data.error ?? "Something went wrong");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  function confirmSubscribe() {
    if (!selectedPlan) return;
    fetcher.submit(
      {
        intent: "subscribe",
        planId: selectedPlan.id,
        billingCycle: selectedPlan.price === null ? "" : billingCycle,
      },
      { method: "post" },
    );
  }

  function confirmCancel() {
    fetcher.submit({ intent: "cancel" }, { method: "post" });
  }

  return (
    <Page title="Choose the perfect plan for your store" narrowWidth={false}>
      <BlockStack gap="600">
        <Text as="p" tone="subdued">
          Scale your product feeds as your business grows. Billed securely
          through Shopify.
        </Text>

        <Box
          background="bg-surface"
          borderRadius="300"
          borderWidth="025"
          borderColor="border"
          padding="400"
        >
          <BlockStack gap="200">
            <Text as="h2" variant="headingSm" tone="subdued">
              Current plan
            </Text>
            <InlineGrid columns={{ xs: 1, sm: 4 }} gap="400">
              <BlockStack gap="050">
                <Text as="span" tone="subdued" variant="bodySm">
                  Plan
                </Text>
                <Text as="span" variant="headingMd">
                  {currentPlan?.name ?? "Free"}
                </Text>
              </BlockStack>
              <BlockStack gap="050">
                <Text as="span" tone="subdued" variant="bodySm">
                  Billing cycle
                </Text>
                <Text as="span" variant="headingMd">
                  {currentBillingCycle
                    ? currentBillingCycle === "MONTHLY"
                      ? "Monthly"
                      : "Yearly"
                    : "—"}
                </Text>
              </BlockStack>
              <BlockStack gap="050">
                <Text as="span" tone="subdued" variant="bodySm">
                  Trial status
                </Text>
                {isTrialActive && trialEndsAt ? (
                  <Badge tone="info">{`Trial ends ${new Date(trialEndsAt).toLocaleDateString()}`}</Badge>
                ) : (
                  <Text as="span" variant="headingMd" tone="subdued">
                    —
                  </Text>
                )}
              </BlockStack>
              <BlockStack gap="050">
                <Text as="span" tone="subdued" variant="bodySm">
                  Renewal date
                </Text>
                <Text as="span" variant="headingMd">
                  {currentPeriodEnd
                    ? new Date(currentPeriodEnd).toLocaleDateString()
                    : "—"}
                </Text>
              </BlockStack>
            </InlineGrid>
          </BlockStack>
        </Box>

        <Box
          position="sticky"
          insetBlockStart="0"
          zIndex="1"
          paddingBlockEnd="200"
          background="bg"
        >
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Current usage
            </Text>
            <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
              <UsageCard
                label="Products"
                used={usage.products}
                max={currentPlan?.maxProducts ?? null}
                isRefreshing={isSubmitting}
              />
              <UsageCard
                label="Variants"
                used={usage.variants}
                max={currentPlan?.maxVariants ?? null}
                isRefreshing={isSubmitting}
              />
              <UsageCard
                label="Feeds"
                used={usage.feeds}
                max={currentPlan?.maxFeeds ?? null}
                isRefreshing={isSubmitting}
              />
            </InlineGrid>
          </BlockStack>
        </Box>

        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">
              Plans
            </Text>
            <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
          </InlineStack>
          <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                isCurrent={plan.id === currentPlanId}
                currentRank={currentRank}
                currentIsTrialActive={isTrialActive}
                currentTrialEndsAt={trialEndsAt}
                isSubmitting={
                  isSubmitting &&
                  (selectedPlan?.id === plan.id ||
                    (cancelPending && plan.id === currentPlanId))
                }
                onSelect={setSelectedPlan}
                onCancel={() => {
                  setCancelPending(true);
                }}
              />
            ))}
          </InlineGrid>
          {currentRank === undefined ? null : (
            <Text as="p" tone="subdued" variant="bodySm">
              {"Choosing a lower-tier plan downgrades immediately; higher-tier plans start a new 7-day trial if you haven't used one for that plan before."}
            </Text>
          )}
        </BlockStack>
      </BlockStack>

      {selectedPlan ? (
        <Modal
          open
          onClose={() => setSelectedPlan(null)}
          title={
            PLAN_RANK[selectedPlan.id] > currentRank
              ? `Upgrade to ${selectedPlan.name}?`
              : `Downgrade to ${selectedPlan.name}?`
          }
          primaryAction={{
            content: "Confirm",
            loading: isSubmitting,
            onAction: confirmSubscribe,
          }}
          secondaryActions={[
            { content: "Cancel", onAction: () => setSelectedPlan(null) },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="200">
              <Text as="p">
                {selectedPlan.price === null
                  ? "You're about to switch to the Free plan. Your current paid subscription will be cancelled."
                  : `You're about to switch to the ${selectedPlan.name} plan at $${
                      billingCycle === "MONTHLY"
                        ? selectedPlan.billing!.monthlyPrice.toFixed(2)
                        : selectedPlan.billing!.yearlyPrice.toFixed(2)
                    }/${billingCycle === "MONTHLY" ? "month" : "year"}. You'll be redirected to Shopify to approve this charge.`}
              </Text>
              <Text as="p" tone="subdued">
                Billed and managed entirely through Shopify. You can change or
                cancel your plan at any time.
              </Text>
            </BlockStack>
          </Modal.Section>
        </Modal>
      ) : null}

      {cancelPending && !selectedPlan ? (
        <Modal
          open
          onClose={() => setCancelPending(false)}
          title="Cancel your subscription?"
          primaryAction={{
            content: "Cancel subscription",
            destructive: true,
            loading: isSubmitting,
            onAction: confirmCancel,
          }}
          secondaryActions={[
            { content: "Keep plan", onAction: () => setCancelPending(false) },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              You&apos;ll immediately move to the Free plan. Any unused portion of
              your current billing period is prorated and credited by
              Shopify.
            </Text>
          </Modal.Section>
        </Modal>
      ) : null}

      {toastMessage ? (
        <Toast content={toastMessage} onDismiss={() => setToastMessage(null)} />
      ) : null}

      <style>{`
        .plan-card {
          transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--p-shadow-300);
        }
        .billing-cycle-toggle {
          display: inline-flex;
          padding: 3px;
          background: var(--p-color-bg-surface-secondary);
          border-radius: var(--p-border-radius-200);
          gap: 2px;
        }
        .billing-cycle-toggle button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          background: transparent;
          border-radius: var(--p-border-radius-150);
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          color: var(--p-color-text-secondary);
          cursor: pointer;
          transition: background-color 150ms ease, color 150ms ease;
        }
        .billing-cycle-toggle button.is-active {
          background: var(--p-color-bg-surface);
          color: var(--p-color-text);
          box-shadow: var(--p-shadow-100);
        }
        .billing-cycle-toggle__badge {
          font-size: 11px;
          font-weight: 600;
          color: var(--p-color-text-magic, #8051ff);
        }
      `}</style>
    </Page>
  );
}
