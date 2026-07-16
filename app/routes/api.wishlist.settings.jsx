import { authenticate } from "../shopify.server";
import { getShopSettings } from "../services/wishlist.server";

/**
 * Public app-proxy settings for the theme extension.
 * GET /apps/wish-pilot/settings (proxied) → /api/wishlist/settings
 */
export const loader = async ({ request }) => {
  try {
    const proxy = await authenticate.public.appProxy(request);
    const shop =
      proxy.session?.shop || new URL(request.url).searchParams.get("shop");
    if (!shop) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getShopSettings(shop);
    return Response.json({ ok: true, settings });
  } catch {
    // Allow admin-authenticated reads too
    try {
      const { session } = await authenticate.admin(request);
      const settings = await getShopSettings(session.shop);
      return Response.json({ ok: true, settings });
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
};
