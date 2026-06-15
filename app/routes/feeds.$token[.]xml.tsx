import type { LoaderFunctionArgs } from "react-router";
import { createStreamingFeedByTokenResponse } from "../services/feed-stream.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = params.token ?? "";
  return createStreamingFeedByTokenResponse({ token, request });
}
