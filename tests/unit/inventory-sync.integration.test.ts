import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

import { inventorySyncService } from "~/services/shopify/inventory-sync.service.server";

const prisma = new PrismaClient();
const TEST_SHOP_DOMAIN = "inventory-sync-test-shop.myshopify.com";

async function getTestShop() {
  return prisma.shop.upsert({
    where: { shopifyDomain: TEST_SHOP_DOMAIN },
    create: {
      shopifyDomain: TEST_SHOP_DOMAIN,
      name: "Inventory Sync Test Shop",
      email: "test@example.com",
      currency: "USD",
    },
    update: {},
  });
}

describe("inventorySyncService", () => {
  afterAll(async () => {
    await prisma.shop.deleteMany({
      where: { shopifyDomain: TEST_SHOP_DOMAIN },
    });
    await prisma.$disconnect();
  });

  it("applies inventory updates keyed by inventory item id", async () => {
    const shop = await getTestShop();
    const product = await prisma.product.create({
      data: {
        shopId: shop.id,
        shopifyId: "gid://shopify/Product/9001",
        title: "Inventory Test Product",
        handle: "inventory-test-product",
        variants: {
          create: {
            shopifyId: "gid://shopify/ProductVariant/9101",
            shopifyInventoryItemId: "gid://shopify/InventoryItem/9201",
            sku: "INV-1",
            price: 10,
            inventoryQuantity: 5,
            inventoryPolicy: "DENY",
          },
        },
      },
      include: { variants: true },
    });

    const updatedCount = await inventorySyncService.applyUpdates([
      {
        shopifyInventoryItemId: "gid://shopify/InventoryItem/9201",
        inventoryQuantity: 0,
        inventoryPolicy: "CONTINUE",
      },
    ]);
    expect(updatedCount).toBe(1);

    const variant = await prisma.variant.findUniqueOrThrow({
      where: { id: product.variants[0]!.id },
    });
    expect(variant.inventoryQuantity).toBe(0);
    expect(variant.inventoryPolicy).toBe("CONTINUE");
  });

  it("is a no-op for an inventory item id that doesn't match any variant", async () => {
    const updatedCount = await inventorySyncService.applyUpdates([
      {
        shopifyInventoryItemId: "gid://shopify/InventoryItem/does-not-exist",
        inventoryQuantity: 100,
        inventoryPolicy: "DENY",
      },
    ]);
    expect(updatedCount).toBe(0);
  });
});
