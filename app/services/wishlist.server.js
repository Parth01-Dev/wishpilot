import prisma from "../db.server";

const LOW_STOCK_THRESHOLD = 5;

/**
 * Default merchant settings used when none exist yet.
 */
export const DEFAULT_SETTINGS = {
  enableWishlist: true,
  showHeartIcon: true,
  allowGuestWishlist: false,
  buttonStyle: "heart",
  primaryColor: "#000000",
  buttonPosition: "product_form",
  showWishlistCount: true,
};

/**
 * Get or create shop settings.
 */
export async function getShopSettings(shop) {
  const existing = await prisma.shopSettings.findUnique({ where: { shop } });
  if (existing) return existing;

  return prisma.shopSettings.create({
    data: { shop, ...DEFAULT_SETTINGS },
  });
}

/**
 * Update shop settings (partial).
 */
export async function updateShopSettings(shop, data) {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, ...DEFAULT_SETTINGS, ...data },
    update: data,
  });
}

/**
 * Prevent duplicate wishlist entries for the same shop/customer/product/variant.
 * Falls back to product-level match so collection cards stay in sync across variants.
 */
export async function findExistingWishlistItem({
  shop,
  customerId,
  productId,
  variantId,
}) {
  const baseWhere = {
    shop,
    productId,
    customerId: customerId ?? null,
  };

  if (variantId) {
    const exact = await prisma.wishlist.findFirst({
      where: { ...baseWhere, variantId },
    });
    if (exact) return exact;
  }

  return prisma.wishlist.findFirst({
    where: baseWhere,
  });
}

/**
 * Add an item to a wishlist. Returns { item, alreadyExists }.
 */
export async function addWishlistItem(data) {
  const existing = await findExistingWishlistItem(data);
  if (existing) {
    return { item: existing, alreadyExists: true };
  }

  const item = await prisma.wishlist.create({
    data: {
      shop: data.shop,
      customerId: data.customerId ?? null,
      customerEmail: data.customerEmail ?? null,
      productId: data.productId,
      variantId: data.variantId ?? null,
      productTitle: data.productTitle,
      productHandle: data.productHandle,
      productImage: data.productImage ?? null,
      vendor: data.vendor ?? null,
      price: data.price ?? null,
    },
  });

  return { item, alreadyExists: false };
}

/**
 * Remove a wishlist item by id (scoped to shop).
 */
export async function removeWishlistItem(shop, id) {
  const item = await prisma.wishlist.findFirst({
    where: { id: Number(id), shop },
  });
  if (!item) return null;

  await prisma.wishlist.delete({ where: { id: item.id } });
  return item;
}

/**
 * Remove wishlist item by product for a customer/guest.
 */
export async function removeWishlistItemByProduct({
  shop,
  customerId,
  productId,
  variantId,
}) {
  const existing = await findExistingWishlistItem({
    shop,
    customerId,
    productId,
    variantId,
  });
  if (!existing) return null;

  await prisma.wishlist.delete({ where: { id: existing.id } });
  return existing;
}

/**
 * Paginated wishlist list with optional search filters.
 */
export async function listWishlistItems(
  shop,
  { page = 1, pageSize = 10, search = "", searchBy = "product" } = {},
) {
  const where = buildWishlistWhere(shop, search, searchBy);

  const skip = (Math.max(1, page) - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.wishlist.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.wishlist.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Build shared wishlist where clause for search filters.
 */
function buildWishlistWhere(shop, search = "", searchBy = "product") {
  const where = { shop };

  if (search.trim()) {
    const term = search.trim();
    if (searchBy === "vendor") {
      where.vendor = { contains: term, mode: "insensitive" };
    } else if (searchBy === "customer") {
      where.OR = [
        { customerEmail: { contains: term, mode: "insensitive" } },
        { customerId: { contains: term, mode: "insensitive" } },
      ];
    } else {
      where.OR = [
        { productTitle: { contains: term, mode: "insensitive" } },
        { productHandle: { contains: term, mode: "insensitive" } },
      ];
    }
  }

  return where;
}

/**
 * Unique products on wishlists, with how many customers saved each.
 */
export async function listWishlistProducts(
  shop,
  { page = 1, pageSize = 10, search = "", searchBy = "product" } = {},
) {
  const where = buildWishlistWhere(shop, search, searchBy);

  const grouped = await prisma.wishlist.groupBy({
    by: ["productId"],
    where,
    _count: { id: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
  });

  const total = grouped.length;
  const skip = (Math.max(1, page) - 1) * pageSize;
  const pageGroups = grouped.slice(skip, skip + pageSize);

  const products = await Promise.all(
    pageGroups.map(async (group) => {
      const sample = await prisma.wishlist.findFirst({
        where: { shop, productId: group.productId },
        orderBy: { createdAt: "desc" },
      });

      return {
        productId: group.productId,
        productTitle: sample?.productTitle || "Product",
        productHandle: sample?.productHandle || "",
        productImage: sample?.productImage || null,
        vendor: sample?.vendor || null,
        price: sample?.price ?? null,
        variantId: sample?.variantId || null,
        customerCount: group._count.id,
        lastAddedAt: group._max.createdAt,
      };
    }),
  );

  return {
    products,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * All wishlist entries for one product (customers / guests who saved it).
 */
export async function getWishlistEntriesForProduct(shop, productId) {
  const normalizedProductId = String(productId).startsWith("gid://")
    ? String(productId)
    : `gid://shopify/Product/${productId}`;

  return prisma.wishlist.findMany({
    where: {
      shop,
      OR: [{ productId }, { productId: normalizedProductId }],
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Delete every wishlist entry for a product in this shop.
 */
export async function removeWishlistProduct(shop, productId) {
  const normalizedProductId = String(productId).startsWith("gid://")
    ? String(productId)
    : `gid://shopify/Product/${productId}`;

  return prisma.wishlist.deleteMany({
    where: {
      shop,
      OR: [{ productId }, { productId: normalizedProductId }],
    },
  });
}

/**
 * Aggregate customers who have wishlist items.
 */
export async function listWishlistCustomers(
  shop,
  { page = 1, pageSize = 10, search = "" } = {},
) {
  const where = {
    shop,
    customerId: { not: null },
  };

  if (search.trim()) {
    where.OR = [
      { customerEmail: { contains: search.trim(), mode: "insensitive" } },
      { customerId: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  const grouped = await prisma.wishlist.groupBy({
    by: ["customerId", "customerEmail"],
    where,
    _count: { id: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
  });

  const total = grouped.length;
  const skip = (Math.max(1, page) - 1) * pageSize;
  const customers = grouped.slice(skip, skip + pageSize).map((row) => ({
    customerId: row.customerId,
    customerEmail: row.customerEmail,
    wishlistCount: row._count.id,
    lastWishlistDate: row._max.createdAt,
  }));

  return {
    customers,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Wishlist items for a single customer.
 */
export async function getCustomerWishlist(shop, customerId) {
  return prisma.wishlist.findMany({
    where: { shop, customerId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Remove all wishlist items for a customer.
 */
export async function removeCustomerWishlist(shop, customerId) {
  return prisma.wishlist.deleteMany({
    where: { shop, customerId },
  });
}

/**
 * Dashboard metrics for the admin home.
 */
export async function getDashboardStats(shop) {
  const [totalItems, recentItems, productGroups, customerGroups, growth] =
    await Promise.all([
      prisma.wishlist.count({ where: { shop } }),
      prisma.wishlist.findMany({
        where: { shop },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.wishlist.groupBy({
        by: ["productId", "productTitle", "productImage", "vendor"],
        where: { shop },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.wishlist.groupBy({
        by: ["customerId"],
        where: { shop, customerId: { not: null } },
        _count: { id: true },
      }),
      getWishlistGrowth(shop, 14),
    ]);

  const mostWished = productGroups[0]
    ? {
        productId: productGroups[0].productId,
        productTitle: productGroups[0].productTitle,
        productImage: productGroups[0].productImage,
        vendor: productGroups[0].vendor,
        count: productGroups[0]._count.id,
      }
    : null;

  return {
    totalItems,
    totalCustomers: customerGroups.length,
    mostWished,
    recentlyAdded: recentItems,
    topProducts: productGroups.map((p) => ({
      productId: p.productId,
      productTitle: p.productTitle,
      productImage: p.productImage,
      vendor: p.vendor,
      count: p._count.id,
    })),
    growth,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
  };
}

/**
 * Analytics payload including growth and top lists.
 */
export async function getAnalytics(shop) {
  const [growth, topProducts, activeCustomers, recentlyAdded] =
    await Promise.all([
      getWishlistGrowth(shop, 30),
      prisma.wishlist.groupBy({
        by: ["productId", "productTitle", "productImage", "vendor", "price"],
        where: { shop },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.wishlist.groupBy({
        by: ["customerId", "customerEmail"],
        where: { shop, customerId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.wishlist.findMany({
        where: { shop },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  return {
    growth,
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      productTitle: p.productTitle,
      productImage: p.productImage,
      vendor: p.vendor,
      price: p.price,
      count: p._count.id,
    })),
    mostActiveCustomers: activeCustomers.map((c) => ({
      customerId: c.customerId,
      customerEmail: c.customerEmail,
      count: c._count.id,
    })),
    recentlyAdded,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
  };
}

/**
 * Daily wishlist growth for the last N days.
 */
export async function getWishlistGrowth(shop, days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const items = await prisma.wishlist.findMany({
    where: { shop, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const buckets = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }

  for (const item of items) {
    const key = item.createdAt.toISOString().slice(0, 10);
    if (buckets[key] !== undefined) buckets[key] += 1;
  }

  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

/**
 * Storefront wishlist for a customer (or guest session key).
 */
export async function getStorefrontWishlist(
  shop,
  { customerId, sort = "newest", search = "", page = 1, pageSize = 12 } = {},
) {
  const where = { shop };

  if (customerId) {
    where.customerId = customerId;
  }

  if (search.trim()) {
    where.OR = [
      { productTitle: { contains: search.trim(), mode: "insensitive" } },
      { vendor: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  let orderBy = { createdAt: "desc" };
  switch (sort) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "alphabetical":
      orderBy = { productTitle: "asc" };
      break;
    case "price":
      orderBy = { price: "asc" };
      break;
    case "vendor":
      orderBy = { vendor: "asc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const skip = (Math.max(1, page) - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.wishlist.findMany({ where, orderBy, skip, take: pageSize }),
    prisma.wishlist.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export { LOW_STOCK_THRESHOLD };
