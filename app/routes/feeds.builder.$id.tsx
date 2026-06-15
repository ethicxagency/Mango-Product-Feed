import {
  data,
  redirect,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { Banner, BlockStack, Button, Layout, Page } from "@shopify/polaris";
import { AppLayout } from "../components/AppLayout";
import { FeedConfigForm } from "../components/FeedConfigForm";
import { getProductFilterOptions } from "../services/feed-builder.server";
import {
  deleteFeedConfig,
  getFeedConfigById,
  regenerateFeedToken,
  replaceFeedRules,
  updateFeedConfig,
} from "../services/feed-config.server";
import { buildFeedXmlFromConfig } from "../services/feed-stream.server";
import type { FeedConfigInput, FeedRuleInput } from "../types/feed";
import type { FeedType } from "../types/product";
import { FEED_PATHS } from "../types/product";
import { buildFeedUrl, buildTokenFeedUrl } from "../types/feed";
import { parseFeedConfigFormData, parseFeedRulesJson } from "../utils/feed";
import { getAppUrl } from "../utils/product";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const feed = await getFeedConfigById(params.id ?? "");
  if (!feed) {
    throw data("Feed not found", { status: 404 });
  }

  const [filterOptions, preview] = await Promise.all([
    getProductFilterOptions(),
    buildFeedXmlFromConfig(feed),
  ]);

  return {
    feed,
    filterOptions,
    preview,
    appUrl: getAppUrl(request),
  };
}

function parseRules(raw: string): FeedRuleInput[] {
  return parseFeedRulesJson(raw).map((rule, index) => ({
    name: String(rule.name ?? `Rule ${index + 1}`),
    conditionField: rule.conditionField,
    conditionOperator: rule.conditionOperator,
    conditionValue: String(rule.conditionValue ?? ""),
    action: rule.action,
    actionValue: rule.actionValue ? String(rule.actionValue) : undefined,
    priority: Number(rule.priority ?? index),
    isActive: rule.isActive !== false,
  }));
}

export async function action({ request, params }: ActionFunctionArgs) {
  const id = params.id ?? "";
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "save");

  if (intent === "delete") {
    await deleteFeedConfig(id);
    return redirect("/feeds/builder");
  }

  if (intent === "regenerate-token") {
    await regenerateFeedToken(id);
    return redirect(`/feeds/builder/${id}`);
  }

  const input = parseFeedConfigFormData(formData);
  const errors: Record<string, string> = {};
  if (!input.name) errors.name = "Feed name is required";

  let filterValues: string[] = [];
  try {
    filterValues = JSON.parse(input.filterValues) as string[];
  } catch {
    errors.filterValues = "Invalid filter values";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const configInput: FeedConfigInput = {
    name: input.name,
    feedType: input.feedType as FeedType,
    filterMode: input.filterMode as FeedConfigInput["filterMode"],
    filterValues,
    schedule: input.schedule as FeedConfigInput["schedule"],
    isActive: input.isActive,
  };

  await updateFeedConfig(id, configInput);
  await replaceFeedRules(id, parseRules(input.rules));

  return redirect(`/feeds/builder/${id}`);
}

export default function FeedBuilderEditRoute() {
  const { feed, filterOptions, preview, appUrl } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <AppLayout>
      <Page
        title={`Edit ${feed.name}`}
        backAction={{ content: "Feed Builder", url: "/feeds/builder" }}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Banner title="Secret feed URLs" tone="info">
                <p>
                  Platform URL:{" "}
                  {buildFeedUrl(appUrl, feed.feedType, feed.token, FEED_PATHS[feed.feedType])}
                </p>
                <p>Token URL: {buildTokenFeedUrl(appUrl, feed.token)}</p>
              </Banner>
              <FeedConfigForm
                config={feed}
                filterOptions={filterOptions}
                errors={actionData?.errors}
                submitLabel="Save feed"
              />
              <form method="post">
                <input type="hidden" name="intent" value="regenerate-token" />
                <Button submit>Regenerate secret token</Button>
              </form>
              {!feed.isDefault && (
                <form method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <Button submit tone="critical">
                    Delete feed
                  </Button>
                </form>
              )}
              <Banner title="Feed preview" tone="success">
                <pre
                  style={{
                    maxHeight: "240px",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {preview.slice(0, 4000)}
                  {preview.length > 4000 ? "\n...truncated..." : ""}
                </pre>
              </Banner>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </AppLayout>
  );
}
