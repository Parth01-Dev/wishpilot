/**
 * Normalize user input to a Shopify shop domain.
 */
export function normalizeShopDomain(value) {
  let shop = String(value || "").trim();
  if (!shop) return "";

  shop = shop.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");

  if (!shop.includes(".")) {
    shop = `${shop}.myshopify.com`;
  }

  return shop.toLowerCase();
}

/**
 * Returns true when the value is a valid Shopify shop domain or store handle.
 */
export function isValidShopDomain(value) {
  const shop = normalizeShopDomain(value);
  if (!shop) return false;

  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
}
