/**
 * Modal showing product details and customers who wishlisted it.
 */
export function WishlistProductModal({
  openProduct,
  detail,
  loading,
  onRemoveEntry,
}) {
  const product = detail?.product || openProduct;
  const customers = detail?.customers || [];
  const productAdminId = String(product?.productId || "").replace(
    "gid://shopify/Product/",
    "",
  );

  return (
    <s-modal id="wishlist-product-modal" heading="Wishlist product" size="large">
      {loading && !product ? (
        <s-stack gap="base" padding="base">
          <s-spinner accessibilityLabel="Loading product details" />
          <s-text>Loading product details…</s-text>
        </s-stack>
      ) : !product ? (
        <s-banner tone="warning">Product details not found.</s-banner>
      ) : (
        <s-stack gap="large">
          <s-stack direction="inline" gap="base" alignItems="start">
            {product.productImage ? (
              <s-box maxInlineSize="88px" maxBlockSize="88px">
                <s-image
                  src={product.productImage}
                  alt={product.productTitle}
                  aspectRatio="1/1"
                />
              </s-box>
            ) : null}
            <s-stack gap="small">
              <s-heading>{product.productTitle}</s-heading>
              <s-text>
                {product.price != null
                  ? `$${Number(product.price).toFixed(2)}`
                  : "Price unavailable"}
              </s-text>
              <s-text>Vendor: {product.vendor || "—"}</s-text>
              <s-text>
                Inventory:{" "}
                {product.inventory != null ? product.inventory : "—"}
              </s-text>
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-badge>{product.status || "UNKNOWN"}</s-badge>
                <s-badge>
                  {product.customerCount ?? customers.length} customers
                </s-badge>
              </s-stack>
              {productAdminId ? (
                <s-button
                  variant="tertiary"
                  href={`shopify://admin/products/${productAdminId}`}
                  target="_blank"
                >
                  Open in Shopify
                </s-button>
              ) : null}
            </s-stack>
          </s-stack>

          <s-divider />

          <s-stack gap="base">
            <s-heading>Customers who saved this product</s-heading>
            {loading ? (
              <s-text>Refreshing customer list…</s-text>
            ) : null}
            {!customers.length ? (
              <s-banner tone="info">
                No customers currently have this product on a wishlist.
              </s-banner>
            ) : (
              <s-table>
                <s-table-header-row>
                  <s-table-header listSlot="primary">Customer</s-table-header>
                  <s-table-header>Email</s-table-header>
                  <s-table-header>Customer ID</s-table-header>
                  <s-table-header>Guest ID</s-table-header>
                  <s-table-header>Date added</s-table-header>
                  <s-table-header>Actions</s-table-header>
                </s-table-header-row>
                <s-table-body>
                  {customers.map((customer) => (
                    <s-table-row key={customer.id}>
                      <s-table-cell>
                        {customer.name || (customer.isGuest ? "Guest" : "—")}
                      </s-table-cell>
                      <s-table-cell>{customer.email || "—"}</s-table-cell>
                      <s-table-cell>{customer.customerId || "—"}</s-table-cell>
                      <s-table-cell>{customer.guestId || "—"}</s-table-cell>
                      <s-table-cell>
                        {customer.createdAt
                          ? new Date(customer.createdAt).toLocaleString()
                          : "—"}
                      </s-table-cell>
                      <s-table-cell>
                        {onRemoveEntry ? (
                          <s-button
                            tone="critical"
                            variant="secondary"
                            onClick={() => onRemoveEntry(customer)}
                          >
                            Remove
                          </s-button>
                        ) : null}
                      </s-table-cell>
                    </s-table-row>
                  ))}
                </s-table-body>
              </s-table>
            )}
          </s-stack>
        </s-stack>
      )}

      <s-button
        slot="secondary-actions"
        commandFor="wishlist-product-modal"
        command="--hide"
      >
        Close
      </s-button>
    </s-modal>
  );
}
