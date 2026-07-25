import type { SettingsWithRelations } from "~/repositories/settings.repository.server";
import type { FeedItem } from "~/services/feed-rules/types";
import type { FeedChannel } from "~/types/feed";
import type { XmlWriter } from "./xml-writer";

export interface FeedTemplateContext {
  feedTitle: string;
  feedDescription: string;
  feedLink: string;
  rootNode: string;
  itemNode: string;
  /** Shop-wide merchant configuration (Settings > Google Merchant / Meta
   * Commerce / TikTok) — platform-specific defaults like brand, condition,
   * product category, custom labels, and shipping price live here rather
   * than per-product, since they're genuinely shop-level settings. */
  settings: SettingsWithRelations;
}

/**
 * One entry per supported sales channel. Each template owns its root
 * element, namespaces, and per-item field mapping — adding a new channel
 * later is just registering one more object here, nothing else in the
 * generation pipeline changes.
 */
export interface FeedTemplate {
  channel: FeedChannel;
  /** Root element name, ignoring any user-supplied custom override. */
  defaultRootNode: string;
  /** Element wrapping the list of items (e.g. RSS's <channel>), or null if
   * items sit directly under the root. */
  wrapperNode: string | null;
  namespaces: Record<string, string>;
  writeChannelMeta(
    writer: XmlWriter,
    ctx: FeedTemplateContext,
    depth: number,
  ): string;
  writeItem(
    writer: XmlWriter,
    item: FeedItem,
    ctx: FeedTemplateContext,
    depth: number,
  ): string;
}
