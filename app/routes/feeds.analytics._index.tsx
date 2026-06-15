import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import {
  BlockStack,
  Card,
  DataTable,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { AppLayout } from "../components/AppLayout";
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

export default function FeedAnalyticsRoute() {
  const { summary, byType } = useLoaderData<typeof loader>();

  const usageRows = summary.feedUsage.map((feed) => [
    feed.feedName,
    FEED_LABELS[feed.feedType],
    String(feed.requestCount),
    String(feed.downloadCount),
    feed.lastAccessedAt ? new Date(feed.lastAccessedAt).toLocaleString() : "Never",
    feed.lastGeneratedAt ? new Date(feed.lastGeneratedAt).toLocaleString() : "Never",
  ]);

  const activityRows = summary.recentActivity.map((item) => [
    new Date(item.createdAt).toLocaleString(),
    item.feedName,
    FEED_LABELS[item.feedType],
    item.status,
    `${item.responseTimeMs} ms`,
    item.isDownload ? "Download" : "Request",
  ]);

  return (
    <AppLayout>
      <Page title="Feed Analytics" subtitle="Track feed requests, downloads, and usage">
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
              <BlockStack gap="200">
                <div style={{ padding: "16px" }}>
                  <Text as="h2" variant="headingMd">
                    Feed usage
                  </Text>
                </div>
                <DataTable
                  columnContentTypes={["text", "text", "numeric", "numeric", "text", "text"]}
                  headings={[
                    "Feed",
                    "Type",
                    "Requests",
                    "Downloads",
                    "Last access",
                    "Last generated",
                  ]}
                  rows={usageRows}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <Card padding="0">
              <BlockStack gap="200">
                <div style={{ padding: "16px" }}>
                  <Text as="h2" variant="headingMd">
                    Recent activity
                  </Text>
                </div>
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "numeric", "text"]}
                  headings={["Time", "Feed", "Type", "Status", "Response", "Usage"]}
                  rows={activityRows}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Average response time by platform
                </Text>
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
    </AppLayout>
  );
}
