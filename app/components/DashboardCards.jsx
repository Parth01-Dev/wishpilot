/**
 * Dashboard metric cards row (Polaris patterns).
 */
export function DashboardCards({
  totalItems = 0,
  totalCustomers = 0,
  mostWished,
  lowStockCount = 0,
}) {
  return (
    <s-section padding="base">
      <s-grid
        gridTemplateColumns="@container (inline-size <= 400px) 1fr, 1fr auto 1fr auto 1fr auto 1fr"
        gap="small"
      >
        <s-clickable href="/app/wishlist" paddingBlock="small-400" paddingInline="small-100" borderRadius="base">
          <s-grid gap="small-300">
            <s-heading>Total Wishlist Items</s-heading>
            <s-text>{totalItems.toLocaleString()}</s-text>
          </s-grid>
        </s-clickable>
        <s-divider direction="block" />
        <s-clickable href="/app/customers" paddingBlock="small-400" paddingInline="small-100" borderRadius="base">
          <s-grid gap="small-300">
            <s-heading>Total Customers</s-heading>
            <s-text>{totalCustomers.toLocaleString()}</s-text>
          </s-grid>
        </s-clickable>
        <s-divider direction="block" />
        <s-clickable href="/app/analytics" paddingBlock="small-400" paddingInline="small-100" borderRadius="base">
          <s-grid gap="small-300">
            <s-heading>Most Wished Product</s-heading>
            <s-text>{mostWished?.productTitle || "—"}</s-text>
            {mostWished?.count ? (
              <s-badge tone="info">{mostWished.count} wishes</s-badge>
            ) : null}
          </s-grid>
        </s-clickable>
        <s-divider direction="block" />
        <s-clickable href="/app/analytics" paddingBlock="small-400" paddingInline="small-100" borderRadius="base">
          <s-grid gap="small-300">
            <s-heading>Low Stock Wishlist</s-heading>
            <s-stack direction="inline" gap="small-200">
              <s-text>{lowStockCount}</s-text>
              {lowStockCount > 0 ? (
                <s-badge tone="warning">Needs attention</s-badge>
              ) : (
                <s-badge tone="success">OK</s-badge>
              )}
            </s-stack>
          </s-grid>
        </s-clickable>
      </s-grid>
    </s-section>
  );
}
