-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" DATETIME
);

-- CreateTable
CREATE TABLE "shops" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "sync_mode" TEXT NOT NULL DEFAULT 'MANUAL',
    "sync_status" TEXT NOT NULL DEFAULT 'IDLE',
    "last_synced_at" DATETIME,
    "initial_sync_done" BOOLEAN NOT NULL DEFAULT false,
    "installed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shopify_charge_id" TEXT,
    "shopify_charge_url" TEXT,
    "price" DECIMAL NOT NULL DEFAULT 0,
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "subscriptions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create local shop for existing standalone data
INSERT INTO "shops" ("id", "shop_domain", "name", "plan", "sync_mode", "sync_status", "initial_sync_done", "installed_at", "updated_at")
VALUES ('local-shop', 'local.mango-feed.app', 'Local Mango Feed', 'FREE', 'MANUAL', 'SUCCESS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RedefineProducts
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_id" TEXT,
    "shopify_product_id" TEXT,
    "shopify_variant_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "gtin" TEXT,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "product_type" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "sale_price" DECIMAL,
    "availability" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "image_url" TEXT NOT NULL,
    "product_url" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_products" ("id", "shop_id", "title", "description", "sku", "gtin", "brand", "category", "product_type", "price", "sale_price", "availability", "image_url", "product_url", "created_at", "updated_at")
SELECT "id", 'local-shop', "title", "description", "sku", "gtin", "brand", "category", "product_type", "price", "sale_price", "availability", "image_url", "product_url", "created_at", "updated_at" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_shop_id_sku_key" ON "products"("shop_id", "sku");
CREATE UNIQUE INDEX "products_shop_id_shopify_variant_id_key" ON "products"("shop_id", "shopify_variant_id");
CREATE INDEX "products_category_idx" ON "products"("category");
CREATE INDEX "products_brand_idx" ON "products"("brand");
CREATE INDEX "products_product_type_idx" ON "products"("product_type");
CREATE INDEX "products_shop_id_idx" ON "products"("shop_id");
PRAGMA foreign_keys=ON;

-- RedefineFeedConfigs
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_feed_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_id" TEXT,
    "name" TEXT NOT NULL,
    "feed_type" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "filter_mode" TEXT NOT NULL DEFAULT 'ALL',
    "filter_values" TEXT NOT NULL DEFAULT '[]',
    "schedule" TEXT NOT NULL DEFAULT 'MANUAL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_generated_at" DATETIME,
    "last_accessed_at" DATETIME,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "feed_configs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_feed_configs" ("id", "shop_id", "name", "feed_type", "token", "is_default", "filter_mode", "filter_values", "schedule", "is_active", "last_generated_at", "last_accessed_at", "request_count", "download_count", "created_at", "updated_at")
SELECT "id", 'local-shop', "name", "feed_type", "token", "is_default", "filter_mode", "filter_values", "schedule", "is_active", "last_generated_at", "last_accessed_at", "request_count", "download_count", "created_at", "updated_at" FROM "feed_configs";
DROP TABLE "feed_configs";
ALTER TABLE "new_feed_configs" RENAME TO "feed_configs";
CREATE UNIQUE INDEX "feed_configs_token_key" ON "feed_configs"("token");
CREATE INDEX "feed_configs_feed_type_is_default_idx" ON "feed_configs"("feed_type", "is_default");
CREATE INDEX "feed_configs_feed_type_is_active_idx" ON "feed_configs"("feed_type", "is_active");
CREATE INDEX "feed_configs_shop_id_idx" ON "feed_configs"("shop_id");
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "shops_shop_domain_key" ON "shops"("shop_domain");
CREATE INDEX "subscriptions_shop_id_status_idx" ON "subscriptions"("shop_id", "status");
