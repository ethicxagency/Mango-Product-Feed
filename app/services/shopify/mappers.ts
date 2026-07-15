import type {
  ShopifyProductNode,
  ShopifyProductVariantNode,
} from "./graphql/product-queries";

const WEIGHT_UNIT_MAP: Record<string, string> = {
  GRAMS: "g",
  KILOGRAMS: "kg",
  OUNCES: "oz",
  POUNDS: "lb",
};

export function mapWeightUnit(shopifyUnit: string | undefined): string {
  return WEIGHT_UNIT_MAP[shopifyUnit ?? ""] ?? "kg";
}

export interface MappedVariant {
  shopifyId: string;
  shopifyInventoryItemId: string;
  title: string;
  sku: string;
  barcode: string;
  position: number;
  price: number | null;
  compareAtPrice: number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  weight: number;
  weightUnit: string;
  inventoryQuantity: number;
  inventoryPolicy: string;
  taxable: boolean;
  requiresShipping: boolean;
  imageShopifyId: string | null;
}

/** Maps one Shopify GraphQL variant node to our Prisma Variant shape. Pure
 * and DB-free so it's independently testable. */
export function mapVariant(
  node: ShopifyProductVariantNode,
  position: number,
): MappedVariant {
  const [option1, option2, option3] = node.selectedOptions.map((o) => o.value);
  const weight = node.inventoryItem.measurement.weight;

  return {
    shopifyId: node.id,
    shopifyInventoryItemId: node.inventoryItem.id,
    title: node.title,
    sku: node.sku ?? "",
    barcode: node.barcode ?? "",
    position,
    price: node.price ? Number(node.price) : null,
    compareAtPrice: node.compareAtPrice ? Number(node.compareAtPrice) : null,
    option1: option1 ?? null,
    option2: option2 ?? null,
    option3: option3 ?? null,
    weight: weight?.value ?? 0,
    weightUnit: mapWeightUnit(weight?.unit),
    inventoryQuantity: node.inventoryQuantity ?? 0,
    inventoryPolicy: node.inventoryPolicy,
    taxable: node.taxable,
    requiresShipping: node.inventoryItem.requiresShipping,
    imageShopifyId: node.image?.id ?? null,
  };
}

export interface MappedProduct {
  shopifyId: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  status: string;
  publishedAt: Date | null;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  images: {
    shopifyId: string;
    url: string;
    altText: string;
    width: number | null;
    height: number | null;
    position: number;
  }[];
  variants: MappedVariant[];
}

/** Maps one Shopify GraphQL product node (with its nested images/variants)
 * to our Prisma shape. Real Shopify data has no equivalent of the Phase 1
 * mock "isHidden"/"isPasswordProtected" simulation fields, so synced
 * products always get `false` for both — status/publishedAt already
 * capture the real visibility rules the eligibility engine cares about. */
export function mapProduct(node: ShopifyProductNode): MappedProduct {
  return {
    shopifyId: node.id,
    title: node.title,
    handle: node.handle,
    descriptionHtml: node.descriptionHtml,
    vendor: node.vendor,
    productType: node.productType,
    status: node.status,
    publishedAt: node.publishedAt ? new Date(node.publishedAt) : null,
    seoTitle: node.seo.title ?? "",
    seoDescription: node.seo.description ?? "",
    tags: node.tags,
    createdAt: new Date(node.createdAt),
    updatedAt: new Date(node.updatedAt),
    images: node.images.edges.map(({ node: image }, index) => ({
      shopifyId: image.id,
      url: image.url,
      altText: image.altText ?? "",
      width: image.width,
      height: image.height,
      position: index + 1,
    })),
    variants: node.variants.edges.map(({ node: variant }, index) =>
      mapVariant(variant, index + 1),
    ),
  };
}
