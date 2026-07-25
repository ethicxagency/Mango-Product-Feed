import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { BlockStack, Card, InlineGrid, Text } from "@shopify/polaris";

import { getAppVersion } from "~/lib/app-info.server";
import { getCurrentShop } from "~/lib/current-shop.server";
import { formatRelativeTime } from "~/lib/format";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);

  return json({
    shopifyStoreName: shop.name,
    shopDomain: shop.shopifyDomain,
    shopifyPlan: shop.planName,
    storeOwner: shop.shopOwnerName || "—",
    primaryDomain: shop.primaryDomain || shop.shopifyDomain,
    connectedSince:
      shop.installedAt?.toISOString() ?? shop.createdAt.toISOString(),
    lastSynchronization: shop.lastProductSyncAt?.toISOString() ?? null,
    appVersion: getAppVersion(),
  });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <BlockStack gap="050">
      <Text as="span" tone="subdued" variant="bodySm">
        {label}
      </Text>
      <Text as="span" fontWeight="medium">
        {value}
      </Text>
    </BlockStack>
  );
}

export default function StoreInformationSettingsPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Store Information
          </Text>
          <Text as="p" tone="subdued">
            Read-only details about your connected Shopify store.
          </Text>
        </BlockStack>

        <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
          <InfoRow label="Shopify store name" value={data.shopifyStoreName} />
          <InfoRow label="Shop domain" value={data.shopDomain} />
          <InfoRow label="Shopify plan" value={data.shopifyPlan} />
          <InfoRow label="Store owner" value={data.storeOwner} />
          <InfoRow label="Primary domain" value={data.primaryDomain} />
          <InfoRow
            label="Connected since"
            value={new Date(data.connectedSince).toLocaleDateString()}
          />
          <InfoRow label="App version" value={data.appVersion} />
          <InfoRow
            label="Last synchronization"
            value={formatRelativeTime(data.lastSynchronization)}
          />
        </InlineGrid>
      </BlockStack>
    </Card>
  );
}
