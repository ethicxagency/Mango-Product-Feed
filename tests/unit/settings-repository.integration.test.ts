import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { settingsRepository } from "~/repositories/settings.repository.server";

const prisma = new PrismaClient();
const TEST_SHOP_DOMAIN = "settings-test-shop.myshopify.com";

async function getTestShop() {
  return prisma.shop.upsert({
    where: { shopifyDomain: TEST_SHOP_DOMAIN },
    create: {
      shopifyDomain: TEST_SHOP_DOMAIN,
      name: "Settings Test Shop",
      email: "test@example.com",
      currency: "USD",
    },
    update: {},
  });
}

describe("settingsRepository", () => {
  beforeEach(async () => {
    const shop = await getTestShop();
    await prisma.settings.deleteMany({ where: { shopId: shop.id } });
  });

  afterAll(async () => {
    await prisma.shop.deleteMany({
      where: { shopifyDomain: TEST_SHOP_DOMAIN },
    });
    await prisma.$disconnect();
  });

  it("lazily creates a settings row with all child tables on first access", async () => {
    const shop = await getTestShop();
    const settings = await settingsRepository.getOrCreate(shop.id);

    expect(settings.shopId).toBe(shop.id);
    expect(settings.googleMerchant).not.toBeNull();
    expect(settings.metaCommerce).not.toBeNull();
    expect(settings.tiktok).not.toBeNull();
    expect(settings.productRules).not.toBeNull();
    expect(settings.defaultCurrency).toBe("USD");
  });

  it("returns the same row on repeated access rather than creating duplicates", async () => {
    const shop = await getTestShop();
    const first = await settingsRepository.getOrCreate(shop.id);
    const second = await settingsRepository.getOrCreate(shop.id);

    expect(second.id).toBe(first.id);
    const count = await prisma.settings.count({ where: { shopId: shop.id } });
    expect(count).toBe(1);
  });

  it("updateGeneral persists changes visible on the next read", async () => {
    const shop = await getTestShop();
    await settingsRepository.getOrCreate(shop.id);
    await settingsRepository.updateGeneral(shop.id, {
      storeName: "Acme Storefront",
      supportEmail: "help@acme.test",
    });

    const settings = await settingsRepository.getOrCreate(shop.id);
    expect(settings.storeName).toBe("Acme Storefront");
    expect(settings.supportEmail).toBe("help@acme.test");
  });

  it("updateGoogleMerchant updates the child table without touching siblings", async () => {
    const shop = await getTestShop();
    await settingsRepository.getOrCreate(shop.id);
    await settingsRepository.updateGoogleMerchant(shop.id, {
      defaultBrand: "Acme",
      shippingPrice: 4.99,
    });

    const settings = await settingsRepository.getOrCreate(shop.id);
    expect(settings.googleMerchant?.defaultBrand).toBe("Acme");
    expect(settings.googleMerchant?.shippingPrice).toBe(4.99);
    expect(settings.metaCommerce?.defaultBrand).toBe(""); // untouched
  });

  it("updateProductRules persists rule toggles and price bounds", async () => {
    const shop = await getTestShop();
    await settingsRepository.getOrCreate(shop.id);
    await settingsRepository.updateProductRules(shop.id, {
      excludeOutOfStock: true,
      minPrice: 10,
      maxPrice: 100,
    });

    const settings = await settingsRepository.getOrCreate(shop.id);
    expect(settings.productRules?.excludeOutOfStock).toBe(true);
    expect(settings.productRules?.minPrice).toBe(10);
    expect(settings.productRules?.maxPrice).toBe(100);
  });

  it("resetAll wipes customizations and restores defaults", async () => {
    const shop = await getTestShop();
    await settingsRepository.getOrCreate(shop.id);
    await settingsRepository.updateGeneral(shop.id, {
      storeName: "Custom Name",
    });
    await settingsRepository.updateGoogleMerchant(shop.id, {
      defaultBrand: "Custom Brand",
    });

    const reset = await settingsRepository.resetAll(shop.id);

    expect(reset.storeName).toBe("");
    expect(reset.googleMerchant?.defaultBrand).toBe("");

    const count = await prisma.settings.count({ where: { shopId: shop.id } });
    expect(count).toBe(1); // exactly one row remains, not zero and not duplicated
  });
});
