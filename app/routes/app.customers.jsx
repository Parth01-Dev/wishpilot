import { Form, useLoaderData, useNavigation, useSubmit } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  listWishlistCustomers,
  removeCustomerWishlist,
} from "../services/wishlist.server";
import { CustomerTable } from "../components/CustomerTable";
import { Pagination } from "../components/Pagination";
import admin from "../styles/admin.module.css";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const search = url.searchParams.get("q") || "";

  const result = await listWishlistCustomers(session.shop, {
    page,
    pageSize: 10,
    search,
  });

  return { ...result, search };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "remove") {
    const customerId = String(form.get("customerId") || "");
    await removeCustomerWishlist(session.shop, customerId);
    return { ok: true, toast: "Customer wishlist removed" };
  }

  return { ok: false };
};

export default function CustomersPage() {
  const { customers, page, totalPages, search, total } = useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const isLoading = navigation.state !== "idle";

  const handleRemove = (customer) => {
    const formData = new FormData();
    formData.set("intent", "remove");
    formData.set("customerId", customer.customerId);
    submit(formData, { method: "post" });
    shopify.toast.show("Wishlist Removed");
  };

  const query = new URLSearchParams();
  if (search) query.set("q", search);
  const baseUrl = `/app/customers${query.toString() ? `?${query.toString()}` : ""}`;

  return (
    <s-page heading="Customers">
      <s-section>
        <div className={admin.pageIntro} style={{ marginBottom: "1rem" }}>
          <p className={admin.pageEyebrow}>Audience</p>
          <h2 className={admin.pageTitle}>{total} wishlist customers</h2>
          <p className={admin.pageSubtitle}>
            Review shoppers who saved products and jump into each wishlist.
          </p>
        </div>

        <Form method="get">
          <div className={admin.toolbar}>
            <s-stack direction="inline" gap="base" alignItems="end">
              <s-text-field
                label="Search"
                name="q"
                value={search}
                placeholder="Search by email or customer ID"
                autocomplete="off"
              />
              <s-button type="submit" variant="primary">
                Search
              </s-button>
            </s-stack>
          </div>
        </Form>
      </s-section>

      {isLoading ? (
        <s-section>
          <s-spinner accessibilityLabel="Loading customers" />
        </s-section>
      ) : (
        <CustomerTable customers={customers} onRemove={handleRemove} />
      )}

      {totalPages > 1 ? (
        <s-section>
          <Pagination page={page} totalPages={totalPages} baseUrl={baseUrl} />
        </s-section>
      ) : null}
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
