const apiKey = process.env.SHOPIFY_API_KEY?.trim() ?? "";
const apiSecret = (
  process.env.SHOPIFY_API_SECRET ??
  process.env.SHOPIFY_API_SECRET_KEY ??
  ""
).trim();
const appUrl = (process.env.SHOPIFY_APP_URL || process.env.APP_URL || "").trim();
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

const missing = [];
if (!apiKey) missing.push("SHOPIFY_API_KEY");
if (!apiSecret) missing.push("SHOPIFY_API_SECRET");
if (!appUrl) missing.push("SHOPIFY_APP_URL or APP_URL");
if (!databaseUrl) missing.push("DATABASE_URL");

if (missing.length > 0) {
  console.error(
    `[startup] Missing required environment variables: ${missing.join(", ")}`,
  );
  console.error(
    "[startup] Set them in Render Dashboard → Environment, then redeploy.",
  );
  process.exit(1);
}

if (
  databaseUrl.includes("render.com") &&
  !databaseUrl.includes("sslmode=")
) {
  console.error(
    "[startup] DATABASE_URL must include ?sslmode=require for Render PostgreSQL.",
  );
  console.error(
    "[startup] Example: postgresql://user:pass@host/db?sslmode=require",
  );
  process.exit(1);
}

console.log("[startup] Production environment check passed.");
