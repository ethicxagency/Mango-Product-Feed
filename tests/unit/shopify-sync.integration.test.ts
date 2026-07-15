import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { collectionSyncService } from "~/services/shopify/collection-sync.service.server";
import { productSyncService } from "~/services/shopify/product-sync.service.server";
import { webhookSyncService } from "~/services/shopify/webhook-sync.service.server";

const prisma = new PrismaClient();
const TEST_SHOP_DOMAIN = "sync-test-shop.myshopify.com";

function mockAdmin(responses: unknown[]): AdminApiContext {
  let call = 0;
  return {
    graphql: vi.fn(async () => {
      const body = responses[call];
      call += 1;
      return { json: async () => body } as never;
    }),
  } as unknown as AdminApiContext;
}

function productPage(
  nodes: unknown[],
  hasNextPage = false,
  endCursor: string | null = null,
) {
  return {
    data: {
      products: {
        edges: nodes.map((node, i) => ({ cursor: `cursor-${i}`, node })),
        pageInfo: { hasNextPage, endCursor },
      },
    },
  };
}

function collectionPage(
  nodes: unknown[],
  hasNextPage = false,
  endCursor: string | null = null,
) {
  return {
    data: {
      collections: {
        edges: nodes.map((node, i) => ({ cursor: `cursor-${i}`, node })),
        pageInfo: { hasNextPage, endCursor },
      },
    },
  };
}

function collectionProductsPage(
  ids: string[],
  hasNextPage = false,
  endCursor: string | null = null,
) {
  return {
    data: {
      collection: {
        products: {
          edges: ids.map((id) => ({ node: { id } })),
          pageInfo: { hasNextPage, endCursor },
        },
      },
    },
  };
}

const productNodeA = {
  id: "gid://shopify/Product/1001",
  title: "Sync Test Shirt",
  handle: "sync-test-shirt",
  descriptionHtml: "<p>A shirt</p>",
  vendor: "Acme",
  productType: "Apparel",
  status: "ACTIVE",
  publishedAt: "2026-01-01T00:00:00Z",
  tags: ["new", "sale"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  seo: { title: "Sync Test Shirt", description: "A test shirt" },
  images: {
    edges: [
      {
        node: {
          id: "gid://shopify/ProductImage/2001",
          url: "https://cdn.example.com/shirt.jpg",
          altText: "Shirt",
          width: 800,
          height: 800,
        },
      },
    ],
  },
  variants: {
    edges: [
      {
        node: {
          id: "gid://shopify/ProductVariant/3001",
          title: "Default Title",
          sku: "SHIRT-1",
          barcode: "012345678905",
          price: "19.99",
          compareAtPrice: "29.99",
          taxable: true,
          selectedOptions: [{ name: "Size", value: "M" }],
          inventoryQuantity: 5,
          inventoryPolicy: "DENY",
          inventoryItem: {
            id: "gid://shopify/InventoryItem/4001",
            requiresShipping: true,
            measurement: { weight: { value: 0.3, unit: "KILOGRAMS" } },
          },
          image: { id: "gid://shopify/ProductImage/2001" },
        },
      },
    ],
  },
};

async function getTestShop() {
  return prisma.shop.upsert({
    where: { shopifyDomain: TEST_SHOP_DOMAIN },
    create: {
      shopifyDomain: TEST_SHOP_DOMAIN,
      name: "Sync Test Shop",
      email: "test@example.com",
      currency: "USD",
    },
    update: {},
  });
}

describe("Shopify sync services (integration, against the local DB with a mocked Admin client)", () => {
  beforeEach(async () => {
    const shop = await getTestShop();
    await prisma.product.deleteMany({ where: { shopId: shop.id } });
    await prisma.collection.deleteMany({ where: { shopId: shop.id } });
  });

  afterAll(async () => {
    await prisma.shop.deleteMany({
      where: { shopifyDomain: TEST_SHOP_DOMAIN },
    });
    await prisma.$disconnect();
  });

  describe("productSyncService", () => {
    it("syncAll upserts products with variants, images, and tags", async () => {
      const shop = await getTestShop();
      const admin = mockAdmin([productPage([productNodeA])]);

      const result = await productSyncService.syncAll(admin, shop.id);
      expect(result).toEqual({ productCount: 1, variantCount: 1 });

      const product = await prisma.product.findFirst({
        where: { shopId: shop.id, shopifyId: "gid://shopify/Product/1001" },
        include: {
          variants: true,
          images: true,
          tags: { include: { tag: true } },
        },
      });

      expect(product).not.toBeNull();
      expect(product!.title).toBe("Sync Test Shirt");
      expect(product!.seoTitle).toBe("Sync Test Shirt");
      expect(product!.isHidden).toBe(false);
      expect(product!.images).toHaveLength(1);
      expect(product!.variants).toHaveLength(1);
      expect(product!.variants[0]!.sku).toBe("SHIRT-1");
      expect(product!.variants[0]!.price).toBe(19.99);
      expect(product!.variants[0]!.imageId).toBe(product!.images[0]!.id);
      expect(product!.tags.map((t) => t.tag.name).sort()).toEqual([
        "new",
        "sale",
      ]);

      const refreshedShop = await prisma.shop.findUniqueOrThrow({
        where: { id: shop.id },
      });
      expect(refreshedShop.lastProductSyncAt).not.toBeNull();
    });

    it("paginates across multiple pages", async () => {
      const shop = await getTestShop();
      const productNodeB = {
        ...productNodeA,
        id: "gid://shopify/Product/1002",
        handle: "sync-test-shirt-2",
        images: { edges: [] },
        variants: { edges: [] },
      };
      const admin = mockAdmin([
        productPage([productNodeA], true, "cursor-1"),
        productPage([productNodeB], false, null),
      ]);

      const result = await productSyncService.syncAll(admin, shop.id);
      expect(result.productCount).toBe(2);

      const count = await prisma.product.count({ where: { shopId: shop.id } });
      expect(count).toBe(2);
    });

    it("syncOne updates an existing product in place", async () => {
      const shop = await getTestShop();
      await productSyncService.syncAll(
        mockAdmin([productPage([productNodeA])]),
        shop.id,
      );

      const updatedNode = {
        ...productNodeA,
        title: "Sync Test Shirt (Updated)",
      };
      const admin = mockAdmin([{ data: { product: updatedNode } }]);
      await productSyncService.syncOne(
        admin,
        shop.id,
        "gid://shopify/Product/1001",
      );

      const product = await prisma.product.findFirst({
        where: { shopId: shop.id, shopifyId: "gid://shopify/Product/1001" },
      });
      expect(product!.title).toBe("Sync Test Shirt (Updated)");

      const count = await prisma.product.count({ where: { shopId: shop.id } });
      expect(count).toBe(1); // updated, not duplicated
    });

    it("deleteOne removes the product", async () => {
      const shop = await getTestShop();
      await productSyncService.syncAll(
        mockAdmin([productPage([productNodeA])]),
        shop.id,
      );

      await productSyncService.deleteOne(shop.id, "gid://shopify/Product/1001");

      const product = await prisma.product.findFirst({
        where: { shopId: shop.id, shopifyId: "gid://shopify/Product/1001" },
      });
      expect(product).toBeNull();
    });
  });

  describe("collectionSyncService", () => {
    const collectionNode = {
      id: "gid://shopify/Collection/5001",
      title: "New Arrivals",
      handle: "new-arrivals",
      description: "The latest",
      ruleSet: null,
    };

    it("syncAll upserts a collection and links member products", async () => {
      const shop = await getTestShop();
      await productSyncService.syncAll(
        mockAdmin([productPage([productNodeA])]),
        shop.id,
      );

      const admin = mockAdmin([
        collectionPage([collectionNode]),
        collectionProductsPage(["gid://shopify/Product/1001"]),
      ]);
      const result = await collectionSyncService.syncAll(admin, shop.id);
      expect(result).toEqual({ collectionCount: 1 });

      const collection = await prisma.collection.findFirst({
        where: { shopId: shop.id, shopifyId: "gid://shopify/Collection/5001" },
        include: { products: true },
      });
      expect(collection).not.toBeNull();
      expect(collection!.isSmart).toBe(false);
      expect(collection!.products).toHaveLength(1);

      const refreshedShop = await prisma.shop.findUniqueOrThrow({
        where: { id: shop.id },
      });
      expect(refreshedShop.lastCollectionSyncAt).not.toBeNull();
    });

    it("marks a collection with a ruleSet as smart", async () => {
      const shop = await getTestShop();
      const smartNode = {
        ...collectionNode,
        ruleSet: { appliedDisjunctively: false },
      };
      const admin = mockAdmin([
        collectionPage([smartNode]),
        collectionProductsPage([]),
      ]);

      await collectionSyncService.syncAll(admin, shop.id);
      const collection = await prisma.collection.findFirst({
        where: { shopId: shop.id, shopifyId: "gid://shopify/Collection/5001" },
      });
      expect(collection!.isSmart).toBe(true);
    });

    it("deleteOne removes the collection", async () => {
      const shop = await getTestShop();
      await collectionSyncService.syncAll(
        mockAdmin([
          collectionPage([collectionNode]),
          collectionProductsPage([]),
        ]),
        shop.id,
      );

      await collectionSyncService.deleteOne(
        shop.id,
        "gid://shopify/Collection/5001",
      );
      const collection = await prisma.collection.findFirst({
        where: { shopId: shop.id, shopifyId: "gid://shopify/Collection/5001" },
      });
      expect(collection).toBeNull();
    });
  });

  describe("webhookSyncService", () => {
    it("handleProductUpsert converts the numeric webhook id to a GID and syncs", async () => {
      const shop = await getTestShop();
      const admin = mockAdmin([{ data: { product: productNodeA } }]);

      await webhookSyncService.handleProductUpsert(admin, shop.id, {
        id: 1001,
      });

      const product = await prisma.product.findFirst({
        where: { shopId: shop.id, shopifyId: "gid://shopify/Product/1001" },
      });
      expect(product).not.toBeNull();
    });

    it("handleProductDelete removes the product by numeric id", async () => {
      const shop = await getTestShop();
      await productSyncService.syncAll(
        mockAdmin([productPage([productNodeA])]),
        shop.id,
      );

      await webhookSyncService.handleProductDelete(shop.id, { id: 1001 });

      const product = await prisma.product.findFirst({
        where: { shopId: shop.id, shopifyId: "gid://shopify/Product/1001" },
      });
      expect(product).toBeNull();
    });

    it("handleCollectionUpsert converts the numeric webhook id to a GID and syncs", async () => {
      const shop = await getTestShop();
      const collectionNode = {
        id: "gid://shopify/Collection/5001",
        title: "New Arrivals",
        handle: "new-arrivals",
        description: "The latest",
        ruleSet: null,
      };
      const admin = mockAdmin([
        { data: { collection: collectionNode } },
        collectionProductsPage([]),
      ]);

      await webhookSyncService.handleCollectionUpsert(admin, shop.id, {
        id: 5001,
      });

      const collection = await prisma.collection.findFirst({
        where: { shopId: shop.id, shopifyId: "gid://shopify/Collection/5001" },
      });
      expect(collection).not.toBeNull();
    });

    it("handleCollectionDelete removes the collection by numeric id", async () => {
      const shop = await getTestShop();
      const collectionNode = {
        id: "gid://shopify/Collection/5001",
        title: "New Arrivals",
        handle: "new-arrivals",
        description: "The latest",
        ruleSet: null,
      };
      await collectionSyncService.syncAll(
        mockAdmin([
          collectionPage([collectionNode]),
          collectionProductsPage([]),
        ]),
        shop.id,
      );

      await webhookSyncService.handleCollectionDelete(shop.id, { id: 5001 });

      const collection = await prisma.collection.findFirst({
        where: { shopId: shop.id, shopifyId: "gid://shopify/Collection/5001" },
      });
      expect(collection).toBeNull();
    });

    it("handleAppUninstalled marks the shop inactive without deleting data", async () => {
      const shop = await getTestShop();
      await productSyncService.syncAll(
        mockAdmin([productPage([productNodeA])]),
        shop.id,
      );

      await webhookSyncService.handleAppUninstalled(TEST_SHOP_DOMAIN);

      const refreshedShop = await prisma.shop.findUniqueOrThrow({
        where: { id: shop.id },
      });
      expect(refreshedShop.isActive).toBe(false);

      const productCount = await prisma.product.count({
        where: { shopId: shop.id },
      });
      expect(productCount).toBe(1);

      // restore for subsequent tests
      await prisma.shop.update({
        where: { id: shop.id },
        data: { isActive: true },
      });
    });
  });
});
