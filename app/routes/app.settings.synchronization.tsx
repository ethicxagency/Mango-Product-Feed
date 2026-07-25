import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Form } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  Spinner,
  Text,
} from "@shopify/polaris";

import { getCurrentShop } from "~/lib/current-shop.server";
import { db } from "~/lib/db.server";
import { formatRelativeTime } from "~/lib/format";
import { isMockModeEnabled } from "~/lib/mock-mode.server";
import { authenticate } from "~/shopify.server";
import { collectionSyncService } from "~/services/shopify/collection-sync.service.server";
import { inventorySyncService } from "~/services/shopify/inventory-sync.service.server";
import { productSyncService } from "~/services/shopify/product-sync.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);

  return json({
    lastProductSyncAt: shop.lastProductSyncAt?.toISOString() ?? null,
    lastInventorySyncAt: shop.lastInventorySyncAt?.toISOString() ?? null,
    lastCollectionSyncAt: shop.lastCollectionSyncAt?.toISOString() ?? null,
    lastWebhookSyncAt: shop.lastWebhookSyncAt?.toISOString() ?? null,
    mockMode: isMockModeEnabled(),
  });
}

type SyncIntent =
  "sync-products" | "sync-collections" | "sync-inventory" | "full-sync";

/** Mock mode has no real Shopify store to query — the local catalog is
 * already the source of truth (it *is* what "synced" would mean here), so
 * these just record a successful sync moment rather than calling out. */
async function runMockSync(shopId: string, intent: SyncIntent) {
  const now = new Date();
  const data: Record<string, Date> = {};
  if (intent === "sync-products" || intent === "full-sync")
    data.lastProductSyncAt = now;
  if (intent === "sync-collections" || intent === "full-sync")
    data.lastCollectionSyncAt = now;
  if (intent === "sync-inventory" || intent === "full-sync")
    data.lastInventorySyncAt = now;

  await db.shop.update({ where: { id: shopId }, data });

  const productCount = await db.product.count({ where: { shopId } });
  const collectionCount = await db.collection.count({ where: { shopId } });
  return { productCount, collectionCount, variantCount: 0 };
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString() as SyncIntent | undefined;

  if (!intent) {
    return json({ error: "Missing sync action" }, { status: 400 });
  }

  try {
    if (isMockModeEnabled()) {
      const result = await runMockSync(shop.id, intent);
      return json({ ok: true, intent, result });
    }

    const { admin } = await authenticate.admin(request);
    let productResult: { productCount: number; variantCount: number } | null =
      null;
    let collectionResult: { collectionCount: number } | null = null;
    let inventoryResult: { variantCount: number } | null = null;

    if (intent === "sync-products" || intent === "full-sync") {
      productResult = await productSyncService.syncAll(admin, shop.id);
    }
    if (intent === "sync-collections" || intent === "full-sync") {
      collectionResult = await collectionSyncService.syncAll(admin, shop.id);
    }
    if (intent === "sync-inventory" || intent === "full-sync") {
      inventoryResult = await inventorySyncService.syncFromShopify(
        admin,
        shop.id,
      );
    }

    return json({
      ok: true,
      intent,
      result: {
        productCount: productResult?.productCount ?? null,
        variantCount:
          productResult?.variantCount ?? inventoryResult?.variantCount ?? null,
        collectionCount: collectionResult?.collectionCount ?? null,
      },
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Synchronization failed unexpectedly.",
      },
      { status: 500 },
    );
  }
}

function SyncStatusRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <BlockStack gap="050">
      <Text as="span" tone="subdued" variant="bodySm">
        {label}
      </Text>
      <Text as="span" fontWeight="medium">
        {formatRelativeTime(value)}
      </Text>
    </BlockStack>
  );
}

export default function SynchronizationSettingsPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const submittingIntent =
    navigation.state === "submitting"
      ? navigation.formData?.get("intent")?.toString()
      : null;

  const success = actionData && "ok" in actionData ? actionData : null;
  const error = actionData && "error" in actionData ? actionData.error : null;

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Synchronization
            </Text>
            <Text as="p" tone="subdued">
              {data.mockMode
                ? "Running in local mock mode — sync actions record a successful run against your local catalog."
                : "Pull the latest products, collections, and inventory from Shopify."}
            </Text>
          </BlockStack>

          {error ? <Banner tone="critical">{error}</Banner> : null}
          {success ? (
            <Banner tone="success">
              {`Sync completed${success.result.productCount !== null ? ` — ${success.result.productCount} products` : ""}${success.result.collectionCount !== null ? `, ${success.result.collectionCount} collections` : ""}${success.result.variantCount ? `, ${success.result.variantCount} variants` : ""}.`}
            </Banner>
          ) : null}

          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <SyncStatusRow
              label="Last product sync"
              value={data.lastProductSyncAt}
            />
            <SyncStatusRow
              label="Last inventory sync"
              value={data.lastInventorySyncAt}
            />
            <SyncStatusRow
              label="Last collection sync"
              value={data.lastCollectionSyncAt}
            />
            <SyncStatusRow
              label="Last webhook sync"
              value={data.lastWebhookSyncAt}
            />
          </InlineGrid>

          {submittingIntent ? (
            <InlineStack gap="200" blockAlign="center">
              <Spinner size="small" />
              <Text as="span" tone="subdued">
                Sync in progress…
              </Text>
            </InlineStack>
          ) : null}

          <InlineStack gap="200">
            <Form method="post">
              <input type="hidden" name="intent" value="sync-products" />
              <Button
                submit
                loading={submittingIntent === "sync-products"}
                disabled={!!submittingIntent}
              >
                Sync products
              </Button>
            </Form>
            <Form method="post">
              <input type="hidden" name="intent" value="sync-collections" />
              <Button
                submit
                loading={submittingIntent === "sync-collections"}
                disabled={!!submittingIntent}
              >
                Sync collections
              </Button>
            </Form>
            <Form method="post">
              <input type="hidden" name="intent" value="sync-inventory" />
              <Button
                submit
                loading={submittingIntent === "sync-inventory"}
                disabled={!!submittingIntent}
              >
                Sync inventory
              </Button>
            </Form>
            <Form method="post">
              <input type="hidden" name="intent" value="full-sync" />
              <Button
                submit
                variant="primary"
                loading={submittingIntent === "full-sync"}
                disabled={!!submittingIntent}
              >
                Full synchronization
              </Button>
            </Form>
          </InlineStack>

          <InlineStack gap="200">
            <Badge tone={data.mockMode ? "info" : "success"}>
              {data.mockMode ? "Mock mode" : "Connected"}
            </Badge>
          </InlineStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
