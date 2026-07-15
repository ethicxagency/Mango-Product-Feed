import { z } from "zod";

import { FEED_CHANNELS, PRODUCT_SELECTION_TYPES } from "~/types/feed";

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date")
  .transform((v) => (v ? new Date(v) : null));

const optionalPrice = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || !Number.isNaN(Number(v)), "Invalid price")
  .transform((v) => (v === undefined ? null : Number(v)));

export const feedFormSchema = z
  .object({
    name: z.string().trim().min(1, "Feed name is required").max(140),
    channel: z.enum(FEED_CHANNELS),
    rootNode: z.string().trim().min(1).max(80).default("feed"),
    itemNode: z.string().trim().min(1).max(80).default("item"),
    prettyPrint: z.boolean().default(true),
    useCdata: z.boolean().default(true),

    productSelectionType: z.enum(PRODUCT_SELECTION_TYPES),
    collectionIds: z.array(z.string()).default([]),
    tagIds: z.array(z.string()).default([]),
    vendors: z.array(z.string()).default([]),
    productTypes: z.array(z.string()).default([]),
    manualProductIds: z.array(z.string()).default([]),

    includeOutOfStock: z.boolean().default(false),
    includeVariants: z.boolean().default(true),
    includeWithoutGtin: z.boolean().default(true),
    includeWithoutSku: z.boolean().default(true),
    skipDuplicateProducts: z.boolean().default(true),
    skipDuplicateVariants: z.boolean().default(true),
    skipBrokenImages: z.boolean().default(true),
    onlyPublished: z.boolean().default(true),
    onlyActive: z.boolean().default(true),

    priceMin: optionalPrice,
    priceMax: optionalPrice,
    createdAfter: optionalDate,
    createdBefore: optionalDate,
    updatedAfter: optionalDate,
    updatedBefore: optionalDate,
  })
  .refine(
    (data) =>
      data.priceMin === null ||
      data.priceMax === null ||
      data.priceMin <= data.priceMax,
    {
      message: "Minimum price must be less than or equal to maximum price",
      path: ["priceMax"],
    },
  );

export type FeedFormInput = z.infer<typeof feedFormSchema>;
