import { EmptyState } from "./EmptyState";

/**
 * Merchant wishlist index table.
 */
export function WishlistTable({ items = [], onRemove }) {
  if (!items.length) {
    return (
      <EmptyState
        heading="No wishlist items yet"
        description="When customers save products, they will appear here."
        actionLabel="View theme extension"
        actionHref="/app/settings"
      />
    );
  }

  return (
    <s-section padding="none" accessibilityLabel="Wishlist table">
      <s-table>
        <s-table-header-row>
          <s-table-header listSlot="primary">Product</s-table-header>
          <s-table-header>Vendor</s-table-header>
          <s-table-header>Customer</s-table-header>
          <s-table-header>Date Added</s-table-header>
          <s-table-header format="numeric">Inventory</s-table-header>
          <s-table-header>Status</s-table-header>
          <s-table-header>Actions</s-table-header>
        </s-table-header-row>
        <s-table-body>
          {items.map((item) => {
            const status = item.status || "UNKNOWN";
            const inventory = item.inventory ?? "—";
            const tone =
              status === "ACTIVE"
                ? "success"
                : status === "DRAFT"
                  ? "attention"
                  : "critical";

            return (
              <s-table-row key={item.id}>
                <s-table-cell>
                  <s-stack direction="inline" gap="small" alignItems="center">
                    {item.productImage ? (
                      <s-box maxInlineSize="40px" maxBlockSize="40px">
                        <s-image
                          src={item.productImage}
                          alt={item.productTitle}
                          aspectRatio="1/1"
                        />
                      </s-box>
                    ) : null}
                    <s-text>{item.productTitle}</s-text>
                  </s-stack>
                </s-table-cell>
                <s-table-cell>{item.vendor || "—"}</s-table-cell>
                <s-table-cell>
                  {item.customerEmail || item.customerId || "Guest"}
                </s-table-cell>
                <s-table-cell>
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : "—"}
                </s-table-cell>
                <s-table-cell>{inventory}</s-table-cell>
                <s-table-cell>
                  <s-badge tone={tone}>{status}</s-badge>
                </s-table-cell>
                <s-table-cell>
                  <s-stack direction="inline" gap="small">
                    {item.productId ? (
                      <s-button
                        variant="tertiary"
                        href={`shopify://admin/products/${item.productId.replace(
                          "gid://shopify/Product/",
                          "",
                        )}`}
                        target="_blank"
                      >
                        View
                      </s-button>
                    ) : null}
                    {onRemove ? (
                      <s-button
                        tone="critical"
                        variant="secondary"
                        onClick={() => onRemove(item)}
                      >
                        Remove
                      </s-button>
                    ) : null}
                  </s-stack>
                </s-table-cell>
              </s-table-row>
            );
          })}
        </s-table-body>
      </s-table>
    </s-section>
  );
}
