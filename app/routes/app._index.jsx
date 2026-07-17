import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getDashboardStats,
  getShopSettings,
} from "../services/wishlist.server";
import { fetchProductsByIds } from "../utils/graphql";
import { DashboardCards } from "../components/DashboardCards";
import { GrowthChart } from "../components/Charts";
import { EmptyState } from "../components/EmptyState";
import { SetupChecklist } from "../components/SetupChecklist";
import admin from "../styles/admin.module.css";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const [stats, settings] = await Promise.all([
    getDashboardStats(session.shop),
    getShopSettings(session.shop),
  ]);

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
        productImage: live?.image || null,
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

  const topDemand = stats.topProducts.slice(0, 5).map((p) => {
    const live = productMap.get(p.productId);
    return {
      ...p,
      productTitle: live?.title || p.productTitle,
      productImage: live?.image || p.productImage || null,
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
    topDemand,
    enableWishlist: settings.enableWishlist,
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
    topDemand,
    enableWishlist,
  } = useLoaderData();

  const showSetup = !enableWishlist || totalItems === 0;

  return (
    <s-page heading="Dashboard">
      <s-button slot="primary-action" href="/app/wishlist" variant="primary">
        View wishlist
      </s-button>
      <s-button slot="secondary-actions" href="/app/settings" variant="tertiary">
        Settings
      </s-button>

      <div className={admin.shell}>
        <div className={admin.pageMeta}>
          <div className={admin.pageMetaCopy}>
            <p className={admin.kicker}>Wishlist insights</p>
            <h2 className={admin.title}>Product demand overview</h2>
            <p className={admin.subtitle}>
              See what shoppers want most, track growth, and spot low-stock
              demand before it converts.
            </p>
          </div>
          <div className={admin.heroActions}>
            <s-button href="/app/analytics" variant="secondary">
              Analytics
            </s-button>
          </div>
        </div>

        <DashboardCards
          totalItems={totalItems}
          totalCustomers={totalCustomers}
          mostWished={mostWished}
          lowStockCount={lowStockProducts.length}
        />

        {showSetup ? (
          <SetupChecklist
            enableWishlist={enableWishlist}
            hasActivity={totalItems > 0}
          />
        ) : null}

        <div className={admin.grid2}>
          <div className={admin.card}>
            <div className={admin.cardHead}>
              <div>
                <h3 className={admin.cardTitle}>Product demand</h3>
                <p className={admin.cardHint}>Most saved products</p>
              </div>
              <s-link href="/app/wishlist">View all</s-link>
            </div>
            <div className={admin.cardBody}>
              {topDemand.length ? (
                topDemand.map((product) => (
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
                      <p className={admin.demandTitle}>{product.productTitle}</p>
                      <p className={admin.demandMeta}>
                        {product.vendor || "Store product"}
                      </p>
                    </div>
                    <div className={admin.demandCount}>
                      <p className={admin.demandCountStrong}>{product.count}</p>
                      <p className={admin.demandCountLabel}>saves</p>
                    </div>
                  </div>
                ))
              ) : (
                <s-paragraph>
                  Demand insights appear after customers save products.
                </s-paragraph>
              )}
            </div>
          </div>

          <div className={admin.card}>
            <div className={admin.cardHead}>
              <div>
                <h3 className={admin.cardTitle}>Wishlist growth</h3>
                <p className={admin.cardHint}>Daily saves</p>
              </div>
            </div>
            <div className={admin.cardBody}>
              {growth.some((g) => g.count > 0) ? (
                <GrowthChart growth={growth} />
              ) : (
                <s-paragraph>
                  Growth appears once customers start saving products.
                </s-paragraph>
              )}
            </div>
          </div>
        </div>

        <div className={admin.grid2Equal}>
          <div className={admin.card}>
            <div className={admin.cardHead}>
              <div>
                <h3 className={admin.cardTitle}>Low stock alerts</h3>
                <p className={admin.cardHint}>Wished products running low</p>
              </div>
            </div>
            <div className={admin.cardBody}>
              {lowStockProducts.length ? (
                lowStockProducts.slice(0, 5).map((product) => (
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
                      <p className={admin.demandTitle}>{product.productTitle}</p>
                      <p className={admin.demandMeta}>
                        {product.inventory} in stock
                      </p>
                    </div>
                    <div className={admin.demandCount}>
                      <p className={admin.demandCountStrong}>{product.count}</p>
                      <p className={admin.demandCountLabel}>wishes</p>
                    </div>
                  </div>
                ))
              ) : (
                <s-paragraph>No low-stock wished products right now.</s-paragraph>
              )}
            </div>
          </div>

          <div className={admin.card}>
            <div className={admin.cardHead}>
              <div>
                <h3 className={admin.cardTitle}>Recent activity</h3>
                <p className={admin.cardHint}>Latest saves</p>
              </div>
            </div>
            <div className={admin.cardBody}>
              {recentlyAdded.length ? (
                recentlyAdded.slice(0, 5).map((item) => (
                  <div key={item.id} className={admin.demandRow}>
                    <div className={admin.thumb}>
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productTitle} />
                      ) : null}
                    </div>
                    <div>
                      <p className={admin.demandTitle}>{item.productTitle}</p>
                      <p className={admin.demandMeta}>
                        {item.customerEmail || item.customerId || "Guest"} ·{" "}
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {item.status ? (
                      <s-badge
                        tone={
                          item.status === "ACTIVE" ? "success" : "attention"
                        }
                      >
                        {item.status}
                      </s-badge>
                    ) : (
                      <span />
                    )}
                  </div>
                ))
              ) : (
                <EmptyState
                  heading="No wishlist activity yet"
                  description="Complete setup, then customers can start saving products."
                  actionLabel="Open Settings"
                  actionHref="/app/settings"
                />
              )}
            </div>
          </div>
        </div>

        {!showSetup ? (
          <SetupChecklist
            enableWishlist={enableWishlist}
            hasActivity={totalItems > 0}
          />
        ) : null}
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
