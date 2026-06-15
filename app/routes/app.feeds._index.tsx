import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  InlineGrid,
  Layout,
  Modal,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { useCallback, useState } from "react";
import { HealthIssuesList } from "../components/HealthIssuesList";
import { previewFeed } from "../services/feed-generator.server";
import { analyzeFeedHealth } from "../services/feed-health.server";
import { listProducts } from "../services/product.server";
import {
  FEED_LABELS,
  FEED_PATHS,
  FEED_TYPES,
  type FeedType,
} from "../types/product";
import { buildFeedUrl } from "../types/feed";
import { getAppUrl } from "../utils/product";
import { getEmbeddedShopContext } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { shopId } = await getEmbeddedShopContext(request);
  const products = await listProducts(shopId);
  const health = analyzeFeedHealth(products);
  const appUrl = getAppUrl(request);

  const previews = Object.fromEntries(
    await Promise.all(
      FEED_TYPES.map(async (feedType) => [
        feedType,
        await previewFeed(feedType),
      ]),
    ),
  ) as Record<FeedType, string>;

  return { health, appUrl, previews };
}

export default function EmbeddedFeedsRoute() {
  const { health, appUrl, previews } = useLoaderData<typeof loader>();
  const [activeFeed, setActiveFeed] = useState<FeedType | null>(null);
  const [copiedFeed, setCopiedFeed] = useState<FeedType | null>(null);

  const handleCopy = useCallback(async (feedType: FeedType) => {
    const url = `${appUrl}${FEED_PATHS[feedType]}`;
    await navigator.clipboard.writeText(url);
    setCopiedFeed(feedType);
    setTimeout(() => setCopiedFeed(null), 2000);
  }, [appUrl]);

  return (
    <Page title="Feed Generator" subtitle="Public XML feeds for ad platforms">
      <Layout>
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
            {FEED_TYPES.map((feedType) => (
              <Card key={feedType}>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    {FEED_LABELS[feedType]}
                  </Text>
                  <TextField
                    label="Feed URL"
                    value={`${appUrl}${FEED_PATHS[feedType]}`}
                    autoComplete="off"
                    readOnly
                    connectedRight={
                      <Button onClick={() => handleCopy(feedType)}>
                        {copiedFeed === feedType ? "Copied" : "Copy"}
                      </Button>
                    }
                  />
                  <Text as="p" variant="bodySm" tone="subdued">
                    Secret URL example: {buildFeedUrl(appUrl, feedType, "your-token", FEED_PATHS[feedType])}
                  </Text>
                  <Button onClick={() => setActiveFeed(feedType)}>Preview XML</Button>
                </BlockStack>
              </Card>
            ))}
          </InlineGrid>
        </Layout.Section>
        <Layout.Section>
          <HealthIssuesList report={health} />
        </Layout.Section>
      </Layout>

      {activeFeed && (
        <Modal
          open
          onClose={() => setActiveFeed(null)}
          title={`${FEED_LABELS[activeFeed]} preview`}
          primaryAction={{ content: "Close", onAction: () => setActiveFeed(null) }}
          size="large"
        >
          <Modal.Section>
            <pre style={{ maxHeight: "420px", overflow: "auto", whiteSpace: "pre-wrap" }}>
              {previews[activeFeed].slice(0, 8000)}
            </pre>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
