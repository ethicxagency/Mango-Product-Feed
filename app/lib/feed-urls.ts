/**
 * Builds the public/private feed URLs. Both point at the same streaming XML
 * route (implemented alongside feed generation); the private variant proves
 * possession of the feed's secret token via a query string.
 */
export function buildFeedUrls(
  appUrl: string,
  feed: { publicToken: string; secretToken: string },
) {
  const base = appUrl.replace(/\/$/, "");
  return {
    publicUrl: `${base}/feeds/${feed.publicToken}.xml`,
    privateUrl: `${base}/feeds/${feed.publicToken}.xml?token=${feed.secretToken}`,
  };
}
