import { authenticate } from "../shopify.server";
import {
  getStorefrontWishlist,
  listWishlistItems,
  getShopSettings,
} from "../services/wishlist.server";

/**
 * GET /api/wishlist
 * Admin: full shop wishlist. App proxy: customer/guest scoped list.
 */
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const search = url.searchParams.get("q") || "";
  const searchBy = url.searchParams.get("searchBy") || "product";
  const sort = url.searchParams.get("sort") || "newest";
  const customerId = url.searchParams.get("customerId");

  try {
    const { session } = await authenticate.admin(request);
    const result = await listWishlistItems(session.shop, {
      page,
      pageSize: 10,
      search,
      searchBy,
    });
    const settings = await getShopSettings(session.shop);
    return Response.json({ ok: true, ...result, settings });
  } catch {
    // Storefront / app proxy
  }

  try {
    const proxy = await authenticate.public.appProxy(request);
    const shop =
      proxy.session?.shop || url.searchParams.get("shop");
    if (!shop) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getShopSettings(shop);
    if (!settings.enableWishlist) {
      return Response.json(
        { error: "Wishlist disabled", code: "DISABLED" },
        { status: 403 },
      );
    }

    const resolvedCustomerId =
      customerId ||
      url.searchParams.get("logged_in_customer_id") ||
      null;

    if (!resolvedCustomerId && !settings.allowGuestWishlist) {
      return Response.json(
        { error: "Login required", code: "LOGIN_REQUIRED", items: [], total: 0 },
        { status: 401 },
      );
    }

    const result = await getStorefrontWishlist(shop, {
      customerId: resolvedCustomerId,
      sort,
      search,
      page,
      pageSize: Number(url.searchParams.get("pageSize") || "12"),
    });

    return Response.json({
      ok: true,
      ...result,
      settings,
      count: result.total,
    });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
};
