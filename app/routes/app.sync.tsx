import {
  redirect,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  FormLayout,
  Layout,
  Page,
  Select,
  Text,
} from "@shopify/polaris";
import { useState } from "react";
import { getShopSyncSummary, updateShopSyncMode } from "../services/shop.server";
import {
  runInitialProductSync,
  runManualProductSync,
} from "../services/shopify-sync.server";
import { getEmbeddedShopContext } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { shopId } = await getEmbeddedShopContext(request);
  const sync = await getShopSyncSummary(shopId);
  return { sync };
}

export async function action({ request }: ActionFunctionArgs) {
  const { shopId, admin } = await getEmbeddedShopContext(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "manual");

  if (intent === "mode") {
    const syncMode = String(formData.get("syncMode") ?? "MANUAL") as "MANUAL" | "AUTOMATIC";
    await updateShopSyncMode(shopId, syncMode);
    return redirect("/app/sync");
  }

  if (intent === "initial") {
    await runInitialProductSync(shopId, admin);
  } else {
    await runManualProductSync(shopId, admin);
  }

  return redirect("/app/sync");
}

export default function EmbeddedSyncRoute() {
  const { sync } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [syncMode, setSyncMode] = useState(sync?.syncMode ?? "MANUAL");

  return (
    <Page title="Product Sync" subtitle="Initial, manual, and automatic Shopify sync">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Sync status
                </Text>
                <Text as="p" variant="bodyMd">
                  Status: {sync?.syncStatus ?? "IDLE"}
                </Text>
                <Text as="p" variant="bodyMd">
                  Products synced: {sync?.productCount ?? 0}
                </Text>
                <Text as="p" variant="bodyMd">
                  Last synced:{" "}
                  {sync?.lastSyncedAt
                    ? new Date(sync.lastSyncedAt).toLocaleString()
                    : "Never"}
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Manual sync
                </Text>
                <form method="post">
                  <input type="hidden" name="intent" value="manual" />
                  <Button submit variant="primary">
                    Run manual sync now
                  </Button>
                </form>
                {!sync?.initialSyncDone && (
                  <form method="post">
                    <input type="hidden" name="intent" value="initial" />
                    <Button submit>Run initial sync</Button>
                  </form>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Automatic sync
                </Text>
                <form method="post">
                  <input type="hidden" name="intent" value="mode" />
                  <FormLayout>
                    <Select
                      label="Sync mode"
                      name="syncMode"
                      options={[
                        { label: "Manual", value: "MANUAL" },
                        { label: "Automatic (webhooks)", value: "AUTOMATIC" },
                      ]}
                      value={syncMode}
                      onChange={(value) =>
                        setSyncMode(value as "MANUAL" | "AUTOMATIC")
                      }
                    />
                    <input type="hidden" name="syncMode" value={syncMode} />
                    <Button submit>Save sync mode</Button>
                  </FormLayout>
                </form>
              </BlockStack>
            </Card>

            {actionData && (
              <Banner tone="success" title="Sync updated">
                <p>Shopify product sync settings were updated.</p>
              </Banner>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
