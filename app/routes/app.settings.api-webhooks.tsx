import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  IndexTable,
  InlineStack,
  Text,
} from "@shopify/polaris";

import { getCurrentShop } from "~/lib/current-shop.server";
import { isMockModeEnabled } from "~/lib/mock-mode.server";
import { WEBHOOK_SUBSCRIPTIONS_QUERY } from "~/services/shopify/graphql/webhook-query";
import type { WebhookSubscriptionsQueryResponse } from "~/services/shopify/graphql/webhook-query";
import {
  apiVersion,
  authenticate,
  registerWebhooks,
  WEBHOOK_TOPICS,
} from "~/shopify.server";

interface WebhookRow {
  topic: string;
  callbackUrl: string;
  registered: boolean;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const expectedTopics = Object.entries(WEBHOOK_TOPICS).map(
    ([topic, callbackUrl]) => ({
      topic,
      callbackUrl,
    }),
  );

  if (isMockModeEnabled()) {
    return json({
      mockMode: true,
      apiVersion,
      webhooks: expectedTopics.map((t): WebhookRow => ({
        ...t,
        registered: false,
      })),
      healthy: false,
    });
  }

  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(WEBHOOK_SUBSCRIPTIONS_QUERY);
  const body = (await response.json()) as WebhookSubscriptionsQueryResponse;
  const registeredTopics = new Set(
    body.data.webhookSubscriptions.edges.map((e) => e.node.topic),
  );

  const webhooks = expectedTopics.map((t): WebhookRow => ({
    ...t,
    registered: registeredTopics.has(t.topic),
  }));

  return json({
    mockMode: false,
    apiVersion,
    webhooks,
    healthy: webhooks.every((w) => w.registered),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);

  if (isMockModeEnabled()) {
    return json({
      ok: true,
      message:
        "Mock mode has no real Shopify session to register webhooks against.",
    });
  }

  const { session } = await authenticate.admin(request);
  await registerWebhooks({ session });

  return json({
    ok: true,
    message: `Webhooks re-registered for ${shop.shopifyDomain}.`,
  });
}

const TOPIC_LABELS: Record<string, string> = {
  PRODUCTS_CREATE: "products/create",
  PRODUCTS_UPDATE: "products/update",
  PRODUCTS_DELETE: "products/delete",
  COLLECTIONS_CREATE: "collections/create",
  COLLECTIONS_UPDATE: "collections/update",
  COLLECTIONS_DELETE: "collections/delete",
  APP_UNINSTALLED: "app/uninstalled",
  APP_SUBSCRIPTIONS_UPDATE: "app_subscriptions/update",
  CUSTOMERS_DATA_REQUEST: "customers/data_request",
  CUSTOMERS_REDACT: "customers/redact",
  SHOP_REDACT: "shop/redact",
};

export default function ApiWebhooksSettingsPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              API & Webhooks
            </Text>
            <Text as="p" tone="subdued">
              {data.mockMode
                ? "Running in local mock mode — no real Shopify session to inspect."
                : "Webhook subscriptions currently registered with Shopify."}
            </Text>
          </BlockStack>
          <Form method="post">
            <Button submit loading={isSubmitting}>
              Re-register webhooks
            </Button>
          </Form>
        </InlineStack>

        {actionData && "message" in actionData ? (
          <Banner tone={data.mockMode ? "info" : "success"}>
            {actionData.message}
          </Banner>
        ) : null}

        <InlineStack gap="200">
          <Text as="span" tone="subdued">
            API version: {data.apiVersion}
          </Text>
          <Badge tone={data.healthy ? "success" : "warning"}>
            {data.healthy
              ? "Healthy"
              : data.mockMode
                ? "Not connected"
                : "Attention needed"}
          </Badge>
        </InlineStack>

        <IndexTable
          itemCount={data.webhooks.length}
          selectable={false}
          headings={[
            { title: "Topic" },
            { title: "Callback URL" },
            { title: "Status" },
          ]}
        >
          {data.webhooks.map((webhook, index) => (
            <IndexTable.Row
              id={webhook.topic}
              key={webhook.topic}
              position={index}
            >
              <IndexTable.Cell>
                <Text as="span" fontWeight="medium">
                  {TOPIC_LABELS[webhook.topic] ?? webhook.topic}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="span" tone="subdued">
                  {webhook.callbackUrl}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Badge tone={webhook.registered ? "success" : "critical"}>
                  {webhook.registered ? "Registered" : "Not registered"}
                </Badge>
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </BlockStack>
    </Card>
  );
}
