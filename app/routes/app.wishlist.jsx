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
  listWishlistProducts,
  removeWishlistItem,
  removeWishlistProduct,
} from "../services/wishlist.server";
import { fetchProductsByIds } from "../utils/graphql";
import { WishlistTable } from "../components/WishlistTable";
import { WishlistProductModal } from "../components/WishlistProductModal";
import { SearchBar } from "../components/SearchBar";
import { Pagination } from "../components/Pagination";
import admin from "../styles/admin.module.css";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const search = url.searchParams.get("q") || "";
  const searchBy = url.searchParams.get("searchBy") || "product";

  const result = await listWishlistProducts(session.shop, {
    page,
    pageSize: 10,
    search,
    searchBy,
  });

  const productMap = await fetchProductsByIds(
    admin,
    result.products.map((item) => item.productId),
  );

  const products = result.products.map((item) => {
    const live = productMap.get(item.productId);
    return {
      ...item,
      productTitle: live?.title || item.productTitle,
      productImage: item.productImage || live?.image || null,
      vendor: item.vendor || live?.vendor || null,
      price: item.price ?? live?.price ?? null,
      inventory: live?.inventory ?? null,
      status: live?.status ?? "UNKNOWN",
    };
  });

  return {
    ...result,
    products,
    search,
    searchBy,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "remove-entry") {
    const id = form.get("id");
    const removed = await removeWishlistItem(session.shop, id);
    return {
      ok: Boolean(removed),
      toast: removed ? "Wishlist Removed" : "Item not found",
    };
  }

  if (intent === "remove-product") {
    const productId = String(form.get("productId") || "");
    const result = await removeWishlistProduct(session.shop, productId);
    return {
      ok: result.count > 0,
      toast:
        result.count > 0
          ? `Removed ${result.count} wishlist ${result.count === 1 ? "entry" : "entries"}`
          : "Product not found",
    };
  }

  return { ok: false };
};

export default function WishlistPage() {
  const { products, page, totalPages, search, searchBy, total } =
    useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isLoading = navigation.state !== "idle";

  const [openProduct, setOpenProduct] = useState(null);

  const detail =
    fetcher.data && fetcher.data.ok
      ? { product: fetcher.data.product, customers: fetcher.data.customers }
      : null;
  const detailLoading = fetcher.state !== "idle";

  const handleOpen = useCallback(
    (product) => {
      setOpenProduct(product);
      const params = new URLSearchParams();
      params.set("productId", product.productId);
      fetcher.load(`/app/wishlist/details?${params.toString()}`);
      shopify.modal.show("wishlist-product-modal");
    },
    [fetcher, shopify],
  );

  const handleRemoveProduct = (product) => {
    const formData = new FormData();
    formData.set("intent", "remove-product");
    formData.set("productId", product.productId);
    submit(formData, { method: "post" });
    shopify.toast.show("Removing wishlist entries…");
  };

  const handleRemoveEntry = (entry) => {
    const formData = new FormData();
    formData.set("intent", "remove-entry");
    formData.set("id", String(entry.id));
    submit(formData, { method: "post" });
    shopify.toast.show("Wishlist Removed");

    if (openProduct) {
      const params = new URLSearchParams();
      params.set("productId", openProduct.productId);
      fetcher.load(`/app/wishlist/details?${params.toString()}`);
    }
  };

  useEffect(() => {
    if (navigation.state !== "idle" || !openProduct) return;
    const intent = navigation.formData?.get("intent");
    if (intent !== "remove-entry" && intent !== "remove-product") return;

    const params = new URLSearchParams();
    params.set("productId", openProduct.productId);
    fetcher.load(`/app/wishlist/details?${params.toString()}`);
  }, [navigation.state, navigation.formData, openProduct, fetcher]);

  const query = new URLSearchParams();
  if (search) query.set("q", search);
  if (searchBy) query.set("searchBy", searchBy);
  const baseUrl = `/app/wishlist${query.toString() ? `?${query.toString()}` : ""}`;

  return (
    <s-page heading="Wishlist">
      <s-button slot="primary-action" href="/app/settings" variant="secondary">
        Theme setup
      </s-button>

      <div className={admin.shell}>
        <div className={admin.pageMeta}>
          <div className={admin.pageMetaCopy}>
            <p className={admin.kicker}>Product demand</p>
            <h2 className={admin.title}>{total} wished products</h2>
            <p className={admin.subtitle}>
              Browse demand by product. Open any card to see who saved it and
              manage list entries.
            </p>
          </div>
        </div>

        <Form method="get">
          <SearchBar value={search} searchBy={searchBy} />
        </Form>

        {isLoading ? (
          <div className={admin.card}>
            <div className={admin.cardBody}>
              <s-stack gap="base">
                <s-spinner accessibilityLabel="Loading wishlist" />
                <s-text>Loading wishlist…</s-text>
              </s-stack>
            </div>
          </div>
        ) : (
          <WishlistTable
            products={products}
            onOpen={handleOpen}
            onRemove={handleRemoveProduct}
          />
        )}

        {totalPages > 1 ? (
          <Pagination page={page} totalPages={totalPages} baseUrl={baseUrl} />
        ) : null}
      </div>

      <WishlistProductModal
        openProduct={openProduct}
        detail={detail}
        loading={detailLoading}
        onRemoveEntry={handleRemoveEntry}
      />
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
