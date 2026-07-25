import { db } from "~/lib/db.server";
import { getAppUrl } from "~/lib/env.server";
import { feedHistoryRepository } from "~/repositories/feed-history.repository.server";
import { feedRepository } from "~/repositories/feed.repository.server";
import { streamFeedXml } from "~/services/feed-generation.service.server";

/** Shop.shopifyDomain for a given feed — used both by the canonical serving
 * route (to validate the URL's shop segment) and by the legacy route (to
 * build the redirect target), so it isn't looked up twice per request path. */
export async function resolveShopDomain(
  shopId: string,
): Promise<string | null> {
  const shop = await db.shop.findUnique({
    where: { id: shopId },
    select: { shopifyDomain: true },
  });
  return shop?.shopifyDomain ?? null;
}

/**
 * The actual feed-serving logic: token/status/security validation, download
 * logging, and the streaming XML response. Shared by every route that can
 * serve a feed's XML, so the validation rules only exist in one place.
 *
 *   - No `?token=`: served only while the feed is ENABLED, unless
 *     Settings > Security has "require secret token" on or "expire public
 *     URLs" has been triggered — either one blocks no-token access
 *     regardless of the feed's own status.
 *   - Correct `?token=<secretToken>`: always served, regardless of the
 *     feed's status or the shop-wide security settings above (this is the
 *     "private" URL, meant for previewing a feed before switching it on,
 *     or as a locked-down URL to hand to an ad platform).
 *   - Wrong token: rejected, even if the feed is enabled.
 *
 * `?download=1` additionally marks the response as a file attachment and
 * logs a download-history entry.
 */
export async function serveFeedXml(
  request: Request,
  publicToken: string,
): Promise<Response> {
  const feed = await feedRepository.findByPublicToken(publicToken);
  if (!feed) {
    throw new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const suppliedToken = url.searchParams.get("token");
  const isDownload = url.searchParams.get("download") === "1";

  if (suppliedToken) {
    if (suppliedToken !== feed.secretToken) {
      throw new Response("Invalid feed token", { status: 403 });
    }
  } else {
    if (feed.status !== "ENABLED") {
      throw new Response("This feed is currently disabled", { status: 403 });
    }

    const settings = await db.settings.findUnique({
      where: { shopId: feed.shopId },
      select: { requireSecretTokenGlobally: true, publicUrlsExpireAt: true },
    });
    if (settings?.requireSecretTokenGlobally) {
      throw new Response("This feed requires a secret token", { status: 403 });
    }
    if (
      settings?.publicUrlsExpireAt &&
      settings.publicUrlsExpireAt <= new Date()
    ) {
      throw new Response("Public feed URLs have been disabled for this store", {
        status: 403,
      });
    }
  }

  if (isDownload) {
    await feedHistoryRepository.recordDownload(feed.id, {
      source: suppliedToken ? "PRIVATE_URL" : "PUBLIC_URL",
      userAgent: request.headers.get("user-agent"),
    });
  }

  const { chunks } = await streamFeedXml(feed, getAppUrl());
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await chunks.next();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(value));
    },
    async cancel() {
      await chunks.return(undefined);
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (isDownload) {
    headers["Content-Disposition"] =
      `attachment; filename="${feed.name.replace(/[^a-z0-9-_]+/gi, "-")}.xml"`;
  }

  return new Response(stream, { headers });
}
