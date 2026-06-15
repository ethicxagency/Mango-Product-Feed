import type { FeedConfig, FeedRule, FeedType } from "@prisma/client";
import { Readable } from "stream";
import {
  getFeedConfigByToken,
  resolveFeedConfig,
  touchFeedAccess,
  touchFeedGenerated,
} from "./feed-config.server";
import { iterateFilteredProducts } from "./feed-builder.server";
import { logFeedAccess, isDownloadRequest } from "./feed-log.server";
import { logFeedRequest } from "./feed-request.server";
import { getAppSettings } from "./settings.server";
import { resolveTemplateForConfig } from "./feed-template.server";
import {
  buildStandardFeedHeader,
  buildFeedItemXml,
  getChannelMeta,
  isFeedExpired,
  STANDARD_FEED_FOOTER,
  FEED_LEGACY_PATHS,
} from "./feed-xml.server";
import { notifyFeedError } from "./notifications.server";
import { logSystemEvent } from "./system-log.server";
import type { FeedRenderContext } from "../types/feed-channels";

export async function createStreamingFeedResponse(options: {
  feedType: FeedType;
  token?: string | null;
  request: Request;
}) {
  const startedAt = Date.now();
  const settings = await getAppSettings();
  const userAgent = options.request.headers.get("user-agent");
  const isDownload = isDownloadRequest(userAgent);

  const config = await resolveFeedConfig(options.feedType, options.token);
  if (!config) {
    await logFeedAccess({
      feedName: `${options.feedType} Feed`,
      feedType: options.feedType,
      status: "ERROR",
      responseTimeMs: Date.now() - startedAt,
      token: options.token,
      userAgent,
      errorMessage: settings.requireSecretTokens
        ? "Invalid or missing feed token"
        : "Feed configuration not found",
    });

    return new Response(
      settings.requireSecretTokens
        ? "Unauthorized: valid feed token required"
        : "Feed configuration not found",
      { status: settings.requireSecretTokens ? 401 : 404 },
    );
  }

  if (isFeedExpired(config)) {
    const message = "Feed has expired";
    if (config.shopId) {
      await notifyFeedError({
        shopId: config.shopId,
        feedName: config.name,
        errorMessage: message,
      });
    }
    return new Response(message, { status: 410 });
  }

  if (settings.requireSecretTokens && !options.token) {
    const legacyPath = FEED_LEGACY_PATHS[options.feedType];
    await logFeedAccess({
      feedConfigId: config.id,
      feedName: config.name,
      feedType: options.feedType,
      status: "ERROR",
      responseTimeMs: Date.now() - startedAt,
      userAgent,
      errorMessage: `Token required. Use ${legacyPath}?token=${config.token}`,
    });

    return new Response("Unauthorized: feed token required", { status: 401 });
  }

  const meta = getChannelMeta(
    config.feedType,
    config.name,
    settings.storeName,
    settings.storeUrl,
  );

  const renderContext: FeedRenderContext = {
    feedType: config.feedType,
    shopId: config.shopId,
    targetCurrency: config.currencyCode,
    targetCountry: config.targetCountry,
    customTemplate: resolveTemplateForConfig(config),
  };

  let productCount = 0;
  const stream = new Readable({
    async read() {
      // handled manually below
    },
  });

  void (async () => {
    try {
      stream.push(buildStandardFeedHeader(meta));

      for await (const product of iterateFilteredProducts(config)) {
        productCount += 1;
        const itemXml = await buildFeedItemXml(product, renderContext);
        stream.push(`${itemXml}\n`);
      }

      stream.push(STANDARD_FEED_FOOTER);
      stream.push(null);

      const responseTimeMs = Date.now() - startedAt;
      await Promise.all([
        touchFeedGenerated(config.id, productCount),
        touchFeedAccess(config.id, { isDownload }),
        logFeedAccess({
          feedConfigId: config.id,
          feedName: config.name,
          feedType: config.feedType,
          status: "SUCCESS",
          responseTimeMs,
          productCount,
          isDownload,
          token: options.token ?? config.token,
          userAgent,
        }),
        logFeedRequest(config.feedType, productCount, "SUCCESS"),
        logSystemEvent({
          category: "feed",
          message: `Generated ${config.name}`,
          metadata: { feedType: config.feedType, productCount },
          shopId: config.shopId ?? undefined,
        }),
      ]);
    } catch (error) {
      const responseTimeMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : "Feed generation failed";
      stream.destroy(error instanceof Error ? error : undefined);

      await Promise.all([
        logFeedAccess({
          feedConfigId: config.id,
          feedName: config.name,
          feedType: config.feedType,
          status: "ERROR",
          responseTimeMs,
          productCount,
          isDownload,
          token: options.token ?? config.token,
          userAgent,
          errorMessage: message,
        }),
        notifyFeedError({
          shopId: config.shopId,
          feedName: config.name,
          errorMessage: message,
        }),
      ]);
    }
  })();

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Feed-Name": config.name,
      "X-Feed-Products": "streaming",
    },
  });
}

export async function createStreamingFeedByTokenResponse(options: {
  token: string;
  request: Request;
}) {
  const startedAt = Date.now();
  const userAgent = options.request.headers.get("user-agent");
  const config = await resolveFeedConfigByTokenOnly(options.token);

  if (!config) {
    await logFeedAccess({
      feedName: "Unknown Feed",
      feedType: "GOOGLE",
      status: "ERROR",
      responseTimeMs: Date.now() - startedAt,
      token: options.token,
      userAgent,
      errorMessage: "Invalid feed token",
    });
    return new Response("Feed not found", { status: 404 });
  }

  return createStreamingFeedResponse({
    feedType: config.feedType,
    token: options.token,
    request: options.request,
  });
}

async function resolveFeedConfigByTokenOnly(token: string) {
  const config = await getFeedConfigByToken(token);
  if (!config?.isActive) return null;
  return config;
}

export async function buildFeedXmlFromConfig(
  config: FeedConfig & { rules?: FeedRule[] },
) {
  const settings = await getAppSettings();
  const meta = getChannelMeta(
    config.feedType,
    config.name,
    settings.storeName,
    settings.storeUrl,
  );
  const renderContext: FeedRenderContext = {
    feedType: config.feedType,
    shopId: config.shopId,
    targetCurrency: config.currencyCode,
    targetCountry: config.targetCountry,
    customTemplate: resolveTemplateForConfig(config),
  };
  const items: string[] = [];

  for await (const product of iterateFilteredProducts(config)) {
    items.push(await buildFeedItemXml(product, renderContext));
  }

  return `${buildStandardFeedHeader(meta)}${items.join("\n")}\n${STANDARD_FEED_FOOTER}`;
}

// Re-export for backward compatibility
export { buildFeedItemXml } from "./feed-xml.server";
