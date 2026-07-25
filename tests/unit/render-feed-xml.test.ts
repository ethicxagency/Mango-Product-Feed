import { describe, expect, it } from "vitest";

import type { SettingsWithRelations } from "~/repositories/settings.repository.server";
import type { FeedItem } from "~/services/feed-rules/types";
import type { FeedTemplateContext } from "~/services/xml/feed-template";
import { renderFeedXml } from "~/services/xml/render-feed-xml.server";
import { getFeedTemplate } from "~/services/xml/templates/registry";
import { validateXml } from "~/services/xml/validate-xml";
import { FEED_CHANNELS } from "~/types/feed";

const emptyAttributes: FeedItem["attributes"] = {
  gtin: null,
  mpn: null,
  isApparel: false,
  color: null,
  size: null,
  material: null,
  pattern: null,
  gender: null,
  ageGroup: null,
  sizeType: null,
  sizeSystem: null,
  adult: null,
  multipack: null,
  isBundle: null,
  energyEfficiencyClass: null,
  minEnergyEfficiencyClass: null,
  maxEnergyEfficiencyClass: null,
  unitPricingMeasure: null,
  unitPricingBaseMeasure: null,
  adsRedirect: null,
  expirationDate: null,
  salePriceEffectiveDate: null,
  productDetail: null,
  productHighlights: [],
  installment: null,
  subscriptionCost: null,
  pickupMethod: null,
  pickupSla: null,
  sellOnGoogleQuantity: null,
  loyaltyPoints: null,
  taxRate: null,
};

const sampleItems: FeedItem[] = [
  {
    itemId: "p1-v1",
    groupId: "p1",
    title: "Classic Tee <Special>",
    description: 'A shirt & "friends"',
    link: "https://shop.example.com/products/classic-tee",
    vendor: "Acme & Co",
    productType: "Apparel > Shirts",
    image: "https://cdn.example.com/main.jpg",
    additionalImages: [
      "https://cdn.example.com/alt1.jpg",
      "https://cdn.example.com/alt2.jpg",
    ],
    price: 19.99,
    compareAtPrice: 29.99,
    currency: "USD",
    availability: "in stock",
    sku: "SKU-1",
    barcode: "012345678905",
    inventoryQuantity: 12,
    option1: "Red",
    option2: "Medium",
    option3: null,
    weight: 0.5,
    weightUnit: "kg",
    taxable: true,
    attributes: {
      ...emptyAttributes,
      gtin: "012345678905",
      mpn: "SKU-1",
      isApparel: true,
      color: "Red",
      size: "Medium",
    },
  },
  {
    itemId: "p2-v1",
    groupId: "p2",
    title: "Plain Mug",
    description: "A simple mug",
    link: "https://shop.example.com/products/plain-mug",
    vendor: "Acme",
    productType: "Home",
    image: "https://cdn.example.com/mug.jpg",
    additionalImages: [],
    price: 9.99,
    compareAtPrice: null,
    currency: "USD",
    availability: "out of stock",
    sku: "",
    barcode: "",
    inventoryQuantity: 0,
    option1: null,
    option2: null,
    option3: null,
    weight: 0.3,
    weightUnit: "kg",
    taxable: true,
    attributes: { ...emptyAttributes },
  },
];

const sampleSettings = {
  googleMerchant: {
    defaultBrand: "Settings Brand",
    defaultCondition: "new",
    identifierExists: true,
    shippingCountry: "US",
    shippingPrice: 4.99,
    taxEnabled: false,
    defaultProductCategory: "Apparel & Accessories",
    defaultCustomLabel0: "Label0",
    defaultCustomLabel1: "Label1",
    defaultCustomLabel2: "",
    defaultCustomLabel3: "",
    defaultCustomLabel4: "",
  },
  metaCommerce: {
    defaultBrand: "Meta Brand",
    condition: "new",
    inventoryPolicy: "DENY",
    facebookCatalogType: "commerce",
  },
  tiktok: {
    defaultBrand: "TikTok Brand",
    condition: "new",
    inventoryPolicy: "DENY",
    defaultProductCategory: "TikTok Apparel",
  },
  productRules: null,
} as unknown as SettingsWithRelations;

async function* asAsyncIterable(items: FeedItem[]) {
  for (const item of items) yield item;
}

async function renderToString(
  channel: (typeof FEED_CHANNELS)[number],
  ctxOverrides: Partial<FeedTemplateContext> = {},
  options = { pretty: true, cdata: false },
) {
  const template = getFeedTemplate(channel);
  const ctx: FeedTemplateContext = {
    feedTitle: "My Store Feed",
    feedDescription: "Feed description",
    feedLink: "https://shop.example.com",
    rootNode: template.defaultRootNode,
    itemNode: "item",
    settings: sampleSettings,
    ...ctxOverrides,
  };

  let xml = "";
  for await (const chunk of renderFeedXml(
    asAsyncIterable(sampleItems),
    template,
    ctx,
    options,
  )) {
    xml += chunk;
  }
  return xml;
}

describe.each(FEED_CHANNELS)("renderFeedXml for %s", (channel) => {
  it("produces well-formed XML", async () => {
    const xml = await renderToString(channel);
    const result = validateXml(xml);
    expect(result.valid, result.error).toBe(true);
  });

  it("escapes special characters in text content without CDATA", async () => {
    const xml = await renderToString(
      channel,
      {},
      { pretty: true, cdata: false },
    );
    expect(xml).toContain("Classic Tee &lt;Special&gt;");
    expect(xml).not.toContain("<Special>");
  });

  it("wraps text content in CDATA when configured", async () => {
    const xml = await renderToString(
      channel,
      {},
      { pretty: true, cdata: true },
    );
    expect(xml).toContain("<![CDATA[Classic Tee <Special>]]>");
    const result = validateXml(xml);
    expect(result.valid, result.error).toBe(true);
  });

  it("produces compact output with no indentation when pretty is off", async () => {
    const xml = await renderToString(
      channel,
      {},
      { pretty: false, cdata: false },
    );
    expect(xml).not.toContain("\n");
  });
});

describe("all RSS-style channels (GOOGLE/META/TIKTOK/PINTEREST/SNAPCHAT/MICROSOFT)", () => {
  it.each([
    "GOOGLE",
    "META",
    "TIKTOK",
    "PINTEREST",
    "SNAPCHAT",
    "MICROSOFT",
  ] as const)(
    "%s emits RSS with a g: namespace and the core fields every platform shares",
    async (channel) => {
      const xml = await renderToString(channel);
      expect(xml).toContain(
        '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
      );
      expect(xml).toContain("<channel>");
      expect(xml).toContain("<g:id>p1-v1</g:id>");
      expect(xml).toContain("<g:item_group_id>p1</g:item_group_id>");
      expect(xml).toContain("<g:availability>out of stock</g:availability>");
    },
  );
});

describe("Google Merchant generator", () => {
  it("emits the full spec: identifiers, category, shipping, custom labels, and apparel", async () => {
    const xml = await renderToString("GOOGLE");
    expect(xml).toContain("<g:mobile_link>");
    expect(xml).toContain("<g:canonical_link>");
    // Discounted item: regular price in g:price, current price in g:sale_price.
    expect(xml).toContain("<g:price>29.99 USD</g:price>");
    expect(xml).toContain("<g:sale_price>19.99 USD</g:sale_price>");
    expect(xml).toContain("<g:gtin>012345678905</g:gtin>");
    expect(xml).toContain("<g:mpn>SKU-1</g:mpn>");
    expect(xml).toContain(
      "<g:google_product_category>Apparel &amp; Accessories</g:google_product_category>",
    );
    expect(xml).toContain("<g:shipping>");
    expect(xml).toContain("<g:price>4.99 USD</g:price>");
    expect(xml).toContain("<g:custom_label_0>Label0</g:custom_label_0>");
    expect(xml).toContain("<g:custom_label_1>Label1</g:custom_label_1>");
    // Apparel fields, only for the apparel-categorized item.
    expect(xml).toContain("<g:color>Red</g:color>");
    expect(xml).toContain("<g:size>Medium</g:size>");
  });

  it("never emits gtin/mpn/identifier_exists as empty nodes", async () => {
    const xml = await renderToString("GOOGLE");
    expect(xml).not.toContain("<g:gtin></g:gtin>");
    expect(xml).not.toContain("<g:mpn></g:mpn>");
    // Mug has no barcode/sku but does have a vendor, so identifiers aren't
    // truly absent — identifier_exists should not be forced to "no".
    const mugSection = xml.split("<g:id>p2-v1</g:id>")[1]!;
    expect(mugSection).not.toContain(
      "<g:identifier_exists>no</g:identifier_exists>",
    );
  });

  it("falls back to the Settings default brand when a product has no vendor", async () => {
    const settingsNoVendor: FeedItem[] = [{ ...sampleItems[1]!, vendor: "" }];
    let xml = "";
    const template = getFeedTemplate("GOOGLE");
    const ctx: FeedTemplateContext = {
      feedTitle: "t",
      feedDescription: "d",
      feedLink: "https://shop.example.com",
      rootNode: template.defaultRootNode,
      itemNode: "item",
      settings: sampleSettings,
    };
    for await (const chunk of renderFeedXml(
      asAsyncIterable(settingsNoVendor),
      template,
      ctx,
      { pretty: true, cdata: false },
    )) {
      xml += chunk;
    }
    expect(xml).toContain("<g:brand>Settings Brand</g:brand>");
  });
});

describe("Meta Catalog generator", () => {
  it("only writes Meta-supported fields, never Google-only extensions", async () => {
    const xml = await renderToString("META");
    expect(xml).toContain("<g:condition>new</g:condition>");
    expect(xml).toContain("<g:brand>Acme &amp; Co</g:brand>");
    expect(xml).toContain("<g:color>Red</g:color>");
    expect(xml).toContain("<g:custom_label_0>Label0</g:custom_label_0>");
    // Meta never gets gtin/mpn/identifier_exists/mobile_link/canonical_link —
    // those are Google-Shopping-only extensions.
    expect(xml).not.toContain("g:gtin");
    expect(xml).not.toContain("g:mpn");
    expect(xml).not.toContain("g:identifier_exists");
    expect(xml).not.toContain("g:mobile_link");
    expect(xml).not.toContain("g:canonical_link");
  });
});

describe("TikTok Catalog generator", () => {
  it("uses its own Settings category and never writes custom labels", async () => {
    const xml = await renderToString("TIKTOK");
    expect(xml).toContain(
      "<g:google_product_category>TikTok Apparel</g:google_product_category>",
    );
    expect(xml).toContain("<g:brand>Acme &amp; Co</g:brand>");
    expect(xml).toContain("<g:color>Red</g:color>");
    expect(xml).not.toContain("g:custom_label");
    expect(xml).not.toContain("g:gtin");
    expect(xml).not.toContain("g:mpn");
  });
});

describe("Custom XML channel", () => {
  it("uses the configured root and item node names, no namespace", async () => {
    const xml = await renderToString("CUSTOM", {
      rootNode: "myFeed",
      itemNode: "product",
    });
    expect(xml).toContain("<myFeed>");
    expect(xml).toContain("<product>");
    expect(xml).toContain("<id>p1-v1</id>");
    expect(xml).toContain("<group_id>p1</group_id>");
    expect(xml).not.toContain("xmlns");
    expect(xml).not.toContain("<channel>");
  });

  it("omits null option fields instead of emitting empty elements", async () => {
    const xml = await renderToString("CUSTOM");
    expect(xml).not.toContain("<option3>");
  });
});

describe("validateXml", () => {
  it("flags genuinely malformed XML", () => {
    const result = validateXml("<a><b></a></b>");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
