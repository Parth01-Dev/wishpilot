import { EmptyState } from "./EmptyState";

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
    <s-section padding="none" accessibilityLabel="Customers table">
      <s-table>
        <s-table-header-row>
          <s-table-header listSlot="primary">Customer</s-table-header>
          <s-table-header>Email</s-table-header>
          <s-table-header format="numeric">Wishlist Count</s-table-header>
          <s-table-header>Last Wishlist Date</s-table-header>
          <s-table-header>Actions</s-table-header>
        </s-table-header-row>
        <s-table-body>
          {customers.map((customer) => (
            <s-table-row key={customer.customerId}>
              <s-table-cell>
                {customer.customerId?.replace("gid://shopify/Customer/", "") ||
                  "—"}
              </s-table-cell>
              <s-table-cell>{customer.customerEmail || "—"}</s-table-cell>
              <s-table-cell>{customer.wishlistCount}</s-table-cell>
              <s-table-cell>
                {customer.lastWishlistDate
                  ? new Date(customer.lastWishlistDate).toLocaleDateString()
                  : "—"}
              </s-table-cell>
              <s-table-cell>
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
              </s-table-cell>
            </s-table-row>
          ))}
        </s-table-body>
      </s-table>
    </s-section>
  );
}
