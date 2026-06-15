import {
  redirect,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { Layout, Page } from "@shopify/polaris";
import { AppLayout } from "../components/AppLayout";
import { FeedConfigForm } from "../components/FeedConfigForm";
import { getProductFilterOptions } from "../services/feed-builder.server";
import {
  createFeedConfig,
  replaceFeedRules,
} from "../services/feed-config.server";
import type { FeedConfigInput, FeedRuleInput } from "../types/feed";
import type { FeedType } from "../types/product";
import { parseFeedConfigFormData, parseFeedRulesJson } from "../utils/feed";

export async function loader(_args: LoaderFunctionArgs) {
  const filterOptions = await getProductFilterOptions();
  return { filterOptions };
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

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
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

  const feed = await createFeedConfig(configInput);
  await replaceFeedRules(feed.id, parseRules(input.rules));

  return redirect(`/feeds/builder/${feed.id}`);
}

export default function FeedBuilderNewRoute() {
  const { filterOptions } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <AppLayout>
      <Page
        title="Create feed"
        backAction={{ content: "Feed Builder", url: "/feeds/builder" }}
      >
        <Layout>
          <Layout.Section>
            <FeedConfigForm
              filterOptions={filterOptions}
              errors={actionData?.errors}
              submitLabel="Create feed"
            />
          </Layout.Section>
        </Layout>
      </Page>
    </AppLayout>
  );
}
