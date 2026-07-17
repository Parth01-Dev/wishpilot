import admin from "../styles/admin.module.css";

/**
 * Modal showing products a customer has saved to their wishlist.
 */
export function CustomerWishlistModal({
  openCustomer,
  detail,
  loading,
  onRemoveItem,
}) {
  const customer = openCustomer;
  const items = detail?.items || [];
  const email =
    detail?.customerEmail || customer?.customerEmail || "Customer wishlist";
  const idLabel = String(
    detail?.customerId || customer?.customerId || "",
  ).replace("gid://shopify/Customer/", "");

  return (
    <s-modal
      id="customer-wishlist-modal"
      heading={email}
      size="large"
    >
      {loading && !detail ? (
        <s-stack gap="base" padding="base">
          <s-spinner accessibilityLabel="Loading customer wishlist" />
          <s-text>Loading wishlist…</s-text>
        </s-stack>
      ) : (
        <s-stack gap="large">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-badge>{detail?.itemCount ?? items.length} products</s-badge>
            {idLabel ? <s-text>Customer ID: {idLabel}</s-text> : null}
          </s-stack>

          <s-divider />

          {!items.length ? (
            <s-banner tone="info">
              This customer has no products on their wishlist.
            </s-banner>
          ) : (
            <div className={admin.modalProductList}>
              {items.map((item) => {
                const productAdminId = String(item.productId || "").replace(
                  "gid://shopify/Product/",
                  "",
                );
                const priceLabel =
                  item.price != null
                    ? `$${Number(item.price).toFixed(2)}`
                    : "—";

                return (
                  <div key={item.id} className={admin.modalProductRow}>
                    <div className={admin.thumb}>
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productTitle}
                        />
                      ) : null}
                    </div>
                    <div>
                      <p className={admin.demandTitle}>{item.productTitle}</p>
                      <p className={admin.demandMeta}>
                        {priceLabel} · {item.vendor || "No vendor"}
                        {item.createdAt
                          ? ` · Added ${new Date(item.createdAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <s-stack direction="inline" gap="small">
                      {item.status ? (
                        <s-badge
                          tone={
                            item.status === "ACTIVE" ? "success" : "attention"
                          }
                        >
                          {item.status}
                        </s-badge>
                      ) : null}
                      {productAdminId ? (
                        <s-button
                          variant="tertiary"
                          href={`shopify://admin/products/${productAdminId}`}
                          target="_blank"
                        >
                          View
                        </s-button>
                      ) : null}
                      {onRemoveItem ? (
                        <s-button
                          tone="critical"
                          variant="tertiary"
                          onClick={() => onRemoveItem(item)}
                        >
                          Remove
                        </s-button>
                      ) : null}
                    </s-stack>
                  </div>
                );
              })}
            </div>
          )}
        </s-stack>
      )}

      <s-button
        slot="secondary-actions"
        commandFor="customer-wishlist-modal"
        command="--hide"
      >
        Close
      </s-button>
    </s-modal>
  );
}
