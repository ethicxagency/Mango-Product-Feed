import type {
  InventoryPolicy,
  ProductStatus,
  WeightUnit,
} from "~/types/product";

export interface GeneratedImage {
  id: string;
  url: string;
  altText: string;
  position: number;
  width: number;
  height: number;
  isBroken: boolean;
}

export interface GeneratedVariant {
  id: string;
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
  weightUnit: WeightUnit;
  inventoryQuantity: number;
  inventoryPolicy: InventoryPolicy;
  imageId: string | null;
}

export interface GeneratedMetafield {
  namespace: string;
  key: string;
  value: string;
  type: string;
}

export interface GeneratedProduct {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  status: ProductStatus;
  publishedAt: Date | null;
  isHidden: boolean;
  isPasswordProtected: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  images: GeneratedImage[];
  variants: GeneratedVariant[];
  metafields: GeneratedMetafield[];
  tagNames: string[];
  collectionTitles: string[];
}
