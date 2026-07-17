import { EmptyState } from "./EmptyState";
import admin from "../styles/admin.module.css";

/**
 * Merchant wishlist index — unique products in a responsive 3-column card grid.
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
      <div className={admin.productGrid}>
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
            <article key={item.productId} className={admin.productCard}>
              <s-clickable onClick={() => onOpen?.(item)} padding="none">
                <div className={admin.productMedia}>
                  {item.productImage ? (
                    <img src={item.productImage} alt={item.productTitle} />
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        placeItems: "center",
                        height: "100%",
                        color: "#87909e",
                        fontSize: "0.85rem",
                      }}
                    >
                      No image
                    </div>
                  )}
                </div>
              </s-clickable>

              <div className={admin.productBody}>
                <s-clickable onClick={() => onOpen?.(item)} padding="none">
                  <s-stack gap="small-100">
                    <h3 className={admin.productTitle}>{item.productTitle}</h3>
                    <p className={admin.productMeta}>
                      {priceLabel} · {item.vendor || "No vendor"}
                    </p>
                  </s-stack>
                </s-clickable>

                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-badge tone="info">{item.customerCount} customers</s-badge>
                  <s-badge tone={tone}>{status}</s-badge>
                </s-stack>

                <p className={admin.productMeta}>Inventory: {inventory}</p>
                <p className={admin.productMeta}>
                  Last added:{" "}
                  {item.lastAddedAt
                    ? new Date(item.lastAddedAt).toLocaleDateString()
                    : "—"}
                </p>

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
              </div>
            </article>
          );
        })}
      </div>
    </s-section>
  );
}
