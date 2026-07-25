/**
 * Builds the public/private feed URLs. Both point at the same streaming XML
 * route (implemented alongside feed generation); the private variant proves
 * possession of the feed's secret token via a query string.
 *
 * The base always comes from APP_URL (see env.server.ts) — never hardcode a
 * domain here, since this same code runs unchanged in local dev and in
 * every deployed environment.
 */
export function buildFeedUrls(
  appUrl: string,
  feed: { publicToken: string; secretToken: string },
  shopDomain: string,
) {
  const base = appUrl.replace(/\/$/, "");
  const path = `/${shopDomain}/feeds/view/${feed.publicToken}.xml`;
  return {
    publicUrl: `${base}${path}`,
    privateUrl: `${base}${path}?token=${feed.secretToken}`,
  };
}
