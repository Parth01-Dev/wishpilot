/**
 * Dashboard metric cards — premium overview strip.
 */
import styles from "./DashboardCards.module.css";

export function DashboardCards({
  totalItems = 0,
  totalCustomers = 0,
  mostWished,
  lowStockCount = 0,
}) {
  return (
    <s-section heading="Overview">
      <div className={styles.grid}>
        <MetricCard
          href="/app/wishlist"
          label="Total Wishlist Items"
          value={totalItems.toLocaleString()}
        />
        <MetricCard
          href="/app/customers"
          label="Total Customers"
          value={totalCustomers.toLocaleString()}
        />
        <MetricCard
          href="/app/analytics"
          label="Most Wished Product"
          value={mostWished?.productTitle || "—"}
          badge={mostWished?.count ? `${mostWished.count} wishes` : null}
          badgeTone="info"
        />
        <MetricCard
          href="/app/analytics"
          label="Low Stock Wishlist"
          value={String(lowStockCount)}
          badge={lowStockCount > 0 ? "Needs attention" : "OK"}
          badgeTone={lowStockCount > 0 ? "warning" : "success"}
        />
      </div>
    </s-section>
  );
}

function MetricCard({ href, label, value, badge, badgeTone }) {
  return (
    <div className={styles.card}>
      <s-box
        padding="base"
        border="base"
        borderRadius="base"
        background="subdued"
        inlineSize="100%"
      >
        <s-clickable href={href} padding="none">
          <s-stack gap="small">
            <s-text color="subdued">{label}</s-text>
            <s-heading>{value}</s-heading>
            {badge ? (
              <s-badge tone={badgeTone || "info"}>{badge}</s-badge>
            ) : null}
          </s-stack>
        </s-clickable>
      </s-box>
    </div>
  );
}
