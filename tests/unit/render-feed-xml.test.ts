import { describe, expect, it } from "vitest";

import type { FeedItem } from "~/services/feed-rules/types";
import type { FeedTemplateContext } from "~/services/xml/feed-template";
import { renderFeedXml } from "~/services/xml/render-feed-xml.server";
import { getFeedTemplate } from "~/services/xml/templates/registry";
import { validateXml } from "~/services/xml/validate-xml";
import { FEED_CHANNELS } from "~/types/feed";

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
  },
];

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

describe("Google-style channel templates (GOOGLE/META/TIKTOK/PINTEREST/SNAPCHAT/MICROSOFT)", () => {
  it.each([
    "GOOGLE",
    "META",
    "TIKTOK",
    "PINTEREST",
    "SNAPCHAT",
    "MICROSOFT",
  ] as const)(
    "%s emits RSS with a g: namespace and per-item g:fields",
    async (channel) => {
      const xml = await renderToString(channel);
      expect(xml).toContain(
        '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
      );
      expect(xml).toContain("<channel>");
      expect(xml).toContain("<g:id>p1-v1</g:id>");
      expect(xml).toContain("<g:item_group_id>p1</g:item_group_id>");
      // Discounted item: regular price in g:price, current price in g:sale_price.
      expect(xml).toContain("<g:price>29.99 USD</g:price>");
      expect(xml).toContain("<g:sale_price>19.99 USD</g:sale_price>");
      // Non-discounted item: only g:price, no g:sale_price.
      expect(xml).toContain("<g:price>9.99 USD</g:price>");
      expect(xml).not.toContain("<g:sale_price>9.99 USD</g:sale_price>");
      expect(xml).toContain("<g:availability>out of stock</g:availability>");
      // Empty SKU/barcode fields are omitted, not emitted empty.
      expect(xml).not.toContain("<g:gtin></g:gtin>");
      expect(xml).not.toContain("<g:mpn></g:mpn>");
    },
  );
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
