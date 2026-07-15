import type { FeedItem } from "~/services/feed-rules/types";
import type { FeedTemplate } from "../feed-template";

/**
 * The fully custom channel: no namespaces, plain element names, and the
 * root/item element names come from the feed's own configuration instead
 * of being fixed here (see render-feed-xml.server.ts, which reads
 * ctx.rootNode/itemNode for every template but only this one is normally
 * configured to something other than "rss"/"item").
 */
export const customTemplate: FeedTemplate = {
  channel: "CUSTOM",
  defaultRootNode: "feed",
  wrapperNode: null,
  namespaces: {},

  writeChannelMeta() {
    return "";
  },

  writeItem(writer, item: FeedItem, ctx, depth) {
    let xml = writer.openTag(ctx.itemNode, {}, depth);
    const d = depth + 1;

    xml += writer.textElement("id", item.itemId, d);
    xml += writer.textElement("group_id", item.groupId, d);
    xml += writer.textElement("title", item.title, d);
    xml += writer.textElement("description", item.description, d);
    xml += writer.textElement("link", item.link, d);
    xml += writer.textElement("image", item.image, d);
    for (const image of item.additionalImages) {
      xml += writer.textElement("additional_image", image, d);
    }
    xml += writer.textElement("price", item.price.toFixed(2), d);
    if (item.compareAtPrice !== null) {
      xml += writer.textElement(
        "compare_at_price",
        item.compareAtPrice.toFixed(2),
        d,
      );
    }
    xml += writer.textElement("currency", item.currency, d);
    xml += writer.textElement("availability", item.availability, d);
    xml += writer.textElement("vendor", item.vendor, d);
    xml += writer.textElement("product_type", item.productType, d);
    xml += writer.textElement("sku", item.sku, d);
    xml += writer.textElement("barcode", item.barcode, d);
    xml += writer.textElement(
      "inventory_quantity",
      String(item.inventoryQuantity),
      d,
    );
    if (item.option1) xml += writer.textElement("option1", item.option1, d);
    if (item.option2) xml += writer.textElement("option2", item.option2, d);
    if (item.option3) xml += writer.textElement("option3", item.option3, d);
    xml += writer.textElement("weight", String(item.weight), d);
    xml += writer.textElement("weight_unit", item.weightUnit, d);

    xml += writer.closeTag(ctx.itemNode, depth);
    return xml;
  },
};
