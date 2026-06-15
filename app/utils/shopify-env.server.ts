export function getShopifyEnv() {
  const apiKey = process.env.SHOPIFY_API_KEY?.trim() ?? "";
  const apiSecret = (
    process.env.SHOPIFY_API_SECRET ??
    process.env.SHOPIFY_API_SECRET_KEY ??
    ""
  ).trim();
  const appUrl = (
    process.env.SHOPIFY_APP_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/$/, "");
  const scopes = process.env.SCOPES?.split(",").map((s) => s.trim()).filter(Boolean);

  return {
    apiKey,
    apiSecret,
    appUrl,
    scopes,
    isConfigured: Boolean(apiKey && apiSecret && appUrl),
  };
}

export function getMissingShopifyEnvKeys(): string[] {
  const env = getShopifyEnv();
  const missing: string[] = [];
  if (!env.apiKey) missing.push("SHOPIFY_API_KEY");
  if (!env.apiSecret) missing.push("SHOPIFY_API_SECRET");
  if (!env.appUrl) missing.push("SHOPIFY_APP_URL or APP_URL");
  return missing;
}
