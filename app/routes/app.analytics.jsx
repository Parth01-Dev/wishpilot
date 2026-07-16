import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getAnalytics } from "../services/wishlist.server";
import { fetchProductsByIds } from "../utils/graphql";
import { Charts } from "../components/Charts";
import { EmptyState } from "../components/EmptyState";

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

          <s-grid
            gridTemplateColumns="@container (inline-size <= 600px) 1fr, 1fr 1fr"
            gap="base"
          >
            <s-section heading="Recently Added">
              <s-stack gap="small">
                {recentlyAdded.map((item) => (
                  <s-box
                    key={item.id}
                    padding="small"
                    border="base"
                    borderRadius="base"
                  >
                    <s-stack gap="small-100">
                      <s-text>{item.productTitle}</s-text>
                      <s-text>
                        {new Date(item.createdAt).toLocaleString()}
                      </s-text>
                    </s-stack>
                  </s-box>
                ))}
              </s-stack>
            </s-section>

            <s-section heading="Low Stock Wishlist Products">
              {lowStockProducts.length ? (
                <s-stack gap="small">
                  {lowStockProducts.map((product) => (
                    <s-box
                      key={product.productId}
                      padding="small"
                      border="base"
                      borderRadius="base"
                    >
                      <s-stack gap="small-100">
                        <s-text>{product.productTitle}</s-text>
                        <s-stack direction="inline" gap="small">
                          <s-badge tone="warning">
                            {product.inventory} left
                          </s-badge>
                          <s-badge>{product.count} wishes</s-badge>
                        </s-stack>
                      </s-stack>
                    </s-box>
                  ))}
                </s-stack>
              ) : (
                <s-paragraph>No low-stock wishlist products.</s-paragraph>
              )}
            </s-section>
          </s-grid>
        </>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
