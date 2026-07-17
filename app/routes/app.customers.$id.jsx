import { redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

/**
 * Legacy detail URL — customer wishlists open in a modal on /app/customers.
 * GIDs in the path often break routing, so redirect back to the list.
 */
export const loader = async () => {
  return redirect("/app/customers");
};

export default function CustomerWishlistDetailsRedirect() {
  return null;
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
