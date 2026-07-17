/**
 * Dashboard metric cards — Swish-style insight KPIs.
 */
import admin from "../styles/admin.module.css";

export function DashboardCards({
  totalItems = 0,
  totalCustomers = 0,
  mostWished,
  lowStockCount = 0,
}) {
  return (
    <div className={admin.kpiRow}>
      <Kpi
        href="/app/wishlist"
        label="Wishlist saves"
        value={totalItems.toLocaleString()}
        foot="Across all customers"
      />
      <Kpi
        href="/app/customers"
        label="Active customers"
        value={totalCustomers.toLocaleString()}
        foot="Shoppers with saved items"
      />
      <Kpi
        href="/app/analytics"
        label="Top demand"
        value={mostWished?.count != null ? String(mostWished.count) : "0"}
        foot={mostWished?.productTitle || "No product yet"}
      />
      <Kpi
        href="/app/analytics"
        label="Low stock alerts"
        value={String(lowStockCount)}
        foot={lowStockCount > 0 ? "Needs attention" : "Inventory healthy"}
      />
    </div>
  );
}

function Kpi({ href, label, value, foot }) {
  return (
    <s-clickable href={href} padding="none">
      <div className={admin.kpi}>
        <p className={admin.kpiLabel}>{label}</p>
        <p className={admin.kpiValue}>{value}</p>
        <p className={admin.kpiFoot}>{foot}</p>
      </div>
    </s-clickable>
  );
}
