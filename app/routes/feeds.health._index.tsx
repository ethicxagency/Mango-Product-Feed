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
import {
  analyzeFeedHealth,
  getAdvancedHealthSummary,
} from "../services/feed-health.server";
import { listProducts } from "../services/product.server";

export async function loader(_args: LoaderFunctionArgs) {
  const products = await listProducts();
  const health = analyzeFeedHealth(products);
  const advanced = getAdvancedHealthSummary(health);
  return { health, advanced };
}

export default function FeedHealthRoute() {
  const { health, advanced } = useLoaderData<typeof loader>();

  return (
    <AppLayout>
      <Page
        title="Feed Health Dashboard"
        subtitle="Advanced validation for GTIN, MPN, duplicate SKU, and broken image URLs"
      >
        <Layout>
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
              {advanced.map((item) => (
                <Card key={item.label}>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {item.label}
                    </Text>
                    <Badge tone={item.count > 0 ? "critical" : "success"}>
                      {String(item.count)}
                    </Badge>
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
    </AppLayout>
  );
}
