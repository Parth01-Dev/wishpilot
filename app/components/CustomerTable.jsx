import { EmptyState } from "./EmptyState";
import { customerWishlistPath } from "../utils/customerId";
import admin from "../styles/admin.module.css";

/**
 * Customers list — clean Swish-like curation rows.
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
      <div className={admin.card}>
        <div className={admin.cardHead}>
          <div>
            <h3 className={admin.cardTitle}>Customer wishlists</h3>
            <p className={admin.cardHint}>Open a list to review or clear items</p>
          </div>
        </div>
        <div className={admin.cardBody}>
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
              <div key={customer.customerId} className={admin.customerRow}>
                <span className={admin.avatar} aria-hidden="true">
                  {initials}
                </span>
                <div>
                  <p className={admin.demandTitle}>{email}</p>
                  <p className={admin.demandMeta}>Customer ID: {idLabel}</p>
                </div>
                <div className={admin.demandCount}>
                  <p className={admin.demandCountStrong}>
                    {customer.wishlistCount}
                  </p>
                  <p className={admin.demandCountLabel}>saved</p>
                </div>
                <s-stack direction="inline" gap="small">
                  <s-button
                    variant="secondary"
                    href={customerWishlistPath(customer.customerId)}
                  >
                    View list
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
    </s-section>
  );
}
