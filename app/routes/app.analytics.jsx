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
      <s-section>
        <div className={admin.pageIntro} style={{ marginBottom: "0.5rem" }}>
          <p className={admin.pageEyebrow}>Insights</p>
          <h2 className={admin.pageTitle}>Wishlist analytics</h2>
          <p className={admin.pageSubtitle}>
            Track growth, top products, and the customers saving the most.
          </p>
        </div>
      </s-section>

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

          <div className={admin.splitEqual}>
            <div className={admin.panel}>
              <div className={admin.panelHeader}>
                <div>
                  <h3 className={admin.panelTitle}>Recently added</h3>
                  <p className={admin.panelHint}>Latest wishlist activity</p>
                </div>
              </div>
              <div className={admin.panelBody}>
                <div className={admin.listStack}>
                  {recentlyAdded.map((item) => (
                    <div key={item.id} className={admin.listRow}>
                      <s-stack gap="small-100" inlineSize="100%">
                        <s-text type="strong">{item.productTitle}</s-text>
                        <s-text color="subdued">
                          {new Date(item.createdAt).toLocaleString()}
                        </s-text>
                      </s-stack>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={admin.panel}>
              <div className={admin.panelHeader}>
                <div>
                  <h3 className={admin.panelTitle}>Low stock wishlist</h3>
                  <p className={admin.panelHint}>
                    Popular products running low
                  </p>
                </div>
              </div>
              <div className={admin.panelBody}>
                {lowStockProducts.length ? (
                  <div className={admin.listStack}>
                    {lowStockProducts.map((product) => (
                      <div key={product.productId} className={admin.listRow}>
                        <s-stack gap="small-100" inlineSize="100%">
                          <s-text type="strong">{product.productTitle}</s-text>
                          <s-stack direction="inline" gap="small">
                            <s-badge tone="warning">
                              {product.inventory} left
                            </s-badge>
                            <s-badge>{product.count} wishes</s-badge>
                          </s-stack>
                        </s-stack>
                      </div>
                    ))}
                  </div>
                ) : (
                  <s-paragraph>No low-stock wishlist products.</s-paragraph>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
