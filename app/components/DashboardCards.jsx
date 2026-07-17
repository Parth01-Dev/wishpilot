/**
 * Dashboard metric cards — premium overview strip.
 */
import admin from "../styles/admin.module.css";

export function DashboardCards({
  totalItems = 0,
  totalCustomers = 0,
  mostWished,
  lowStockCount = 0,
}) {
  return (
    <s-section>
      <div className={admin.pageIntro} style={{ marginBottom: "0.85rem" }}>
        <p className={admin.pageEyebrow}>Performance</p>
        <h2 className={admin.pageTitle}>Overview</h2>
        <p className={admin.pageSubtitle}>
          A quick snapshot of wishlist activity across your store.
        </p>
      </div>

      <div className={admin.metricGrid}>
        <MetricCard
          href="/app/wishlist"
          label="Wishlist items"
          value={totalItems.toLocaleString()}
          icon="♥"
          iconClass={admin.metricIconRose}
        />
        <MetricCard
          href="/app/customers"
          label="Customers"
          value={totalCustomers.toLocaleString()}
          icon="◎"
          iconClass={admin.metricIconTeal}
        />
        <MetricCard
          href="/app/analytics"
          label="Most wished"
          value={mostWished?.productTitle || "—"}
          icon="★"
          iconClass={admin.metricIconIndigo}
          badge={mostWished?.count ? `${mostWished.count} wishes` : null}
          badgeTone="info"
        />
        <MetricCard
          href="/app/analytics"
          label="Low stock"
          value={String(lowStockCount)}
          icon="!"
          iconClass={admin.metricIconAmber}
          badge={lowStockCount > 0 ? "Needs attention" : "Healthy"}
          badgeTone={lowStockCount > 0 ? "warning" : "success"}
        />
      </div>
    </s-section>
  );
}

function MetricCard({
  href,
  label,
  value,
  icon,
  iconClass,
  badge,
  badgeTone,
}) {
  return (
    <div className={admin.metricCard}>
      <s-clickable href={href} padding="none">
        <div className={admin.metricInner}>
          <div className={admin.metricTop}>
            <span className={`${admin.metricIcon} ${iconClass || ""}`}>
              {icon}
            </span>
            {badge ? (
              <s-badge tone={badgeTone || "info"}>{badge}</s-badge>
            ) : null}
          </div>
          <p className={admin.metricLabel}>{label}</p>
          <p className={admin.metricValue}>{value}</p>
        </div>
      </s-clickable>
    </div>
  );
}
