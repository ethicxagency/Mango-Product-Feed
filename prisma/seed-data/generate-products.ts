import { faker } from "@faker-js/faker";

import {
  COLOR_OPTIONS,
  MATERIAL_OPTIONS,
  PRODUCT_TYPES,
  SIZE_OPTIONS,
  STORAGE_OPTIONS,
  TAG_POOL,
  VENDORS,
  WEIGHT_UNIT_CYCLE,
} from "./constants";
import type {
  GeneratedImage,
  GeneratedMetafield,
  GeneratedProduct,
  GeneratedVariant,
} from "./types";

function slugify(text: string, suffix: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${suffix}`;
}

function pickImageUrl(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/900/900`;
}

const BROKEN_IMAGE_URL = "https://cdn.mango-demo.invalid/broken/not-found.jpg";

function buildImages(productSeed: string, skip: boolean): GeneratedImage[] {
  if (skip) return [];

  const count = faker.number.int({ min: 1, max: 4 });
  const includeBroken = faker.number.int({ min: 1, max: 100 }) <= 3;

  return Array.from({ length: count }, (_, index) => {
    const isBroken = includeBroken && index === count - 1;
    return {
      id: crypto.randomUUID(),
      url: isBroken
        ? BROKEN_IMAGE_URL
        : pickImageUrl(`${productSeed}-${index}`),
      altText: `${productSeed} — image ${index + 1}`,
      position: index + 1,
      width: 900,
      height: 900,
      isBroken,
    };
  });
}

function optionSetFor(
  productType: string,
): { name: string; values: string[] }[] {
  switch (productType) {
    case "Apparel":
    case "Footwear":
      return [
        { name: "Size", values: SIZE_OPTIONS },
        { name: "Color", values: COLOR_OPTIONS },
      ];
    case "Electronics":
      return [{ name: "Storage", values: STORAGE_OPTIONS }];
    case "Home & Kitchen":
    case "Accessories":
      return [
        { name: "Color", values: COLOR_OPTIONS },
        { name: "Material", values: MATERIAL_OPTIONS },
      ];
    default:
      return [{ name: "Color", values: COLOR_OPTIONS }];
  }
}

interface VariantEdgeCases {
  missingSku: boolean;
  missingBarcode: boolean;
  missingPrice: boolean;
  outOfStockDeny: boolean;
  outOfStockContinue: boolean;
  duplicateSku: string | null;
}

function buildVariants(
  productType: string,
  basePrice: number,
  images: GeneratedImage[],
  edgeCases: VariantEdgeCases,
): GeneratedVariant[] {
  const optionSets = optionSetFor(productType);
  const useVariants = faker.number.int({ min: 1, max: 100 }) <= 70;

  const combos: Array<[string | null, string | null, string | null]> =
    useVariants
      ? optionSets.length === 2
        ? optionSets[0]!.values
            .slice(
              0,
              faker.number.int({ min: 2, max: optionSets[0]!.values.length }),
            )
            .flatMap((v1) =>
              optionSets[1]!.values
                .slice(0, faker.number.int({ min: 1, max: 3 }))
                .map((v2): [string, string, null] => [v1, v2, null]),
            )
        : optionSets[0]!.values
            .slice(0, faker.number.int({ min: 2, max: 4 }))
            .map((v1): [string, null, null] => [v1, null, null])
      : [[null, null, null]];

  return combos.map((combo, index) => {
    const [option1, option2, option3] = combo;
    const variantTitle =
      combo[0] === null ? "Default Title" : combo.filter(Boolean).join(" / ");

    const priceJitter = faker.number.float({
      min: -5,
      max: 20,
      fractionDigits: 2,
    });
    const price =
      edgeCases.missingPrice && index === 0
        ? null
        : Math.max(1, Number((basePrice + priceJitter).toFixed(2)));

    const hasCompareAt = faker.number.int({ min: 1, max: 100 }) <= 35;
    const compareAtPrice =
      hasCompareAt && price !== null
        ? Number(
            (
              price + faker.number.float({ min: 2, max: 25, fractionDigits: 2 })
            ).toFixed(2),
          )
        : null;

    let inventoryQuantity = faker.number.int({ min: 0, max: 250 });
    let inventoryPolicy: GeneratedVariant["inventoryPolicy"] = "DENY";

    if (edgeCases.outOfStockDeny && index === 0) {
      inventoryQuantity = 0;
      inventoryPolicy = "DENY";
    } else if (edgeCases.outOfStockContinue && index === 0) {
      inventoryQuantity = 0;
      inventoryPolicy = "CONTINUE";
    }

    const sku = edgeCases.missingSku
      ? ""
      : (edgeCases.duplicateSku ??
        `SKU-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`);

    const barcode = edgeCases.missingBarcode
      ? ""
      : faker.string.numeric({ length: 12 });

    return {
      id: crypto.randomUUID(),
      title: variantTitle,
      sku,
      barcode,
      position: index + 1,
      price,
      compareAtPrice,
      option1,
      option2,
      option3,
      weight: Number(
        faker.number.float({ min: 0.05, max: 12, fractionDigits: 2 }),
      ),
      weightUnit: WEIGHT_UNIT_CYCLE[index % WEIGHT_UNIT_CYCLE.length]!,
      inventoryQuantity,
      inventoryPolicy,
      imageId: images[index % images.length]?.id ?? images[0]?.id ?? null,
    };
  });
}

function buildMetafields(productType: string): GeneratedMetafield[] {
  const fields: GeneratedMetafield[] = [
    {
      namespace: "custom",
      key: "care_instructions",
      value: faker.lorem.sentence(),
      type: "multi_line_text_field",
    },
  ];

  if (productType === "Electronics") {
    fields.push({
      namespace: "custom",
      key: "warranty_months",
      value: String(faker.helpers.arrayElement([6, 12, 24])),
      type: "number_integer",
    });
  }

  return fields;
}

export interface GenerateProductsOptions {
  count: number;
  /** SKUs to intentionally reuse so duplicate-SKU rules have data to catch. */
  duplicateSkuPool: string[];
}

export function generateProducts({
  count,
  duplicateSkuPool,
}: GenerateProductsOptions): GeneratedProduct[] {
  const products: GeneratedProduct[] = [];

  for (let i = 0; i < count; i++) {
    const productType = faker.helpers.arrayElement(PRODUCT_TYPES);
    const vendor = faker.helpers.arrayElement(VENDORS);
    const roll = faker.number.int({ min: 1, max: 100 });

    const title = roll <= 2 ? "" : faker.commerce.productName();
    const handle = slugify(title || `product`, i);

    const status =
      roll > 2 && roll <= 6
        ? "DRAFT"
        : roll > 6 && roll <= 9
          ? "ARCHIVED"
          : "ACTIVE";

    const isDeleted = roll === 10;
    const isHidden = roll > 10 && roll <= 12;
    const isPasswordProtected = roll > 12 && roll <= 13;
    const skipImages = roll > 13 && roll <= 18;

    const createdAt = faker.date.past({ years: 2 });
    const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

    const images = buildImages(`${handle}`, skipImages);

    const variantRoll = faker.number.int({ min: 1, max: 100 });
    const useDuplicateSku =
      duplicateSkuPool.length > 0 && variantRoll <= 3
        ? faker.helpers.arrayElement(duplicateSkuPool)
        : null;

    const variants = buildVariants(
      productType,
      Number(faker.commerce.price({ min: 8, max: 400 })),
      images,
      {
        missingSku: variantRoll > 3 && variantRoll <= 5,
        missingBarcode: variantRoll > 5 && variantRoll <= 7,
        missingPrice: variantRoll > 7 && variantRoll <= 9,
        outOfStockDeny: variantRoll > 9 && variantRoll <= 17,
        outOfStockContinue: variantRoll > 17 && variantRoll <= 20,
        duplicateSku: useDuplicateSku,
      },
    );

    const tagNames = faker.helpers.arrayElements(
      TAG_POOL,
      faker.number.int({ min: 1, max: 5 }),
    );

    products.push({
      id: crypto.randomUUID(),
      title,
      handle,
      descriptionHtml: `<p>${faker.commerce.productDescription()}</p>`,
      vendor,
      productType,
      status,
      publishedAt: status === "ACTIVE" && !isHidden ? createdAt : null,
      isHidden,
      isPasswordProtected,
      deletedAt: isDeleted ? faker.date.recent() : null,
      createdAt,
      updatedAt,
      images,
      variants,
      metafields: buildMetafields(productType),
      tagNames,
      collectionTitles: [],
    });
  }

  return products;
}
