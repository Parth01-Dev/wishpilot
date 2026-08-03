import path from "node:path";
import { readFile } from "node:fs/promises";
import { authenticate } from "../shopify.server";

const ASSETS = {
  "add.js": {
    file: "wishpilot-add.js",
    type: "application/javascript; charset=utf-8",
  },
  "add.css": {
    file: "wishpilot.css",
    type: "text/css; charset=utf-8",
  },
};

/**
 * App-proxy storefront assets so collection paste snippets can load JS/CSS
 * without relying on the theme app embed.
 *
 * Storefront: /apps/wish-pilot/sf/add.js  →  /api/wishlist/sf/add.js
 *             /apps/wish-pilot/sf/add.css →  /api/wishlist/sf/add.css
 */
export const loader = async ({ request, params }) => {
  try {
    await authenticate.public.appProxy(request);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const meta = ASSETS[params.asset];
  if (!meta) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const filePath = path.join(
      process.cwd(),
      "extensions",
      "wishlist-button",
      "assets",
      meta.file,
    );
    const body = await readFile(filePath, "utf8");
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": meta.type,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return new Response("Asset unavailable", { status: 500 });
  }
};
