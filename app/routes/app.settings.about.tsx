import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { BlockStack, Card, InlineGrid, Text } from "@shopify/polaris";

import { getAppVersion, getDatabaseVersion } from "~/lib/app-info.server";
import { getCurrentShop } from "~/lib/current-shop.server";
import { apiVersion } from "~/shopify.server";
import { settingsService } from "~/services/settings.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const settings = await settingsService.getSettings(shop.id);

  return json({
    appVersion: getAppVersion(),
    databaseVersion: getDatabaseVersion(),
    shopifyApiVersion: apiVersion,
    supportEmail: settings.supportEmail || shop.email,
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

export default function AboutSettingsPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Mango Product Feed
          </Text>
          <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
            <InfoRow label="App version" value={data.appVersion} />
            <InfoRow label="Database version" value={data.databaseVersion} />
            <InfoRow
              label="Shopify API version"
              value={data.shopifyApiVersion}
            />
            <InfoRow
              label="Support email"
              value={data.supportEmail || "Not set"}
            />
          </InlineGrid>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Resources
          </Text>
          <Text as="p" tone="subdued">
            Documentation, privacy policy, terms of service, and release notes
            links haven&apos;t been configured yet for this app listing — add
            them in the Partner Dashboard before submitting to the Shopify App
            Store.
          </Text>
          <BlockStack gap="100">
            <Text as="span" tone="subdued">
              Documentation — not configured
            </Text>
            <Text as="span" tone="subdued">
              Privacy policy — not configured
            </Text>
            <Text as="span" tone="subdued">
              Terms of service — not configured
            </Text>
            <Text as="span" tone="subdued">
              Release notes — not configured
            </Text>
          </BlockStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
