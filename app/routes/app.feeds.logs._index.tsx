import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Layout, Page } from "@shopify/polaris";
import { FeedLogsTable } from "../components/FeedLogsTable";
import { countFeedLogs, listFeedLogs } from "../services/feed-log.server";

export async function loader(_args: LoaderFunctionArgs) {
  const [logs, total] = await Promise.all([listFeedLogs(100), countFeedLogs()]);
  return { logs, total };
}

export default function EmbeddedFeedLogsRoute() {
  const { logs, total } = useLoaderData<typeof loader>();
  return (
    <Page title="Feed Logs" subtitle={`${total.toLocaleString()} logged feed requests`}>
      <Layout>
        <Layout.Section>
          <FeedLogsTable logs={logs} />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
