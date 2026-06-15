import { PrismaClient, Availability } from "@prisma/client";
import { LOCAL_SHOP_ID } from "../app/constants/shop";
import { seedDefaultSettings } from "../app/services/settings.server";

const prisma = new PrismaClient();

const sampleProducts = [
  {
    title: "Alphonso Mango Box (6 pcs)",
    description:
      "Premium Alphonso mangoes hand-picked from Ratnagiri farms. Sweet, fiberless pulp perfect for desserts and smoothies.",
    sku: "MNG-ALP-006",
    gtin: "00812345678901",
    brand: "Mango Co.",
    category: "Food, Beverages & Tobacco > Food Items > Fruits & Vegetables > Fresh & Frozen Fruits",
    productType: "Fresh Fruit",
    price: "29.99",
    salePrice: "24.99",
    availability: Availability.IN_STOCK,
    imageUrl: "https://images.example.com/mango/alphonso-box.jpg",
    productUrl: "https://mango-store.example.com/products/alphonso-box",
  },
  {
    title: "Dried Mango Slices - 250g",
    description:
      "Sun-dried mango slices with no added sugar. A healthy snack packed with natural sweetness.",
    sku: "MNG-DRY-250",
    gtin: "00812345678902",
    brand: "Mango Co.",
    category: "Food, Beverages & Tobacco > Food Items > Fruits & Vegetables > Dried Fruits",
    productType: "Dried Snacks",
    price: "12.50",
    availability: Availability.IN_STOCK,
    imageUrl: "https://images.example.com/mango/dried-slices.jpg",
    productUrl: "https://mango-store.example.com/products/dried-slices",
  },
  {
    title: "Mango Hot Sauce",
    description:
      "Small-batch mango habanero hot sauce with tropical heat and bright citrus notes.",
    sku: "MNG-SAUCE-01",
    gtin: "00812345678903",
    brand: "Mango Co.",
    category: "Food, Beverages & Tobacco > Food Items > Condiments & Sauces",
    productType: "Condiments",
    price: "8.99",
    availability: Availability.IN_STOCK,
    imageUrl: "https://images.example.com/mango/hot-sauce.jpg",
    productUrl: "https://mango-store.example.com/products/mango-hot-sauce",
  },
  {
    title: "Frozen Mango Chunks - 1kg",
    description:
      "IQF frozen mango chunks ideal for smoothies, baking, and bubble tea.",
    sku: "MNG-FRZ-1KG",
    gtin: "00812345678904",
    brand: "Mango Co.",
    category: "Food, Beverages & Tobacco > Food Items > Frozen Foods",
    productType: "Frozen Fruit",
    price: "15.00",
    availability: Availability.PREORDER,
    imageUrl: "https://images.example.com/mango/frozen-chunks.jpg",
    productUrl: "https://mango-store.example.com/products/frozen-chunks",
  },
  {
    title: "Mango Leaf Tea - 20 bags",
    description:
      "Herbal tea blend featuring dried mango leaves and hibiscus for a refreshing cup.",
    sku: "MNG-TEA-20",
    brand: "Mango Co.",
    category: "Food, Beverages & Tobacco > Beverages > Tea",
    productType: "Tea",
    price: "9.99",
    availability: Availability.OUT_OF_STOCK,
    imageUrl: "https://images.example.com/mango/leaf-tea.jpg",
    productUrl: "https://mango-store.example.com/products/mango-leaf-tea",
  },
  {
    title: "Incomplete Sample Product",
    description: "Used to demonstrate feed health checker warnings.",
    sku: "MNG-DEMO-BAD",
    brand: "",
    category: "Uncategorized",
    productType: "Sample",
    price: "0",
    availability: Availability.IN_STOCK,
    imageUrl: "not-a-valid-url",
    productUrl: "",
  },
];

async function main() {
  await prisma.feedLog.deleteMany();
  await prisma.feedRule.deleteMany();
  await prisma.feedConfig.deleteMany();
  await prisma.feedRequest.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.product.deleteMany();
  await prisma.shop.deleteMany();

  await prisma.shop.create({
    data: {
      id: LOCAL_SHOP_ID,
      shopDomain: "local.mango-feed.app",
      name: "Local Mango Feed",
      initialSyncDone: true,
      syncStatus: "SUCCESS",
    },
  });

  for (const product of sampleProducts) {
    await prisma.product.create({
      data: {
        ...product,
        shopId: LOCAL_SHOP_ID,
      },
    });
  }

  const defaultFeeds = await Promise.all([
    prisma.feedConfig.create({
      data: {
        shopId: LOCAL_SHOP_ID,
        name: "Default Google Shopping Feed",
        feedType: "GOOGLE",
        token: "google-default-token",
        isDefault: true,
        filterMode: "ALL",
        schedule: "DAILY",
      },
    }),
    prisma.feedConfig.create({
      data: {
        shopId: LOCAL_SHOP_ID,
        name: "Default Meta Catalog Feed",
        feedType: "META",
        token: "meta-default-token",
        isDefault: true,
        filterMode: "ALL",
        schedule: "DAILY",
      },
    }),
    prisma.feedConfig.create({
      data: {
        shopId: LOCAL_SHOP_ID,
        name: "Default TikTok Catalog Feed",
        feedType: "TIKTOK",
        token: "tiktok-default-token",
        isDefault: true,
        filterMode: "ALL",
        schedule: "DAILY",
      },
    }),
  ]);

  const googleFeed = defaultFeeds[0];
  const metaFeed = defaultFeeds[1];

  await prisma.feedRule.createMany({
    data: [
      {
        feedConfigId: googleFeed.id,
        name: "Exclude out of stock products",
        conditionField: "STOCK",
        conditionOperator: "EQ",
        conditionValue: "0",
        action: "EXCLUDE",
        priority: 1,
      },
      {
        feedConfigId: googleFeed.id,
        name: "Exclude products under $10",
        conditionField: "PRICE",
        conditionOperator: "LT",
        conditionValue: "10",
        action: "EXCLUDE",
        priority: 2,
      },
      {
        feedConfigId: metaFeed.id,
        name: "Append promo text for condiments",
        conditionField: "CATEGORY",
        conditionOperator: "CONTAINS",
        conditionValue: "Condiments",
        action: "APPEND_TEXT",
        actionValue: "Limited time mango promo.",
        priority: 1,
      },
    ],
  });

  await prisma.feedConfig.create({
    data: {
      shopId: LOCAL_SHOP_ID,
      name: "Mango Co. Brand Feed",
      feedType: "GOOGLE",
      token: "abc123",
      filterMode: "BRANDS",
      filterValues: JSON.stringify(["Mango Co."]),
      schedule: "HOURLY",
    },
  });

  await seedDefaultSettings();
  const { seedSystemFeedTemplates } = await import("../app/services/feed-template.server");
  const { ensureDefaultAdmin } = await import("../app/services/admin.server");
  await seedSystemFeedTemplates();
  await ensureDefaultAdmin();

  await prisma.categoryMapping.createMany({
    data: [
      {
        shopId: LOCAL_SHOP_ID,
        platform: "GOOGLE",
        sourceCategory: "Uncategorized",
        targetCategory: "Food, Beverages & Tobacco > Food Items",
      },
      {
        shopId: LOCAL_SHOP_ID,
        platform: "META",
        sourceCategory: "Uncategorized",
        targetCategory: "Food & Beverages",
      },
    ],
  });

  const pinterestFeed = await prisma.feedConfig.create({
    data: {
      shopId: LOCAL_SHOP_ID,
      name: "Default Pinterest Catalog Feed",
      feedType: "PINTEREST",
      token: "pinterest-default-token",
      isDefault: true,
      filterMode: "ALL",
      schedule: "DAILY",
    },
  });

  const snapchatFeed = await prisma.feedConfig.create({
    data: {
      shopId: LOCAL_SHOP_ID,
      name: "Default Snapchat Catalog Feed",
      feedType: "SNAPCHAT",
      token: "snapchat-default-token",
      isDefault: true,
      filterMode: "ALL",
      schedule: "DAILY",
    },
  });

  console.log(
    `Seeded ${sampleProducts.length} products, ${defaultFeeds.length + 3} feed configs, Pinterest (${pinterestFeed.id}), Snapchat (${snapchatFeed.id}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
