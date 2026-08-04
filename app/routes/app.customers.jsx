import { useCallback, useEffect, useState } from "react";
import {
  Form,
  Link,
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
  removeGuestWishlist,
  removeWishlistItem,
} from "../services/wishlist.server";
import { CustomerTable } from "../components/CustomerTable";
import { CustomerWishlistModal } from "../components/CustomerWishlistModal";
import { Pagination } from "../components/Pagination";
import admin from "../styles/admin.module.css";

function resolveTab(value) {
  return value === "guest" || value === "guests" ? "guest" : "registered";
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const search = url.searchParams.get("q") || "";
  const type = resolveTab(url.searchParams.get("tab"));

  const result = await listWishlistCustomers(session.shop, {
    page,
    pageSize: 10,
    search,
    type,
  });

  return { ...result, search };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "remove") {
    const customerId = String(form.get("customerId") || "").trim();
    const guestId = String(form.get("guestId") || "").trim();

    if (guestId) {
      await removeGuestWishlist(session.shop, guestId);
      return { ok: true, toast: "Guest wishlist removed" };
    }

    if (customerId) {
      await removeCustomerWishlist(session.shop, customerId);
      return { ok: true, toast: "Customer wishlist removed" };
    }

    return { ok: false, toast: "Missing customer or guest id" };
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

function buildCustomersUrl({ tab, search, page } = {}) {
  const params = new URLSearchParams();
  if (tab && tab !== "registered") params.set("tab", tab);
  if (search) params.set("q", search);
  if (page && Number(page) > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/app/customers?${qs}` : "/app/customers";
}

export default function CustomersPage() {
  const {
    customers,
    page,
    totalPages,
    search,
    type,
    registeredTotal,
    guestTotal,
  } = useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isLoading = navigation.state !== "idle";
  const activeTab = type === "guest" ? "guest" : "registered";

  const [openCustomer, setOpenCustomer] = useState(null);

  const detail =
    fetcher.data && fetcher.data.ok
      ? {
          type: fetcher.data.type,
          customerId: fetcher.data.customerId,
          guestId: fetcher.data.guestId,
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
      if (customer.guestId && !customer.customerId) {
        params.set("guestId", customer.guestId);
      } else {
        params.set("customerId", customer.customerId);
      }
      fetcher.load(`/app/customers/details?${params.toString()}`);
      shopify.modal.show("customer-wishlist-modal");
    },
    [fetcher, shopify],
  );

  const handleRemove = (customer) => {
    const formData = new FormData();
    formData.set("intent", "remove");
    if (customer.guestId && !customer.customerId) {
      formData.set("guestId", customer.guestId);
    } else {
      formData.set("customerId", customer.customerId);
    }
    submit(formData, { method: "post" });
    shopify.toast.show("Wishlist Removed");

    const sameGuest =
      customer.guestId && openCustomer?.guestId === customer.guestId;
    const sameCustomer =
      customer.customerId &&
      openCustomer?.customerId === customer.customerId;
    if (sameGuest || sameCustomer) {
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
    if (openCustomer.guestId && !openCustomer.customerId) {
      params.set("guestId", openCustomer.guestId);
    } else {
      params.set("customerId", openCustomer.customerId);
    }
    fetcher.load(`/app/customers/details?${params.toString()}`);
  }, [navigation.state, navigation.formData, openCustomer, fetcher]);

  const baseUrl = buildCustomersUrl({ tab: activeTab, search });
  const headingCount =
    activeTab === "guest" ? guestTotal : registeredTotal;

  return (
    <s-page heading="Customers">
      <div className={admin.shell}>
        <div className={admin.pageMeta}>
          <div className={admin.pageMetaCopy}>
            <p className={admin.kicker}>List management</p>
            <h2 className={admin.title}>
              {headingCount}{" "}
              {activeTab === "guest" ? "guest wishlists" : "customers"}
            </h2>
            <p className={admin.subtitle}>
              Browse and curate shopper wishlists from admin — the same way
              premium wishlist apps manage lists.
            </p>
          </div>
        </div>

        <div className={admin.tabs} role="tablist" aria-label="Customer type">
          <Link
            to={buildCustomersUrl({ tab: "registered", search })}
            className={`${admin.tab} ${
              activeTab === "registered" ? admin.tabActive : ""
            }`}
            role="tab"
            aria-selected={activeTab === "registered"}
          >
            Registered ({registeredTotal})
          </Link>
          <Link
            to={buildCustomersUrl({ tab: "guest", search })}
            className={`${admin.tab} ${
              activeTab === "guest" ? admin.tabActive : ""
            }`}
            role="tab"
            aria-selected={activeTab === "guest"}
          >
            Guests ({guestTotal})
          </Link>
        </div>

        <Form method="get">
          <input type="hidden" name="tab" value={activeTab} />
          <div className={admin.toolbar}>
            <div className={admin.toolbarGridWide}>
              <div className={admin.toolbarFieldGrow}>
                <s-text-field
                  label="Search"
                  name="q"
                  value={search}
                  placeholder={
                    activeTab === "guest"
                      ? "Search by guest ID"
                      : "Search by email or customer ID"
                  }
                  autocomplete="off"
                />
              </div>
              <s-button type="submit" variant="primary">
                Search
              </s-button>
            </div>
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
            type={activeTab}
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
