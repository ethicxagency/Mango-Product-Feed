import { useEffect, useRef, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Link,
  useFetcher,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "@remix-run/react";
import {
  ActionList,
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  ChoiceList,
  EmptyState,
  Filters,
  IndexTable,
  InlineStack,
  Modal,
  Page,
  Popover,
  SkeletonBodyText,
  Text,
  TextField,
  Toast,
  Tooltip,
} from "@shopify/polaris";
import type {
  AppliedFilterInterface,
  BadgeProps,
  IndexTableProps,
} from "@shopify/polaris";
import {
  ClipboardIcon,
  DeleteIcon,
  DuplicateIcon,
  EditIcon,
  ExportIcon,
  MenuHorizontalIcon,
  RefreshIcon,
  ViewIcon,
} from "@shopify/polaris-icons";

import { ToggleSwitch } from "~/components/ToggleSwitch";
import { formatAbsoluteDate, zonedDayBoundary } from "~/lib/format";
import { getCurrentShop } from "~/lib/current-shop.server";
import { getAppUrl } from "~/lib/env.server";
import { buildFeedUrls } from "~/lib/feed-urls";
import { FEED_CHANNEL_LABELS } from "~/lib/feed-channels";
import { useCopyToClipboard } from "~/lib/use-copy-to-clipboard";
import type { FeedSortField } from "~/repositories/feed.repository.server";
import { recordFeedGeneration } from "~/services/feed-generation-runner.service.server";
import { feedService } from "~/services/feed.service.server";
import { settingsService } from "~/services/settings.service.server";
import { FEED_CHANNELS } from "~/types/feed";
import type { FeedChannel } from "~/types/feed";

const PAGE_SIZE = 20;

// Column order drives both the heading array and onSort's index -> field
// mapping below — keep the two in lockstep if columns are ever reordered.
const SORT_FIELDS_BY_COLUMN: (FeedSortField | null)[] = [
  null, // Serial number — a page-relative position, not a real sortable field
  "name",
  "channel",
  "status",
  "createdAt",
  "updatedAt",
  "lastGeneratedAt",
  null, // Enable toggle
  null, // Actions
];

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const params = new URL(request.url).searchParams;

  const q = params.get("q")?.trim() || "";
  const channelParam = params.get("channel") ?? "";
  const statusParam = params.get("status") ?? "";
  const createdFrom = params.get("createdFrom") ?? "";
  const createdTo = params.get("createdTo") ?? "";
  const updatedFrom = params.get("updatedFrom") ?? "";
  const updatedTo = params.get("updatedTo") ?? "";
  const dir = params.get("dir") === "asc" ? "asc" : "desc";
  const sortParam = params.get("sort") ?? "createdAt";
  const sort: FeedSortField = (
    SORT_FIELDS_BY_COLUMN.includes(sortParam as FeedSortField)
      ? sortParam
      : "createdAt"
  ) as FeedSortField;
  const page = Math.max(1, Number(params.get("page")) || 1);

  const channel = FEED_CHANNELS.includes(channelParam as FeedChannel)
    ? channelParam
    : undefined;

  // The Status filter is a single control over two different real fields:
  // Feed.status for Active/Inactive, Feed.lastGenerationStatus for
  // Failed/Generating — there's no unified "status" column backing all
  // four, so the loader routes the chosen value to whichever field it
  // actually describes.
  let status: string | undefined;
  let generationStatus: string | undefined;
  if (statusParam === "ENABLED" || statusParam === "DISABLED") {
    status = statusParam;
  } else if (statusParam === "FAILED" || statusParam === "RUNNING") {
    generationStatus = statusParam;
  }

  const settings = await settingsService.getSettings(shop.id);
  const timezone = settings.timezone;

  // Date-filter inputs are calendar days picked in the merchant's own
  // timezone (the same one the Created/Updated columns render in), so the
  // day boundaries must be computed in that zone too — otherwise a filter
  // like "created from tomorrow" can drift by the UTC offset and still
  // include (or exclude) today's feeds near midnight.
  const { feeds, total } = await feedService.listFeeds(shop.id, {
    search: q || undefined,
    channel,
    status,
    generationStatus,
    createdFrom: createdFrom
      ? zonedDayBoundary(createdFrom, timezone, "start")
      : undefined,
    createdTo: createdTo
      ? zonedDayBoundary(createdTo, timezone, "end")
      : undefined,
    updatedFrom: updatedFrom
      ? zonedDayBoundary(updatedFrom, timezone, "start")
      : undefined,
    updatedTo: updatedTo
      ? zonedDayBoundary(updatedTo, timezone, "end")
      : undefined,
    sortField: sort,
    sortDirection: dir,
    page,
    pageSize: PAGE_SIZE,
  });

  const appUrl = getAppUrl();

  return json({
    feeds: feeds.map((f) => ({
      id: f.id,
      name: f.name,
      channel: f.channel,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      lastGeneratedAt: f.lastGeneratedAt?.toISOString() ?? null,
      lastGenerationStatus: f.lastGenerationStatus,
      urls: buildFeedUrls(appUrl, f, shop.shopifyDomain),
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    timezone: settings.timezone,
    filters: {
      q,
      channel: channelParam,
      status: statusParam,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      sort,
      dir,
    },
  });
}

interface FeedActionResult {
  ok: boolean;
  intent: string | null;
  error: string | null;
  generation: { status: string; productCount: number } | null;
}

function actionResult(overrides: Partial<FeedActionResult>): FeedActionResult {
  return {
    ok: true,
    intent: null,
    error: null,
    generation: null,
    ...overrides,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString() ?? null;
  const feedId = formData.get("feedId")?.toString();

  if (!feedId) {
    return json(actionResult({ ok: false, error: "Missing feedId" }), {
      status: 400,
    });
  }

  try {
    if (intent === "delete") {
      await feedService.deleteFeed(shop.id, feedId);
      return json(actionResult({ intent }));
    }
    if (intent === "duplicate") {
      await feedService.duplicateFeed(shop.id, feedId);
      return json(actionResult({ intent }));
    }
    if (intent === "enable" || intent === "disable") {
      await feedService.setStatus(
        shop.id,
        feedId,
        intent === "enable" ? "ENABLED" : "DISABLED",
      );
      return json(actionResult({ intent }));
    }
    if (intent === "regenerate") {
      const feed = await feedService.getFeed(shop.id, feedId);
      if (!feed) {
        return json(
          actionResult({ ok: false, intent, error: "Feed not found" }),
          { status: 404 },
        );
      }
      const run = await recordFeedGeneration(feed, getAppUrl());
      return json(
        actionResult({
          intent,
          generation: { status: run.status, productCount: run.productCount },
        }),
      );
    }
    return json(actionResult({ ok: false, intent, error: "Unknown action" }), {
      status: 400,
    });
  } catch (error) {
    return json(
      actionResult({
        ok: false,
        intent,
        error: error instanceof Error ? error.message : "Action failed",
      }),
      { status: 500 },
    );
  }
}

type LoaderFeed = ReturnType<
  typeof useLoaderData<typeof loader>
>["feeds"][number];

function statusBadge(
  status: string,
  generationStatus: string | null,
): { label: string; tone: BadgeProps["tone"] } {
  if (generationStatus === "RUNNING") {
    return { label: "Generating", tone: "attention" };
  }
  if (generationStatus === "FAILED") {
    return { label: "Failed", tone: "critical" };
  }
  return status === "ENABLED"
    ? { label: "Active", tone: "success" }
    : { label: "Inactive", tone: undefined };
}

function lastSyncLabel(feed: LoaderFeed, timezone: string): string {
  if (!feed.lastGeneratedAt) return "Never synced";
  const when = formatAbsoluteDate(feed.lastGeneratedAt, timezone);
  return feed.lastGenerationStatus === "FAILED" ? `Failed — ${when}` : when;
}

function FeedRow({
  feed,
  index,
  timezone,
  copy,
  notify,
  onRequestDelete,
}: {
  feed: LoaderFeed;
  index: number;
  timezone: string;
  copy: (text: string, label: string) => void;
  notify: (message: string) => void;
  onRequestDelete: (feed: LoaderFeed) => void;
}) {
  const fetcher = useFetcher<typeof action>();
  const [overflowActive, setOverflowActive] = useState(false);
  const isMutating = fetcher.state !== "idle";

  const pendingIntent = fetcher.formData?.get("intent")?.toString();
  const optimisticStatus =
    pendingIntent === "enable"
      ? "ENABLED"
      : pendingIntent === "disable"
        ? "DISABLED"
        : feed.status;

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (!fetcher.data.ok) {
      notify(fetcher.data.error ?? "Action failed");
      return;
    }
    if (fetcher.data.intent === "enable") notify("Feed enabled");
    if (fetcher.data.intent === "disable") notify("Feed disabled");
    if (fetcher.data.intent === "duplicate")
      notify(`Duplicated "${feed.name}"`);
    if (fetcher.data.intent === "regenerate") {
      notify(
        fetcher.data.generation?.status === "SUCCESS"
          ? `Feed regenerated — ${fetcher.data.generation.productCount} products`
          : `Feed regeneration finished with status ${fetcher.data.generation?.status}`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  function submit(intent: string) {
    fetcher.submit({ intent, feedId: feed.id }, { method: "post" });
  }

  const badge = statusBadge(optimisticStatus, feed.lastGenerationStatus);

  return (
    <IndexTable.Row id={feed.id} position={index}>
      <IndexTable.Cell>
        <Text as="span" tone="subdued">
          {index + 1}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Link to={`/app/feeds/${feed.id}`}>
          <Text as="span" fontWeight="semibold">
            {feed.name}
          </Text>
        </Link>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {FEED_CHANNEL_LABELS[feed.channel as FeedChannel] ?? feed.channel}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {formatAbsoluteDate(feed.createdAt, timezone)}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {formatAbsoluteDate(feed.updatedAt, timezone)}
      </IndexTable.Cell>
      <IndexTable.Cell>{lastSyncLabel(feed, timezone)}</IndexTable.Cell>
      <IndexTable.Cell>
        <ToggleSwitch
          label="Enabled"
          checked={optimisticStatus === "ENABLED"}
          disabled={isMutating}
          onChange={(checked) => submit(checked ? "enable" : "disable")}
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="100" wrap={false} blockAlign="center">
          <Tooltip content="Copy feed URL">
            <Button
              icon={ClipboardIcon}
              accessibilityLabel="Copy feed URL"
              variant="tertiary"
              onClick={() => copy(feed.urls.publicUrl, "Feed URL")}
            />
          </Tooltip>
          <Tooltip content="Download feed">
            <Button
              icon={ExportIcon}
              accessibilityLabel="Download feed"
              variant="tertiary"
              url={`${feed.urls.privateUrl}&download=1`}
            />
          </Tooltip>
          <Tooltip content="Preview feed">
            <Button
              icon={ViewIcon}
              accessibilityLabel="Preview feed"
              variant="tertiary"
              url={feed.urls.publicUrl}
              target="_blank"
            />
          </Tooltip>
          <Tooltip content="Edit feed">
            <Button
              icon={EditIcon}
              accessibilityLabel="Edit feed"
              variant="tertiary"
              url={`/app/feeds/${feed.id}`}
            />
          </Tooltip>
          <Popover
            active={overflowActive}
            onClose={() => setOverflowActive(false)}
            activator={
              <Button
                icon={MenuHorizontalIcon}
                accessibilityLabel="More actions"
                variant="tertiary"
                disabled={isMutating}
                onClick={() => setOverflowActive((prev) => !prev)}
              />
            }
          >
            <ActionList
              items={[
                {
                  content: "Regenerate",
                  icon: RefreshIcon,
                  disabled: isMutating,
                  onAction: () => {
                    setOverflowActive(false);
                    submit("regenerate");
                  },
                },
                {
                  content: "Duplicate",
                  icon: DuplicateIcon,
                  disabled: isMutating,
                  onAction: () => {
                    setOverflowActive(false);
                    submit("duplicate");
                  },
                },
                ...(feed.lastGenerationStatus === "FAILED"
                  ? [
                      {
                        content: "View validation errors",
                        url: `/app/feeds/${feed.id}`,
                      },
                    ]
                  : []),
                {
                  content: "Delete",
                  icon: DeleteIcon,
                  destructive: true,
                  onAction: () => {
                    setOverflowActive(false);
                    onRequestDelete(feed);
                  },
                },
              ]}
            />
          </Popover>
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <IndexTable.Row id={`skeleton-${i}`} key={`skeleton-${i}`} position={i}>
          {Array.from({ length: 9 }).map((__, cellIndex) => (
            <IndexTable.Cell key={cellIndex}>
              <SkeletonBodyText lines={1} />
            </IndexTable.Cell>
          ))}
        </IndexTable.Row>
      ))}
    </>
  );
}

export default function FeedsIndexPage() {
  const { feeds, total, page, pageSize, timezone, filters } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const { toastMessage, setToastMessage, copy } = useCopyToClipboard();
  const deleteFetcher = useFetcher<typeof action>();
  const [feedToDelete, setFeedToDelete] = useState<LoaderFeed | null>(null);
  const [queryValue, setQueryValue] = useState(filters.q);
  const queryDebounce = useRef<ReturnType<typeof setTimeout>>();

  const isLoading = navigation.state === "loading";

  useEffect(() => {
    if (deleteFetcher.state !== "idle" || !deleteFetcher.data) return;
    if (deleteFetcher.data.ok) {
      setToastMessage("Feed deleted");
      setFeedToDelete(null);
    } else {
      setToastMessage(deleteFetcher.data.error ?? "Failed to delete feed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteFetcher.state, deleteFetcher.data]);

  function applyParam(
    updates: Record<string, string | null>,
    resetPage = true,
  ) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.delete("page");
    setSearchParams(next);
  }

  function handleQueryChange(value: string) {
    setQueryValue(value);
    if (queryDebounce.current) clearTimeout(queryDebounce.current);
    queryDebounce.current = setTimeout(
      () => applyParam({ q: value || null }),
      400,
    );
  }

  function handleQueryClear() {
    setQueryValue("");
    if (queryDebounce.current) clearTimeout(queryDebounce.current);
    applyParam({ q: null });
  }

  function handleClearAll() {
    setQueryValue("");
    applyParam({
      q: null,
      channel: null,
      status: null,
      createdFrom: null,
      createdTo: null,
      updatedFrom: null,
      updatedTo: null,
    });
  }

  function goToPage(nextPage: number) {
    applyParam({ page: String(nextPage) }, false);
  }

  const sortColumnIndex = SORT_FIELDS_BY_COLUMN.indexOf(filters.sort);
  const sortDirection: IndexTableProps["sortDirection"] =
    filters.dir === "asc" ? "ascending" : "descending";

  function handleSort(
    headingIndex: number,
    direction: "ascending" | "descending",
  ) {
    const field = SORT_FIELDS_BY_COLUMN[headingIndex];
    if (!field) return;
    applyParam({
      sort: field,
      dir: direction === "ascending" ? "asc" : "desc",
    });
  }

  const hasActiveFilters = Boolean(
    filters.q ||
    filters.channel ||
    filters.status ||
    filters.createdFrom ||
    filters.createdTo ||
    filters.updatedFrom ||
    filters.updatedTo,
  );

  const appliedFilters: AppliedFilterInterface[] = [];
  if (filters.channel) {
    appliedFilters.push({
      key: "channel",
      label: `Feed type: ${FEED_CHANNEL_LABELS[filters.channel as FeedChannel] ?? filters.channel}`,
      onRemove: () => applyParam({ channel: null }),
    });
  }
  if (filters.status) {
    const statusLabels: Record<string, string> = {
      ENABLED: "Active",
      DISABLED: "Inactive",
      FAILED: "Failed",
      RUNNING: "Generating",
    };
    appliedFilters.push({
      key: "status",
      label: `Status: ${statusLabels[filters.status] ?? filters.status}`,
      onRemove: () => applyParam({ status: null }),
    });
  }
  if (filters.createdFrom || filters.createdTo) {
    appliedFilters.push({
      key: "created",
      label: `Created: ${filters.createdFrom || "any"} – ${filters.createdTo || "any"}`,
      onRemove: () => applyParam({ createdFrom: null, createdTo: null }),
    });
  }
  if (filters.updatedFrom || filters.updatedTo) {
    appliedFilters.push({
      key: "updated",
      label: `Updated: ${filters.updatedFrom || "any"} – ${filters.updatedTo || "any"}`,
      onRemove: () => applyParam({ updatedFrom: null, updatedTo: null }),
    });
  }

  return (
    <Page
      title="Feeds"
      primaryAction={{ content: "Create feed", url: "/app/feeds/new" }}
    >
      <Card padding="0">
        {total === 0 && !hasActiveFilters ? (
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
          <BlockStack gap="0">
            <Box padding="300">
              <Filters
                queryValue={queryValue}
                queryPlaceholder="Search feeds by name"
                onQueryChange={handleQueryChange}
                onQueryClear={handleQueryClear}
                onClearAll={handleClearAll}
                appliedFilters={appliedFilters}
                filters={[
                  {
                    key: "channel",
                    label: "Feed type",
                    filter: (
                      <ChoiceList
                        title="Feed type"
                        titleHidden
                        choices={FEED_CHANNELS.map((c) => ({
                          label: FEED_CHANNEL_LABELS[c],
                          value: c,
                        }))}
                        selected={filters.channel ? [filters.channel] : []}
                        onChange={(selected) =>
                          applyParam({ channel: selected[0] ?? null })
                        }
                      />
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    filter: (
                      <ChoiceList
                        title="Status"
                        titleHidden
                        choices={[
                          { label: "Active", value: "ENABLED" },
                          { label: "Inactive", value: "DISABLED" },
                          { label: "Failed", value: "FAILED" },
                          { label: "Generating", value: "RUNNING" },
                        ]}
                        selected={filters.status ? [filters.status] : []}
                        onChange={(selected) =>
                          applyParam({ status: selected[0] ?? null })
                        }
                      />
                    ),
                  },
                  {
                    key: "created",
                    label: "Created date",
                    filter: (
                      <BlockStack gap="200">
                        <TextField
                          label="From"
                          type="date"
                          autoComplete="off"
                          value={filters.createdFrom}
                          onChange={(value) =>
                            applyParam({ createdFrom: value || null })
                          }
                        />
                        <TextField
                          label="To"
                          type="date"
                          autoComplete="off"
                          value={filters.createdTo}
                          onChange={(value) =>
                            applyParam({ createdTo: value || null })
                          }
                        />
                      </BlockStack>
                    ),
                  },
                  {
                    key: "updated",
                    label: "Updated date",
                    filter: (
                      <BlockStack gap="200">
                        <TextField
                          label="From"
                          type="date"
                          autoComplete="off"
                          value={filters.updatedFrom}
                          onChange={(value) =>
                            applyParam({ updatedFrom: value || null })
                          }
                        />
                        <TextField
                          label="To"
                          type="date"
                          autoComplete="off"
                          value={filters.updatedTo}
                          onChange={(value) =>
                            applyParam({ updatedTo: value || null })
                          }
                        />
                      </BlockStack>
                    ),
                  },
                ]}
              />
            </Box>

            {total === 0 ? (
              <EmptyState
                heading="No feeds found"
                action={{ content: "Clear filters", onAction: handleClearAll }}
                image=""
              >
                <p>Try changing or removing your search and filters.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "feed", plural: "feeds" }}
                itemCount={feeds.length}
                selectable={false}
                lastColumnSticky
                sortable={[
                  false,
                  true,
                  true,
                  true,
                  true,
                  true,
                  true,
                  false,
                  false,
                ]}
                sortColumnIndex={
                  sortColumnIndex === -1 ? undefined : sortColumnIndex
                }
                sortDirection={sortDirection}
                onSort={handleSort}
                pagination={{
                  hasNext: page * pageSize < total,
                  hasPrevious: page > 1,
                  onNext: () => goToPage(page + 1),
                  onPrevious: () => goToPage(page - 1),
                  label: `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`,
                }}
                headings={[
                  { title: "#" },
                  { title: "Feed name" },
                  { title: "Feed type" },
                  { title: "Status" },
                  { title: "Created" },
                  { title: "Updated" },
                  { title: "Last sync" },
                  { title: "Enabled" },
                  { title: "Actions" },
                ]}
              >
                {isLoading ? (
                  <SkeletonRows count={feeds.length || PAGE_SIZE} />
                ) : (
                  feeds.map((feed, index) => (
                    <FeedRow
                      key={feed.id}
                      feed={feed}
                      index={index}
                      timezone={timezone}
                      copy={copy}
                      notify={setToastMessage}
                      onRequestDelete={setFeedToDelete}
                    />
                  ))
                )}
              </IndexTable>
            )}
          </BlockStack>
        )}
      </Card>

      {feedToDelete ? (
        <Modal
          open
          onClose={() => setFeedToDelete(null)}
          title={`Delete "${feedToDelete.name}"?`}
          primaryAction={{
            content: "Delete",
            destructive: true,
            loading: deleteFetcher.state !== "idle",
            onAction: () => {
              deleteFetcher.submit(
                { intent: "delete", feedId: feedToDelete.id },
                { method: "post" },
              );
            },
          }}
          secondaryActions={[
            { content: "Cancel", onAction: () => setFeedToDelete(null) },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              This permanently deletes the feed and its generation history. This
              cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>
      ) : null}

      {toastMessage ? (
        <Toast content={toastMessage} onDismiss={() => setToastMessage(null)} />
      ) : null}
    </Page>
  );
}
