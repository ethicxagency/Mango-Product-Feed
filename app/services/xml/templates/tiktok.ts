import type { FeedItem } from "~/services/feed-rules/types";
import type { FeedTemplate, FeedTemplateContext } from "../feed-template";
import type { XmlWriter } from "../xml-writer";
import {
  writeApparelFields,
  writePriceFields,
  writeShippingField,
} from "./shared-fields";

const GOOGLE_NAMESPACE = "http://base.google.com/ns/1.0";

/**
 * TikTok Catalog generator — like Meta, TikTok documents its feed as
 * accepting Google's `g:` RSS format but only recognizes a specific
 * subset. Notably no custom_label support and no gtin/mpn/tax/identifier
 * fields — TikTok's own Settings section has its own `defaultProductCategory`
 * (unlike Meta, which shares Google's), so that's used here instead of
 * Settings > Google Merchant.
 */
export const tiktokFeedTemplate: FeedTemplate = {
  channel: "TIKTOK",
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
    const tiktok = ctx.settings.tiktok;
    const attrs = item.attributes;
    const brand = item.vendor || tiktok?.defaultBrand || "";

    let xml = writer.openTag("item", {}, depth);
    const d = depth + 1;

    xml += writer.textElement("g:id", item.itemId, d);
    xml += writer.textElement("title", item.title, d);
    xml += writer.textElement("description", item.description, d);
    xml += writer.textElement("g:availability", item.availability, d);
    xml += writePriceFields(writer, item, d);
    xml += writer.textElement("g:brand", brand, d);
    xml += writer.textElement("g:condition", tiktok?.condition ?? "new", d);
    xml += writer.textElement("link", item.link, d);
    xml += writer.textElement("g:image_link", item.image, d);
    for (const image of item.additionalImages) {
      xml += writer.textElement("g:additional_image_link", image, d);
    }
    if (tiktok?.defaultProductCategory) {
      xml += writer.textElement(
        "g:google_product_category",
        tiktok.defaultProductCategory,
        d,
      );
    }
    xml += writer.textElement("g:product_type", item.productType, d);

    if (attrs.isApparel) {
      xml += writeApparelFields(writer, attrs, d);
    }

    xml += writer.textElement("g:item_group_id", item.groupId, d);
    xml += writeShippingField(writer, d, {
      country: ctx.settings.googleMerchant?.shippingCountry ?? "US",
      price: ctx.settings.googleMerchant?.shippingPrice ?? null,
      currency: item.currency,
    });

    xml += writer.closeTag("item", depth);
    return xml;
  },
};
