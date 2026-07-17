import { authenticate } from "../shopify.server";
import { getCustomerWishlist } from "../services/wishlist.server";
import { fetchProductsByIds } from "../utils/graphql";

/**
 * Resource loader: customer wishlist products for admin modal.
 * GET /app/customers/details?customerId=...
 */
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");

  if (!customerId) {
    return Response.json(
      { ok: false, error: "customerId is required" },
      { status: 400 },
    );
  }

  const entries = await getCustomerWishlist(session.shop, customerId);
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
    customerId,
    customerEmail: entries[0]?.customerEmail || null,
    itemCount: items.length,
    items,
  });
};
