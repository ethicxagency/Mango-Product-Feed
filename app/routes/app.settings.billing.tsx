import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  EmptyState,
  InlineGrid,
  InlineStack,
  Text,
} from "@shopify/polaris";

import { getCurrentShop } from "~/lib/current-shop.server";
import { db } from "~/lib/db.server";
import { subscriptionService } from "~/services/subscription.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const [current, productsUsed, feedsUsed] = await Promise.all([
    subscriptionService.getCurrentPlan(shop.id),
    db.product.count({ where: { shopId: shop.id, deletedAt: null } }),
    db.feed.count({ where: { shopId: shop.id } }),
  ]);

  return json({
    planName: current.plan.name,
    billingCycle: current.billingCycle,
    isTrialActive: current.isTrialActive,
    trialEndsAt: current.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: current.currentPeriodEnd?.toISOString() ?? null,
    productsUsed,
    feedsUsed,
  });
}

export default function BillingSettingsPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                Current plan
              </Text>
              <Text as="p" tone="subdued">
                Billing is managed entirely through Shopify.
              </Text>
            </BlockStack>
            <InlineStack gap="150">
              {data.isTrialActive && data.trialEndsAt ? (
                <Badge tone="info">{`Trial ends ${new Date(data.trialEndsAt).toLocaleDateString()}`}</Badge>
              ) : null}
              <Badge tone="success">{data.planName}</Badge>
            </InlineStack>
          </InlineStack>

          <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
            <BlockStack gap="050">
              <Text as="span" tone="subdued" variant="bodySm">
                Billing cycle
              </Text>
              <Text as="span" variant="headingSm">
                {data.billingCycle
                  ? data.billingCycle === "MONTHLY"
                    ? "Monthly"
                    : "Yearly"
                  : "—"}
              </Text>
            </BlockStack>
            <BlockStack gap="050">
              <Text as="span" tone="subdued" variant="bodySm">
                Renewal date
              </Text>
              <Text as="span" variant="headingSm">
                {data.currentPeriodEnd
                  ? new Date(data.currentPeriodEnd).toLocaleDateString()
                  : "—"}
              </Text>
            </BlockStack>
          </InlineGrid>

          <Button url="/app/plans">Manage plan</Button>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Usage
          </Text>
          <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
            <BlockStack gap="050">
              <Text as="span" tone="subdued" variant="bodySm">
                Products used
              </Text>
              <Text as="span" variant="headingLg">
                {data.productsUsed.toLocaleString()}
              </Text>
            </BlockStack>
            <BlockStack gap="050">
              <Text as="span" tone="subdued" variant="bodySm">
                Feeds used
              </Text>
              <Text as="span" variant="headingLg">
                {data.feedsUsed.toLocaleString()}
              </Text>
            </BlockStack>
          </InlineGrid>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Billing history
          </Text>
          <EmptyState heading="No invoices yet" image="">
            <p>
              Invoices are managed by Shopify and will appear in your{" "}
              <Link to="/app/plans">Shopify billing settings</Link> once a
              paid plan is active.
            </p>
          </EmptyState>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
