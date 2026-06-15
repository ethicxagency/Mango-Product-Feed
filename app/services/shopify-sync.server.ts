import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { Availability } from "@prisma/client";
import prisma from "../db.server";
import { normalizeShopDomain } from "../constants/shop";

const PRODUCTS_QUERY = `#graphql
  query MangoProductSync($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          description
          vendor
          productType
          onlineStoreUrl
          status
          category {
            fullName
          }
          collections(first: 5) {
            edges {
              node {
                title
              }
            }
          }
          featuredMedia {
            preview {
              image {
                url
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                sku
                barcode
                price
                compareAtPrice
                availableForSale
                inventoryQuantity
              }
            }
          }
        }
      }
    }
  }
`;

interface ShopifyVariantNode {
  id: string;
  sku: string | null;
  barcode: string | null;
  price: string;
  compareAtPrice: string | null;
  availableForSale: boolean;
  inventoryQuantity: number | null;
}

interface ShopifyProductNode {
  id: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  onlineStoreUrl: string | null;
  status: string;
  category: { fullName: string } | null;
  collections: { edges: { node: { title: string } }[] };
  featuredMedia: { preview: { image: { url: string } | null } | null } | null;
  variants: { edges: { node: ShopifyVariantNode }[] };
}

function mapAvailability(variant: ShopifyVariantNode): Availability {
  if ((variant.inventoryQuantity ?? 0) <= 0 && !variant.availableForSale) {
    return "OUT_OF_STOCK";
  }
  return "IN_STOCK";
}

function buildProductUrl(shopDomain: string, product: ShopifyProductNode): string {
  if (product.onlineStoreUrl) return product.onlineStoreUrl;
  const handleGuess = product.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `https://${shopDomain}/products/${handleGuess}`;
}

function buildCategory(product: ShopifyProductNode): string {
  if (product.category?.fullName) return product.category.fullName;
  const collection = product.collections.edges[0]?.node.title;
  if (collection) return collection;
  return product.productType || "Uncategorized";
}

function mapShopifyProductToRecords(
  shopId: string,
  shopDomain: string,
  product: ShopifyProductNode,
) {
  const imageUrl =
    product.featuredMedia?.preview?.image?.url ??
    "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";
  const category = buildCategory(product);
  const brand = product.vendor || "Unknown";
  const productUrl = buildProductUrl(shopDomain, product);

  return product.variants.edges.map(({ node: variant }) => ({
    shopId,
    shopifyProductId: product.id,
    shopifyVariantId: variant.id,
    title: product.title,
    description: product.description || product.title,
    sku: variant.sku || variant.id.split("/").pop() || product.id,
    gtin: variant.barcode || null,
    brand,
    category,
    productType: product.productType || "General",
    price: variant.price,
    salePrice: variant.compareAtPrice ? variant.price : null,
    availability: mapAvailability(variant),
    imageUrl,
    productUrl,
  }));
}

async function fetchAllShopifyProducts(admin: AdminApiContext) {
  const products: ShopifyProductNode[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response: Response = await admin.graphql(PRODUCTS_QUERY, {
      variables: { cursor },
    });
    const payload: {
      data?: {
        products?: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: { node: ShopifyProductNode }[];
        };
      };
    } = await response.json();
    const connection = payload.data?.products;

    if (!connection) {
      throw new Error("Unable to fetch Shopify products");
    }

    for (const edge of connection.edges ?? []) {
      products.push(edge.node);
    }

    hasNextPage = connection.pageInfo.hasNextPage;
    cursor = connection.pageInfo.endCursor;
  }

  return products;
}

export async function syncShopProducts(
  shopId: string,
  admin: AdminApiContext,
  options: { replaceExisting?: boolean } = {},
) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error("Shop not found");

  await prisma.shop.update({
    where: { id: shopId },
    data: { syncStatus: "RUNNING" },
  });

  try {
    const shopifyProducts = await fetchAllShopifyProducts(admin);
    const records = shopifyProducts.flatMap((product) =>
      mapShopifyProductToRecords(shopId, shop.shopDomain, product),
    );

    if (options.replaceExisting !== false) {
      await prisma.product.deleteMany({ where: { shopId } });
    }

    for (const record of records) {
      await prisma.product.upsert({
        where: {
          shopId_shopifyVariantId: {
            shopId,
            shopifyVariantId: record.shopifyVariantId,
          },
        },
        create: record,
        update: record,
      });
    }

    await prisma.shop.update({
      where: { id: shopId },
      data: {
        syncStatus: "SUCCESS",
        lastSyncedAt: new Date(),
        initialSyncDone: true,
      },
    });

    return {
      productCount: records.length,
      shopifyProductCount: shopifyProducts.length,
    };
  } catch (error) {
    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: "ERROR" },
    });
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (shop) {
      const { notifySyncFailure } = await import("./notifications.server");
      await notifySyncFailure({
        shopId,
        shopDomain: shop.shopDomain,
        errorMessage: error instanceof Error ? error.message : "Sync failed",
      });
    }
    throw error;
  }
}

export async function runInitialProductSync(
  shopId: string,
  admin: AdminApiContext,
) {
  return syncShopProducts(shopId, admin, { replaceExisting: true });
}

export async function runManualProductSync(
  shopId: string,
  admin: AdminApiContext,
) {
  return syncShopProducts(shopId, admin, { replaceExisting: true });
}

export async function runAutomaticProductSync(
  shopDomain: string,
  admin: AdminApiContext,
) {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain: normalizeShopDomain(shopDomain) },
  });

  if (!shop || shop.syncMode !== "AUTOMATIC") {
    return null;
  }

  return syncShopProducts(shop.id, admin, { replaceExisting: true });
}

export async function syncSingleShopifyProductById(
  shopId: string,
  admin: AdminApiContext,
  shopifyProductId: string,
) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return;

  const response = await admin.graphql(
    `#graphql
      query MangoSingleProduct($id: ID!) {
        product(id: $id) {
          id
          title
          description
          vendor
          productType
          onlineStoreUrl
          status
          category { fullName }
          collections(first: 5) { edges { node { title } } }
          featuredMedia { preview { image { url } } }
          variants(first: 100) {
            edges {
              node {
                id
                sku
                barcode
                price
                compareAtPrice
                availableForSale
                inventoryQuantity
              }
            }
          }
        }
      }
    `,
    { variables: { id: shopifyProductId } },
  );

  const payload = await response.json();
  const product = payload.data?.product as ShopifyProductNode | null;
  if (!product) {
    await prisma.product.deleteMany({
      where: { shopId, shopifyProductId },
    });
    return;
  }

  const records = mapShopifyProductToRecords(shopId, shop.shopDomain, product);
  const variantIds = records.map((record) => record.shopifyVariantId);

  await prisma.product.deleteMany({
    where: {
      shopId,
      shopifyProductId,
      shopifyVariantId: { notIn: variantIds },
    },
  });

  for (const record of records) {
    await prisma.product.upsert({
      where: {
        shopId_shopifyVariantId: {
          shopId,
          shopifyVariantId: record.shopifyVariantId,
        },
      },
      create: record,
      update: record,
    });
  }
}

export async function deleteShopifyProductFromShop(
  shopId: string,
  shopifyProductId: string,
) {
  await prisma.product.deleteMany({
    where: { shopId, shopifyProductId },
  });
}
