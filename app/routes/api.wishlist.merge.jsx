import { authenticate } from "../shopify.server";
import {
  getShopSettings,
  mergeGuestWishlistIntoCustomer,
} from "../services/wishlist.server";

/**
 * POST /api/wishlist/merge
 * Transfer guest wishlist items to a logged-in customer (deduped by product).
 * App proxy: /apps/wish-pilot/merge
 */
export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let shop;
  let loggedInCustomerId = null;
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
      loggedInCustomerId =
        new URL(request.url).searchParams.get("logged_in_customer_id") || null;
      if (!shop) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
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

  const customerId =
    body.customerId || loggedInCustomerId
      ? String(body.customerId || loggedInCustomerId)
      : null;
  const guestId = body.guestId ? String(body.guestId).trim() : null;
  const customerEmail = body.customerEmail
    ? String(body.customerEmail)
    : null;

  if (!customerId) {
    return Response.json(
      { error: "customerId is required", code: "LOGIN_REQUIRED" },
      { status: 401 },
    );
  }

  if (!guestId) {
    return Response.json({
      ok: true,
      merged: 0,
      skipped: 0,
      total: 0,
      toast: "Nothing to merge",
    });
  }

  const result = await mergeGuestWishlistIntoCustomer({
    shop,
    customerId,
    guestId,
    customerEmail,
  });

  return Response.json({
    ok: true,
    ...result,
    toast:
      result.merged > 0
        ? `Merged ${result.merged} item${result.merged === 1 ? "" : "s"} into your wishlist`
        : "Wishlist synced",
  });
};

export const loader = async () => {
  return Response.json({ error: "Use POST" }, { status: 405 });
};
