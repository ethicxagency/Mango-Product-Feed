import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { BlockStack, Card, DataTable, Layout, Page, Text } from "@shopify/polaris";
import { FeedAnalyticsCards } from "../components/FeedLogsTable";
import { getFeedAnalyticsByType, getFeedAnalyticsSummary } from "../services/feed-analytics.server";
import { FEED_LABELS } from "../types/product";

export async function loader(_args: LoaderFunctionArgs) {
  const [summary, byType] = await Promise.all([
    getFeedAnalyticsSummary(),
    getFeedAnalyticsByType(),
  ]);
  return { summary, byType };
}

export default function EmbeddedFeedAnalyticsRoute() {
  const { summary, byType } = useLoaderData<typeof loader>();
  const usageRows = summary.feedUsage.map((feed) => [
    feed.feedName,
    FEED_LABELS[feed.feedType],
    String(feed.requestCount),
    String(feed.downloadCount),
    feed.lastAccessedAt ? new Date(feed.lastAccessedAt).toLocaleString() : "Never",
  ]);

  return (
    <Page title="Feed Analytics" subtitle="Requests, downloads, and feed usage">
      <Layout>
        <Layout.Section>
          <FeedAnalyticsCards
            totalRequests={summary.totalRequests}
            totalDownloads={summary.totalDownloads}
            totalFeeds={summary.totalFeeds}
            activeFeeds={summary.activeFeeds}
          />
        </Layout.Section>
        <Layout.Section>
          <Card padding="0">
            <DataTable
              columnContentTypes={["text", "text", "numeric", "numeric", "text"]}
              headings={["Feed", "Type", "Requests", "Downloads", "Last access"]}
              rows={usageRows}
            />
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              {byType.map((row) => (
                <Text as="p" key={row.feedType} variant="bodyMd">
                  {FEED_LABELS[row.feedType]}: {row.requests} requests, avg {row.avgResponseTimeMs} ms
                </Text>
              ))}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
