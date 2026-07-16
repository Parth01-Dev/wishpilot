import { authenticate } from "../shopify.server";
import { getAnalytics } from "../services/wishlist.server";
import { fetchProductsByIds } from "../utils/graphql";

/**
 * GET /api/analytics
 */
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const analytics = await getAnalytics(session.shop);

  const productMap = await fetchProductsByIds(
    admin,
    analytics.topProducts.map((p) => p.productId),
  );

  const lowStockProducts = analytics.topProducts
    .map((p) => {
      const live = productMap.get(p.productId);
      return {
        ...p,
        inventory: live?.inventory ?? null,
        status: live?.status ?? null,
      };
    })
    .filter(
      (p) =>
        p.inventory != null && p.inventory <= analytics.lowStockThreshold,
    );

  return Response.json({
    ok: true,
    ...analytics,
    lowStockProducts,
  });
};
