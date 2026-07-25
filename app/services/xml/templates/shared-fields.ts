import type { FeedItemAttributes } from "~/services/feed-rules/attributes";
import type { FeedItem } from "~/services/feed-rules/types";
import type { XmlWriter } from "../xml-writer";

/**
 * Reusable field-mapping layer shared by the Google/Meta/TikTok generators
 * (google.ts / meta.ts / tiktok.ts) — every one of those platforms
 * documents its RSS feed as accepting the same `g:`-namespaced element
 * names Google Merchant Center popularized, so the wire-level formatting
 * for price, apparel attributes, shipping, and custom labels is genuinely
 * shared, not duplicated per platform. What differs between platforms is
 * *which* of these a given Generator calls and in what combination — that
 * selection logic lives entirely in each Generator, per FeedItem -> Mapper
 * -> Platform XML.
 */

export function formatMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

/** g:price / g:sale_price — when there's a valid compare-at price, the
 * *regular* price is g:price and the current (discounted) price is
 * g:sale_price; otherwise only g:price is written. */
export function writePriceFields(
  writer: XmlWriter,
  item: Pick<FeedItem, "price" | "compareAtPrice" | "currency">,
  depth: number,
): string {
  if (item.compareAtPrice !== null) {
    return (
      writer.textElement(
        "g:price",
        formatMoney(item.compareAtPrice, item.currency),
        depth,
      ) +
      writer.textElement(
        "g:sale_price",
        formatMoney(item.price, item.currency),
        depth,
      )
    );
  }
  return writer.textElement(
    "g:price",
    formatMoney(item.price, item.currency),
    depth,
  );
}

/** gender/age_group/color/size/material/pattern/size_type/size_system —
 * supported by Google, Meta, and TikTok alike. Only ever written when a
 * real value is available (see feed-rules/attributes.ts); apparel
 * category detection gates nothing here, since an empty field is skipped
 * by XmlWriter.textElement regardless. */
export function writeApparelFields(
  writer: XmlWriter,
  attrs: FeedItemAttributes,
  depth: number,
): string {
  return (
    writer.textElement("g:gender", attrs.gender ?? "", depth) +
    writer.textElement("g:age_group", attrs.ageGroup ?? "", depth) +
    writer.textElement("g:color", attrs.color ?? "", depth) +
    writer.textElement("g:size", attrs.size ?? "", depth) +
    writer.textElement("g:material", attrs.material ?? "", depth) +
    writer.textElement("g:pattern", attrs.pattern ?? "", depth) +
    writer.textElement("g:size_type", attrs.sizeType ?? "", depth) +
    writer.textElement("g:size_system", attrs.sizeSystem ?? "", depth)
  );
}

/** g:custom_label_0 .. g:custom_label_4 — Google, Meta, and TikTok all
 * document this family. Values come from Settings (merchant-configured
 * per-shop defaults), not per-product data. */
export function writeCustomLabels(
  writer: XmlWriter,
  labels: (string | null | undefined)[],
  depth: number,
): string {
  return labels
    .slice(0, 5)
    .map((label, index) =>
      writer.textElement(`g:custom_label_${index}`, label ?? "", depth),
    )
    .join("");
}

/** g:shipping — nested country/price, only written when a shipping price
 * is actually configured (Settings > Google Merchant "shippingPrice").
 * Supported by Google, Meta, and TikTok. */
export function writeShippingField(
  writer: XmlWriter,
  depth: number,
  params: { country: string; price: number | null; currency: string },
): string {
  if (params.price === null) return "";
  return (
    writer.openTag("g:shipping", {}, depth) +
    writer.textElement("g:country", params.country, depth + 1) +
    writer.textElement(
      "g:price",
      formatMoney(params.price, params.currency),
      depth + 1,
    ) +
    writer.closeTag("g:shipping", depth)
  );
}
