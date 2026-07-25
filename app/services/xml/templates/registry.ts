import type { FeedChannel } from "~/types/feed";
import type { FeedTemplate } from "../feed-template";
import { customTemplate } from "./custom";
import { googleFeedTemplate } from "./google";
import { createGoogleStyleTemplate } from "./google-style";
import { metaFeedTemplate } from "./meta";
import { tiktokFeedTemplate } from "./tiktok";

/**
 * GOOGLE/META/TIKTOK each have their own generator now (see google.ts /
 * meta.ts / tiktok.ts) with platform-curated field sets. Pinterest,
 * Snapchat, and Microsoft Shopping stay on the shared Google-style RSS
 * template — their catalog specs are genuinely close enough to Google's
 * that a dedicated generator isn't justified yet, and this is exactly the
 * seam a future PinterestFeedGenerator/etc. would plug into without
 * touching Google/Meta/TikTok's generators at all.
 */
const templates: Record<FeedChannel, FeedTemplate> = {
  GOOGLE: googleFeedTemplate,
  META: metaFeedTemplate,
  TIKTOK: tiktokFeedTemplate,
  PINTEREST: createGoogleStyleTemplate("PINTEREST"),
  SNAPCHAT: createGoogleStyleTemplate("SNAPCHAT"),
  MICROSOFT: createGoogleStyleTemplate("MICROSOFT"),
  CUSTOM: customTemplate,
};

export function getFeedTemplate(channel: FeedChannel): FeedTemplate {
  return templates[channel];
}
