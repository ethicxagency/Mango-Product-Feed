import { Badge, BlockStack, Card, DataTable, Text } from "@shopify/polaris";
import type { FeedLogRow } from "../types/feed";
import { FEED_LABELS } from "../types/product";

interface FeedLogsTableProps {
  logs: FeedLogRow[];
}

export function FeedLogsTable({ logs }: FeedLogsTableProps) {
  const rows = logs.map((log) => [
    new Date(log.createdAt).toLocaleString(),
    log.feedName,
    FEED_LABELS[log.feedType],
    log.status,
    `${log.responseTimeMs} ms`,
    String(log.productCount),
    log.isDownload ? "Download" : "Request",
  ]);

  return (
    <Card padding="0">
      {rows.length > 0 ? (
        <DataTable
          columnContentTypes={[
            "text",
            "text",
            "text",
            "text",
            "numeric",
            "numeric",
            "text",
          ]}
          headings={[
            "Request time",
            "Feed name",
            "Type",
            "Status",
            "Response time",
            "Products",
            "Usage",
          ]}
          rows={rows}
        />
      ) : (
        <BlockStack gap="200">
          <Text as="p" variant="bodyMd">
            No feed logs yet. Request a feed URL to start tracking analytics.
          </Text>
        </BlockStack>
      )}
    </Card>
  );
}

export function FeedAnalyticsCards({
  totalRequests,
  totalDownloads,
  totalFeeds,
  activeFeeds,
}: {
  totalRequests: number;
  totalDownloads: number;
  totalFeeds: number;
  activeFeeds: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "16px",
      }}
    >
      <MetricCard label="Feed requests" value={String(totalRequests)} />
      <MetricCard label="Feed downloads" value={String(totalDownloads)} />
      <MetricCard label="Total feeds" value={String(totalFeeds)} />
      <MetricCard label="Active feeds" value={String(activeFeeds)} tone="success" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="p" variant="bodyMd" tone="subdued">
          {label}
        </Text>
        {tone ? <Badge tone={tone}>{value}</Badge> : <Text as="p" variant="headingLg">{value}</Text>}
      </BlockStack>
    </Card>
  );
}
