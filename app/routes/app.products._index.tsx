import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import {
  Badge,
  BlockStack,
  Card,
  DataTable,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { listProducts } from "../services/product.server";
import { AVAILABILITY_LABELS } from "../types/product";
import { getEmbeddedShopContext } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { shopId } = await getEmbeddedShopContext(request);
  const products = await listProducts(shopId);
  return { products };
}

export default function EmbeddedProductsRoute() {
  const { products } = useLoaderData<typeof loader>();

  const rows = products.map((product) => [
    product.title,
    product.sku,
    product.brand,
    `$${String(product.price)}`,
    AVAILABILITY_LABELS[product.availability],
  ]);

  return (
    <Page
      title="Products"
      subtitle="Synced from Shopify Admin"
      primaryAction={{ content: "Manage sync", url: "/app/sync" }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <DataTable
              columnContentTypes={["text", "text", "text", "text", "text"]}
              headings={["Title", "SKU", "Brand", "Price", "Availability"]}
              rows={rows}
            />
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">
                Products are managed in Shopify and synced into Mango Product Feed.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
