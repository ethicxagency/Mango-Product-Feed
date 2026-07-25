/**
 * Channel-agnostic per-item enrichment: real product/variant fields plus
 * anything a merchant has set via `feed.*` metafields (apparel attributes,
 * GTIN/MPN overrides, and the long tail of rarely-used optional Google
 * attributes). This stays channel-agnostic on purpose — which of these a
 * given platform actually *writes* is each Generator's own decision (see
 * xml/templates/*.ts); this module only resolves what's actually available.
 *
 * Nothing here is fabricated: a field is populated only when real data
 * exists (a metafield value, or a validity-checked product field). No
 * metafield sync exists yet in this app, so today every optional field
 * below resolves to null for every product — that's correct, not a bug.
 * The moment a merchant or a future sync populates `feed.color`,
 * `feed.gtin`, etc. on a product, this starts emitting it automatically.
 */

export interface FeedItemAttributes {
  /** Validated GTIN (8/12/13/14 digits) — falls back to barcode only if it
   * actually looks like a GTIN; never emits a barcode that obviously isn't
   * one (e.g. an internal SKU-like code). */
  gtin: string | null;
  mpn: string | null;
  isApparel: boolean;
  color: string | null;
  size: string | null;
  material: string | null;
  pattern: string | null;
  gender: string | null;
  ageGroup: string | null;
  sizeType: string | null;
  sizeSystem: string | null;
  adult: string | null;
  multipack: string | null;
  isBundle: string | null;
  energyEfficiencyClass: string | null;
  minEnergyEfficiencyClass: string | null;
  maxEnergyEfficiencyClass: string | null;
  unitPricingMeasure: string | null;
  unitPricingBaseMeasure: string | null;
  adsRedirect: string | null;
  expirationDate: string | null;
  salePriceEffectiveDate: string | null;
  productDetail: string | null;
  productHighlights: string[];
  installment: string | null;
  subscriptionCost: string | null;
  pickupMethod: string | null;
  pickupSla: string | null;
  sellOnGoogleQuantity: string | null;
  loyaltyPoints: string | null;
  taxRate: string | null;
}

export interface ProductMetafieldInput {
  namespace: string;
  key: string;
  value: string;
}

const APPAREL_KEYWORDS = [
  "apparel",
  "clothing",
  "shirt",
  "t-shirt",
  "dress",
  "pant",
  "jean",
  "skirt",
  "short",
  "jacket",
  "coat",
  "shoe",
  "footwear",
  "sneaker",
  "boot",
  "sock",
  "underwear",
  "swimwear",
  "hat",
  "cap",
  "glove",
  "scarf",
  "handbag",
  "jewelry",
  "watch",
  "accessor",
];

export function isApparelCategory(productType: string): boolean {
  const haystack = productType.toLowerCase();
  return APPAREL_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

/** Google/Meta/TikTok all require a GTIN to be a bare 8/12/13/14-digit
 * code — a non-numeric or wrong-length barcode isn't a GTIN and must be
 * omitted rather than published as one. */
export function isValidGtin(value: string): boolean {
  const trimmed = value.trim();
  return /^\d{8}$|^\d{12,14}$/.test(trimmed);
}

const FEED_METAFIELD_NAMESPACE = "feed";

function readMetafield(
  metafields: ProductMetafieldInput[],
  key: string,
): string | null {
  const value = metafields
    .find((m) => m.namespace === FEED_METAFIELD_NAMESPACE && m.key === key)
    ?.value.trim();
  return value ? value : null;
}

export interface ResolveFeedItemAttributesParams {
  barcode: string;
  sku: string;
  productType: string;
  metafields: ProductMetafieldInput[];
}

export function resolveFeedItemAttributes({
  barcode,
  sku,
  productType,
  metafields,
}: ResolveFeedItemAttributesParams): FeedItemAttributes {
  const mf = (key: string) => readMetafield(metafields, key);

  const gtinOverride = mf("gtin");
  const resolvedGtin =
    gtinOverride && isValidGtin(gtinOverride)
      ? gtinOverride
      : isValidGtin(barcode)
        ? barcode
        : null;

  const productHighlightRaw = mf("product_highlight");

  return {
    gtin: resolvedGtin,
    mpn: mf("mpn") ?? (sku.trim() ? sku.trim() : null),
    isApparel: isApparelCategory(productType),
    color: mf("color"),
    size: mf("size"),
    material: mf("material"),
    pattern: mf("pattern"),
    gender: mf("gender"),
    ageGroup: mf("age_group"),
    sizeType: mf("size_type"),
    sizeSystem: mf("size_system"),
    adult: mf("adult"),
    multipack: mf("multipack"),
    isBundle: mf("is_bundle"),
    energyEfficiencyClass: mf("energy_efficiency_class"),
    minEnergyEfficiencyClass: mf("min_energy_efficiency_class"),
    maxEnergyEfficiencyClass: mf("max_energy_efficiency_class"),
    unitPricingMeasure: mf("unit_pricing_measure"),
    unitPricingBaseMeasure: mf("unit_pricing_base_measure"),
    adsRedirect: mf("ads_redirect"),
    expirationDate: mf("expiration_date"),
    salePriceEffectiveDate: mf("sale_price_effective_date"),
    productDetail: mf("product_detail"),
    productHighlights: productHighlightRaw
      ? productHighlightRaw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : [],
    installment: mf("installment"),
    subscriptionCost: mf("subscription_cost"),
    pickupMethod: mf("pickup_method"),
    pickupSla: mf("pickup_sla"),
    sellOnGoogleQuantity: mf("sell_on_google_quantity"),
    loyaltyPoints: mf("loyalty_points"),
    taxRate: mf("tax_rate"),
  };
}
