import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const [productsUsed, feedsUsed] = await Promise.all([
    db.product.count({ where: { shopId: shop.id, deletedAt: null } }),
    db.feed.count({ where: { shopId: shop.id } }),
  ]);

  return json({
    planName: shop.planName,
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
                Billing is managed through Shopify.
              </Text>
            </BlockStack>
            <Badge tone="info">{data.planName}</Badge>
          </InlineStack>

          <Button disabled>Upgrade plan</Button>
          <Text as="p" tone="subdued" variant="bodySm">
            Paid plans aren&apos;t available yet — this app is currently free
            while in local development.
          </Text>
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
              Invoices will appear here once billing is enabled for your plan.
            </p>
          </EmptyState>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
