export const DEFAULT_FEED_PLATFORMS = ["GOOGLE", "META", "TIKTOK"] as const;
export type DefaultFeedPlatform = (typeof DEFAULT_FEED_PLATFORMS)[number];

export const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const PRODUCT_CONDITIONS = ["new", "used", "refurbished"] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export const FACEBOOK_CATALOG_TYPES = [
  "commerce",
  "destination",
  "hotels",
  "vehicles",
  "flights",
] as const;
export type FacebookCatalogType = (typeof FACEBOOK_CATALOG_TYPES)[number];

export const TEAM_ROLES = ["OWNER", "ADMIN", "EDITOR", "VIEWER"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
] as const;

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "INR",
  "BRL",
] as const;

export const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "BR", label: "Brazil" },
] as const;

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Australia/Sydney",
  "UTC",
] as const;

export const SETTINGS_SECTIONS = [
  { path: "general", label: "General" },
  { path: "store-information", label: "Store Information" },
  { path: "feed-defaults", label: "Feed Defaults" },
  { path: "google-merchant", label: "Google Merchant" },
  { path: "meta-commerce", label: "Meta Commerce" },
  { path: "tiktok", label: "TikTok Catalog" },
  { path: "product-rules", label: "Product Rules" },
  { path: "synchronization", label: "Synchronization" },
  { path: "notifications", label: "Notifications" },
  { path: "api-webhooks", label: "API & Webhooks" },
  { path: "security", label: "Security" },
  { path: "billing", label: "Billing" },
  { path: "team", label: "Team" },
  { path: "about", label: "About" },
] as const;
