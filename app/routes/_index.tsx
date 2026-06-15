import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import {
  Badge,
  BlockStack,
  Card,
  InlineGrid,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { AppLayout } from "../components/AppLayout";
import { HealthIssuesList } from "../components/HealthIssuesList";
import { getDashboardStats } from "../services/feed-request.server";
import { analyzeFeedHealth } from "../services/feed-health.server";
import { listProducts } from "../services/product.server";

export async function loader(_args: LoaderFunctionArgs) {
  const products = await listProducts();
  const health = analyzeFeedHealth(products);
  const stats = await getDashboardStats(products.length, health.score);

  return { stats, health };
}

export default function DashboardRoute() {
  const { stats, health } = useLoaderData<typeof loader>();

  return (
    <AppLayout>
      <Page title="Dashboard" subtitle="Mango Product Feed overview">
        <Layout>
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
    </AppLayout>
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
