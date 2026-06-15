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
import { AppLayout } from "../components/AppLayout";
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
import { getAppUrl } from "../utils/product";

export async function loader({ request }: LoaderFunctionArgs) {
  const products = await listProducts();
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

export default function FeedsRoute() {
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
    <AppLayout>
      <Page
        title="Feed Generator"
        subtitle="Generate and preview XML product feeds for ad platforms"
      >
        <Layout>
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
              {FEED_TYPES.map((feedType) => (
                <Card key={feedType}>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      {FEED_LABELS[feedType]}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Public feed URL
                    </Text>
                    <TextField
                      label=""
                      labelHidden
                      value={`${appUrl}${FEED_PATHS[feedType]}`}
                      autoComplete="off"
                      readOnly
                      connectedRight={
                        <Button onClick={() => handleCopy(feedType)}>
                          {copiedFeed === feedType ? "Copied" : "Copy URL"}
                        </Button>
                      }
                    />
                    <InlineStack gap="200">
                      <Button onClick={() => setActiveFeed(feedType)}>
                        Preview XML
                      </Button>
                      <Button
                        url={`${FEED_PATHS[feedType]}`}
                        target="_blank"
                        variant="plain"
                      >
                        Open feed
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Card>
              ))}
            </InlineGrid>
          </Layout.Section>
          <Layout.Section>
            <HealthIssuesList report={health} />
          </Layout.Section>
        </Layout>
      </Page>

      {activeFeed && (
        <Modal
          open
          onClose={() => setActiveFeed(null)}
          title={`${FEED_LABELS[activeFeed]} preview`}
          primaryAction={{
            content: "Close",
            onAction: () => setActiveFeed(null),
          }}
          size="large"
        >
          <Modal.Section>
            <BlockStack gap="300">
              <Badge tone="info">{`${previews[activeFeed].length.toLocaleString()} characters`}</Badge>
              <pre
                style={{
                  maxHeight: "420px",
                  overflow: "auto",
                  background: "#f6f6f7",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {previews[activeFeed]}
              </pre>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </AppLayout>
  );
}

function InlineStack({
  gap,
  children,
}: {
  gap: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {children}
    </div>
  );
}
