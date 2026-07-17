import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getDashboardStats } from "../services/wishlist.server";
import { fetchProductsByIds } from "../utils/graphql";
import { DashboardCards } from "../components/DashboardCards";
import { GrowthChart } from "../components/Charts";
import { EmptyState } from "../components/EmptyState";
import admin from "../styles/admin.module.css";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const stats = await getDashboardStats(session.shop);

  const productIds = [
    ...new Set([
      ...(stats.mostWished ? [stats.mostWished.productId] : []),
      ...stats.recentlyAdded.map((i) => i.productId),
      ...stats.topProducts.map((p) => p.productId),
    ]),
  ];

  const productMap = await fetchProductsByIds(admin, productIds);

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

  const recentlyAdded = stats.recentlyAdded.map((item) => {
    const live = productMap.get(item.productId);
    return {
      ...item,
      inventory: live?.inventory ?? null,
      status: live?.status ?? null,
      productImage: item.productImage || live?.image || null,
    };
  });

  return {
    totalItems: stats.totalItems,
    totalCustomers: stats.totalCustomers,
    mostWished: stats.mostWished
      ? {
          ...stats.mostWished,
          ...(productMap.get(stats.mostWished.productId) || {}),
        }
      : null,
    recentlyAdded,
    lowStockProducts,
    growth: stats.growth,
  };
};

export default function Dashboard() {
  const {
    totalItems,
    totalCustomers,
    mostWished,
    recentlyAdded,
    lowStockProducts,
    growth,
  } = useLoaderData();

  return (
    <s-page heading="Dashboard">
      <s-button slot="primary-action" href="/app/wishlist" variant="primary">
        View Wishlist
      </s-button>
      <s-button slot="secondary-actions" href="/app/settings" variant="tertiary">
        Settings
      </s-button>

      <DashboardCards
        totalItems={totalItems}
        totalCustomers={totalCustomers}
        mostWished={mostWished}
        lowStockCount={lowStockProducts.length}
      />

      <div className={admin.split}>
        <div className={admin.panel}>
          <div className={admin.panelHeader}>
            <div>
              <h3 className={admin.panelTitle}>Wishlist growth</h3>
              <p className={admin.panelHint}>Recent saves over time</p>
            </div>
          </div>
          <div className={admin.panelBody}>
            {growth.some((g) => g.count > 0) ? (
              <GrowthChart growth={growth} />
            ) : (
              <s-paragraph>
                Growth will appear after customers start saving products.
              </s-paragraph>
            )}
          </div>
        </div>

        <div className={admin.panel}>
          <div className={admin.panelHeader}>
            <div>
              <h3 className={admin.panelTitle}>Low stock alerts</h3>
              <p className={admin.panelHint}>Wished products running low</p>
            </div>
          </div>
          <div className={admin.panelBody}>
            {lowStockProducts.length ? (
              <div className={admin.listStack}>
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div key={product.productId} className={admin.listRow}>
                    <s-stack gap="small-100" inlineSize="100%">
                      <s-text type="strong">{product.productTitle}</s-text>
                      <s-stack direction="inline" gap="small">
                        <s-badge tone="warning">
                          {product.inventory} in stock
                        </s-badge>
                        <s-badge>{product.count} wishes</s-badge>
                      </s-stack>
                    </s-stack>
                  </div>
                ))}
              </div>
            ) : (
              <s-paragraph>No low-stock wished products right now.</s-paragraph>
            )}
          </div>
        </div>
      </div>

      <s-section>
        <div className={admin.panel}>
          <div className={admin.panelHeader}>
            <div>
              <h3 className={admin.panelTitle}>Recently added</h3>
              <p className={admin.panelHint}>Latest products saved by shoppers</p>
            </div>
          </div>
          <div className={admin.panelBody}>
            {recentlyAdded.length ? (
              <div className={admin.listStack}>
                {recentlyAdded.map((item) => (
                  <div key={item.id} className={admin.listRow}>
                    {item.productImage ? (
                      <div className={admin.thumb}>
                        <img src={item.productImage} alt={item.productTitle} />
                      </div>
                    ) : (
                      <span
                        className={`${admin.metricIcon} ${admin.metricIconRose}`}
                        aria-hidden="true"
                      >
                        ♥
                      </span>
                    )}
                    <s-stack gap="small-100" inlineSize="100%">
                      <s-text type="strong">{item.productTitle}</s-text>
                      <s-text color="subdued">
                        {item.customerEmail || item.customerId || "Guest"} ·{" "}
                        {new Date(item.createdAt).toLocaleString()}
                      </s-text>
                    </s-stack>
                    {item.status ? (
                      <s-badge
                        tone={
                          item.status === "ACTIVE" ? "success" : "attention"
                        }
                      >
                        {item.status}
                      </s-badge>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                heading="No wishlist activity yet"
                description="Enable the wishlist button on your product pages from Settings, then add the theme block."
                actionLabel="Open Settings"
                actionHref="/app/settings"
              />
            )}
          </div>
        </div>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
