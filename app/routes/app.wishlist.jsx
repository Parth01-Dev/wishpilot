import { useEffect } from "react";
import { Form, useLoaderData, useNavigation, useSubmit } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  listWishlistItems,
  removeWishlistItem,
} from "../services/wishlist.server";
import { fetchProductsByIds } from "../utils/graphql";
import { WishlistTable } from "../components/WishlistTable";
import { SearchBar } from "../components/SearchBar";
import { Pagination } from "../components/Pagination";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const search = url.searchParams.get("q") || "";
  const searchBy = url.searchParams.get("searchBy") || "product";

  const result = await listWishlistItems(session.shop, {
    page,
    pageSize: 10,
    search,
    searchBy,
  });

  const productMap = await fetchProductsByIds(
    admin,
    result.items.map((i) => i.productId),
  );

  const items = result.items.map((item) => {
    const live = productMap.get(item.productId);
    return {
      ...item,
      productImage: item.productImage || live?.image || null,
      vendor: item.vendor || live?.vendor || null,
      inventory: live?.inventory ?? null,
      status: live?.status ?? "UNKNOWN",
    };
  });

  return {
    ...result,
    items,
    search,
    searchBy,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "remove") {
    const id = form.get("id");
    const removed = await removeWishlistItem(session.shop, id);
    return {
      ok: Boolean(removed),
      toast: removed ? "Wishlist Removed" : "Item not found",
    };
  }

  return { ok: false };
};

export default function WishlistPage() {
  const { items, page, totalPages, search, searchBy, total } = useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const isLoading = navigation.state !== "idle";

  useEffect(() => {
    if (navigation.formData?.get("intent") === "remove" && navigation.state === "idle") {
      // Toast handled via action navigation result below
    }
  }, [navigation]);

  const handleRemove = (item) => {
    const formData = new FormData();
    formData.set("intent", "remove");
    formData.set("id", String(item.id));
    submit(formData, { method: "post" });
    shopify.toast.show("Wishlist Removed");
  };

  const query = new URLSearchParams();
  if (search) query.set("q", search);
  if (searchBy) query.set("searchBy", searchBy);
  const baseUrl = `/app/wishlist${query.toString() ? `?${query.toString()}` : ""}`;

  return (
    <s-page heading="Wishlist">
      <s-section heading={`All items (${total})`}>
        <Form method="get">
          <SearchBar value={search} searchBy={searchBy} />
        </Form>
      </s-section>

      {isLoading ? (
        <s-section>
          <s-stack gap="base">
            <s-spinner accessibilityLabel="Loading wishlist" />
            <s-text>Loading wishlist…</s-text>
          </s-stack>
        </s-section>
      ) : (
        <WishlistTable items={items} onRemove={handleRemove} />
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
