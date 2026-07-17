import { EmptyState } from "./EmptyState";
import admin from "../styles/admin.module.css";

/**
 * Customers who have saved wishlist items.
 */
export function CustomerTable({ customers = [], onRemove }) {
  if (!customers.length) {
    return (
      <EmptyState
        heading="No wishlist customers yet"
        description="Customers appear here after they save products to their wishlist."
      />
    );
  }

  return (
    <s-section accessibilityLabel="Customers list">
      <div className={admin.panel}>
        <div className={admin.panelHeader}>
          <div>
            <h3 className={admin.panelTitle}>Wishlist customers</h3>
            <p className={admin.panelHint}>
              People who have saved one or more products
            </p>
          </div>
        </div>
        <div className={admin.panelBody}>
          <div className={admin.listStack}>
            {customers.map((customer) => {
              const idLabel =
                customer.customerId?.replace("gid://shopify/Customer/", "") ||
                "—";
              const email = customer.customerEmail || "No email";
              const initials = (customer.customerEmail || idLabel || "C")
                .replace(/[^a-zA-Z0-9]/g, "")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div key={customer.customerId} className={admin.listRow}>
                  <span className={admin.avatar} aria-hidden="true">
                    {initials}
                  </span>
                  <s-stack gap="small-100" inlineSize="100%">
                    <s-text type="strong">{email}</s-text>
                    <s-text color="subdued">ID: {idLabel}</s-text>
                  </s-stack>
                  <s-badge>{customer.wishlistCount} items</s-badge>
                  <s-text color="subdued">
                    {customer.lastWishlistDate
                      ? new Date(customer.lastWishlistDate).toLocaleDateString()
                      : "—"}
                  </s-text>
                  <s-stack direction="inline" gap="small">
                    <s-button
                      variant="secondary"
                      href={`/app/customers/${encodeURIComponent(customer.customerId)}`}
                    >
                      View Wishlist
                    </s-button>
                    {onRemove ? (
                      <s-button
                        tone="critical"
                        variant="tertiary"
                        onClick={() => onRemove(customer)}
                      >
                        Remove
                      </s-button>
                    ) : null}
                  </s-stack>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </s-section>
  );
}
