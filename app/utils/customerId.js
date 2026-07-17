/**
 * Normalize Shopify customer IDs for URLs and DB lookups.
 * GIDs like "gid://shopify/Customer/123" break single-segment routes
 * when decoded in the embedded admin, so paths use the numeric id.
 */

export function customerNumericId(customerId) {
  if (!customerId) return "";
  return String(customerId).replace(/^gid:\/\/shopify\/Customer\//i, "");
}

export function customerGid(customerId) {
  if (!customerId) return null;
  const value = decodeURIComponent(String(customerId));
  if (value.startsWith("gid://")) return value;
  const numeric = customerNumericId(value);
  return numeric ? `gid://shopify/Customer/${numeric}` : value;
}

/**
 * Values to match against wishlist.customerId (stored as GID or numeric).
 */
export function customerIdMatchers(customerId) {
  const raw = decodeURIComponent(String(customerId || ""));
  const gid = customerGid(raw);
  const numeric = customerNumericId(raw);
  return [...new Set([raw, gid, numeric].filter(Boolean))];
}

export function customerWishlistPath(customerId) {
  const id = customerNumericId(customerId) || encodeURIComponent(String(customerId));
  return `/app/customers/${id}`;
}
