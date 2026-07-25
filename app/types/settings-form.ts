import { z } from "zod";

import {
  booleanField,
  optionalEmailField,
  optionalIntField,
  optionalNumberField,
  requiredTextField,
} from "~/lib/zod-helpers";
import {
  DATE_FORMATS,
  DEFAULT_FEED_PLATFORMS,
  PRODUCT_CONDITIONS,
} from "~/types/settings";
import { INVENTORY_POLICIES } from "~/types/product";

// ---------------------------------------------------------------------------
// General
// ---------------------------------------------------------------------------

export const generalSettingsSchema = z.object({
  storeName: requiredTextField("Store name", 140),
  companyName: requiredTextField("Company name", 140),
  supportEmail: optionalEmailField,
  timezone: requiredTextField("Timezone", 60).default("America/New_York"),
  defaultLanguage: requiredTextField("Default language", 10).default("en"),
  defaultCurrency: requiredTextField("Default currency", 10).default("USD"),
  country: requiredTextField("Country", 10).default("US"),
  dateFormat: z.enum(DATE_FORMATS).default("MM/DD/YYYY"),
});
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

// ---------------------------------------------------------------------------
// Feed Defaults
// ---------------------------------------------------------------------------

export const feedDefaultsSettingsSchema = z.object({
  defaultPlatform: z.enum(DEFAULT_FEED_PLATFORMS).default("GOOGLE"),
  feedDefaultLanguage: requiredTextField("Default language", 10).default("en"),
  feedDefaultCurrency: requiredTextField("Default currency", 10).default("USD"),
  feedDefaultCountry: requiredTextField("Default country", 10).default("US"),
  feedIncludeVariants: booleanField(true),
  feedIncludeOutOfStock: booleanField(false),
  feedIncludeDraftProducts: booleanField(false),
  feedDefaultProductLimit: optionalIntField,
  feedEnablePrettyXml: booleanField(true),
  feedEnableXmlCompression: booleanField(false),
});
export type FeedDefaultsSettingsInput = z.infer<
  typeof feedDefaultsSettingsSchema
>;

// ---------------------------------------------------------------------------
// Google Merchant
// ---------------------------------------------------------------------------

export const googleMerchantSettingsSchema = z.object({
  defaultBrand: requiredTextField("Default brand", 140),
  defaultCondition: z.enum(PRODUCT_CONDITIONS).default("new"),
  identifierExists: booleanField(true),
  shippingCountry: requiredTextField("Shipping country", 10).default("US"),
  shippingPrice: optionalNumberField,
  taxEnabled: booleanField(false),
  defaultProductCategory: requiredTextField("Default product category", 140),
  defaultCustomLabel0: requiredTextField("Custom label 0", 100),
  defaultCustomLabel1: requiredTextField("Custom label 1", 100),
  defaultCustomLabel2: requiredTextField("Custom label 2", 100),
  defaultCustomLabel3: requiredTextField("Custom label 3", 100),
  defaultCustomLabel4: requiredTextField("Custom label 4", 100),
});
export type GoogleMerchantSettingsInput = z.infer<
  typeof googleMerchantSettingsSchema
>;

// ---------------------------------------------------------------------------
// Meta Commerce
// ---------------------------------------------------------------------------

export const FACEBOOK_CATALOG_TYPE_VALUES = [
  "commerce",
  "destination",
  "hotels",
  "vehicles",
  "flights",
] as const;

export const metaCommerceSettingsSchema = z.object({
  defaultBrand: requiredTextField("Default brand", 140),
  condition: z.enum(PRODUCT_CONDITIONS).default("new"),
  inventoryPolicy: z.enum(INVENTORY_POLICIES).default("DENY"),
  facebookCatalogType: z.enum(FACEBOOK_CATALOG_TYPE_VALUES).default("commerce"),
});
export type MetaCommerceSettingsInput = z.infer<
  typeof metaCommerceSettingsSchema
>;

// ---------------------------------------------------------------------------
// TikTok Catalog
// ---------------------------------------------------------------------------

export const tiktokSettingsSchema = z.object({
  defaultBrand: requiredTextField("Default brand", 140),
  condition: z.enum(PRODUCT_CONDITIONS).default("new"),
  inventoryPolicy: z.enum(INVENTORY_POLICIES).default("DENY"),
  defaultProductCategory: requiredTextField("Default product category", 140),
});
export type TikTokSettingsInput = z.infer<typeof tiktokSettingsSchema>;

// ---------------------------------------------------------------------------
// Product Rules
// ---------------------------------------------------------------------------

export const productRulesSettingsSchema = z
  .object({
    excludeDraftProducts: booleanField(true),
    excludeArchivedProducts: booleanField(true),
    excludeOutOfStock: booleanField(false),
    excludeNoImage: booleanField(true),
    excludeNoSku: booleanField(false),
    excludeNoGtin: booleanField(false),
    excludeHiddenProducts: booleanField(true),
    excludeAdultProducts: booleanField(false),
    minPrice: optionalNumberField,
    maxPrice: optionalNumberField,
  })
  .refine(
    (data) =>
      data.minPrice === null ||
      data.maxPrice === null ||
      data.minPrice <= data.maxPrice,
    {
      message: "Minimum price must be less than or equal to maximum price",
      path: ["maxPrice"],
    },
  );
export type ProductRulesSettingsInput = z.infer<
  typeof productRulesSettingsSchema
>;

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationsSettingsSchema = z.object({
  notifyFeedGenerationFailed: booleanField(true),
  notifySynchronizationFailed: booleanField(true),
  notifyWeeklyFeedReport: booleanField(false),
  notifyWebhookErrors: booleanField(true),
  notificationEmail: optionalEmailField,
});
export type NotificationsSettingsInput = z.infer<
  typeof notificationsSettingsSchema
>;

// ---------------------------------------------------------------------------
// Security (toggle fields only — token actions are separate intents)
// ---------------------------------------------------------------------------

export const securitySettingsSchema = z.object({
  requireSecretTokenGlobally: booleanField(false),
});
export type SecuritySettingsInput = z.infer<typeof securitySettingsSchema>;
