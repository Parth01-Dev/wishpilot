import { useLoaderData, useSubmit } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getCustomerWishlist,
  removeWishlistItem,
} from "../services/wishlist.server";
import { customerGid, customerNumericId } from "../utils/customerId";
import { EmptyState } from "../components/EmptyState";
import admin from "../styles/admin.module.css";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const customerId = customerGid(params.id);
  const items = await getCustomerWishlist(session.shop, customerId);

  return {
    customerId,
    customerNumericId: customerNumericId(customerId),
    customerEmail: items[0]?.customerEmail || null,
    items,
  };
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "remove") {
    const id = form.get("id");
    await removeWishlistItem(session.shop, id);
    return { ok: true };
  }

  return { ok: false, customerId: params.id };
};

export default function CustomerWishlistDetails() {
  const { customerNumericId, customerEmail, items } = useLoaderData();
  const submit = useSubmit();
  const shopify = useAppBridge();

  const handleRemove = (item) => {
    const formData = new FormData();
    formData.set("intent", "remove");
    formData.set("id", String(item.id));
    submit(formData, { method: "post" });
    shopify.toast.show("Wishlist Removed");
  };

  return (
    <s-page heading={customerEmail || "Customer wishlist"}>
      <s-link slot="breadcrumb-actions" href="/app/customers">
        Customers
      </s-link>

      <div className={admin.shell}>
        <div className={admin.pageMeta}>
          <div className={admin.pageMetaCopy}>
            <p className={admin.kicker}>Customer wishlist</p>
            <h2 className={admin.title}>
              {customerEmail || `Customer ${customerNumericId || ""}`}
            </h2>
            <p className={admin.subtitle}>
              {items.length} saved{" "}
              {items.length === 1 ? "product" : "products"}
              {customerNumericId ? ` · ID ${customerNumericId}` : ""}
            </p>
          </div>
        </div>

        <div className={admin.card}>
          <div className={admin.cardHead}>
            <div>
              <h3 className={admin.cardTitle}>Saved products</h3>
              <p className={admin.cardHint}>
                Products this shopper added to their wishlist
              </p>
            </div>
            <s-badge>{items.length}</s-badge>
          </div>
          <div className={admin.cardBody}>
            {items.length ? (
              items.map((item) => {
                const priceLabel =
                  item.price != null
                    ? `$${Number(item.price).toFixed(2)}`
                    : "—";

                return (
                  <div key={item.id} className={admin.demandRow}>
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
                        {priceLabel} · {item.vendor || "No vendor"} · Added{" "}
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <s-button
                      tone="critical"
                      variant="tertiary"
                      onClick={() => handleRemove(item)}
                    >
                      Remove
                    </s-button>
                  </div>
                );
              })
            ) : (
              <EmptyState
                heading="This wishlist is empty"
                description="Items will show up when the customer saves products."
                actionLabel="Back to customers"
                actionHref="/app/customers"
              />
            )}
          </div>
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
