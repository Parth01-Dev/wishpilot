import { useLoaderData, useSubmit } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getCustomerWishlist,
  removeWishlistItem,
} from "../services/wishlist.server";
import { ProductCard } from "../components/ProductCard";
import { EmptyState } from "../components/EmptyState";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const customerId = decodeURIComponent(params.id);
  const items = await getCustomerWishlist(session.shop, customerId);

  return {
    customerId,
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
  const { customerId, customerEmail, items } = useLoaderData();
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
    <s-page heading={customerEmail || "Customer Wishlist"}>
      <s-link slot="breadcrumb-actions" href="/app/customers">
        Customers
      </s-link>
      <s-section heading="Customer">
        <s-paragraph>
          <s-text>ID: </s-text>
          {customerId}
        </s-paragraph>
        {customerEmail ? (
          <s-paragraph>
            <s-text>Email: </s-text>
            {customerEmail}
          </s-paragraph>
        ) : null}
        <s-badge>{items.length} items</s-badge>
      </s-section>

      <s-section heading="Wishlist items">
        {items.length ? (
          <s-grid
            gridTemplateColumns="@container (inline-size <= 500px) 1fr, 1fr 1fr"
            gap="base"
          >
            {items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onRemove={handleRemove}
                showMoveToCart
              />
            ))}
          </s-grid>
        ) : (
          <EmptyState
            heading="This customer has an empty wishlist"
            description="Items will show up when the customer saves products."
            actionLabel="Back to customers"
            actionHref="/app/customers"
          />
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
