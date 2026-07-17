import { authenticate } from "../shopify.server";
import {
  removeWishlistItem,
  removeWishlistItemByProduct,
} from "../services/wishlist.server";

/**
 * POST /api/wishlist/remove
 */
export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let shop;
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const adminAuth = await authenticate.admin(request);
    shop = adminAuth.session.shop;
  } catch {
    try {
      const proxy = await authenticate.public.appProxy(request);
      shop =
        proxy.session?.shop || new URL(request.url).searchParams.get("shop");
      if (!shop) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { id, productId, variantId, customerId, guestId } = body;

  let removed = null;
  if (id) {
    removed = await removeWishlistItem(shop, id);
  } else if (productId) {
    const normalizedProductId = String(productId).startsWith("gid://")
      ? String(productId)
      : `gid://shopify/Product/${productId}`;
    const normalizedVariantId = variantId
      ? String(variantId).startsWith("gid://")
        ? String(variantId)
        : `gid://shopify/ProductVariant/${variantId}`
      : null;

    removed = await removeWishlistItemByProduct({
      shop,
      customerId: customerId ? String(customerId) : null,
      guestId: !customerId && guestId ? String(guestId) : null,
      productId: normalizedProductId,
      variantId: normalizedVariantId,
    });
  } else {
    return Response.json(
      { error: "id or productId is required" },
      { status: 400 },
    );
  }

  if (!removed) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    toast: "Wishlist Removed",
    item: removed,
  });
};

export const loader = async () => {
  return Response.json({ error: "Use POST" }, { status: 405 });
};
