import path from "node:path";
import { readFile } from "node:fs/promises";

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
 * App-proxy storefront assets (public — no Shopify auth required).
 * Script/link tags on the shop hit /apps/wish-pilot/sf/* and are proxied here.
 *
 * Previously returned 401 from authenticate.public.appProxy, which blocked
 * window.WishPilot from ever loading on collection pages.
 */
export const loader = async ({ params }) => {
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
        "Cache-Control": "public, max-age=60, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Asset unavailable", { status: 500 });
  }
};
