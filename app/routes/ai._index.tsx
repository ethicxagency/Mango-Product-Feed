import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { BlockStack, Card, Layout, Page, Text } from "@shopify/polaris";
import { AppLayout } from "../components/AppLayout";
import { LOCAL_SHOP_ID } from "../constants/shop";
import { listProducts } from "../services/product.server";
import {
  generateFeedHealthSuggestions,
  listAiOptimizations,
  optimizeProductDescription,
  optimizeProductTitle,
} from "../services/ai.server";

export async function loader() {
  const products = await listProducts(LOCAL_SHOP_ID);
  const sample = products[0];
  const history = sample ? await listAiOptimizations(sample.id) : [];
  return { products: products.slice(0, 20), sampleId: sample?.id ?? null, history };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const productId = String(formData.get("productId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const product = (await listProducts(LOCAL_SHOP_ID)).find((p) => p.id === productId);
  if (!product) return { error: "Product not found" };

  if (intent === "title") {
    const output = await optimizeProductTitle(product);
    return { output, type: "title" };
  }
  if (intent === "description") {
    const output = await optimizeProductDescription(product);
    return { output, type: "description" };
  }
  if (intent === "health") {
    const output = await generateFeedHealthSuggestions(product);
    return { output, type: "health" };
  }

  return { error: "Unknown action" };
}

export default function AiToolsPage() {
  const { products, history } = useLoaderData<typeof loader>();

  return (
    <AppLayout>
      <Page title="AI Optimization" subtitle="Improve titles, descriptions, and feed health">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="p" variant="bodyMd">
                  Select a product and run AI optimization. Requires OPENAI_API_KEY in production;
                  falls back to local suggestions when unavailable.
                </Text>
                {products.map((product) => (
                  <Card key={product.id}>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">{product.title}</Text>
                      <Form method="post" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input type="hidden" name="productId" value={product.id} />
                        <button name="intent" value="title" type="submit">Optimize title</button>
                        <button name="intent" value="description" type="submit">Optimize description</button>
                        <button name="intent" value="health" type="submit">Health suggestions</button>
                      </Form>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">Recent AI runs</Text>
                {history.length === 0 ? (
                  <Text as="p" tone="subdued">No optimizations yet.</Text>
                ) : (
                  history.map((row) => (
                    <Text as="p" key={row.id} variant="bodySm">
                      [{row.type}] {row.output.slice(0, 120)}...
                    </Text>
                  ))
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppLayout>
  );
}
