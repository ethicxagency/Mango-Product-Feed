import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

import { db } from "~/lib/db.server";
import {
  COLLECTION_BY_ID_QUERY,
  COLLECTION_PRODUCTS_QUERY,
  COLLECTION_SYNC_QUERY,
} from "./graphql/collection-queries";
import type {
  CollectionByIdQueryResponse,
  CollectionProductsQueryResponse,
  CollectionSyncQueryResponse,
  ShopifyCollectionNode,
} from "./graphql/collection-queries";

export interface CollectionSyncResult {
  collectionCount: number;
}

/** Fetches every product ID currently in a Shopify collection, following
 * pagination — collections (e.g. "All Products") can easily exceed one
 * page. */
async function fetchAllMemberProductIds(
  admin: AdminApiContext,
  shopifyCollectionId: string,
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await admin.graphql(COLLECTION_PRODUCTS_QUERY, {
      variables: { id: shopifyCollectionId, cursor },
    });
    const body = (await response.json()) as CollectionProductsQueryResponse;
    const products = body.data.collection?.products;
    if (!products) break;

    ids.push(...products.edges.map((edge) => edge.node.id));
    cursor = products.pageInfo.hasNextPage
      ? (products.pageInfo.endCursor ?? undefined)
      : undefined;
  } while (cursor);

  return ids;
}

async function upsertCollection(
  admin: AdminApiContext,
  shopId: string,
  node: ShopifyCollectionNode,
): Promise<void> {
  const memberShopifyIds = await fetchAllMemberProductIds(admin, node.id);

  await db.$transaction(async (tx) => {
    const collection = await tx.collection.upsert({
      where: { shopId_shopifyId: { shopId, shopifyId: node.id } },
      create: {
        shopId,
        shopifyId: node.id,
        title: node.title,
        handle: node.handle,
        description: node.description,
        isSmart: node.ruleSet !== null,
      },
      update: {
        title: node.title,
        handle: node.handle,
        description: node.description,
        isSmart: node.ruleSet !== null,
      },
    });

    await tx.productCollection.deleteMany({
      where: { collectionId: collection.id },
    });

    if (memberShopifyIds.length > 0) {
      const localProducts = await tx.product.findMany({
        where: { shopId, shopifyId: { in: memberShopifyIds } },
        select: { id: true },
      });
      if (localProducts.length > 0) {
        await tx.productCollection.createMany({
          data: localProducts.map((p) => ({
            collectionId: collection.id,
            productId: p.id,
          })),
        });
      }
    }
  });
}

export const collectionSyncService = {
  async syncAll(
    admin: AdminApiContext,
    shopId: string,
  ): Promise<CollectionSyncResult> {
    let cursor: string | undefined;
    let collectionCount = 0;

    do {
      const response = await admin.graphql(COLLECTION_SYNC_QUERY, {
        variables: { cursor },
      });
      const body = (await response.json()) as CollectionSyncQueryResponse;

      for (const edge of body.data.collections.edges) {
        await upsertCollection(admin, shopId, edge.node);
        collectionCount += 1;
      }

      cursor = body.data.collections.pageInfo.hasNextPage
        ? (body.data.collections.pageInfo.endCursor ?? undefined)
        : undefined;
    } while (cursor);

    await db.shop.update({
      where: { id: shopId },
      data: { lastCollectionSyncAt: new Date() },
    });

    return { collectionCount };
  },

  /** Re-fetches and upserts a single collection — used by the
   * collections/create and collections/update webhook handlers. */
  async syncOne(
    admin: AdminApiContext,
    shopId: string,
    shopifyCollectionId: string,
  ): Promise<void> {
    const response = await admin.graphql(COLLECTION_BY_ID_QUERY, {
      variables: { id: shopifyCollectionId },
    });
    const body = (await response.json()) as CollectionByIdQueryResponse;

    if (!body.data.collection) return;
    await upsertCollection(admin, shopId, body.data.collection);
  },

  async deleteOne(shopId: string, shopifyCollectionId: string): Promise<void> {
    await db.collection.deleteMany({
      where: { shopId, shopifyId: shopifyCollectionId },
    });
  },
};
