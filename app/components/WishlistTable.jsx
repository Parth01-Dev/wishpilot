import { EmptyState } from "./EmptyState";

/**
 * Merchant wishlist index — one row per unique product.
 */
export function WishlistTable({ products = [], onOpen, onRemove }) {
  if (!products.length) {
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
          <s-table-header format="numeric">Customers</s-table-header>
          <s-table-header>Last added</s-table-header>
          <s-table-header format="numeric">Inventory</s-table-header>
          <s-table-header>Status</s-table-header>
          <s-table-header>Actions</s-table-header>
        </s-table-header-row>
        <s-table-body>
          {products.map((item) => {
            const status = item.status || "UNKNOWN";
            const inventory = item.inventory ?? "—";
            const tone =
              status === "ACTIVE"
                ? "success"
                : status === "DRAFT"
                  ? "attention"
                  : "critical";
            const productAdminId = String(item.productId || "").replace(
              "gid://shopify/Product/",
              "",
            );

            return (
              <s-table-row key={item.productId}>
                <s-table-cell>
                  <s-clickable onClick={() => onOpen?.(item)} padding="none">
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
                      <s-stack gap="none">
                        <s-text type="strong">{item.productTitle}</s-text>
                        {item.price != null ? (
                          <s-text color="subdued">
                            ${Number(item.price).toFixed(2)}
                          </s-text>
                        ) : null}
                      </s-stack>
                    </s-stack>
                  </s-clickable>
                </s-table-cell>
                <s-table-cell>{item.vendor || "—"}</s-table-cell>
                <s-table-cell>
                  <s-badge>{item.customerCount}</s-badge>
                </s-table-cell>
                <s-table-cell>
                  {item.lastAddedAt
                    ? new Date(item.lastAddedAt).toLocaleDateString()
                    : "—"}
                </s-table-cell>
                <s-table-cell>{inventory}</s-table-cell>
                <s-table-cell>
                  <s-badge tone={tone}>{status}</s-badge>
                </s-table-cell>
                <s-table-cell>
                  <s-stack direction="inline" gap="small">
                    <s-button variant="tertiary" onClick={() => onOpen?.(item)}>
                      Details
                    </s-button>
                    {productAdminId ? (
                      <s-button
                        variant="tertiary"
                        href={`shopify://admin/products/${productAdminId}`}
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
