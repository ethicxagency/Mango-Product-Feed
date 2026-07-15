import { describe, expect, it } from "vitest";

import {
  mapProduct,
  mapVariant,
  mapWeightUnit,
} from "~/services/shopify/mappers";
import type {
  ShopifyProductNode,
  ShopifyProductVariantNode,
} from "~/services/shopify/graphql/product-queries";

describe("mapWeightUnit", () => {
  it("maps every known Shopify weight unit", () => {
    expect(mapWeightUnit("GRAMS")).toBe("g");
    expect(mapWeightUnit("KILOGRAMS")).toBe("kg");
    expect(mapWeightUnit("OUNCES")).toBe("oz");
    expect(mapWeightUnit("POUNDS")).toBe("lb");
  });

  it("falls back to kg for unknown or missing units", () => {
    expect(mapWeightUnit(undefined)).toBe("kg");
    expect(mapWeightUnit("STONE")).toBe("kg");
  });
});

const baseVariantNode: ShopifyProductVariantNode = {
  id: "gid://shopify/ProductVariant/1",
  title: "Default Title",
  sku: "SKU-1",
  barcode: "012345678905",
  price: "19.99",
  compareAtPrice: "29.99",
  taxable: true,
  selectedOptions: [{ name: "Color", value: "Red" }],
  inventoryQuantity: 10,
  inventoryPolicy: "DENY",
  inventoryItem: {
    id: "gid://shopify/InventoryItem/1",
    requiresShipping: true,
    measurement: { weight: { value: 0.5, unit: "KILOGRAMS" } },
  },
  image: { id: "gid://shopify/ProductImage/1" },
};

describe("mapVariant", () => {
  it("maps a fully-populated variant", () => {
    const mapped = mapVariant(baseVariantNode, 1);
    expect(mapped).toEqual({
      shopifyId: "gid://shopify/ProductVariant/1",
      shopifyInventoryItemId: "gid://shopify/InventoryItem/1",
      title: "Default Title",
      sku: "SKU-1",
      barcode: "012345678905",
      position: 1,
      price: 19.99,
      compareAtPrice: 29.99,
      option1: "Red",
      option2: null,
      option3: null,
      weight: 0.5,
      weightUnit: "kg",
      inventoryQuantity: 10,
      inventoryPolicy: "DENY",
      taxable: true,
      requiresShipping: true,
      imageShopifyId: "gid://shopify/ProductImage/1",
    });
  });

  it("maps up to three selected options in order", () => {
    const mapped = mapVariant(
      {
        ...baseVariantNode,
        selectedOptions: [
          { name: "Color", value: "Red" },
          { name: "Size", value: "M" },
          { name: "Material", value: "Cotton" },
        ],
      },
      1,
    );
    expect(mapped.option1).toBe("Red");
    expect(mapped.option2).toBe("M");
    expect(mapped.option3).toBe("Cotton");
  });

  it("handles a variant with no price, no image, and no weight data", () => {
    const mapped = mapVariant(
      {
        ...baseVariantNode,
        price: "",
        compareAtPrice: null,
        image: null,
        inventoryItem: {
          ...baseVariantNode.inventoryItem,
          measurement: { weight: null },
        },
      },
      2,
    );
    expect(mapped.price).toBeNull();
    expect(mapped.compareAtPrice).toBeNull();
    expect(mapped.imageShopifyId).toBeNull();
    expect(mapped.weight).toBe(0);
    expect(mapped.weightUnit).toBe("kg");
  });
});

const baseProductNode: ShopifyProductNode = {
  id: "gid://shopify/Product/1",
  title: "Classic Tee",
  handle: "classic-tee",
  descriptionHtml: "<p>A shirt</p>",
  vendor: "Acme",
  productType: "Apparel",
  status: "ACTIVE",
  publishedAt: "2026-01-01T00:00:00Z",
  tags: ["summer", "sale"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  seo: { title: "Classic Tee | Acme", description: "The best tee" },
  images: {
    edges: [
      {
        node: {
          id: "gid://shopify/ProductImage/1",
          url: "https://cdn.example.com/1.jpg",
          altText: "Front",
          width: 800,
          height: 800,
        },
      },
    ],
  },
  variants: { edges: [{ node: baseVariantNode }] },
};

describe("mapProduct", () => {
  it("maps a fully-populated product with nested images and variants", () => {
    const mapped = mapProduct(baseProductNode);

    expect(mapped.shopifyId).toBe("gid://shopify/Product/1");
    expect(mapped.title).toBe("Classic Tee");
    expect(mapped.status).toBe("ACTIVE");
    expect(mapped.publishedAt).toEqual(new Date("2026-01-01T00:00:00Z"));
    expect(mapped.seoTitle).toBe("Classic Tee | Acme");
    expect(mapped.seoDescription).toBe("The best tee");
    expect(mapped.tags).toEqual(["summer", "sale"]);
    expect(mapped.images).toHaveLength(1);
    expect(mapped.images[0]).toMatchObject({
      shopifyId: "gid://shopify/ProductImage/1",
      url: "https://cdn.example.com/1.jpg",
      position: 1,
    });
    expect(mapped.variants).toHaveLength(1);
    expect(mapped.variants[0]!.sku).toBe("SKU-1");
  });

  it("defaults publishedAt to null when the product is unpublished", () => {
    const mapped = mapProduct({ ...baseProductNode, publishedAt: null });
    expect(mapped.publishedAt).toBeNull();
  });

  it("defaults seo fields to empty strings when absent", () => {
    const mapped = mapProduct({
      ...baseProductNode,
      seo: { title: null, description: null },
    });
    expect(mapped.seoTitle).toBe("");
    expect(mapped.seoDescription).toBe("");
  });
});
