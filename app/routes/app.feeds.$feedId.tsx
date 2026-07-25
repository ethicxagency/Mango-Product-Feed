import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Text,
  Toast,
} from "@shopify/polaris";
import type { BadgeProps } from "@shopify/polaris";

import { FeedForm } from "~/components/FeedForm";
import { getCurrentShop } from "~/lib/current-shop.server";
import { getAppUrl } from "~/lib/env.server";
import { buildFeedUrls } from "~/lib/feed-urls";
import { parseFeedForm } from "~/lib/parse-feed-form.server";
import { useCopyToClipboard } from "~/lib/use-copy-to-clipboard";
import { catalogFacetsRepository } from "~/repositories/catalog-facets.repository.server";
import { collectionRepository } from "~/repositories/collection.repository.server";
import { feedHistoryRepository } from "~/repositories/feed-history.repository.server";
import { productRepository } from "~/repositories/product.repository.server";
import { tagRepository } from "~/repositories/tag.repository.server";
import { streamFeedXml } from "~/services/feed-generation.service.server";
import { recordFeedGeneration } from "~/services/feed-generation-runner.service.server";
import { feedService } from "~/services/feed.service.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const feedId = params.feedId!;
  const feed = await feedService.getFeed(shop.id, feedId);

  if (!feed) {
    throw new Response("Feed not found", { status: 404 });
  }

  const [collections, tags, vendors, productTypes, products, history] =
    await Promise.all([
      collectionRepository.listByShop(shop.id),
      tagRepository.listByShop(shop.id),
      catalogFacetsRepository.listVendors(shop.id),
      catalogFacetsRepository.listProductTypes(shop.id),
      productRepository.search(shop.id, ""),
      feedHistoryRepository.listByFeed(feedId, 10),
    ]);

  return json({
    feed: {
      id: feed.id,
      name: feed.name,
      channel: feed.channel,
      status: feed.status,
      lastGeneratedAt: feed.lastGeneratedAt,
      lastGenerationStatus: feed.lastGenerationStatus,
      lastProductCount: feed.lastProductCount,
    },
    formValues: feedService.toFormInput(feed),
    urls: buildFeedUrls(getAppUrl(), feed, shop.shopifyDomain),
    collections: collections.map((c) => ({ id: c.id, label: c.title })),
    tags: tags.map((t) => ({ id: t.id, label: t.name })),
    vendors,
    productTypes,
    products: products.map((p) => ({
      id: p.id,
      title: p.title || "(untitled product)",
      vendor: p.vendor,
    })),
    history: history.map((h) => ({
      id: h.id,
      status: h.status,
      startedAt: h.startedAt,
      durationMs: h.durationMs,
      productCount: h.productCount,
      variantCount: h.variantCount,
      errorCount: h.errorCount,
      errors: JSON.parse(h.errorsJson) as { code: string; message: string }[],
    })),
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const feedId = params.feedId!;
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString() ?? "update";

  if (intent === "delete") {
    await feedService.deleteFeed(shop.id, feedId);
    return redirect("/app/feeds");
  }

  if (intent === "duplicate") {
    const duplicate = await feedService.duplicateFeed(shop.id, feedId);
    return redirect(`/app/feeds/${duplicate.id}`);
  }

  if (intent === "enable" || intent === "disable") {
    await feedService.setStatus(
      shop.id,
      feedId,
      intent === "enable" ? "ENABLED" : "DISABLED",
    );
    return json({ ok: true });
  }

  if (intent === "generate") {
    const feed = await feedService.getFeed(shop.id, feedId);
    if (!feed) {
      throw new Response("Feed not found", { status: 404 });
    }

    const run = await recordFeedGeneration(feed, getAppUrl());

    return json({
      ok: true,
      generated: true,
      generation: {
        status: run.status,
        productCount: run.productCount,
        variantCount: run.variantCount,
        durationMs: run.durationMs,
        errors: run.errors,
      },
    });
  }

  if (intent === "preview") {
    const feed = await feedService.getFeed(shop.id, feedId);
    if (!feed) {
      throw new Response("Feed not found", { status: 404 });
    }

    // A preview only needs to show representative item content, not a
    // syntactically complete document — so it's fine (and much simpler) to
    // stop mid-stream and label the result as truncated, rather than
    // reconstructing valid closing tags for whichever template ran.
    const itemOpenTag = `<${feed.channel === "CUSTOM" ? feed.itemNode : "item"}>`;
    const PREVIEW_ITEM_LIMIT = 10;

    const { chunks } = await streamFeedXml(feed, getAppUrl());
    let xml = "";
    let itemCount = 0;
    let truncated = false;

    for await (const chunk of chunks) {
      if (itemCount >= PREVIEW_ITEM_LIMIT) {
        truncated = true;
        await chunks.return(undefined);
        break;
      }
      xml += chunk;
      if (chunk.includes(itemOpenTag)) {
        itemCount += 1;
      }
    }

    return json({ ok: true, preview: { xml, itemCount, truncated } });
  }

  const result = parseFeedForm(formData);
  if (!result.success || !result.data) {
    return json(
      { error: result.error ?? "Invalid form submission" },
      { status: 400 },
    );
  }

  await feedService.updateFeed(shop.id, feedId, result.data);
  return json({ ok: true, saved: true });
}

const GENERATION_STATUS_TONE: Record<string, BadgeProps["tone"]> = {
  SUCCESS: "success",
  RUNNING: "info",
  PARTIAL: "warning",
  FAILED: "critical",
};

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function EditFeedPage() {
  const {
    feed,
    formValues: rawFormValues,
    urls,
    collections,
    tags,
    vendors,
    productTypes,
    products,
    history,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const { toastMessage, setToastMessage, copy } = useCopyToClipboard();

  // useLoaderData serializes Date -> string over the wire; convert back
  // before handing defaults to FeedForm, which works with real Date objects.
  const formValues = {
    ...rawFormValues,
    createdAfter: toDate(rawFormValues.createdAfter),
    createdBefore: toDate(rawFormValues.createdBefore),
    updatedAfter: toDate(rawFormValues.updatedAfter),
    updatedBefore: toDate(rawFormValues.updatedBefore),
  };

  const isSubmitting = navigation.state === "submitting";

  const generation =
    actionData && "generation" in actionData
      ? (actionData.generation as {
          status: "SUCCESS" | "PARTIAL" | "FAILED";
          productCount: number;
          variantCount: number;
          durationMs: number;
          errors: { code: string; message: string }[];
        })
      : null;

  const preview =
    actionData && "preview" in actionData
      ? (actionData.preview as {
          xml: string;
          itemCount: number;
          truncated: boolean;
        })
      : null;

  return (
    <>
      <FeedForm
        pageTitle={feed.name}
        submitLabel="Save changes"
        defaultValues={formValues}
        collections={collections}
        tags={tags}
        vendors={vendors}
        productTypes={productTypes}
        products={products}
        isSubmitting={isSubmitting}
        formError={
          actionData && "error" in actionData ? actionData.error : null
        }
        pageSecondaryActions={[
          {
            content: "Duplicate",
            url: undefined,
            onAction: () => {
              const form = document.getElementById(
                "feed-intent-form",
              ) as HTMLFormElement | null;
              if (form) {
                (form.elements.namedItem("intent") as HTMLInputElement).value =
                  "duplicate";
                form.requestSubmit();
              }
            },
          },
          {
            content: "Delete",
            destructive: true,
            onAction: () => {
              if (!confirm(`Delete "${feed.name}"? This cannot be undone.`)) {
                return;
              }
              const form = document.getElementById(
                "feed-intent-form",
              ) as HTMLFormElement | null;
              if (form) {
                (form.elements.namedItem("intent") as HTMLInputElement).value =
                  "delete";
                form.requestSubmit();
              }
            },
          },
        ]}
        beforeFormContent={
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                {actionData && "saved" in actionData && actionData.saved ? (
                  <Banner tone="success">Feed saved.</Banner>
                ) : null}

                {generation ? (
                  <Banner
                    tone={
                      generation.status === "SUCCESS"
                        ? "success"
                        : generation.status === "PARTIAL"
                          ? "warning"
                          : "critical"
                    }
                  >
                    <BlockStack gap="100">
                      <Text as="p">
                        {`Generation ${generation.status.toLowerCase()} — ${generation.productCount} products, ${generation.variantCount} variants in ${formatDuration(generation.durationMs)}.`}
                      </Text>
                      {generation.errors.length > 0 ? (
                        <BlockStack gap="050">
                          {generation.errors.map((err) => (
                            <Text as="p" key={err.code}>
                              {err.message}
                            </Text>
                          ))}
                        </BlockStack>
                      ) : null}
                    </BlockStack>
                  </Banner>
                ) : null}

                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Badge
                      tone={feed.status === "ENABLED" ? "success" : undefined}
                    >
                      {feed.status}
                    </Badge>
                    {feed.lastGenerationStatus ? (
                      <Badge
                        tone={GENERATION_STATUS_TONE[feed.lastGenerationStatus]}
                      >
                        {`Last run: ${feed.lastGenerationStatus}`}
                      </Badge>
                    ) : (
                      <Text as="span" tone="subdued">
                        Never generated
                      </Text>
                    )}
                  </InlineStack>
                  <InlineStack gap="200">
                    <form method="post">
                      <input type="hidden" name="intent" value="preview" />
                      <Button submit>Preview feed</Button>
                    </form>
                    <form method="post">
                      <input type="hidden" name="intent" value="generate" />
                      <Button submit variant="primary">
                        Generate feed
                      </Button>
                    </form>
                    <Button url={`${urls.privateUrl}&download=1`}>
                      Download XML
                    </Button>
                    <form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value={feed.status === "ENABLED" ? "disable" : "enable"}
                      />
                      <Button submit>
                        {feed.status === "ENABLED"
                          ? "Disable feed"
                          : "Enable feed"}
                      </Button>
                    </form>
                  </InlineStack>
                </InlineStack>

                {preview ? (
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      {`Preview (first ${preview.itemCount} item${preview.itemCount === 1 ? "" : "s"}${preview.truncated ? ", truncated" : ""})`}
                    </Text>
                    <div
                      style={{
                        maxHeight: 320,
                        overflow: "auto",
                        background: "var(--p-color-bg-surface-secondary)",
                        padding: "var(--p-space-300)",
                        borderRadius: "var(--p-border-radius-200)",
                      }}
                    >
                      <pre
                        style={{
                          margin: 0,
                          fontSize: 12,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {preview.xml}
                      </pre>
                    </div>
                  </BlockStack>
                ) : null}

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Feed URLs
                  </Text>
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" tone="subdued">
                      {urls.publicUrl}
                    </Text>
                    <Button onClick={() => copy(urls.publicUrl, "Public URL")}>
                      Copy public URL
                    </Button>
                  </InlineStack>
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" tone="subdued">
                      {urls.privateUrl}
                    </Text>
                    <Button
                      onClick={() => copy(urls.privateUrl, "Private URL")}
                    >
                      Copy private URL
                    </Button>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Feed history
                </Text>
                {history.length === 0 ? (
                  <Text as="p" tone="subdued">
                    No generation runs yet. Click &quot;Generate feed&quot;
                    above to run one.
                  </Text>
                ) : (
                  <BlockStack gap="200">
                    {history.map((run) => (
                      <BlockStack gap="100" key={run.id}>
                        <InlineStack gap="200" blockAlign="center">
                          <Badge tone={GENERATION_STATUS_TONE[run.status]}>
                            {run.status}
                          </Badge>
                          <Text as="span" tone="subdued">
                            {new Date(run.startedAt).toLocaleString()}
                          </Text>
                          <Text as="span" tone="subdued">
                            {`${run.productCount} products, ${run.variantCount} variants, ${formatDuration(run.durationMs ?? 0)}`}
                          </Text>
                        </InlineStack>
                        {run.errors.length > 0 ? (
                          <BlockStack gap="050">
                            {run.errors.map((err, i) => (
                              <Text
                                as="span"
                                tone="subdued"
                                key={`${run.id}-${i}`}
                              >
                                {`• ${err.message}`}
                              </Text>
                            ))}
                          </BlockStack>
                        ) : null}
                      </BlockStack>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        }
      />
      <form id="feed-intent-form" method="post" style={{ display: "none" }}>
        <input type="hidden" name="intent" value="" />
      </form>
      {toastMessage ? (
        <Toast content={toastMessage} onDismiss={() => setToastMessage(null)} />
      ) : null}
    </>
  );
}
