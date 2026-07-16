import { authenticate } from "../shopify.server";
import { addWishlistItem, getShopSettings } from "../services/wishlist.server";
import { PRODUCT_BY_ID, mapProductNode } from "../utils/graphql";

/**
 * POST /api/wishlist/add
 * Authenticated admin helper OR app-proxy storefront (via authenticate.public.appProxy).
 */
export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let shop;
  let admin;
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Prefer admin session when present; otherwise use app proxy.
  let loggedInCustomerId = null;
  try {
    const adminAuth = await authenticate.admin(request);
    shop = adminAuth.session.shop;
    admin = adminAuth.admin;
  } catch {
    try {
      const proxy = await authenticate.public.appProxy(request);
      shop = proxy.session?.shop || new URL(request.url).searchParams.get("shop");
      loggedInCustomerId =
        new URL(request.url).searchParams.get("logged_in_customer_id") || null;
      if (!shop) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (proxy.admin) admin = proxy.admin;
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const settings = await getShopSettings(shop);
  if (!settings.enableWishlist) {
    return Response.json(
      { error: "Wishlist is disabled", code: "DISABLED" },
      { status: 403 },
    );
  }

  const {
    productId,
    variantId,
    customerId: bodyCustomerId,
    customerEmail,
    productTitle,
    productHandle,
    productImage,
    vendor,
    price,
  } = body;

  const customerId = bodyCustomerId || loggedInCustomerId || null;

  if (!productId) {
    return Response.json({ error: "productId is required" }, { status: 400 });
  }

  if (!customerId && !settings.allowGuestWishlist) {
    return Response.json(
      { error: "Login required", code: "LOGIN_REQUIRED" },
      { status: 401 },
    );
  }

  let enriched = {
    productTitle: productTitle || "Product",
    productHandle: productHandle || "",
    productImage: productImage || null,
    vendor: vendor || null,
    price: null,
  };

  if (price != null && price !== "") {
    const parsed = Number(String(price).replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(parsed)) {
      enriched.price = parsed;
    }
  }

  // Enrich from Admin API when available
  if (admin) {
    try {
      const gid = productId.startsWith("gid://")
        ? productId
        : `gid://shopify/Product/${productId}`;
      const response = await admin.graphql(PRODUCT_BY_ID, {
        variables: { id: gid },
      });
      const json = await response.json();
      const mapped = mapProductNode(json.data?.product);
      if (mapped) {
        enriched = {
          productTitle: mapped.title,
          productHandle: mapped.handle,
          productImage: mapped.image,
          vendor: mapped.vendor,
          price: mapped.price,
        };
      }
    } catch {
      // Fall back to client-provided fields
    }
  }

  const normalizedProductId = String(productId).startsWith("gid://")
    ? String(productId)
    : `gid://shopify/Product/${productId}`;

  const normalizedVariantId = variantId
    ? String(variantId).startsWith("gid://")
      ? String(variantId)
      : `gid://shopify/ProductVariant/${variantId}`
    : null;

  const { item, alreadyExists } = await addWishlistItem({
    shop,
    customerId: customerId ? String(customerId) : null,
    customerEmail: customerEmail || null,
    productId: normalizedProductId,
    variantId: normalizedVariantId,
    ...enriched,
  });

  if (alreadyExists) {
    return Response.json({
      ok: true,
      alreadyExists: true,
      toast: "Already in Wishlist",
      item,
    });
  }

  return Response.json({
    ok: true,
    alreadyExists: false,
    toast: "Wishlist Added",
    item,
  });
};

export const loader = async () => {
  return Response.json({ error: "Use POST" }, { status: 405 });
};
