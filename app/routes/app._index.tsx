import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import {
  Badge,
  BlockStack,
  Banner,
  Card,
  InlineGrid,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { HealthIssuesList } from "../components/HealthIssuesList";
import { getDashboardStats } from "../services/feed-request.server";
import { analyzeFeedHealth } from "../services/feed-health.server";
import { listProducts } from "../services/product.server";
import { getShopSyncSummary } from "../services/shop.server";
import { getEmbeddedShopContext } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { shopId, shopDomain } = await getEmbeddedShopContext(request);
  const products = await listProducts(shopId);
  const health = analyzeFeedHealth(products);
  const stats = await getDashboardStats(products.length, health.score, shopId);
  const sync = await getShopSyncSummary(shopId);

  return { stats, health, sync, shopDomain };
}

export default function EmbeddedDashboardRoute() {
  const { stats, health, sync, shopDomain } = useLoaderData<typeof loader>();

  return (
    <Page title="Dashboard" subtitle={`Mango Product Feed · ${shopDomain}`}>
      <Layout>
        <Layout.Section>
          <Banner title="Shopify connected" tone="success">
            <p>
              Products are synced from Shopify. Last sync:{" "}
              {sync?.lastSyncedAt
                ? new Date(sync.lastSyncedAt).toLocaleString()
                : "Not yet synced"}
            </p>
          </Banner>
        </Layout.Section>
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
            <StatCard label="Total Products" value={String(stats.totalProducts)} />
            <StatCard label="Total Feeds" value={String(stats.totalFeeds)} />
            <StatCard label="Feed Requests" value={String(stats.feedRequests)} />
            <StatCard
              label="Feed Health Score"
              value={`${stats.feedHealthScore}%`}
              tone={
                stats.feedHealthScore >= 80
                  ? "success"
                  : stats.feedHealthScore >= 50
                    ? "warning"
                    : "critical"
              }
            />
          </InlineGrid>
        </Layout.Section>
        <Layout.Section>
          <HealthIssuesList report={health} />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "critical";
}) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="p" variant="bodyMd" tone="subdued">
          {label}
        </Text>
        {tone ? (
          <Badge tone={tone}>{value}</Badge>
        ) : (
          <Text as="p" variant="headingLg">
            {value}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
