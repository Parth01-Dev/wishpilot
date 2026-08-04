import { authenticate } from "../shopify.server";
import {
  getCustomerWishlist,
  getGuestWishlist,
} from "../services/wishlist.server";
import { fetchProductsByIds } from "../utils/graphql";

/**
 * Resource loader: customer or guest wishlist products for admin modal.
 * GET /app/customers/details?customerId=... | ?guestId=...
 */
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  const guestId = url.searchParams.get("guestId");

  if (!customerId && !guestId) {
    return Response.json(
      { ok: false, error: "customerId or guestId is required" },
      { status: 400 },
    );
  }

  const entries = customerId
    ? await getCustomerWishlist(session.shop, customerId)
    : await getGuestWishlist(session.shop, guestId);

  const productMap = await fetchProductsByIds(
    admin,
    entries.map((item) => item.productId),
  );

  const items = entries.map((item) => {
    const live = productMap.get(item.productId);
    return {
      id: item.id,
      productId: item.productId,
      productTitle: live?.title || item.productTitle,
      productImage: item.productImage || live?.image || null,
      vendor: item.vendor || live?.vendor || null,
      price: item.price ?? live?.price ?? null,
      inventory: live?.inventory ?? null,
      status: live?.status ?? "UNKNOWN",
      createdAt: item.createdAt,
    };
  });

  return Response.json({
    ok: true,
    type: customerId ? "registered" : "guest",
    customerId: customerId || null,
    guestId: guestId || entries[0]?.guestId || null,
    customerEmail: entries[0]?.customerEmail || null,
    itemCount: items.length,
    items,
  });
};
