Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "shops" (
    "id" TEXT NOT NULL,
    "shopifyDomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "ianaTimezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "planName" TEXT NOT NULL DEFAULT 'mock-development',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" TIMESTAMP(3),
    "grantedScopes" TEXT NOT NULL DEFAULT '',
    "lastProductSyncAt" TIMESTAMP(3),
    "lastCollectionSyncAt" TIMESTAMP(3),
    "lastInventorySyncAt" TIMESTAMP(3),
    "lastWebhookSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "primaryDomain" TEXT NOT NULL DEFAULT '',
    "shopOwnerName" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
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
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopifyId" TEXT,
    "title" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "descriptionHtml" TEXT NOT NULL DEFAULT '',
    "vendor" TEXT NOT NULL DEFAULT '',
    "productType" TEXT NOT NULL DEFAULT '',
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "publishedAt" TIMESTAMP(3),
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isPasswordProtected" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "shopifyId" TEXT,
    "shopifyInventoryItemId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Default Title',
    "sku" TEXT NOT NULL DEFAULT '',
    "barcode" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION,
    "compareAtPrice" DOUBLE PRECISION,
    "option1" TEXT,
    "option2" TEXT,
    "option3" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weightUnit" TEXT NOT NULL DEFAULT 'kg',
    "inventoryQuantity" INTEGER NOT NULL DEFAULT 0,
    "inventoryPolicy" TEXT NOT NULL DEFAULT 'DENY',
    "inventoryManagement" TEXT NOT NULL DEFAULT 'SHOPIFY',
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "requiresShipping" BOOLEAN NOT NULL DEFAULT true,
    "imageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "shopifyId" TEXT,
    "url" TEXT NOT NULL,
    "altText" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 1,
    "width" INTEGER,
    "height" INTEGER,
    "isBroken" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_metafields" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'single_line_text_field',

    CONSTRAINT "product_metafields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tags" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopifyId" TEXT,
    "title" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isSmart" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_collections" (
    "productId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,

    CONSTRAINT "product_collections_pkey" PRIMARY KEY ("productId","collectionId")
);

-- CreateTable
CREATE TABLE "feeds" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENABLED',
    "publicToken" TEXT NOT NULL,
    "secretToken" TEXT NOT NULL,
    "rootNode" TEXT NOT NULL DEFAULT 'feed',
    "itemNode" TEXT NOT NULL DEFAULT 'item',
    "prettyPrint" BOOLEAN NOT NULL DEFAULT true,
    "useCdata" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lastGeneratedAt" TIMESTAMP(3),
    "lastGenerationStatus" TEXT,
    "lastGenerationMs" INTEGER,
    "lastProductCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_rules" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "productSelectionType" TEXT NOT NULL DEFAULT 'ALL',
    "includeOutOfStock" BOOLEAN NOT NULL DEFAULT false,
    "includeVariants" BOOLEAN NOT NULL DEFAULT true,
    "includeWithoutGtin" BOOLEAN NOT NULL DEFAULT true,
    "includeWithoutSku" BOOLEAN NOT NULL DEFAULT true,
    "skipDuplicateProducts" BOOLEAN NOT NULL DEFAULT true,
    "skipDuplicateVariants" BOOLEAN NOT NULL DEFAULT true,
    "skipBrokenImages" BOOLEAN NOT NULL DEFAULT true,
    "onlyPublished" BOOLEAN NOT NULL DEFAULT true,
    "onlyActive" BOOLEAN NOT NULL DEFAULT true,
    "priceMin" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "createdAfter" TIMESTAMP(3),
    "createdBefore" TIMESTAMP(3),
    "updatedAfter" TIMESTAMP(3),
    "updatedBefore" TIMESTAMP(3),

    CONSTRAINT "feed_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_collections" (
    "feedId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,

    CONSTRAINT "feed_collections_pkey" PRIMARY KEY ("feedId","collectionId")
);

-- CreateTable
CREATE TABLE "feed_tags" (
    "feedId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "feed_tags_pkey" PRIMARY KEY ("feedId","tagId")
);

-- CreateTable
CREATE TABLE "feed_vendors" (
    "feedId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,

    CONSTRAINT "feed_vendors_pkey" PRIMARY KEY ("feedId","vendor")
);

-- CreateTable
CREATE TABLE "feed_product_types" (
    "feedId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,

    CONSTRAINT "feed_product_types_pkey" PRIMARY KEY ("feedId","productType")
);

-- CreateTable
CREATE TABLE "feed_products" (
    "feedId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "feed_products_pkey" PRIMARY KEY ("feedId","productId")
);

-- CreateTable
CREATE TABLE "feed_history" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "variantCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "errorsJson" TEXT NOT NULL DEFAULT '[]',
    "fileSizeBytes" INTEGER,
    "triggeredBy" TEXT NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "feed_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_downloads" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "feedHistoryId" TEXT,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL_DOWNLOAD',

    CONSTRAINT "feed_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "supportEmail" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "country" TEXT NOT NULL DEFAULT 'US',
    "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "defaultPlatform" TEXT NOT NULL DEFAULT 'GOOGLE',
    "feedDefaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "feedDefaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "feedDefaultCountry" TEXT NOT NULL DEFAULT 'US',
    "feedIncludeVariants" BOOLEAN NOT NULL DEFAULT true,
    "feedIncludeOutOfStock" BOOLEAN NOT NULL DEFAULT false,
    "feedIncludeDraftProducts" BOOLEAN NOT NULL DEFAULT false,
    "feedDefaultProductLimit" INTEGER,
    "feedEnablePrettyXml" BOOLEAN NOT NULL DEFAULT true,
    "feedEnableXmlCompression" BOOLEAN NOT NULL DEFAULT false,
    "notifyFeedGenerationFailed" BOOLEAN NOT NULL DEFAULT true,
    "notifySynchronizationFailed" BOOLEAN NOT NULL DEFAULT true,
    "notifyWeeklyFeedReport" BOOLEAN NOT NULL DEFAULT false,
    "notifyWebhookErrors" BOOLEAN NOT NULL DEFAULT true,
    "notificationEmail" TEXT NOT NULL DEFAULT '',
    "requireSecretTokenGlobally" BOOLEAN NOT NULL DEFAULT false,
    "publicUrlsExpireAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_merchant_settings" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "defaultBrand" TEXT NOT NULL DEFAULT '',
    "defaultCondition" TEXT NOT NULL DEFAULT 'new',
    "identifierExists" BOOLEAN NOT NULL DEFAULT true,
    "shippingCountry" TEXT NOT NULL DEFAULT 'US',
    "shippingPrice" DOUBLE PRECISION,
    "taxEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultProductCategory" TEXT NOT NULL DEFAULT '',
    "defaultCustomLabel0" TEXT NOT NULL DEFAULT '',
    "defaultCustomLabel1" TEXT NOT NULL DEFAULT '',
    "defaultCustomLabel2" TEXT NOT NULL DEFAULT '',
    "defaultCustomLabel3" TEXT NOT NULL DEFAULT '',
    "defaultCustomLabel4" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "google_merchant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_commerce_settings" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "defaultBrand" TEXT NOT NULL DEFAULT '',
    "condition" TEXT NOT NULL DEFAULT 'new',
    "inventoryPolicy" TEXT NOT NULL DEFAULT 'DENY',
    "facebookCatalogType" TEXT NOT NULL DEFAULT 'commerce',

    CONSTRAINT "meta_commerce_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiktok_settings" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "defaultBrand" TEXT NOT NULL DEFAULT '',
    "condition" TEXT NOT NULL DEFAULT 'new',
    "inventoryPolicy" TEXT NOT NULL DEFAULT 'DENY',
    "defaultProductCategory" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "tiktok_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_rules_settings" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "excludeDraftProducts" BOOLEAN NOT NULL DEFAULT true,
    "excludeArchivedProducts" BOOLEAN NOT NULL DEFAULT true,
    "excludeOutOfStock" BOOLEAN NOT NULL DEFAULT false,
    "excludeNoImage" BOOLEAN NOT NULL DEFAULT true,
    "excludeNoSku" BOOLEAN NOT NULL DEFAULT false,
    "excludeNoGtin" BOOLEAN NOT NULL DEFAULT false,
    "excludeHiddenProducts" BOOLEAN NOT NULL DEFAULT true,
    "excludeAdultProducts" BOOLEAN NOT NULL DEFAULT false,
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,

    CONSTRAINT "product_rules_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shops_shopifyDomain_key" ON "shops"("shopifyDomain");

-- CreateIndex
CREATE INDEX "products_shopId_status_idx" ON "products"("shopId", "status");

-- CreateIndex
CREATE INDEX "products_shopId_vendor_idx" ON "products"("shopId", "vendor");

-- CreateIndex
CREATE INDEX "products_shopId_productType_idx" ON "products"("shopId", "productType");

-- CreateIndex
CREATE INDEX "products_shopId_createdAt_idx" ON "products"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "products_shopId_updatedAt_idx" ON "products"("shopId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "products_shopId_handle_key" ON "products"("shopId", "handle");

-- CreateIndex
CREATE UNIQUE INDEX "products_shopId_shopifyId_key" ON "products"("shopId", "shopifyId");

-- CreateIndex
CREATE UNIQUE INDEX "variants_shopifyId_key" ON "variants"("shopifyId");

-- CreateIndex
CREATE UNIQUE INDEX "variants_shopifyInventoryItemId_key" ON "variants"("shopifyInventoryItemId");

-- CreateIndex
CREATE INDEX "variants_productId_idx" ON "variants"("productId");

-- CreateIndex
CREATE INDEX "variants_sku_idx" ON "variants"("sku");

-- CreateIndex
CREATE INDEX "variants_barcode_idx" ON "variants"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "product_images_shopifyId_key" ON "product_images"("shopifyId");

-- CreateIndex
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_metafields_productId_namespace_key_key" ON "product_metafields"("productId", "namespace", "key");

-- CreateIndex
CREATE UNIQUE INDEX "tags_shopId_name_key" ON "tags"("shopId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "collections_shopId_handle_key" ON "collections"("shopId", "handle");

-- CreateIndex
CREATE UNIQUE INDEX "collections_shopId_shopifyId_key" ON "collections"("shopId", "shopifyId");

-- CreateIndex
CREATE UNIQUE INDEX "feeds_publicToken_key" ON "feeds"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "feeds_secretToken_key" ON "feeds"("secretToken");

-- CreateIndex
CREATE INDEX "feeds_shopId_status_idx" ON "feeds"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "feed_rules_feedId_key" ON "feed_rules"("feedId");

-- CreateIndex
CREATE INDEX "feed_history_feedId_startedAt_idx" ON "feed_history"("feedId", "startedAt");

-- CreateIndex
CREATE INDEX "feed_downloads_feedId_downloadedAt_idx" ON "feed_downloads"("feedId", "downloadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "settings_shopId_key" ON "settings"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "google_merchant_settings_settingsId_key" ON "google_merchant_settings"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_commerce_settings_settingsId_key" ON "meta_commerce_settings"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "tiktok_settings_settingsId_key" ON "tiktok_settings"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "product_rules_settings_settingsId_key" ON "product_rules_settings"("settingsId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "product_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_metafields" ADD CONSTRAINT "product_metafields_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeds" ADD CONSTRAINT "feeds_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_rules" ADD CONSTRAINT "feed_rules_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_collections" ADD CONSTRAINT "feed_collections_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_collections" ADD CONSTRAINT "feed_collections_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_tags" ADD CONSTRAINT "feed_tags_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_tags" ADD CONSTRAINT "feed_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_vendors" ADD CONSTRAINT "feed_vendors_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_product_types" ADD CONSTRAINT "feed_product_types_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_products" ADD CONSTRAINT "feed_products_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_products" ADD CONSTRAINT "feed_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_history" ADD CONSTRAINT "feed_history_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_downloads" ADD CONSTRAINT "feed_downloads_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_downloads" ADD CONSTRAINT "feed_downloads_feedHistoryId_fkey" FOREIGN KEY ("feedHistoryId") REFERENCES "feed_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_merchant_settings" ADD CONSTRAINT "google_merchant_settings_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_commerce_settings" ADD CONSTRAINT "meta_commerce_settings_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiktok_settings" ADD CONSTRAINT "tiktok_settings_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_rules_settings" ADD CONSTRAINT "product_rules_settings_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

