import { authenticate } from "../shopify.server";
import {
  getCustomerWishlist,
  listWishlistCustomers,
} from "../services/wishlist.server";

/**
 * GET /api/customer/:id
 * Without id in path, list customers via ?list=1
 */
export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  if (!params.id || params.id === "list") {
    const page = Number(url.searchParams.get("page") || "1");
    const search = url.searchParams.get("q") || "";
    const result = await listWishlistCustomers(session.shop, {
      page,
      pageSize: 10,
      search,
    });
    return Response.json({ ok: true, ...result });
  }

  const customerId = decodeURIComponent(params.id);
  const items = await getCustomerWishlist(session.shop, customerId);

  return Response.json({
    ok: true,
    customerId,
    customerEmail: items[0]?.customerEmail || null,
    items,
    count: items.length,
  });
};
