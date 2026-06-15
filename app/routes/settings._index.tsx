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
  Checkbox,
  FormLayout,
  Layout,
  Page,
  TextField,
} from "@shopify/polaris";
import { useState } from "react";
import { AppLayout } from "../components/AppLayout";
import { runScheduledFeeds } from "../services/feed-scheduler.server";
import { getAppSettings, updateAppSettings } from "../services/settings.server";
import type { AppSettingsMap } from "../types/feed";

export async function loader(_args: LoaderFunctionArgs) {
  const settings = await getAppSettings();
  return { settings };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "save");

  if (intent === "run-scheduler") {
    const results = await runScheduledFeeds();
    return { schedulerResults: results };
  }

  const updates: Partial<AppSettingsMap> = {
    storeName: String(formData.get("storeName") ?? ""),
    storeUrl: String(formData.get("storeUrl") ?? ""),
    requireSecretTokens: formData.get("requireSecretTokens") === "on",
    streamingBatchSize: Number.parseInt(String(formData.get("streamingBatchSize") ?? "500"), 10),
    maxFeedLogs: Number.parseInt(String(formData.get("maxFeedLogs") ?? "10000"), 10),
    enableScheduler: formData.get("enableScheduler") === "on",
  };

  const settings = await updateAppSettings(updates);
  return redirect("/settings");
}

export default function SettingsRoute() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [formState, setFormState] = useState(settings);

  return (
    <AppLayout>
      <Page title="Settings" subtitle="Configure store details, security, scheduler, and performance">
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {actionData?.schedulerResults && (
                <Banner tone="success" title="Scheduler run complete">
                  <p>
                    Processed {actionData.schedulerResults.length} scheduled feed
                    {actionData.schedulerResults.length === 1 ? "" : "s"}.
                  </p>
                </Banner>
              )}

              <form method="post">
                <input type="hidden" name="intent" value="save" />
                <Card>
                  <BlockStack gap="400">
                    <FormLayout>
                      <TextField
                        label="Store name"
                        name="storeName"
                        value={formState.storeName}
                        onChange={(value) =>
                          setFormState((current) => ({ ...current, storeName: value }))
                        }
                        autoComplete="off"
                      />
                      <TextField
                        label="Store URL"
                        name="storeUrl"
                        value={formState.storeUrl}
                        onChange={(value) =>
                          setFormState((current) => ({ ...current, storeUrl: value }))
                        }
                        autoComplete="off"
                      />
                      <TextField
                        label="Streaming batch size"
                        name="streamingBatchSize"
                        type="number"
                        value={String(formState.streamingBatchSize)}
                        onChange={(value) =>
                          setFormState((current) => ({
                            ...current,
                            streamingBatchSize: Number.parseInt(value || "500", 10),
                          }))
                        }
                        autoComplete="off"
                        helpText="Products loaded per batch for streaming XML generation"
                      />
                      <TextField
                        label="Maximum feed logs"
                        name="maxFeedLogs"
                        type="number"
                        value={String(formState.maxFeedLogs)}
                        onChange={(value) =>
                          setFormState((current) => ({
                            ...current,
                            maxFeedLogs: Number.parseInt(value || "10000", 10),
                          }))
                        }
                        autoComplete="off"
                      />
                      <input
                        type="hidden"
                        name="requireSecretTokens"
                        value={formState.requireSecretTokens ? "on" : "off"}
                      />
                      <Checkbox
                        label="Require secret feed tokens for all public feed URLs"
                        checked={formState.requireSecretTokens}
                        onChange={(checked) =>
                          setFormState((current) => ({
                            ...current,
                            requireSecretTokens: checked,
                          }))
                        }
                      />
                      <input
                        type="hidden"
                        name="enableScheduler"
                        value={formState.enableScheduler ? "on" : "off"}
                      />
                      <Checkbox
                        label="Enable feed scheduler"
                        checked={formState.enableScheduler}
                        onChange={(checked) =>
                          setFormState((current) => ({ ...current, enableScheduler: checked }))
                        }
                      />
                    </FormLayout>
                    <Button submit variant="primary">
                      Save settings
                    </Button>
                  </BlockStack>
                </Card>
              </form>

              <form method="post">
                <input type="hidden" name="intent" value="run-scheduler" />
                <Button submit>Run scheduled feeds now</Button>
              </form>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </AppLayout>
  );
}
