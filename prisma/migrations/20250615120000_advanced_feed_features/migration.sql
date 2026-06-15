-- AlterTable
ALTER TABLE "products" ADD COLUMN "gtin" TEXT;

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");
CREATE INDEX "products_brand_idx" ON "products"("brand");
CREATE INDEX "products_product_type_idx" ON "products"("product_type");

-- CreateTable
CREATE TABLE "feed_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "feed_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feed_config_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition_field" TEXT NOT NULL,
    "condition_operator" TEXT NOT NULL,
    "condition_value" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "action_value" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feed_rules_feed_config_id_fkey" FOREIGN KEY ("feed_config_id") REFERENCES "feed_configs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feed_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feed_config_id" TEXT,
    "feed_name" TEXT NOT NULL,
    "feed_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "response_time_ms" INTEGER NOT NULL,
    "product_count" INTEGER NOT NULL DEFAULT 0,
    "is_download" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT,
    "user_agent" TEXT,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feed_logs_feed_config_id_fkey" FOREIGN KEY ("feed_config_id") REFERENCES "feed_configs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "feed_configs_token_key" ON "feed_configs"("token");
CREATE INDEX "feed_configs_feed_type_is_default_idx" ON "feed_configs"("feed_type", "is_default");
CREATE INDEX "feed_configs_feed_type_is_active_idx" ON "feed_configs"("feed_type", "is_active");
CREATE INDEX "feed_rules_feed_config_id_priority_idx" ON "feed_rules"("feed_config_id", "priority");
CREATE INDEX "feed_logs_feed_config_id_created_at_idx" ON "feed_logs"("feed_config_id", "created_at");
CREATE INDEX "feed_logs_created_at_idx" ON "feed_logs"("created_at");
CREATE INDEX "feed_logs_feed_type_created_at_idx" ON "feed_logs"("feed_type", "created_at");
