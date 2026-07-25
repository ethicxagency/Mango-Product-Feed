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
 * Google Merchant Center generator — the full spec. Every optional field
 * below is genuinely conditional: it's written only when real data backs
 * it (a Settings > Google Merchant value, a `feed.*` metafield, or a
 * validity-checked product/variant field). Nothing here is fabricated —
 * see feed-rules/attributes.ts for exactly where each optional value
 * would come from once a merchant (or a future metafield sync) sets it.
 */
export const googleFeedTemplate: FeedTemplate = {
  channel: "GOOGLE",
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
    const google = ctx.settings.googleMerchant;
    const attrs = item.attributes;
    const brand = item.vendor || google?.defaultBrand || "";

    let xml = writer.openTag("item", {}, depth);
    const d = depth + 1;

    // Core identification
    xml += writer.textElement("g:id", item.itemId, d);
    xml += writer.textElement("title", item.title, d);
    xml += writer.textElement("description", item.description, d);
    xml += writer.textElement("link", item.link, d);
    xml += writer.textElement("g:mobile_link", item.link, d);
    xml += writer.textElement("g:canonical_link", item.link, d);

    // Images
    xml += writer.textElement("g:image_link", item.image, d);
    for (const image of item.additionalImages) {
      xml += writer.textElement("g:additional_image_link", image, d);
    }

    // Availability & pricing
    xml += writer.textElement("g:availability", item.availability, d);
    xml += writePriceFields(writer, item, d);
    if (attrs.salePriceEffectiveDate) {
      xml += writer.textElement(
        "g:sale_price_effective_date",
        attrs.salePriceEffectiveDate,
        d,
      );
    }

    // Brand / condition / identifiers
    xml += writer.textElement("g:brand", brand, d);
    xml += writer.textElement(
      "g:condition",
      google?.defaultCondition ?? "new",
      d,
    );
    if (attrs.gtin) xml += writer.textElement("g:gtin", attrs.gtin, d);
    if (attrs.mpn) xml += writer.textElement("g:mpn", attrs.mpn, d);
    const hasIdentifier = Boolean(attrs.gtin) || Boolean(attrs.mpn);
    if (google?.identifierExists === false || (!hasIdentifier && !brand)) {
      xml += writer.textElement("g:identifier_exists", "no", d);
    }

    // Categorization
    if (google?.defaultProductCategory) {
      xml += writer.textElement(
        "g:google_product_category",
        google.defaultProductCategory,
        d,
      );
    }
    xml += writer.textElement("g:product_type", item.productType, d);
    xml += writer.textElement("g:item_group_id", item.groupId, d);

    // Shipping & tax
    xml += writeShippingField(writer, d, {
      country: google?.shippingCountry ?? "US",
      price: google?.shippingPrice ?? null,
      currency: item.currency,
    });
    if (google?.taxEnabled && item.taxable && attrs.taxRate) {
      xml += writer.openTag("g:tax", {}, d);
      xml += writer.textElement("g:country", google.shippingCountry, d + 1);
      xml += writer.textElement("g:rate", attrs.taxRate, d + 1);
      xml += writer.textElement("g:tax_ship", "y", d + 1);
      xml += writer.closeTag("g:tax", d);
    }

    // Flags
    if (attrs.adult) xml += writer.textElement("g:adult", attrs.adult, d);
    if (attrs.multipack) {
      xml += writer.textElement("g:multipack", attrs.multipack, d);
    }
    if (attrs.isBundle)
      xml += writer.textElement("g:is_bundle", attrs.isBundle, d);

    // Energy efficiency
    if (attrs.energyEfficiencyClass) {
      xml += writer.textElement(
        "g:energy_efficiency_class",
        attrs.energyEfficiencyClass,
        d,
      );
    }
    if (attrs.minEnergyEfficiencyClass) {
      xml += writer.textElement(
        "g:min_energy_efficiency_class",
        attrs.minEnergyEfficiencyClass,
        d,
      );
    }
    if (attrs.maxEnergyEfficiencyClass) {
      xml += writer.textElement(
        "g:max_energy_efficiency_class",
        attrs.maxEnergyEfficiencyClass,
        d,
      );
    }

    // Unit pricing
    if (attrs.unitPricingMeasure) {
      xml += writer.textElement(
        "g:unit_pricing_measure",
        attrs.unitPricingMeasure,
        d,
      );
    }
    if (attrs.unitPricingBaseMeasure) {
      xml += writer.textElement(
        "g:unit_pricing_base_measure",
        attrs.unitPricingBaseMeasure,
        d,
      );
    }

    // Apparel (auto-populated only for apparel-categorized products, and
    // only ever written when a real value exists)
    if (attrs.isApparel) {
      xml += writeApparelFields(writer, attrs, d);
    }

    // Misc optional
    if (attrs.adsRedirect) {
      xml += writer.textElement("g:ads_redirect", attrs.adsRedirect, d);
    }
    if (attrs.expirationDate) {
      xml += writer.textElement("g:expiration_date", attrs.expirationDate, d);
    }
    if (attrs.productDetail) {
      xml += writer.textElement("g:product_detail", attrs.productDetail, d);
    }
    for (const highlight of attrs.productHighlights) {
      xml += writer.textElement("g:product_highlight", highlight, d);
    }
    if (attrs.installment) {
      xml += writer.textElement("g:installment", attrs.installment, d);
    }
    if (attrs.subscriptionCost) {
      xml += writer.textElement(
        "g:subscription_cost",
        attrs.subscriptionCost,
        d,
      );
    }
    if (attrs.pickupMethod) {
      xml += writer.textElement("g:pickup_method", attrs.pickupMethod, d);
    }
    if (attrs.pickupSla) {
      xml += writer.textElement("g:pickup_sla", attrs.pickupSla, d);
    }
    if (attrs.sellOnGoogleQuantity) {
      xml += writer.textElement(
        "g:sell_on_google_quantity",
        attrs.sellOnGoogleQuantity,
        d,
      );
    }
    if (attrs.loyaltyPoints) {
      xml += writer.textElement("g:loyalty_points", attrs.loyaltyPoints, d);
    }

    // Custom labels (Settings > Google Merchant)
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

    xml += writer.closeTag("item", depth);
    return xml;
  },
};
