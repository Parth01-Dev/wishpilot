import { authenticate } from "../shopify.server";
import { getDashboardStats } from "../services/wishlist.server";
import { fetchProductsByIds } from "../utils/graphql";

/**
 * GET /api/dashboard
 */
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const stats = await getDashboardStats(session.shop);

  const productMap = await fetchProductsByIds(
    admin,
    [
      ...(stats.mostWished ? [stats.mostWished.productId] : []),
      ...stats.topProducts.map((p) => p.productId),
    ],
  );

  const lowStockProducts = stats.topProducts
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
        p.inventory != null && p.inventory <= stats.lowStockThreshold,
    );

  return Response.json({
    ok: true,
    totalItems: stats.totalItems,
    totalCustomers: stats.totalCustomers,
    mostWished: stats.mostWished,
    recentlyAdded: stats.recentlyAdded,
    growth: stats.growth,
    lowStockProducts,
  });
};
