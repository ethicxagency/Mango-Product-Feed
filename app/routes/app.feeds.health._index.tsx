import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Badge, BlockStack, Card, InlineGrid, Layout, Page, Text } from "@shopify/polaris";
import { HealthIssuesList } from "../components/HealthIssuesList";
import { analyzeFeedHealth, getAdvancedHealthSummary } from "../services/feed-health.server";
import { listProducts } from "../services/product.server";
import { getEmbeddedShopContext } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { shopId } = await getEmbeddedShopContext(request);
  const products = await listProducts(shopId);
  const health = analyzeFeedHealth(products);
  const advanced = getAdvancedHealthSummary(health);
  return { health, advanced };
}

export default function EmbeddedFeedHealthRoute() {
  const { health, advanced } = useLoaderData<typeof loader>();
  return (
    <Page title="Feed Health Dashboard" subtitle="Advanced GTIN, MPN, SKU, and image validation">
      <Layout>
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
            {advanced.map((item) => (
              <Card key={item.label}>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" tone="subdued">{item.label}</Text>
                  <Badge tone={item.count > 0 ? "critical" : "success"}>{String(item.count)}</Badge>
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
  );
}
