import { z } from "zod";

export const productInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  sku: z.string().trim().min(1).max(100),
  gtin: z.string().trim().max(14).optional(),
  brand: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(500),
  productType: z.string().trim().min(1).max(200),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().or(z.literal("")),
  availability: z.enum(["IN_STOCK", "OUT_OF_STOCK", "PREORDER"]),
  imageUrl: z.string().url().max(2000),
  productUrl: z.string().url().max(2000),
  currencyCode: z.string().length(3).optional(),
  countryCode: z.string().length(2).optional().or(z.literal("")),
});

export const feedConfigInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  feedType: z.enum(["GOOGLE", "META", "TIKTOK", "PINTEREST", "SNAPCHAT", "CUSTOM"]),
  filterMode: z.enum(["ALL", "PRODUCTS", "CATEGORIES", "BRANDS", "PRODUCT_TYPES"]),
  filterValues: z.array(z.string()),
  schedule: z.enum(["MANUAL", "HOURLY", "DAILY", "WEEKLY"]),
  isActive: z.boolean(),
  currencyCode: z.string().length(3).optional(),
  targetCountry: z.string().length(2).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export const categoryMappingSchema = z.object({
  platform: z.enum(["GOOGLE", "META", "TIKTOK", "PINTEREST", "SNAPCHAT"]),
  sourceCategory: z.string().trim().min(1).max(500),
  targetCategory: z.string().trim().min(1).max(500),
});

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    errors[key] = issue.message;
  }
  return errors;
}

export function sanitizeString(input: string, maxLength = 500): string {
  return input.trim().slice(0, maxLength);
}
