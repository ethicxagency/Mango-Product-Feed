const apiKey = process.env.SHOPIFY_API_KEY?.trim() ?? "";
const apiSecret = (
  process.env.SHOPIFY_API_SECRET ??
  process.env.SHOPIFY_API_SECRET_KEY ??
  ""
).trim();
const appUrl = (process.env.SHOPIFY_APP_URL || process.env.APP_URL || "").trim();

const missing = [];
if (!apiKey) missing.push("SHOPIFY_API_KEY");
if (!apiSecret) missing.push("SHOPIFY_API_SECRET");
if (!appUrl) missing.push("SHOPIFY_APP_URL or APP_URL");

if (missing.length > 0) {
  console.error(
    `[startup] Missing required environment variables: ${missing.join(", ")}`,
  );
  console.error(
    "[startup] Add them in Render Dashboard → Environment, then redeploy.",
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error("[startup] Missing DATABASE_URL (link Render PostgreSQL).");
  process.exit(1);
}

console.log("[startup] Production environment check passed.");
