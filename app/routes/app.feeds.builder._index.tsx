import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { BlockStack, Button, Card, DataTable, Layout, Page, Text } from "@shopify/polaris";
import { listFeedConfigs } from "../services/feed-config.server";
import { describeSchedule, FILTER_MODE_LABELS, SCHEDULE_LABELS, buildFeedUrl, buildTokenFeedUrl } from "../types/feed";
import { FEED_LABELS, FEED_PATHS } from "../types/product";
import { getAppUrl } from "../utils/product";
import { getEmbeddedShopContext } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { shopId } = await getEmbeddedShopContext(request);
  const feeds = await listFeedConfigs(undefined, shopId);
  return { feeds, appUrl: getAppUrl(request) };
}

export default function EmbeddedFeedBuilderRoute() {
  const { feeds, appUrl } = useLoaderData<typeof loader>();
  const rows = feeds.map((feed) => [
    feed.name,
    FEED_LABELS[feed.feedType],
    FILTER_MODE_LABELS[feed.filterMode],
    SCHEDULE_LABELS[feed.schedule],
    buildFeedUrl(appUrl, feed.feedType, feed.token, FEED_PATHS[feed.feedType]),
  ]);

  return (
    <Page
      title="Feed Builder"
      subtitle="Multiple Google, Meta, and TikTok feeds per shop"
      primaryAction={{ content: "Create feed", url: "/feeds/builder/new" }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <DataTable
              columnContentTypes={["text", "text", "text", "text", "text"]}
              headings={["Name", "Type", "Selection", "Schedule", "Secret URL"]}
              rows={rows}
            />
          </Card>
        </Layout.Section>
        <Layout.Section>
          <BlockStack gap="300">
            {feeds.map((feed) => (
              <Card key={feed.id}>
                <BlockStack gap="100">
                  <Text as="h3" variant="headingMd">{feed.name}</Text>
                  <Text as="p" variant="bodySm">{describeSchedule(feed.schedule, feed.lastGeneratedAt?.toISOString() ?? null)}</Text>
                  <Text as="p" variant="bodySm">Token URL: {buildTokenFeedUrl(appUrl, feed.token)}</Text>
                  <Button url={`/feeds/builder/${feed.id}`}>Edit feed</Button>
                </BlockStack>
              </Card>
            ))}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
