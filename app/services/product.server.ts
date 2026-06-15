import prisma from "../db.server";
import { LOCAL_SHOP_ID } from "../constants/shop";
import type { ProductInput } from "../types/product";
import type { Availability, Prisma, Product } from "@prisma/client";
import { resolveShopId } from "./shop.server";

function toDecimal(value: string) {
  return value;
}

function withShopId(shopId: string, where: Prisma.ProductWhereInput = {}) {
  return { ...where, shopId };
}

export async function listProducts(shopId?: string | null): Promise<Product[]> {
  const resolvedShopId = await resolveShopId(shopId);
  return prisma.product.findMany({
    where: { shopId: resolvedShopId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProductById(
  id: string,
  shopId?: string | null,
): Promise<Product | null> {
  const resolvedShopId = await resolveShopId(shopId);
  return prisma.product.findFirst({
    where: { id, shopId: resolvedShopId },
  });
}

export async function createProduct(
  input: ProductInput,
  shopId?: string | null,
): Promise<Product> {
  const resolvedShopId = await resolveShopId(shopId);
  return prisma.product.create({
    data: {
      shopId: resolvedShopId,
      title: input.title,
      description: input.description,
      sku: input.sku,
      gtin: input.gtin?.trim() || null,
      brand: input.brand,
      category: input.category,
      productType: input.productType,
      price: toDecimal(input.price),
      salePrice: input.salePrice ? toDecimal(input.salePrice) : null,
      availability: input.availability as Availability,
      imageUrl: input.imageUrl,
      productUrl: input.productUrl,
    },
  });
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  shopId?: string | null,
): Promise<Product> {
  const resolvedShopId = await resolveShopId(shopId);
  const existing = await getProductById(id, resolvedShopId);
  if (!existing) {
    throw new Error("Product not found");
  }

  return prisma.product.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      sku: input.sku,
      gtin: input.gtin?.trim() || null,
      brand: input.brand,
      category: input.category,
      productType: input.productType,
      price: toDecimal(input.price),
      salePrice: input.salePrice ? toDecimal(input.salePrice) : null,
      availability: input.availability as Availability,
      imageUrl: input.imageUrl,
      productUrl: input.productUrl,
    },
  });
}

export async function deleteProduct(
  id: string,
  shopId?: string | null,
): Promise<void> {
  const resolvedShopId = await resolveShopId(shopId);
  const existing = await getProductById(id, resolvedShopId);
  if (!existing) return;
  await prisma.product.delete({ where: { id } });
}

export async function countProducts(shopId?: string | null): Promise<number> {
  const resolvedShopId = await resolveShopId(shopId);
  return prisma.product.count({ where: { shopId: resolvedShopId } });
}

export async function isSkuTaken(
  sku: string,
  excludeId?: string,
  shopId?: string | null,
): Promise<boolean> {
  const resolvedShopId = await resolveShopId(shopId);
  const existing = await prisma.product.findUnique({
    where: {
      shopId_sku: {
        shopId: resolvedShopId,
        sku,
      },
    },
  });
  if (!existing) return false;
  return existing.id !== excludeId;
}

export async function* iterateProducts(
  where: Prisma.ProductWhereInput = {},
  batchSize = 500,
  shopId?: string | null,
): AsyncGenerator<Product> {
  const resolvedShopId = await resolveShopId(shopId);
  let cursor: string | undefined;

  while (true) {
    const batch = await prisma.product.findMany({
      where: withShopId(resolvedShopId, where),
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });

    if (batch.length === 0) break;

    for (const product of batch) {
      yield product;
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < batchSize) break;
  }
}

export async function deleteAllShopProducts(shopId: string) {
  return prisma.product.deleteMany({ where: { shopId } });
}

export { LOCAL_SHOP_ID };
