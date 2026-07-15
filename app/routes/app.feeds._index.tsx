import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  EmptyState,
  IndexTable,
  Page,
  Text,
} from "@shopify/polaris";
import type { BadgeProps } from "@shopify/polaris";

import { formatRelativeTime } from "~/lib/format";
import { getCurrentShop } from "~/lib/current-shop.server";
import { FEED_CHANNEL_LABELS } from "~/lib/feed-channels";
import { feedService } from "~/services/feed.service.server";
import type { FeedChannel } from "~/types/feed";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const feeds = await feedService.listFeeds(shop.id);

  return json({
    feeds: feeds.map((f) => ({
      id: f.id,
      name: f.name,
      channel: f.channel,
      status: f.status,
      lastGeneratedAt: f.lastGeneratedAt?.toISOString() ?? null,
      lastGenerationStatus: f.lastGenerationStatus,
      lastProductCount: f.lastProductCount,
    })),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();
  const feedId = formData.get("feedId")?.toString();

  if (!feedId) {
    return json({ error: "Missing feedId" }, { status: 400 });
  }

  if (intent === "delete") {
    await feedService.deleteFeed(shop.id, feedId);
  } else if (intent === "duplicate") {
    await feedService.duplicateFeed(shop.id, feedId);
  } else if (intent === "enable" || intent === "disable") {
    await feedService.setStatus(
      shop.id,
      feedId,
      intent === "enable" ? "ENABLED" : "DISABLED",
    );
  }

  return json({ ok: true });
}

const GENERATION_STATUS_TONE: Record<string, BadgeProps["tone"]> = {
  SUCCESS: "success",
  RUNNING: "info",
  PARTIAL: "warning",
  FAILED: "critical",
};

export default function FeedsIndexPage() {
  const { feeds } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isBusy = navigation.state !== "idle";

  return (
    <Page
      title="Feeds"
      primaryAction={{ content: "Create feed", url: "/app/feeds/new" }}
    >
      <Card padding="0">
        {feeds.length === 0 ? (
          <EmptyState
            heading="Create your first feed"
            action={{ content: "Create feed", url: "/app/feeds/new" }}
            image=""
          >
            <p>
              Feeds generate an XML file for Google, Meta, TikTok, Pinterest,
              Snapchat, Microsoft, or a custom destination.
            </p>
          </EmptyState>
        ) : (
          <IndexTable
            resourceName={{ singular: "feed", plural: "feeds" }}
            itemCount={feeds.length}
            selectable={false}
            headings={[
              { title: "Name" },
              { title: "Channel" },
              { title: "Status" },
              { title: "Last generated" },
              { title: "Products" },
              { title: "Actions" },
            ]}
          >
            {feeds.map((feed, index) => (
              <IndexTable.Row id={feed.id} key={feed.id} position={index}>
                <IndexTable.Cell>
                  <Link to={`/app/feeds/${feed.id}`}>
                    <Text as="span" fontWeight="semibold">
                      {feed.name}
                    </Text>
                  </Link>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {FEED_CHANNEL_LABELS[feed.channel as FeedChannel] ??
                    feed.channel}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Badge
                    tone={feed.status === "ENABLED" ? "success" : undefined}
                  >
                    {feed.status}
                  </Badge>
                  {feed.lastGenerationStatus ? (
                    <Badge
                      tone={GENERATION_STATUS_TONE[feed.lastGenerationStatus]}
                    >
                      {feed.lastGenerationStatus}
                    </Badge>
                  ) : null}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {formatRelativeTime(feed.lastGeneratedAt)}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {feed.lastProductCount?.toLocaleString() ?? "—"}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <BlockStack gap="100">
                    <Form method="post">
                      <input type="hidden" name="feedId" value={feed.id} />
                      <input
                        type="hidden"
                        name="intent"
                        value={feed.status === "ENABLED" ? "disable" : "enable"}
                      />
                      <Button submit size="slim" disabled={isBusy}>
                        {feed.status === "ENABLED" ? "Disable" : "Enable"}
                      </Button>
                    </Form>
                    <Form method="post">
                      <input type="hidden" name="feedId" value={feed.id} />
                      <input type="hidden" name="intent" value="duplicate" />
                      <Button submit size="slim" disabled={isBusy}>
                        Duplicate
                      </Button>
                    </Form>
                  </BlockStack>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        )}
      </Card>
    </Page>
  );
}
