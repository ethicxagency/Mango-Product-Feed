import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData, useRevalidator } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Card,
  EmptyState,
  InlineGrid,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";
import type { BadgeProps } from "@shopify/polaris";
import {
  CalendarCheckIcon,
  CheckCircleIcon,
  CodeIcon,
  FileIcon,
  PlusIcon,
  ProductIcon,
  ProductUnavailableIcon,
  RefreshIcon,
  SettingsIcon,
} from "@shopify/polaris-icons";

import { DashboardStatCard } from "~/components/dashboard/DashboardStatCard";
import { ProductBreakdownCard } from "~/components/dashboard/ProductBreakdownCard";
import { QuickActionCard } from "~/components/dashboard/QuickActionCard";
import { formatDuration, formatRelativeTime } from "~/lib/format";
import { getCurrentShop } from "~/lib/current-shop.server";
import { FEED_CHANNEL_LABELS } from "~/lib/feed-channels";
import { isMockModeEnabled } from "~/lib/mock-mode.server";
import { getDashboardSummary } from "~/services/dashboard.service.server";
import { startCatalogSync } from "~/services/shopify/initial-sync.server";
import { authenticate } from "~/shopify.server";
import type { FeedChannel } from "~/types/feed";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const summary = await getDashboardSummary(shop.id);
  return json({
    summary,
    sync: { status: shop.lastSyncStatus, error: shop.lastSyncError },
  });
}

/** Retry a failed (or stalled) catalog sync. startCatalogSync claims the sync
 *  atomically, so double-clicks and concurrent retries never run it twice. */
export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const form = await request.formData();
  if (form.get("intent") !== "retry-sync") {
    return json({ ok: false, result: "unknown-intent" }, { status: 400 });
  }
  if (isMockModeEnabled()) return json({ ok: true, result: "mock" });

  const { admin } = await authenticate.admin(request);
  const result = await startCatalogSync(shop.id, admin);
  return json({ ok: true, result });
}

function SyncStatusBanner({
  status,
  error,
}: {
  status: string | null;
  error: string | null;
}) {
  const fetcher = useFetcher<typeof action>();
  const revalidator = useRevalidator();

  // While the background sync runs, poll the loader so the banner (and the
  // product counts) update on their own without a manual refresh.
  useEffect(() => {
    if (status !== "RUNNING") return;
    const id = setInterval(() => revalidator.revalidate(), 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === "RUNNING") {
    return (
      <Banner tone="info" title="Syncing your products">
        <p>
          We&apos;re importing your catalog from Shopify in the background. You
          can keep using the app — numbers update automatically as it
          progresses.
        </p>
      </Banner>
    );
  }

  if (status === "FAILED") {
    return (
      <Banner
        tone="critical"
        title="Product sync failed"
        action={{
          content: "Retry sync",
          loading: fetcher.state !== "idle",
          onAction: () =>
            fetcher.submit({ intent: "retry-sync" }, { method: "post" }),
        }}
      >
        <p>
          {error ?? "Something went wrong while importing your products."} No
          product data was lost — retrying picks up where it left off.
        </p>
      </Banner>
    );
  }

  return null;
}

const HISTORY_STATUS_TONE: Record<string, BadgeProps["tone"]> = {
  SUCCESS: "success",
  RUNNING: "info",
  PARTIAL: "warning",
  FAILED: "critical",
};

export default function Dashboard() {
  const { summary, sync } = useLoaderData<typeof loader>();
  const feedStatusTone = summary.lastGenerationStatus
    ? HISTORY_STATUS_TONE[summary.lastGenerationStatus]
    : undefined;

  return (
    <Page
      title="Dashboard"
      subtitle="Manage your product feeds across multiple channels."
    >
      <BlockStack gap="600">
        <SyncStatusBanner status={sync.status} error={sync.error} />
        <BlockStack gap="300">
          <Text as="h2" variant="headingSm" tone="subdued">
            Overview
          </Text>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <DashboardStatCard
              label="Total Products"
              value={summary.productCounts.total.toLocaleString()}
              icon={ProductIcon}
            />
            <DashboardStatCard
              label="Active Products"
              value={summary.productCounts.active.toLocaleString()}
              icon={CheckCircleIcon}
              tone="success"
            />
            <DashboardStatCard
              label="Draft Products"
              value={summary.productCounts.draft.toLocaleString()}
              icon={FileIcon}
              tone="warning"
            />
            <DashboardStatCard
              label="Archived Products"
              value={summary.productCounts.archived.toLocaleString()}
              icon={ProductUnavailableIcon}
            />
          </InlineGrid>
        </BlockStack>

        <BlockStack gap="300">
          <Text as="h2" variant="headingSm" tone="subdued">
            Feed performance
          </Text>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <DashboardStatCard
              label="Feed Count"
              value={summary.feedCount.toLocaleString()}
              icon={FileIcon}
            />
            <DashboardStatCard
              label="Latest Feed"
              value={summary.latestFeedName ?? "—"}
              icon={CodeIcon}
            />
            <DashboardStatCard
              label="Last Generated"
              value={formatRelativeTime(summary.lastGeneratedAt)}
              icon={CalendarCheckIcon}
            />
            <Card padding="400">
              <BlockStack gap="300">
                <Text as="span" tone="subdued" variant="bodySm" fontWeight="medium">
                  Feed Status
                </Text>
                {summary.lastGenerationStatus ? (
                  <Box>
                    <Badge tone={feedStatusTone} size="large">
                      {summary.lastGenerationStatus}
                    </Badge>
                  </Box>
                ) : (
                  <Text as="span" variant="heading2xl" tone="subdued">
                    —
                  </Text>
                )}
              </BlockStack>
            </Card>
          </InlineGrid>
        </BlockStack>

        <BlockStack gap="300">
          <Text as="h2" variant="headingSm" tone="subdued">
            Quick actions
          </Text>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <QuickActionCard
              icon={PlusIcon}
              title="Create Feed"
              description="Set up a new product feed."
              url="/app/feeds/new"
            />
            <QuickActionCard
              icon={RefreshIcon}
              title="Generate Feed"
              description="Run generation on an existing feed."
              url="/app/feeds"
            />
            <QuickActionCard
              icon={CodeIcon}
              title="View XML"
              description="Preview a feed's XML output."
              url="/app/feeds"
            />
            <QuickActionCard
              icon={SettingsIcon}
              title="Feed Settings"
              description="Configure platform defaults."
              url="/app/settings/feed-defaults"
            />
          </InlineGrid>
        </BlockStack>

        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <ProductBreakdownCard counts={summary.productCounts} />

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Recent Activity
              </Text>

              {summary.recentActivity.length === 0 ? (
                <EmptyState
                  heading="No feed generated yet"
                  action={{ content: "Generate Feed", url: "/app/feeds/new" }}
                  image=""
                >
                  <p>Create your first product feed to get started.</p>
                </EmptyState>
              ) : (
                <BlockStack gap="300">
                  {summary.recentActivity.map((activity) => (
                    <BlockStack key={activity.id} gap="100">
                      <InlineGrid columns={{ xs: 1, sm: "1fr auto" }} gap="200">
                        <Text as="span">
                          <Text as="span" fontWeight="semibold">
                            {activity.feedName}
                          </Text>{" "}
                          ·{" "}
                          {FEED_CHANNEL_LABELS[
                            activity.channel as FeedChannel
                          ] ?? activity.channel}{" "}
                          · {activity.productCount.toLocaleString()} products ·{" "}
                          {formatDuration(activity.durationMs)}
                        </Text>
                        <InlineStack align="end">
                          <Badge tone={HISTORY_STATUS_TONE[activity.status]}>
                            {activity.status}
                          </Badge>
                        </InlineStack>
                      </InlineGrid>
                      <Text as="span" tone="subdued" variant="bodySm">
                        {formatRelativeTime(activity.startedAt)}
                      </Text>
                    </BlockStack>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}
