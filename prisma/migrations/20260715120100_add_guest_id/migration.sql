-- AlterTable
ALTER TABLE "ShopSettings" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Wishlist" ALTER COLUMN "productHandle" DROP DEFAULT,
ADD COLUMN "guestId" TEXT;

-- CreateIndex
CREATE INDEX "Wishlist_guestId_idx" ON "Wishlist"("guestId");

-- CreateIndex
CREATE INDEX "Wishlist_shop_guestId_productId_idx" ON "Wishlist"("shop", "guestId", "productId");
