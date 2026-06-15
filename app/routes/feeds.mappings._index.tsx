import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { BlockStack, Card, Layout, Page, Select, Text, TextField } from "@shopify/polaris";
import { useState } from "react";
import { AppLayout } from "../components/AppLayout";
import { LOCAL_SHOP_ID } from "../constants/shop";
import {
  deleteCategoryMapping,
  listCategoryMappings,
  upsertCategoryMapping,
} from "../services/category-mapping.server";
import type { CategoryMappingPlatform } from "@prisma/client";

const PLATFORMS: { label: string; value: CategoryMappingPlatform }[] = [
  { label: "Google", value: "GOOGLE" },
  { label: "Meta", value: "META" },
  { label: "TikTok", value: "TIKTOK" },
  { label: "Pinterest", value: "PINTEREST" },
  { label: "Snapchat", value: "SNAPCHAT" },
];

export async function loader() {
  const mappings = await listCategoryMappings(LOCAL_SHOP_ID);
  return { mappings };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "delete") {
    await deleteCategoryMapping(String(formData.get("id")));
    return { ok: true };
  }

  await upsertCategoryMapping({
    shopId: LOCAL_SHOP_ID,
    platform: String(formData.get("platform")) as CategoryMappingPlatform,
    sourceCategory: String(formData.get("sourceCategory")),
    targetCategory: String(formData.get("targetCategory")),
  });

  return { ok: true };
}

export default function CategoryMappingsPage() {
  const { mappings } = useLoaderData<typeof loader>();
  const [platform, setPlatform] = useState<CategoryMappingPlatform>("GOOGLE");

  return (
    <AppLayout>
      <Page title="Category Mapping" subtitle="Map internal categories to channel taxonomies">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Select
                  label="Platform"
                  options={PLATFORMS}
                  value={platform}
                  onChange={(value) => setPlatform(value as CategoryMappingPlatform)}
                />
                <Form method="post">
                  <input type="hidden" name="platform" value={platform} />
                  <BlockStack gap="200">
                    <TextField label="Source category" name="sourceCategory" autoComplete="off" />
                    <TextField label="Target category" name="targetCategory" autoComplete="off" />
                    <button type="submit">Save mapping</button>
                  </BlockStack>
                </Form>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">Existing mappings</Text>
                {mappings.map((mapping) => (
                  <div key={mapping.id} style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text as="p" variant="bodySm">
                      [{mapping.platform}] {mapping.sourceCategory} → {mapping.targetCategory}
                    </Text>
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={mapping.id} />
                      <button type="submit">Delete</button>
                    </Form>
                  </div>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppLayout>
  );
}
