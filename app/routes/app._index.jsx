import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getDashboardStats } from "../services/wishlist.server";
import { fetchProductsByIds } from "../utils/graphql";
import { DashboardCards } from "../components/DashboardCards";
import { GrowthChart } from "../components/Charts";
import { EmptyState } from "../components/EmptyState";
import splitStyles from "../components/DashboardSplit.module.css";

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

      <div className={splitStyles.split}>
        <s-section heading="Wishlist Growth">
          {growth.some((g) => g.count > 0) ? (
            <GrowthChart growth={growth} />
          ) : (
            <s-box
              padding="base"
              border="base"
              borderRadius="base"
              background="subdued"
            >
              <s-paragraph>
                Growth will appear after customers start saving products.
              </s-paragraph>
            </s-box>
          )}
        </s-section>

        <s-section heading="Low Stock Alerts">
          {lowStockProducts.length ? (
            <s-stack gap="small">
              {lowStockProducts.slice(0, 5).map((product) => (
                <s-box
                  key={product.productId}
                  padding="base"
                  border="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <s-stack gap="small">
                    <s-text type="strong">{product.productTitle}</s-text>
                    <s-stack direction="inline" gap="small">
                      <s-badge tone="warning">
                        {product.inventory} in stock
                      </s-badge>
                      <s-badge>{product.count} wishes</s-badge>
                    </s-stack>
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          ) : (
            <s-box
              padding="base"
              border="base"
              borderRadius="base"
              background="subdued"
            >
              <s-paragraph>No low-stock wished products right now.</s-paragraph>
            </s-box>
          )}
        </s-section>
      </div>

      <s-section heading="Recently Added">
        {recentlyAdded.length ? (
          <s-stack gap="small">
            {recentlyAdded.map((item) => (
              <s-box
                key={item.id}
                padding="base"
                border="base"
                borderRadius="base"
                background="subdued"
              >
                <s-stack direction="inline" gap="base" alignItems="center">
                  {item.productImage ? (
                    <s-box
                      maxInlineSize="48px"
                      maxBlockSize="48px"
                      borderRadius="base"
                      overflow="hidden"
                    >
                      <s-image
                        src={item.productImage}
                        alt={item.productTitle}
                        aspectRatio="1/1"
                      />
                    </s-box>
                  ) : null}
                  <s-stack gap="small-100" inlineSize="100%">
                    <s-text type="strong">{item.productTitle}</s-text>
                    <s-text color="subdued">
                      {item.customerEmail || item.customerId || "Guest"} ·{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </s-text>
                  </s-stack>
                  {item.status ? (
                    <s-badge
                      tone={item.status === "ACTIVE" ? "success" : "attention"}
                    >
                      {item.status}
                    </s-badge>
                  ) : null}
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        ) : (
          <EmptyState
            heading="No wishlist activity yet"
            description="Enable the wishlist button on your product pages from Settings, then add the theme block."
            actionLabel="Open Settings"
            actionHref="/app/settings"
          />
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
