import type { LoaderFunctionArgs } from "@remix-run/node";

import { getAppUrl } from "~/lib/env.server";
import { feedHistoryRepository } from "~/repositories/feed-history.repository.server";
import { feedRepository } from "~/repositories/feed.repository.server";
import { streamFeedXml } from "~/services/feed-generation.service.server";

/**
 * Serves the actual feed XML at /feeds/:publicToken.xml. Both the public
 * and private URLs shown in the feed editor point here — the only
 * difference is whether a `?token=` query string is present:
 *
 *   - No token: served only while the feed is ENABLED (the "public" URL).
 *   - Correct `?token=<secretToken>`: served regardless of enabled state
 *     (the "private" URL, meant for previewing a feed before switching it
 *     on, or as a more locked-down URL to hand to an ad platform).
 *   - Wrong token: rejected, even if the feed is enabled.
 *
 * `?download=1` additionally marks the response as a file attachment and
 * logs a download-history entry — used by the "Download XML" button in the
 * feed editor. Routine ad-platform polling never sets this flag, so it
 * doesn't spam the download history.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const publicToken = params.publicToken;
  if (!publicToken) {
    throw new Response("Not Found", { status: 404 });
  }

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
  } else if (feed.status !== "ENABLED") {
    throw new Response("This feed is currently disabled", { status: 403 });
  }

  if (isDownload) {
    await feedHistoryRepository.recordDownload(feed.id, {
      source: suppliedToken ? "PRIVATE_URL" : "PUBLIC_URL",
      userAgent: request.headers.get("user-agent"),
    });
  }

  const { chunks } = streamFeedXml(feed, getAppUrl());
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
