import { authenticate } from "../shopify.server";
import { getWishlistEntriesForProduct } from "../services/wishlist.server";
import {
  fetchCustomersByIds,
  fetchProductsByIds,
} from "../utils/graphql";

/**
 * Resource loader: product wishlist detail + customers for admin modal.
 * GET /app/wishlist/details?productId=...
 */
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) {
    return Response.json({ ok: false, error: "productId is required" }, { status: 400 });
  }

  const entries = await getWishlistEntriesForProduct(session.shop, productId);
  if (!entries.length) {
    return Response.json({
      ok: true,
      product: null,
      customers: [],
    });
  }

  const productMap = await fetchProductsByIds(admin, [productId, entries[0].productId]);
  const live =
    productMap.get(productId) ||
    productMap.get(entries[0].productId) ||
    null;

  const customerIds = [
    ...new Set(entries.map((entry) => entry.customerId).filter(Boolean)),
  ];
  const customerMap = await fetchCustomersByIds(admin, customerIds);

  const sample = entries[0];
  const product = {
    productId: sample.productId,
    productTitle: live?.title || sample.productTitle,
    productHandle: live?.handle || sample.productHandle,
    productImage: sample.productImage || live?.image || null,
    vendor: sample.vendor || live?.vendor || null,
    price: sample.price ?? live?.price ?? null,
    inventory: live?.inventory ?? null,
    status: live?.status ?? "UNKNOWN",
    customerCount: entries.length,
  };

  const customers = entries.map((entry) => {
    const liveCustomer = entry.customerId
      ? customerMap.get(entry.customerId) ||
        customerMap.get(
          String(entry.customerId).replace("gid://shopify/Customer/", ""),
        )
      : null;

    const isGuest = !entry.customerId;
    const numericCustomerId = entry.customerId
      ? String(entry.customerId).replace("gid://shopify/Customer/", "")
      : null;

    return {
      id: entry.id,
      customerId: numericCustomerId,
      guestId: isGuest ? `guest-${entry.id}` : null,
      name: liveCustomer?.name || (isGuest ? "Guest" : null),
      email: liveCustomer?.email || entry.customerEmail || null,
      createdAt: entry.createdAt,
      isGuest,
    };
  });

  return Response.json({ ok: true, product, customers });
};
