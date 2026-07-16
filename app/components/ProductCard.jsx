/**
 * Product card used on customer wishlist detail views.
 */
export function ProductCard({ item, onRemove, showMoveToCart = true }) {
  const priceLabel =
    item.price != null ? `$${Number(item.price).toFixed(2)}` : "—";

  return (
    <s-box
      padding="base"
      border="base"
      borderRadius="base"
      background="subdued"
    >
      <s-stack direction="inline" gap="base" alignItems="start">
        {item.productImage ? (
          <s-box maxInlineSize="72px" maxBlockSize="72px">
            <s-image
              src={item.productImage}
              alt={item.productTitle}
              aspectRatio="1/1"
            />
          </s-box>
        ) : (
          <s-box
            padding="base"
            background="base"
            borderRadius="base"
            maxInlineSize="72px"
          >
            <s-text>—</s-text>
          </s-box>
        )}
        <s-stack gap="small" inlineSize="100%">
          <s-heading>{item.productTitle}</s-heading>
          <s-text>{priceLabel}</s-text>
          <s-text>{item.vendor || "Unknown vendor"}</s-text>
          <s-text>
            Added{" "}
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString()
              : "—"}
          </s-text>
          <s-stack direction="inline" gap="small">
            {onRemove ? (
              <s-button
                tone="critical"
                variant="secondary"
                onClick={() => onRemove(item)}
              >
                Remove
              </s-button>
            ) : null}
            {showMoveToCart ? (
              <s-button variant="tertiary" disabled>
                Move to Cart
              </s-button>
            ) : null}
          </s-stack>
        </s-stack>
      </s-stack>
    </s-box>
  );
}
