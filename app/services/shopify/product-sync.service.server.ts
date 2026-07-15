import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

import { db } from "~/lib/db.server";
import {
  PRODUCT_BY_ID_QUERY,
  PRODUCT_SYNC_QUERY,
} from "./graphql/product-queries";
import type {
  ProductByIdQueryResponse,
  ProductSyncQueryResponse,
  ShopifyProductNode,
} from "./graphql/product-queries";
import { mapProduct } from "./mappers";
import type { MappedProduct } from "./mappers";

export interface ProductSyncResult {
  productCount: number;
  variantCount: number;
}

/** Upserts one product (and fully replaces its images/variants/tags) —
 * shared by the full sync and the single-product webhook path so there is
 * exactly one place that knows how to write a Shopify product to our
 * schema. */
async function upsertProduct(
  shopId: string,
  mapped: MappedProduct,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const product = await tx.product.upsert({
      where: { shopId_shopifyId: { shopId, shopifyId: mapped.shopifyId } },
      create: {
        shopId,
        shopifyId: mapped.shopifyId,
        title: mapped.title,
        handle: mapped.handle,
        descriptionHtml: mapped.descriptionHtml,
        vendor: mapped.vendor,
        productType: mapped.productType,
        seoTitle: mapped.seoTitle,
        seoDescription: mapped.seoDescription,
        status: mapped.status,
        publishedAt: mapped.publishedAt,
        isHidden: false,
        isPasswordProtected: false,
        createdAt: mapped.createdAt,
        updatedAt: mapped.updatedAt,
      },
      update: {
        title: mapped.title,
        handle: mapped.handle,
        descriptionHtml: mapped.descriptionHtml,
        vendor: mapped.vendor,
        productType: mapped.productType,
        seoTitle: mapped.seoTitle,
        seoDescription: mapped.seoDescription,
        status: mapped.status,
        publishedAt: mapped.publishedAt,
        isHidden: false,
        isPasswordProtected: false,
        updatedAt: mapped.updatedAt,
      },
    });

    // Images and variants are fully replaced each sync rather than
    // diffed — Shopify is the single source of truth and catalogs are
    // small enough per-product (typically well under 100 images/variants)
    // that a delete-and-recreate is simpler and just as correct as a merge.
    await tx.productImage.deleteMany({ where: { productId: product.id } });
    const createdImages =
      mapped.images.length > 0
        ? await Promise.all(
            mapped.images.map((img) =>
              tx.productImage.create({
                data: {
                  productId: product.id,
                  shopifyId: img.shopifyId,
                  url: img.url,
                  altText: img.altText,
                  width: img.width,
                  height: img.height,
                  position: img.position,
                },
              }),
            ),
          )
        : [];
    const imageIdByShopifyId = new Map(
      createdImages.map((img) => [img.shopifyId, img.id]),
    );

    await tx.variant.deleteMany({ where: { productId: product.id } });
    if (mapped.variants.length > 0) {
      await tx.variant.createMany({
        data: mapped.variants.map((v) => ({
          productId: product.id,
          shopifyId: v.shopifyId,
          shopifyInventoryItemId: v.shopifyInventoryItemId,
          title: v.title,
          sku: v.sku,
          barcode: v.barcode,
          position: v.position,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
          weight: v.weight,
          weightUnit: v.weightUnit,
          inventoryQuantity: v.inventoryQuantity,
          inventoryPolicy: v.inventoryPolicy,
          taxable: v.taxable,
          requiresShipping: v.requiresShipping,
          imageId: v.imageShopifyId
            ? (imageIdByShopifyId.get(v.imageShopifyId) ?? null)
            : null,
        })),
      });
    }

    await tx.productTag.deleteMany({ where: { productId: product.id } });
    for (const tagName of mapped.tags) {
      const tag = await tx.tag.upsert({
        where: { shopId_name: { shopId, name: tagName } },
        create: { shopId, name: tagName },
        update: {},
      });
      await tx.productTag.create({
        data: { productId: product.id, tagId: tag.id },
      });
    }
  });
}

export const productSyncService = {
  /** Paginates through every product in the shop's catalog and upserts it.
   * Used for the initial sync right after install. */
  async syncAll(
    admin: AdminApiContext,
    shopId: string,
  ): Promise<ProductSyncResult> {
    let cursor: string | undefined;
    let productCount = 0;
    let variantCount = 0;

    do {
      const response = await admin.graphql(PRODUCT_SYNC_QUERY, {
        variables: { cursor },
      });
      const body = (await response.json()) as ProductSyncQueryResponse;

      for (const edge of body.data.products.edges) {
        await upsertProduct(shopId, mapProduct(edge.node));
        productCount += 1;
        variantCount += edge.node.variants.edges.length;
      }

      cursor = body.data.products.pageInfo.hasNextPage
        ? (body.data.products.pageInfo.endCursor ?? undefined)
        : undefined;
    } while (cursor);

    await db.shop.update({
      where: { id: shopId },
      data: { lastProductSyncAt: new Date() },
    });

    return { productCount, variantCount };
  },

  /** Re-fetches and upserts a single product — used by the
   * products/create and products/update webhook handlers. */
  async syncOne(
    admin: AdminApiContext,
    shopId: string,
    shopifyProductId: string,
  ): Promise<void> {
    const response = await admin.graphql(PRODUCT_BY_ID_QUERY, {
      variables: { id: shopifyProductId },
    });
    const body = (await response.json()) as ProductByIdQueryResponse;

    if (!body.data.product) return;
    await upsertProduct(
      shopId,
      mapProduct(body.data.product as ShopifyProductNode),
    );
  },

  /** Removes a product that was deleted in Shopify — used by the
   * products/delete webhook handler, whose payload only carries the ID. */
  async deleteOne(shopId: string, shopifyProductId: string): Promise<void> {
    await db.product.deleteMany({
      where: { shopId, shopifyId: shopifyProductId },
    });
  },
};
