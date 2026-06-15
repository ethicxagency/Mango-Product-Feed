import {
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  DataTable,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { AppLayout } from "../components/AppLayout";
import { listFeedConfigs } from "../services/feed-config.server";
import { FILTER_MODE_LABELS, SCHEDULE_LABELS, buildFeedUrl, buildTokenFeedUrl, describeSchedule } from "../types/feed";
import { FEED_LABELS, FEED_PATHS } from "../types/product";
import { getAppUrl } from "../utils/product";

export async function loader({ request }: LoaderFunctionArgs) {
  const feeds = await listFeedConfigs();
  const appUrl = getAppUrl(request);
  return { feeds, appUrl };
}

export default function FeedBuilderIndexRoute() {
  const { feeds, appUrl } = useLoaderData<typeof loader>();

  const rows = feeds.map((feed) => [
    feed.name,
    FEED_LABELS[feed.feedType],
    FILTER_MODE_LABELS[feed.filterMode],
    SCHEDULE_LABELS[feed.schedule],
    feed.isActive ? "Active" : "Inactive",
    feed.requestCount.toString(),
    `${appUrl}${FEED_PATHS[feed.feedType]}?token=${feed.token}`,
  ]);

  return (
    <AppLayout>
      <Page
        title="Feed Builder"
        subtitle="Create multiple Google, Meta, and TikTok feeds with custom filters and rules"
        primaryAction={{ content: "Create feed", url: "/feeds/builder/new" }}
      >
        <Layout>
          <Layout.Section>
            <Card padding="0">
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text", "numeric", "text"]}
                headings={[
                  "Name",
                  "Type",
                  "Selection",
                  "Schedule",
                  "Status",
                  "Requests",
                  "Secret URL",
                ]}
                rows={rows}
              />
            </Card>
          </Layout.Section>
          <Layout.Section>
            <BlockStack gap="400">
              {feeds.map((feed) => (
                <Card key={feed.id}>
                  <BlockStack gap="200">
                    <InlineRow>
                      <Text as="h3" variant="headingMd">
                        {feed.name}
                      </Text>
                      {feed.isDefault && <Badge tone="info">Default</Badge>}
                    </InlineRow>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {describeSchedule(
                        feed.schedule,
                        feed.lastGeneratedAt?.toISOString() ?? null,
                      )}
                    </Text>
                    <Text as="p" variant="bodySm">
                      Secret URL: {buildFeedUrl(appUrl, feed.feedType, feed.token, FEED_PATHS[feed.feedType])}
                    </Text>
                    <Text as="p" variant="bodySm">
                      Token URL: {buildTokenFeedUrl(appUrl, feed.token)}
                    </Text>
                    <InlineRow>
                      <Button url={`/feeds/builder/${feed.id}`}>Edit feed</Button>
                      {!feed.isDefault && (
                        <Button url={`/feeds/builder/${feed.id}`} variant="plain">
                          Manage rules ({String(feed._count.rules)})
                        </Button>
                      )}
                    </InlineRow>
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </AppLayout>
  );
}

function InlineRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>{children}</div>;
}
