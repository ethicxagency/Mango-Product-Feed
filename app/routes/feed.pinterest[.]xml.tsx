import type { LoaderFunctionArgs } from "react-router";
import { createStreamingFeedResponse } from "../services/feed-stream.server";
import { enforceRequestSecurity } from "../middleware/security.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await enforceRequestSecurity(request, { rateLimit: 60, rateLimitKey: "feed:pinterest" });
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  return createStreamingFeedResponse({
    feedType: "PINTEREST",
    token,
    request,
  });
}
