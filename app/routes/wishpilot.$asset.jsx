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
 * Public storefront assets (no auth).
 * Loaded by the collection card Liquid snippet and/or app embed.
 *
 * Direct:   /wishpilot/add.js
 *           /wishpilot/add.css
 * App proxy (also works): /apps/wish-pilot/sf/add.js → see api.wishlist.sf.$asset
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
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Asset unavailable", { status: 500 });
  }
};
