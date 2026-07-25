import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { feedRepository } from "~/repositories/feed.repository.server";
import { resolveShopDomain } from "~/services/feed-serving.service.server";

/**
 * Legacy feed URL: /feeds/:publicToken.xml
 *
 * Superseded by the shop-scoped /:shopDomain/feeds/view/:token.xml route
 * (see feed-urls.ts), but old links (bookmarked, or already handed to an
 * ad platform) must keep working — so this just redirects to the new
 * location instead of serving XML itself, preserving any `?token=` or
 * `&download=1` query string. All real serving logic lives in
 * feed-serving.service.server.ts, shared with the new route.
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

  const shopDomain = await resolveShopDomain(feed.shopId);
  if (!shopDomain) {
    throw new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  return redirect(`/${shopDomain}/feeds/view/${publicToken}.xml${url.search}`);
}
