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
import type { PlanDefinition } from "~/lib/plans";
import { PLANS, usagePercent, usageTone, usageWarning } from "~/lib/plans";
import { billingService } from "~/services/billing.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const summary = await billingService.getSummary(shop.id, shop.planName);

  return json({
    currentPlanId: summary.plan.id,
    usage: summary.usage,
    plans: PLANS,
  });
}

interface UpgradeActionResult {
  ok: boolean;
  planId: string | null;
  planName: string | null;
  error: string | null;
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const planId = formData.get("planId")?.toString();

  if (!planId) {
    return json<UpgradeActionResult>(
      { ok: false, planId: null, planName: null, error: "Missing planId" },
      { status: 400 },
    );
  }

  try {
    const plan = await billingService.upgradePlan(shop.id, planId);
    return json<UpgradeActionResult>({
      ok: true,
      planId: plan.id,
      planName: plan.name,
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Response
        ? await error.text()
        : error instanceof Error
          ? error.message
          : "Upgrade failed";
    return json<UpgradeActionResult>(
      {
        ok: false,
        planId: null,
        planName: null,
        error: message || "Upgrade failed",
      },
      { status: 500 },
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
                <Text
                  as="span"
                  variant="bodySm"
                  fontWeight="medium"
                  tone="subdued"
                >
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
              <Text
                as="span"
                variant="bodySm"
                tone={percent >= 100 ? "critical" : "caution"}
              >
                {warning}
              </Text>
            ) : null}
          </>
        )}
      </BlockStack>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  isSubmitting,
  onUpgrade,
}: {
  plan: PlanDefinition;
  isCurrent: boolean;
  isSubmitting: boolean;
  onUpgrade: (plan: PlanDefinition) => void;
}) {
  const isRecommended = Boolean(plan.recommended) && !isCurrent;
  const [amount, period] = plan.priceLabel.includes("/")
    ? plan.priceLabel.split("/")
    : [plan.priceLabel, null];

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
        <div style={{ minHeight: 22 }}>
          {isCurrent ? (
            <Badge tone="success">Current plan</Badge>
          ) : isRecommended ? (
            <Badge tone="attention">Most popular</Badge>
          ) : null}
        </div>
        <Text as="h3" variant="headingMd">
          {plan.name}
        </Text>
        <InlineStack gap="100" blockAlign="baseline">
          <Text as="p" variant="heading2xl">
            {amount}
          </Text>
          {period ? (
            <Text as="span" variant="bodyMd" tone="subdued">
              {`/${period}`}
            </Text>
          ) : null}
        </InlineStack>
        <Text as="span" variant="bodySm" tone="subdued">
          {plan.trialDays
            ? `${plan.trialDays}-day free trial`
            : plan.price === null
              ? "No credit card required"
              : "Billed monthly · cancel anytime"}
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
            <InlineStack
              key={feature}
              gap="200"
              blockAlign="start"
              wrap={false}
            >
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
        <Button
          variant={isCurrent ? "secondary" : "primary"}
          disabled={isCurrent}
          loading={isSubmitting}
          onClick={() => onUpgrade(plan)}
          fullWidth
        >
          {isCurrent ? "Current Plan" : "Upgrade Plan"}
        </Button>
      </Box>
    </div>
  );
}

export default function PlansPage() {
  const { currentPlanId, usage, plans } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [selectedPlan, setSelectedPlan] = useState<PlanDefinition | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isSubmitting = fetcher.state !== "idle";
  const currentPlan = plans.find((p) => p.id === currentPlanId);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.ok) {
      setToastMessage(`Upgraded to the ${fetcher.data.planName} plan`);
      setSelectedPlan(null);
    } else {
      setToastMessage(fetcher.data.error ?? "Upgrade failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  function confirmUpgrade() {
    if (!selectedPlan) return;
    fetcher.submit({ planId: selectedPlan.id }, { method: "post" });
  }

  return (
    <Page title="Choose the perfect plan for your store" narrowWidth={false}>
      <BlockStack gap="600">
        <Text as="p" tone="subdued">
          Scale your product feeds as your business grows.
        </Text>

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
          <Text as="h2" variant="headingMd">
            Plans
          </Text>
          <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={plan.id === currentPlanId}
                isSubmitting={isSubmitting && selectedPlan?.id === plan.id}
                onUpgrade={setSelectedPlan}
              />
            ))}
          </InlineGrid>
        </BlockStack>
      </BlockStack>

      {selectedPlan ? (
        <Modal
          open
          onClose={() => setSelectedPlan(null)}
          title={`Upgrade to ${selectedPlan.name}?`}
          primaryAction={{
            content: "Confirm upgrade",
            loading: isSubmitting,
            onAction: confirmUpgrade,
          }}
          secondaryActions={[
            { content: "Cancel", onAction: () => setSelectedPlan(null) },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="200">
              <Text as="p">
                {`You're about to switch to the ${selectedPlan.name} plan at ${selectedPlan.priceLabel}.`}
              </Text>
              <Text as="p" tone="subdued">
                Billed through Shopify. You can change plans at any time.
              </Text>
            </BlockStack>
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
      `}</style>
    </Page>
  );
}
