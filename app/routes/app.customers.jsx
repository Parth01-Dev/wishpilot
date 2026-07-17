import { useCallback, useEffect, useState } from "react";
import {
  Form,
  useFetcher,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  listWishlistCustomers,
  removeCustomerWishlist,
  removeWishlistItem,
} from "../services/wishlist.server";
import { CustomerTable } from "../components/CustomerTable";
import { CustomerWishlistModal } from "../components/CustomerWishlistModal";
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

  if (intent === "remove-item") {
    const id = form.get("id");
    const removed = await removeWishlistItem(session.shop, id);
    return {
      ok: Boolean(removed),
      toast: removed ? "Wishlist item removed" : "Item not found",
    };
  }

  return { ok: false };
};

export default function CustomersPage() {
  const { customers, page, totalPages, search, total } = useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isLoading = navigation.state !== "idle";

  const [openCustomer, setOpenCustomer] = useState(null);

  const detail =
    fetcher.data && fetcher.data.ok
      ? {
          customerId: fetcher.data.customerId,
          customerEmail: fetcher.data.customerEmail,
          itemCount: fetcher.data.itemCount,
          items: fetcher.data.items,
        }
      : null;
  const detailLoading = fetcher.state !== "idle";

  const handleOpen = useCallback(
    (customer) => {
      setOpenCustomer(customer);
      const params = new URLSearchParams();
      params.set("customerId", customer.customerId);
      fetcher.load(`/app/customers/details?${params.toString()}`);
      shopify.modal.show("customer-wishlist-modal");
    },
    [fetcher, shopify],
  );

  const handleRemove = (customer) => {
    const formData = new FormData();
    formData.set("intent", "remove");
    formData.set("customerId", customer.customerId);
    submit(formData, { method: "post" });
    shopify.toast.show("Wishlist Removed");
    if (openCustomer?.customerId === customer.customerId) {
      shopify.modal.hide("customer-wishlist-modal");
      setOpenCustomer(null);
    }
  };

  const handleRemoveItem = (item) => {
    const formData = new FormData();
    formData.set("intent", "remove-item");
    formData.set("id", String(item.id));
    submit(formData, { method: "post" });
    shopify.toast.show("Wishlist item removed");
  };

  useEffect(() => {
    if (navigation.state !== "idle" || !openCustomer) return;
    const intent = navigation.formData?.get("intent");
    if (intent !== "remove-item") return;

    const params = new URLSearchParams();
    params.set("customerId", openCustomer.customerId);
    fetcher.load(`/app/customers/details?${params.toString()}`);
  }, [navigation.state, navigation.formData, openCustomer, fetcher]);

  const query = new URLSearchParams();
  if (search) query.set("q", search);
  const baseUrl = `/app/customers${query.toString() ? `?${query.toString()}` : ""}`;

  return (
    <s-page heading="Customers">
      <div className={admin.shell}>
        <div className={admin.pageMeta}>
          <div className={admin.pageMetaCopy}>
            <p className={admin.kicker}>List management</p>
            <h2 className={admin.title}>{total} customers</h2>
            <p className={admin.subtitle}>
              Browse and curate shopper wishlists from admin — the same way
              premium wishlist apps manage lists.
            </p>
          </div>
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

        {isLoading ? (
          <div className={admin.card}>
            <div className={admin.cardBody}>
              <s-spinner accessibilityLabel="Loading customers" />
            </div>
          </div>
        ) : (
          <CustomerTable
            customers={customers}
            onOpen={handleOpen}
            onRemove={handleRemove}
          />
        )}

        {totalPages > 1 ? (
          <Pagination page={page} totalPages={totalPages} baseUrl={baseUrl} />
        ) : null}
      </div>

      <CustomerWishlistModal
        openCustomer={openCustomer}
        detail={detail}
        loading={detailLoading}
        onRemoveItem={handleRemoveItem}
      />
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
