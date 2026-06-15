-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "product_type" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "sale_price" DECIMAL,
    "availability" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "image_url" TEXT NOT NULL,
    "product_url" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "feed_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feed_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "product_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "feed_requests_feed_type_created_at_idx" ON "feed_requests"("feed_type", "created_at");
