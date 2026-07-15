import type { FeedItem } from "~/services/feed-rules/types";
import type { FeedChannel } from "~/types/feed";
import type { FeedTemplate, FeedTemplateContext } from "../feed-template";
import type { XmlWriter } from "../xml-writer";

const GOOGLE_NAMESPACE = "http://base.google.com/ns/1.0";

function formatMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Google Merchant Center's RSS 2.0 + g: namespace format has become the de
 * facto standard for shopping feeds — Meta, TikTok, Pinterest, Snapchat and
 * Microsoft Shopping all document their catalog feeds as accepting this
 * same shape. Rather than duplicating near-identical templates six times,
 * every RSS-style channel is this one field mapping with a different
 * channel id, which keeps them consistent and leaves one place to fix bugs.
 */
export function createGoogleStyleTemplate(channel: FeedChannel): FeedTemplate {
  return {
    channel,
    defaultRootNode: "rss",
    wrapperNode: "channel",
    namespaces: { g: GOOGLE_NAMESPACE },

    writeChannelMeta(writer, ctx, depth) {
      return (
        writer.textElement("title", ctx.feedTitle, depth) +
        writer.textElement("link", ctx.feedLink, depth) +
        writer.textElement("description", ctx.feedDescription, depth)
      );
    },

    writeItem(
      writer: XmlWriter,
      item: FeedItem,
      _ctx: FeedTemplateContext,
      depth: number,
    ) {
      let xml = writer.openTag("item", {}, depth);
      const d = depth + 1;

      xml += writer.textElement("g:id", item.itemId, d);
      xml += writer.textElement("title", item.title, d);
      xml += writer.textElement("description", item.description, d);
      xml += writer.textElement("link", item.link, d);
      xml += writer.textElement("g:image_link", item.image, d);
      for (const image of item.additionalImages) {
        xml += writer.textElement("g:additional_image_link", image, d);
      }
      xml += writer.textElement("g:availability", item.availability, d);

      if (item.compareAtPrice !== null) {
        xml += writer.textElement(
          "g:price",
          formatMoney(item.compareAtPrice, item.currency),
          d,
        );
        xml += writer.textElement(
          "g:sale_price",
          formatMoney(item.price, item.currency),
          d,
        );
      } else {
        xml += writer.textElement(
          "g:price",
          formatMoney(item.price, item.currency),
          d,
        );
      }

      xml += writer.textElement("g:brand", item.vendor, d);
      xml += writer.textElement("g:condition", "new", d);
      xml += writer.textElement("g:gtin", item.barcode, d);
      xml += writer.textElement("g:mpn", item.sku, d);
      xml += writer.textElement("g:product_type", item.productType, d);
      xml += writer.textElement("g:item_group_id", item.groupId, d);

      xml += writer.closeTag("item", depth);
      return xml;
    },
  };
}
