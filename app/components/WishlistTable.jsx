import { EmptyState } from "./EmptyState";

/**
 * Merchant wishlist index — unique products in a 3-column card grid.
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
    <s-section accessibilityLabel="Wishlist products">
      <s-grid
        gridTemplateColumns="@container (inline-size <= 600px) 1fr, @container (inline-size <= 900px) 1fr 1fr, 1fr 1fr 1fr"
        gap="base"
      >
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
          const priceLabel =
            item.price != null ? `$${Number(item.price).toFixed(2)}` : "—";

          return (
            <s-box
              key={item.productId}
              padding="base"
              border="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack gap="base">
                <s-clickable onClick={() => onOpen?.(item)} padding="none">
                  <s-stack gap="small">
                    {item.productImage ? (
                      <s-box
                        border="base"
                        borderRadius="base"
                        overflow="hidden"
                      >
                        <s-image
                          src={item.productImage}
                          alt={item.productTitle}
                          aspectRatio="1/1"
                          objectFit="cover"
                          inlineSize="fill"
                        />
                      </s-box>
                    ) : (
                      <s-box
                        padding="large"
                        background="base"
                        borderRadius="base"
                        border="base"
                      >
                        <s-stack alignItems="center">
                          <s-text color="subdued">No image</s-text>
                        </s-stack>
                      </s-box>
                    )}

                    <s-heading>{item.productTitle}</s-heading>
                    <s-text>{priceLabel}</s-text>
                    <s-text color="subdued">{item.vendor || "—"}</s-text>
                  </s-stack>
                </s-clickable>

                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-badge>{item.customerCount} customers</s-badge>
                  <s-badge tone={tone}>{status}</s-badge>
                </s-stack>

                <s-text color="subdued">Inventory: {inventory}</s-text>
                <s-text color="subdued">
                  Last added:{" "}
                  {item.lastAddedAt
                    ? new Date(item.lastAddedAt).toLocaleDateString()
                    : "—"}
                </s-text>

                <s-stack direction="inline" gap="small">
                  <s-button variant="primary" onClick={() => onOpen?.(item)}>
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
              </s-stack>
            </s-box>
          );
        })}
      </s-grid>
    </s-section>
  );
}
