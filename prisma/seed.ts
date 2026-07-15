import { PrismaClient } from "@prisma/client";

import { generateCollections } from "./seed-data/generate-collections";
import { generateProducts } from "./seed-data/generate-products";
import { TAG_POOL } from "./seed-data/constants";

const prisma = new PrismaClient();

// Total product count to seed. Override with `SEED_PRODUCT_COUNT=100000` to
// exercise the 100k+ performance path described in the spec.
const PRODUCT_COUNT = Number(process.env.SEED_PRODUCT_COUNT ?? 300);

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function createManyInChunks<T>(
  items: T[],
  size: number,
  insert: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  for (const batch of chunk(items, size)) {
    await insert(batch);
  }
}

async function main() {
  console.log(`Resetting database...`);
  await prisma.shop.deleteMany();

  console.log(`Creating mock shop...`);
  const shop = await prisma.shop.create({
    data: {
      shopifyDomain: "mango-demo.myshopify.com",
      name: "Mango Demo Store",
      email: "merchant@mango-demo.example.com",
      currency: "USD",
      ianaTimezone: "America/New_York",
      planName: "mock-development",
    },
  });

  console.log(`Creating tags...`);
  const tags = await Promise.all(
    TAG_POOL.map((name) =>
      prisma.tag.create({ data: { shopId: shop.id, name } }),
    ),
  );
  const tagIdByName = new Map(tags.map((t) => [t.name, t.id]));

  console.log(`Creating collections...`);
  const collections = generateCollections();
  await createManyInChunks(collections, 100, (batch) =>
    prisma.collection.createMany({
      data: batch.map((c) => ({ ...c, shopId: shop.id })),
    }),
  );
  const collectionIds = collections.map((c) => c.id);

  console.log(`Generating ${PRODUCT_COUNT} mock products...`);
  // Seed a shared SKU pool so a small percentage of variants intentionally
  // collide — this is what exercises the "skip duplicate SKU" feed rule.
  const duplicateSkuPool = Array.from(
    { length: 15 },
    (_, i) => `SKU-SHARED-${String(i).padStart(4, "0")}`,
  );

  const products = generateProducts({
    count: PRODUCT_COUNT,
    duplicateSkuPool,
  });

  for (const product of products) {
    product.collectionTitles = collections
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 3) + 1)
      .map((c) => c.title);
  }

  console.log(`Inserting products...`);
  await createManyInChunks(products, 50, (batch) =>
    prisma.product.createMany({
      data: batch.map((p) => ({
        id: p.id,
        shopId: shop.id,
        title: p.title,
        handle: p.handle,
        descriptionHtml: p.descriptionHtml,
        vendor: p.vendor,
        productType: p.productType,
        status: p.status,
        publishedAt: p.publishedAt,
        isHidden: p.isHidden,
        isPasswordProtected: p.isPasswordProtected,
        deletedAt: p.deletedAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    }),
  );

  console.log(`Inserting images...`);
  const allImages = products.flatMap((p) =>
    p.images.map((img) => ({ ...img, productId: p.id })),
  );
  await createManyInChunks(allImages, 100, (batch) =>
    prisma.productImage.createMany({ data: batch }),
  );

  console.log(`Inserting variants...`);
  const allVariants = products.flatMap((p) =>
    p.variants.map((v) => ({ ...v, productId: p.id })),
  );
  await createManyInChunks(allVariants, 50, (batch) =>
    prisma.variant.createMany({ data: batch }),
  );

  console.log(`Inserting metafields...`);
  const allMetafields = products.flatMap((p) =>
    p.metafields.map((m) => ({ ...m, productId: p.id })),
  );
  await createManyInChunks(allMetafields, 100, (batch) =>
    prisma.productMetafield.createMany({ data: batch }),
  );

  console.log(`Linking tags...`);
  const productTagRows = products.flatMap((p) =>
    p.tagNames
      .map((name) => tagIdByName.get(name))
      .filter((tagId): tagId is string => Boolean(tagId))
      .map((tagId) => ({ productId: p.id, tagId })),
  );
  await createManyInChunks(productTagRows, 200, (batch) =>
    prisma.productTag.createMany({ data: batch }),
  );

  console.log(`Linking collections...`);
  const collectionIdByTitle = new Map(collections.map((c) => [c.title, c.id]));
  const productCollectionRows = products.flatMap((p) =>
    p.collectionTitles
      .map((title) => collectionIdByTitle.get(title))
      .filter((id): id is string => Boolean(id))
      .map((collectionId) => ({ productId: p.id, collectionId })),
  );
  await createManyInChunks(productCollectionRows, 200, (batch) =>
    prisma.productCollection.createMany({ data: batch }),
  );

  console.log(
    `Seed complete: ${products.length} products, ${allVariants.length} variants, ${allImages.length} images, ${collectionIds.length} collections, ${tags.length} tags.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
