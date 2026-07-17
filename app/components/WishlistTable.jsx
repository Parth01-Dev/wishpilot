import { EmptyState } from "./EmptyState";
import admin from "../styles/admin.module.css";

/**
 * Product demand cards — Swish-style saves emphasis.
 */
export function WishlistTable({ products = [], onOpen, onRemove }) {
  if (!products.length) {
    return (
      <EmptyState
        heading="No wishlist items yet"
        description="When customers save products, demand insights will appear here."
        actionLabel="Open Settings"
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
                  ) : null}
                </div>
              </s-clickable>

              <div className={admin.productBody}>
                <div className={admin.productTop}>
                  <s-clickable onClick={() => onOpen?.(item)} padding="none">
                    <h3 className={admin.productName}>{item.productTitle}</h3>
                    <p className={admin.productMeta}>
                      {priceLabel} · {item.vendor || "No vendor"} · Stock{" "}
                      {inventory}
                    </p>
                  </s-clickable>
                  <div className={admin.savesPill}>
                    <p className={admin.savesPillStrong}>
                      {item.customerCount}
                    </p>
                    <p className={admin.savesPillLabel}>saves</p>
                  </div>
                </div>

                <s-badge tone={tone}>{status}</s-badge>
              </div>

              <div className={admin.productFooter}>
                <s-button variant="primary" onClick={() => onOpen?.(item)}>
                  Details
                </s-button>
                {productAdminId ? (
                  <s-button
                    variant="tertiary"
                    href={`shopify://admin/products/${productAdminId}`}
                    target="_blank"
                  >
                    View product
                  </s-button>
                ) : null}
                {onRemove ? (
                  <s-button
                    tone="critical"
                    variant="tertiary"
                    onClick={() => onRemove(item)}
                  >
                    Remove
                  </s-button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </s-section>
  );
}
