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
  if (existing) return normalizeSettings(existing);

  const created = await prisma.shopSettings.create({
    data: { shop, ...DEFAULT_SETTINGS },
  });
  return normalizeSettings(created);
}

/**
 * Ensure storefront/admin always receive real booleans for toggles.
 */
function normalizeSettings(settings) {
  return {
    ...settings,
    enableWishlist: Boolean(settings.enableWishlist),
    showHeartIcon: Boolean(settings.showHeartIcon),
    allowGuestWishlist: Boolean(settings.allowGuestWishlist),
    showWishlistCount: Boolean(settings.showWishlistCount),
  };
}

/**
 * Update shop settings (partial).
 */
export async function updateShopSettings(shop, data) {
  const updated = await prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, ...DEFAULT_SETTINGS, ...data },
    update: data,
  });
  return normalizeSettings(updated);
}

/**
 * Normalize Shopify customer IDs to numeric + GID forms for reliable lookups.
 */
export function customerIdVariants(customerId) {
  const raw = String(customerId || "").trim();
  if (!raw) return [];
  const numeric = raw.replace("gid://shopify/Customer/", "");
  const gid = raw.startsWith("gid://")
    ? raw
    : `gid://shopify/Customer/${raw}`;
  return [...new Set([raw, numeric, gid].filter(Boolean))];
}

/**
 * Prefer a stable numeric customer id when writing wishlist rows.
 */
function canonicalCustomerId(customerId) {
  const variants = customerIdVariants(customerId);
  return variants.find((id) => !String(id).startsWith("gid://")) || variants[0] || null;
}

/**
 * Prevent duplicate wishlist entries for the same shop/customer|guest/product/variant.
 * Falls back to product-level match so collection cards stay in sync across variants.
 */
export async function findExistingWishlistItem({
  shop,
  customerId,
  guestId,
  productId,
  variantId,
}) {
  const baseWhere = {
    shop,
    productId,
    ...(customerId
      ? { customerId: { in: customerIdVariants(customerId) } }
      : guestId
        ? { guestId, customerId: null }
        : { customerId: null, guestId: null }),
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
 * Move guest wishlist items onto a logged-in customer account.
 * Skips products the customer already has (deletes the guest duplicate).
 */
export async function mergeGuestWishlistIntoCustomer({
  shop,
  customerId,
  guestId,
  customerEmail,
}) {
  if (!shop || !customerId || !guestId) {
    return { merged: 0, skipped: 0, total: 0 };
  }

  const resolvedCustomerId = canonicalCustomerId(customerId);
  const resolvedGuestId = String(guestId).trim();
  if (!resolvedCustomerId || !resolvedGuestId) {
    return { merged: 0, skipped: 0, total: 0 };
  }

  const guestItems = await prisma.wishlist.findMany({
    where: {
      shop,
      guestId: resolvedGuestId,
      customerId: null,
    },
  });

  let merged = 0;
  let skipped = 0;

  for (const item of guestItems) {
    const existing = await findExistingWishlistItem({
      shop,
      customerId: resolvedCustomerId,
      guestId: null,
      productId: item.productId,
      variantId: item.variantId,
    });

    if (existing) {
      await prisma.wishlist.delete({ where: { id: item.id } });
      skipped += 1;
      continue;
    }

    await prisma.wishlist.update({
      where: { id: item.id },
      data: {
        customerId: resolvedCustomerId,
        guestId: null,
        customerEmail: customerEmail || item.customerEmail || null,
      },
    });
    merged += 1;
  }

  return { merged, skipped, total: guestItems.length };
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
      customerId: data.customerId ? canonicalCustomerId(data.customerId) : null,
      guestId: data.customerId ? null : data.guestId ?? null,
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
  guestId,
  productId,
  variantId,
}) {
  const existing = await findExistingWishlistItem({
    shop,
    customerId,
    guestId,
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
 * Aggregate customers or guests who have wishlist items.
 * type: "registered" (customerId present) | "guest" (guestId present, no customerId)
 */
export async function listWishlistCustomers(
  shop,
  { page = 1, pageSize = 10, search = "", type = "registered" } = {},
) {
  const tab = type === "guest" ? "guest" : "registered";
  const term = search.trim();

  const registeredWhere = {
    shop,
    customerId: { not: null },
    ...(term
      ? {
          OR: [
            { customerEmail: { contains: term, mode: "insensitive" } },
            { customerId: { contains: term, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const guestWhere = {
    shop,
    customerId: null,
    AND: [
      { guestId: { not: null } },
      { NOT: { guestId: "" } },
      ...(term
        ? [{ guestId: { contains: term, mode: "insensitive" } }]
        : []),
    ],
  };

  const registeredCountWhere = {
    shop,
    customerId: { not: null },
  };
  const guestCountWhere = {
    shop,
    customerId: null,
    AND: [{ guestId: { not: null } }, { NOT: { guestId: "" } }],
  };

  const [registeredGrouped, guestGrouped] = await Promise.all([
    prisma.wishlist.groupBy({
      by: ["customerId", "customerEmail"],
      where: registeredCountWhere,
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
    }),
    prisma.wishlist.groupBy({
      by: ["guestId"],
      where: guestCountWhere,
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
    }),
  ]);

  const registeredTotal = registeredGrouped.length;
  const guestTotal = guestGrouped.length;

  let grouped;
  if (tab === "guest") {
    if (term) {
      grouped = await prisma.wishlist.groupBy({
        by: ["guestId"],
        where: guestWhere,
        _count: { id: true },
        _max: { createdAt: true },
        orderBy: { _max: { createdAt: "desc" } },
      });
    } else {
      grouped = guestGrouped;
    }
  } else if (term) {
    grouped = await prisma.wishlist.groupBy({
      by: ["customerId", "customerEmail"],
      where: registeredWhere,
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
    });
  } else {
    grouped = registeredGrouped;
  }

  const total = grouped.length;
  const skip = (Math.max(1, page) - 1) * pageSize;
  const customers = grouped.slice(skip, skip + pageSize).map((row) => {
    if (tab === "guest") {
      return {
        type: "guest",
        customerId: null,
        guestId: row.guestId,
        customerEmail: null,
        wishlistCount: row._count.id,
        lastWishlistDate: row._max.createdAt,
      };
    }
    return {
      type: "registered",
      customerId: row.customerId,
      guestId: null,
      customerEmail: row.customerEmail,
      wishlistCount: row._count.id,
      lastWishlistDate: row._max.createdAt,
    };
  });

  return {
    customers,
    total,
    registeredTotal,
    guestTotal,
    type: tab,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Wishlist items for a single customer.
 * Accepts numeric IDs or full Shopify Customer GIDs.
 */
export async function getCustomerWishlist(shop, customerId) {
  const ids = customerIdVariants(customerId);
  if (!ids.length) return [];

  return prisma.wishlist.findMany({
    where: {
      shop,
      customerId: { in: ids },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Wishlist items for a guest session.
 */
export async function getGuestWishlist(shop, guestId) {
  const id = String(guestId || "").trim();
  if (!id) return [];

  return prisma.wishlist.findMany({
    where: {
      shop,
      guestId: id,
      customerId: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Remove all wishlist items for a customer.
 * Accepts numeric IDs or full Shopify Customer GIDs.
 */
export async function removeCustomerWishlist(shop, customerId) {
  const ids = customerIdVariants(customerId);
  if (!ids.length) return { count: 0 };

  return prisma.wishlist.deleteMany({
    where: {
      shop,
      customerId: { in: ids },
    },
  });
}

/**
 * Remove all wishlist items for a guest session.
 */
export async function removeGuestWishlist(shop, guestId) {
  const id = String(guestId || "").trim();
  if (!id) return { count: 0 };

  return prisma.wishlist.deleteMany({
    where: {
      shop,
      guestId: id,
      customerId: null,
    },
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
 * Storefront wishlist for a logged-in customer or guest session.
 * Requires customerId or guestId — never returns the whole shop list.
 */
export async function getStorefrontWishlist(
  shop,
  {
    customerId,
    guestId,
    sort = "newest",
    search = "",
    page = 1,
    pageSize = 12,
  } = {},
) {
  if (!customerId && !guestId) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const where = {
    shop,
    ...(customerId
      ? { customerId: { in: customerIdVariants(customerId) } }
      : { guestId, customerId: null }),
  };

  if (search.trim()) {
    where.AND = [
      {
        OR: [
          { productTitle: { contains: search.trim(), mode: "insensitive" } },
          { vendor: { contains: search.trim(), mode: "insensitive" } },
        ],
      },
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
