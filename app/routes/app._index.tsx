import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Card,
  EmptyState,
  InlineGrid,
  Page,
  Text,
} from "@shopify/polaris";
import type { BadgeProps } from "@shopify/polaris";

import { formatDuration, formatRelativeTime } from "~/lib/format";
import { getCurrentShop } from "~/lib/current-shop.server";
import { FEED_CHANNEL_LABELS } from "~/lib/feed-channels";
import { getDashboardSummary } from "~/services/dashboard.service.server";
import type { FeedChannel } from "~/types/feed";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const summary = await getDashboardSummary(shop.id);
  return json({ summary });
}

const HISTORY_STATUS_TONE: Record<string, BadgeProps["tone"]> = {
  SUCCESS: "success",
  RUNNING: "info",
  PARTIAL: "warning",
  FAILED: "critical",
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <BlockStack gap="100">
        <Text as="span" tone="subdued" variant="bodySm">
          {label}
        </Text>
        <Text as="span" variant="headingLg">
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}

export default function Dashboard() {
  const { summary } = useLoaderData<typeof loader>();

  return (
    <Page title="Dashboard">
      <BlockStack gap="400">
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <StatCard
            label="Total Products"
            value={summary.productCounts.total.toLocaleString()}
          />
          <StatCard
            label="Active Products"
            value={summary.productCounts.active.toLocaleString()}
          />
          <StatCard
            label="Draft Products"
            value={summary.productCounts.draft.toLocaleString()}
          />
          <StatCard
            label="Archived Products"
            value={summary.productCounts.archived.toLocaleString()}
          />
        </InlineGrid>

        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <StatCard
            label="Feed Count"
            value={summary.feedCount.toLocaleString()}
          />
          <StatCard label="Latest Feed" value={summary.latestFeedName ?? "—"} />
          <StatCard
            label="Last Generated"
            value={formatRelativeTime(summary.lastGeneratedAt)}
          />
          <StatCard
            label="Feed Status"
            value={summary.lastGenerationStatus ?? "—"}
          />
        </InlineGrid>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Recent Activity
            </Text>

            {summary.recentActivity.length === 0 ? (
              <EmptyState heading="No feed activity yet" image="">
                <p>Generate a feed to see its history show up here.</p>
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
                        {FEED_CHANNEL_LABELS[activity.channel as FeedChannel] ??
                          activity.channel}{" "}
                        · {activity.productCount.toLocaleString()} products ·{" "}
                        {formatDuration(activity.durationMs)}
                      </Text>
                      <Badge tone={HISTORY_STATUS_TONE[activity.status]}>
                        {activity.status}
                      </Badge>
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
      </BlockStack>
    </Page>
  );
}
