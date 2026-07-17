import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getAnalytics } from "../services/wishlist.server";
import { fetchProductsByIds } from "../utils/graphql";
import { Charts } from "../components/Charts";
import { EmptyState } from "../components/EmptyState";
import admin from "../styles/admin.module.css";

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
        productImage: live?.image || null,
      };
    })
    .filter(
      (p) =>
        p.inventory != null && p.inventory <= analytics.lowStockThreshold,
    );

  return {
    ...analytics,
    lowStockProducts,
  };
};

export default function AnalyticsPage() {
  const {
    growth,
    topProducts,
    mostActiveCustomers,
    recentlyAdded,
    lowStockProducts,
  } = useLoaderData();

  const hasData = topProducts.length > 0 || growth.some((g) => g.count > 0);

  return (
    <s-page heading="Analytics">
      <div className={admin.shell}>
        <div className={admin.pageMeta}>
          <div className={admin.pageMetaCopy}>
            <p className={admin.kicker}>Insights</p>
            <h2 className={admin.title}>Wishlist analytics</h2>
            <p className={admin.subtitle}>
              Track product demand, engagement, and low-stock wishlist signals.
            </p>
          </div>
        </div>

        {!hasData ? (
          <EmptyState
            heading="No analytics yet"
            description="Charts populate once customers add products to their wishlist."
            actionLabel="Open Wishlist"
            actionHref="/app/wishlist"
          />
        ) : (
          <>
            <Charts
              growth={growth}
              topProducts={topProducts}
              activeCustomers={mostActiveCustomers}
            />

            <div className={admin.grid2Equal}>
              <div className={admin.card}>
                <div className={admin.cardHead}>
                  <div>
                    <h3 className={admin.cardTitle}>Recent activity</h3>
                    <p className={admin.cardHint}>Latest wishlist saves</p>
                  </div>
                </div>
                <div className={admin.cardBody}>
                  {recentlyAdded.map((item) => (
                    <div key={item.id} className={admin.demandRow}>
                      <div>
                        <p className={admin.demandTitle}>{item.productTitle}</p>
                        <p className={admin.demandMeta}>
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={admin.card}>
                <div className={admin.cardHead}>
                  <div>
                    <h3 className={admin.cardTitle}>Low stock demand</h3>
                    <p className={admin.cardHint}>
                      Popular products running low
                    </p>
                  </div>
                </div>
                <div className={admin.cardBody}>
                  {lowStockProducts.length ? (
                    lowStockProducts.map((product) => (
                      <div key={product.productId} className={admin.demandRow}>
                        <div className={admin.thumb}>
                          {product.productImage ? (
                            <img
                              src={product.productImage}
                              alt={product.productTitle}
                            />
                          ) : null}
                        </div>
                        <div>
                          <p className={admin.demandTitle}>
                            {product.productTitle}
                          </p>
                          <p className={admin.demandMeta}>
                            {product.inventory} left
                          </p>
                        </div>
                        <div className={admin.demandCount}>
                          <p className={admin.demandCountStrong}>
                            {product.count}
                          </p>
                          <p className={admin.demandCountLabel}>wishes</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <s-paragraph>No low-stock wishlist products.</s-paragraph>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
