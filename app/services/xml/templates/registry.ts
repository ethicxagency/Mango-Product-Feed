import type { FeedChannel } from "~/types/feed";
import type { FeedTemplate } from "../feed-template";
import { customTemplate } from "./custom";
import { createGoogleStyleTemplate } from "./google-style";

const templates: Record<FeedChannel, FeedTemplate> = {
  GOOGLE: createGoogleStyleTemplate("GOOGLE"),
  META: createGoogleStyleTemplate("META"),
  TIKTOK: createGoogleStyleTemplate("TIKTOK"),
  PINTEREST: createGoogleStyleTemplate("PINTEREST"),
  SNAPCHAT: createGoogleStyleTemplate("SNAPCHAT"),
  MICROSOFT: createGoogleStyleTemplate("MICROSOFT"),
  CUSTOM: customTemplate,
};

export function getFeedTemplate(channel: FeedChannel): FeedTemplate {
  return templates[channel];
}
