-- Production-ready schema: PostgreSQL migration
-- Extends Mango Product Feed with new channels, admin, AI, notifications

-- New enums
CREATE TYPE "CategoryMappingPlatform" AS ENUM ('GOOGLE', 'META', 'TIKTOK', 'PINTEREST', 'SNAPCHAT');
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VIEWER');
CREATE TYPE "NotificationType" AS ENUM ('FEED_ERROR', 'FEED_EXPIRY', 'SYNC_FAILURE');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE "SystemLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');
CREATE TYPE "AiOptimizationType" AS ENUM ('TITLE', 'DESCRIPTION', 'HEALTH_SUGGESTION');

-- Extend FeedType enum
ALTER TYPE "FeedType" ADD VALUE IF NOT EXISTS 'PINTEREST';
ALTER TYPE "FeedType" ADD VALUE IF NOT EXISTS 'SNAPCHAT';
ALTER TYPE "FeedType" ADD VALUE IF NOT EXISTS 'CUSTOM';

-- Extend RuleConditionField enum
ALTER TYPE "RuleConditionField" ADD VALUE IF NOT EXISTS 'SKU';
ALTER TYPE "RuleConditionField" ADD VALUE IF NOT EXISTS 'COUNTRY';

-- Product extensions
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "currency_code" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "country_code" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "ai_optimized_title" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "ai_optimized_description" TEXT;
CREATE INDEX IF NOT EXISTS "products_country_code_idx" ON "products"("country_code");

-- Feed templates
CREATE TABLE IF NOT EXISTS "feed_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "feed_type" "FeedType" NOT NULL,
    "item_template" TEXT NOT NULL,
    "header_template" TEXT NOT NULL DEFAULT '',
    "footer_template" TEXT NOT NULL DEFAULT '',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "feed_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "feed_templates_feed_type_idx" ON "feed_templates"("feed_type");

-- Feed config extensions
ALTER TABLE "feed_configs" ADD COLUMN IF NOT EXISTS "currency_code" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "feed_configs" ADD COLUMN IF NOT EXISTS "target_country" TEXT;
ALTER TABLE "feed_configs" ADD COLUMN IF NOT EXISTS "template_id" TEXT;
ALTER TABLE "feed_configs" ADD COLUMN IF NOT EXISTS "custom_xml_template" TEXT;
ALTER TABLE "feed_configs" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "feed_configs_target_country_idx" ON "feed_configs"("target_country");

ALTER TABLE "feed_configs" DROP CONSTRAINT IF EXISTS "feed_configs_template_id_fkey";
ALTER TABLE "feed_configs" ADD CONSTRAINT "feed_configs_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "feed_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Category mappings
CREATE TABLE IF NOT EXISTS "category_mappings" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "platform" "CategoryMappingPlatform" NOT NULL,
    "source_category" TEXT NOT NULL,
    "target_category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "category_mappings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "category_mappings_shop_id_platform_source_category_key"
  ON "category_mappings"("shop_id", "platform", "source_category");
CREATE INDEX IF NOT EXISTS "category_mappings_shop_id_platform_idx" ON "category_mappings"("shop_id", "platform");
ALTER TABLE "category_mappings" DROP CONSTRAINT IF EXISTS "category_mappings_shop_id_fkey";
ALTER TABLE "category_mappings" ADD CONSTRAINT "category_mappings_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Product exclusions
CREATE TABLE IF NOT EXISTS "product_exclusions" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition_field" "RuleConditionField" NOT NULL,
    "condition_operator" "RuleConditionOperator" NOT NULL,
    "condition_value" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_exclusions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "product_exclusions_shop_id_is_active_idx" ON "product_exclusions"("shop_id", "is_active");
ALTER TABLE "product_exclusions" DROP CONSTRAINT IF EXISTS "product_exclusions_shop_id_fkey";
ALTER TABLE "product_exclusions" ADD CONSTRAINT "product_exclusions_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Admin users
CREATE TABLE IF NOT EXISTS "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_key" ON "admin_users"("email");

-- Notification preferences
CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "email" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_shop_id_type_email_key"
  ON "notification_preferences"("shop_id", "type", "email");
ALTER TABLE "notification_preferences" DROP CONSTRAINT IF EXISTS "notification_preferences_shop_id_fkey";
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notification logs
CREATE TABLE IF NOT EXISTS "notification_logs" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notification_logs_shop_id_created_at_idx" ON "notification_logs"("shop_id", "created_at");
CREATE INDEX IF NOT EXISTS "notification_logs_type_created_at_idx" ON "notification_logs"("type", "created_at");

-- System logs
CREATE TABLE IF NOT EXISTS "system_logs" (
    "id" TEXT NOT NULL,
    "level" "SystemLogLevel" NOT NULL DEFAULT 'INFO',
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "shop_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "system_logs_level_created_at_idx" ON "system_logs"("level", "created_at");
CREATE INDEX IF NOT EXISTS "system_logs_category_created_at_idx" ON "system_logs"("category", "created_at");
CREATE INDEX IF NOT EXISTS "system_logs_shop_id_created_at_idx" ON "system_logs"("shop_id", "created_at");

-- AI optimizations
CREATE TABLE IF NOT EXISTS "ai_optimizations" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" "AiOptimizationType" NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_optimizations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_optimizations_product_id_type_idx" ON "ai_optimizations"("product_id", "type");
ALTER TABLE "ai_optimizations" DROP CONSTRAINT IF EXISTS "ai_optimizations_product_id_fkey";
ALTER TABLE "ai_optimizations" ADD CONSTRAINT "ai_optimizations_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
