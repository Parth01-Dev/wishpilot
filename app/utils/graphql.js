/**
 * Admin GraphQL queries for wishlist product enrichment.
 */

export const PRODUCTS_BY_IDS = `#graphql
  query WishPilotProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        handle
        status
        vendor
        totalInventory
        featuredImage {
          url
          altText
        }
        priceRangeV2 {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 1) {
          nodes {
            id
            inventoryQuantity
          }
        }
      }
    }
  }
`;

export const PRODUCT_BY_ID = `#graphql
  query WishPilotProductById($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      status
      vendor
      totalInventory
      featuredImage {
        url
        altText
      }
      priceRangeV2 {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 10) {
        nodes {
          id
          title
          inventoryQuantity
          price
        }
      }
    }
  }
`;

/**
 * Normalize Admin API product nodes for wishlist rows.
 */
export function mapProductNode(node) {
  if (!node?.id) return null;

  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    status: node.status,
    vendor: node.vendor,
    inventory: node.totalInventory ?? 0,
    image: node.featuredImage?.url ?? null,
    price: node.priceRangeV2?.minVariantPrice?.amount
      ? parseFloat(node.priceRangeV2.minVariantPrice.amount)
      : null,
    currencyCode: node.priceRangeV2?.minVariantPrice?.currencyCode ?? "USD",
  };
}

/**
 * Fetch and map products by GID list via Admin GraphQL.
 */
export async function fetchProductsByIds(admin, productIds) {
  if (!productIds?.length) return new Map();

  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  const response = await admin.graphql(PRODUCTS_BY_IDS, {
    variables: { ids: uniqueIds },
  });
  const json = await response.json();
  const map = new Map();

  for (const node of json.data?.nodes ?? []) {
    const mapped = mapProductNode(node);
    if (mapped) map.set(mapped.id, mapped);
  }

  return map;
}
