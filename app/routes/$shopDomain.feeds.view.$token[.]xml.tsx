import type { LoaderFunctionArgs } from "@remix-run/node";

import { feedRepository } from "~/repositories/feed.repository.server";
import {
  resolveShopDomain,
  serveFeedXml,
} from "~/services/feed-serving.service.server";

/**
 * Canonical feed-serving route: /:shopDomain/feeds/view/:token.xml
 *
 * The shop domain is part of the canonical path, so a token that resolves
 * to a different shop 404s here rather than silently serving — same
 * not-found behavior as an unknown token. All actual validation (token,
 * status, security settings) and streaming lives in the shared service so
 * this route and the legacy redirect below never duplicate that logic.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { shopDomain, token } = params;
  if (!shopDomain || !token) {
    throw new Response("Not Found", { status: 404 });
  }

  const feed = await feedRepository.findByPublicToken(token);
  if (!feed) {
    throw new Response("Not Found", { status: 404 });
  }

  const feedShopDomain = await resolveShopDomain(feed.shopId);
  if (feedShopDomain !== shopDomain) {
    throw new Response("Not Found", { status: 404 });
  }

  return serveFeedXml(request, token);
}
