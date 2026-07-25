import type { FeedItem } from "~/services/feed-rules/types";
import type { FeedTemplate, FeedTemplateContext } from "../feed-template";
import type { XmlWriter } from "../xml-writer";
import {
  writeApparelFields,
  writeCustomLabels,
  writePriceFields,
  writeShippingField,
} from "./shared-fields";

const GOOGLE_NAMESPACE = "http://base.google.com/ns/1.0";

/**
 * Meta Catalog generator — deliberately narrower than Google's. Meta's own
 * feed spec is documented as RSS 2.0 with the same `g:` namespace Google
 * popularized, but Meta doesn't use (and ignores or can reject items for)
 * Google-Shopping-only extensions like gtin/mpn/identifier_exists, tax,
 * energy efficiency, unit pricing, or the pickup/loyalty/subscription
 * fields — so this Generator never writes them, independent of whether
 * Google's generator would. google_product_category, shipping, and custom
 * labels reuse the same Settings > Google Merchant values Google's
 * generator uses (Meta's Settings section has no separate fields for
 * these — the taxonomy and shipping/label config are genuinely shared).
 */
export const metaFeedTemplate: FeedTemplate = {
  channel: "META",
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
    ctx: FeedTemplateContext,
    depth: number,
  ) {
    const meta = ctx.settings.metaCommerce;
    const google = ctx.settings.googleMerchant;
    const attrs = item.attributes;
    const brand = item.vendor || meta?.defaultBrand || "";

    let xml = writer.openTag("item", {}, depth);
    const d = depth + 1;

    xml += writer.textElement("g:id", item.itemId, d);
    xml += writer.textElement("title", item.title, d);
    xml += writer.textElement("description", item.description, d);
    xml += writer.textElement("g:availability", item.availability, d);
    xml += writer.textElement("g:condition", meta?.condition ?? "new", d);
    xml += writePriceFields(writer, item, d);
    xml += writer.textElement("link", item.link, d);
    xml += writer.textElement("g:image_link", item.image, d);
    for (const image of item.additionalImages) {
      xml += writer.textElement("g:additional_image_link", image, d);
    }
    xml += writer.textElement("g:brand", brand, d);
    if (google?.defaultProductCategory) {
      xml += writer.textElement(
        "g:google_product_category",
        google.defaultProductCategory,
        d,
      );
    }
    xml += writer.textElement("g:product_type", item.productType, d);
    xml += writer.textElement("g:item_group_id", item.groupId, d);

    if (attrs.isApparel) {
      xml += writeApparelFields(writer, attrs, d);
    }

    xml += writeCustomLabels(
      writer,
      [
        google?.defaultCustomLabel0,
        google?.defaultCustomLabel1,
        google?.defaultCustomLabel2,
        google?.defaultCustomLabel3,
        google?.defaultCustomLabel4,
      ],
      d,
    );

    xml += writeShippingField(writer, d, {
      country: google?.shippingCountry ?? "US",
      price: google?.shippingPrice ?? null,
      currency: item.currency,
    });

    xml += writer.closeTag("item", depth);
    return xml;
  },
};
