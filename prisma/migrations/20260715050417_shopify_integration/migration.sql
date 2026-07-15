-- CreateTable
CREATE TABLE "shops" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopifyDomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "ianaTimezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "planName" TEXT NOT NULL DEFAULT 'mock-development',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" DATETIME,
    "grantedScopes" TEXT NOT NULL DEFAULT '',
    "lastProductSyncAt" DATETIME,
    "lastCollectionSyncAt" DATETIME,
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT
);

-- CreateTable
CREATE TABLE "session" (
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
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "publishedAt" DATETIME,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isPasswordProtected" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "variants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "shopifyId" TEXT,
    "shopifyInventoryItemId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Default Title',
    "sku" TEXT NOT NULL DEFAULT '',
    "barcode" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 1,
    "price" REAL,
    "compareAtPrice" REAL,
    "option1" TEXT,
    "option2" TEXT,
    "option3" TEXT,
    "weight" REAL NOT NULL DEFAULT 0,
    "weightUnit" TEXT NOT NULL DEFAULT 'kg',
    "inventoryQuantity" INTEGER NOT NULL DEFAULT 0,
    "inventoryPolicy" TEXT NOT NULL DEFAULT 'DENY',
    "inventoryManagement" TEXT NOT NULL DEFAULT 'SHOPIFY',
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "requiresShipping" BOOLEAN NOT NULL DEFAULT true,
    "imageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "variants_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "product_images" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "shopifyId" TEXT,
    "url" TEXT NOT NULL,
    "altText" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 1,
    "width" INTEGER,
    "height" INTEGER,
    "isBroken" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_metafields" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'single_line_text_field',
    CONSTRAINT "product_metafields_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "tags_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_tags" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("productId", "tagId"),
    CONSTRAINT "product_tags_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "shopifyId" TEXT,
    "title" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isSmart" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "collections_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_collections" (
    "productId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,

    PRIMARY KEY ("productId", "collectionId"),
    CONSTRAINT "product_collections_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_collections_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feeds" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "lastGeneratedAt" DATETIME,
    "lastGenerationStatus" TEXT,
    "lastGenerationMs" INTEGER,
    "lastProductCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "feeds_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feed_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "priceMin" REAL,
    "priceMax" REAL,
    "createdAfter" DATETIME,
    "createdBefore" DATETIME,
    "updatedAfter" DATETIME,
    "updatedBefore" DATETIME,
    CONSTRAINT "feed_rules_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feed_collections" (
    "feedId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,

    PRIMARY KEY ("feedId", "collectionId"),
    CONSTRAINT "feed_collections_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "feed_collections_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feed_tags" (
    "feedId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("feedId", "tagId"),
    CONSTRAINT "feed_tags_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "feed_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feed_vendors" (
    "feedId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,

    PRIMARY KEY ("feedId", "vendor"),
    CONSTRAINT "feed_vendors_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feed_product_types" (
    "feedId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,

    PRIMARY KEY ("feedId", "productType"),
    CONSTRAINT "feed_product_types_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feed_products" (
    "feedId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    PRIMARY KEY ("feedId", "productId"),
    CONSTRAINT "feed_products_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "feed_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feed_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "durationMs" INTEGER,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "variantCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "errorsJson" TEXT NOT NULL DEFAULT '[]',
    "fileSizeBytes" INTEGER,
    "triggeredBy" TEXT NOT NULL DEFAULT 'MANUAL',
    CONSTRAINT "feed_history_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feed_downloads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedId" TEXT NOT NULL,
    "feedHistoryId" TEXT,
    "downloadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL_DOWNLOAD',
    CONSTRAINT "feed_downloads_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "feed_downloads_feedHistoryId_fkey" FOREIGN KEY ("feedHistoryId") REFERENCES "feed_history" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
