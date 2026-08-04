import { EmptyState } from "./EmptyState";
import admin from "../styles/admin.module.css";

/**
 * Customers list — registered or guest wishlists.
 */
export function CustomerTable({
  customers = [],
  type = "registered",
  onOpen,
  onRemove,
}) {
  const isGuest = type === "guest";

  if (!customers.length) {
    return (
      <EmptyState
        heading={
          isGuest ? "No guest wishlists yet" : "No wishlist customers yet"
        }
        description={
          isGuest
            ? "Guests appear here after they save products without signing in."
            : "Customers appear here after they save products to their wishlist."
        }
      />
    );
  }

  return (
    <s-section
      accessibilityLabel={isGuest ? "Guest wishlists list" : "Customers list"}
    >
      <div className={admin.card}>
        <div className={admin.cardHead}>
          <div>
            <h3 className={admin.cardTitle}>
              {isGuest ? "Guest wishlists" : "Customer wishlists"}
            </h3>
            <p className={admin.cardHint}>
              Open a list to review saved products
            </p>
          </div>
        </div>
        <div className={admin.cardBody}>
          {customers.map((customer) => {
            const rowKey = isGuest
              ? customer.guestId
              : customer.customerId;
            const idLabel = isGuest
              ? customer.guestId || "—"
              : customer.customerId?.replace(
                  "gid://shopify/Customer/",
                  "",
                ) || "—";
            const title = isGuest
              ? "Guest shopper"
              : customer.customerEmail || "No email";
            const metaLabel = isGuest
              ? `Guest ID: ${idLabel}`
              : `Customer ID: ${idLabel}`;
            const initials = (
              isGuest
                ? "G"
                : (customer.customerEmail || idLabel || "C")
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .slice(0, 2)
            ).toUpperCase();

            return (
              <div key={rowKey} className={admin.customerRow}>
                <span className={admin.avatar} aria-hidden="true">
                  {initials}
                </span>
                <div>
                  <p className={admin.demandTitle}>{title}</p>
                  <p className={admin.demandMeta}>{metaLabel}</p>
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
                    onClick={() => onOpen?.(customer)}
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
