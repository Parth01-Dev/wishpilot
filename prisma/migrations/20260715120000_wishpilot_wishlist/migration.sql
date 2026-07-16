-- AlterTable Wishlist: add merchant/storefront enrichment fields
ALTER TABLE "Wishlist" ADD COLUMN "customerEmail" TEXT;
ALTER TABLE "Wishlist" ADD COLUMN "vendor" TEXT;
ALTER TABLE "Wishlist" ADD COLUMN "price" DOUBLE PRECISION;

UPDATE "Wishlist" SET "productHandle" = '' WHERE "productHandle" IS NULL;

ALTER TABLE "Wishlist" ALTER COLUMN "productHandle" SET NOT NULL;
ALTER TABLE "Wishlist" ALTER COLUMN "productHandle" SET DEFAULT '';

-- CreateTable ShopSettings
CREATE TABLE "ShopSettings" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "enableWishlist" BOOLEAN NOT NULL DEFAULT true,
    "showHeartIcon" BOOLEAN NOT NULL DEFAULT true,
    "allowGuestWishlist" BOOLEAN NOT NULL DEFAULT false,
    "buttonStyle" TEXT NOT NULL DEFAULT 'heart',
    "primaryColor" TEXT NOT NULL DEFAULT '#000000',
    "buttonPosition" TEXT NOT NULL DEFAULT 'product_form',
    "showWishlistCount" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopSettings_shop_key" ON "ShopSettings"("shop");
CREATE INDEX "Wishlist_shop_createdAt_idx" ON "Wishlist"("shop", "createdAt");
CREATE INDEX "Wishlist_shop_customerId_productId_idx" ON "Wishlist"("shop", "customerId", "productId");
