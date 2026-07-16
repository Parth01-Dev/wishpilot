import { useCallback, useEffect, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getShopSettings,
  updateShopSettings,
} from "../services/wishlist.server";
import { FUTURE_FEATURES } from "../utils/futureFeatures";
import { WISHLIST_CARD_SNIPPET } from "../utils/themeSnippet";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);
  return { settings, futureFeatures: FUTURE_FEATURES };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  const settings = await updateShopSettings(session.shop, {
    enableWishlist: form.get("enableWishlist") === "on",
    showHeartIcon: form.get("showHeartIcon") === "on",
    allowGuestWishlist: form.get("allowGuestWishlist") === "on",
    showWishlistCount: form.get("showWishlistCount") === "on",
    buttonStyle: String(form.get("buttonStyle") || "heart"),
    primaryColor: String(form.get("primaryColor") || "#000000"),
    buttonPosition: String(form.get("buttonPosition") || "product_form"),
  });

  return { ok: true, settings, toast: "Settings Saved" };
};

export default function SettingsPage() {
  const { settings, futureFeatures } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  const isSaving =
    navigation.state !== "idle" && navigation.formMethod === "POST";

  useEffect(() => {
    if (actionData?.ok) {
      shopify.toast.show(actionData.toast || "Settings Saved");
    }
  }, [actionData, shopify]);

  const current = actionData?.settings || settings;

  return (
    <s-page heading="Settings" inlineSize="small">
      <Form method="post" data-save-bar>
        <s-section heading="Wishlist">
          <s-stack gap="base">
            <s-checkbox
              label="Enable Wishlist"
              name="enableWishlist"
              {...(current.enableWishlist ? { checked: true } : {})}
            />
            <s-checkbox
              label="Show Heart Icon"
              name="showHeartIcon"
              {...(current.showHeartIcon ? { checked: true } : {})}
            />
            <s-checkbox
              label="Allow Guest Wishlist"
              name="allowGuestWishlist"
              {...(current.allowGuestWishlist ? { checked: true } : {})}
            />
            <s-checkbox
              label="Show Wishlist Count"
              name="showWishlistCount"
              {...(current.showWishlistCount ? { checked: true } : {})}
            />
          </s-stack>
        </s-section>

        <s-section heading="Appearance">
          <s-choice-list label="Wishlist Button Style" name="buttonStyle">
            <s-choice
              value="heart"
              {...(current.buttonStyle === "heart" ? { selected: true } : {})}
            >
              Heart icon
            </s-choice>
            <s-choice
              value="button"
              {...(current.buttonStyle === "button" ? { selected: true } : {})}
            >
              Text button
            </s-choice>
            <s-choice
              value="icon_text"
              {...(current.buttonStyle === "icon_text"
                ? { selected: true }
                : {})}
            >
              Icon + text
            </s-choice>
          </s-choice-list>

          <s-color-field
            label="Primary Color"
            name="primaryColor"
            value={current.primaryColor}
          />

          <s-choice-list label="Button Position" name="buttonPosition">
            <s-choice
              value="product_form"
              {...(current.buttonPosition === "product_form"
                ? { selected: true }
                : {})}
            >
              Near product form
            </s-choice>
            <s-choice
              value="below_price"
              {...(current.buttonPosition === "below_price"
                ? { selected: true }
                : {})}
            >
              Below price
            </s-choice>
            <s-choice
              value="custom"
              {...(current.buttonPosition === "custom"
                ? { selected: true }
                : {})}
            >
              Custom (theme editor)
            </s-choice>
          </s-choice-list>
        </s-section>

        <s-section heading="Theme app extension">
          <s-paragraph>
            Add the <s-text type="strong">Add to Wishlist</s-text> block to your
            product template in the theme editor. Also add the header wishlist
            icon and wishlist page section.
          </s-paragraph>
        </s-section>

        <s-stack direction="inline" gap="base">
          <s-button type="submit" variant="primary" {...(isSaving ? { loading: true } : {})}>
            Save settings
          </s-button>
        </s-stack>
      </Form>

      <ThemeSnippetSection />

      <s-section heading="Coming soon" slot="aside">
        <s-paragraph>
          Architecture is ready for these future WishPilot features:
        </s-paragraph>
        <s-unordered-list>
          {futureFeatures.map((feature) => (
            <s-list-item key={feature.id}>
              <s-text type="strong">{feature.title}</s-text> —{" "}
              {feature.description}
            </s-list-item>
          ))}
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

function ThemeSnippetSection() {
  const shopify = useAppBridge();
  const [copied, setCopied] = useState(false);

  const copySnippet = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(WISHLIST_CARD_SNIPPET);
      setCopied(true);
      shopify.toast.show("Snippet copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      shopify.toast.show("Could not copy — select and copy manually");
    }
  }, [shopify]);

  return (
    <s-section heading="Collection / product card button">
      <s-stack gap="base">
        <s-paragraph>
          Use this when you want a wishlist heart on every product card
          (collection, search, homepage). Customers click it to add that
          product to their wishlist.
        </s-paragraph>

        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background="subdued"
        >
          <s-unordered-list>
            <s-list-item>
              1. Online Store → Themes → Customize →{" "}
              <s-text type="strong">App embeds</s-text> → enable{" "}
              <s-text type="strong">WishPilot</s-text> → Save
            </s-list-item>
            <s-list-item>
              2. Online Store → Themes →{" "}
              <s-text type="strong">Edit code</s-text>
            </s-list-item>
            <s-list-item>
              3. Open <s-text type="strong">snippets/card-product.liquid</s-text>{" "}
              (Dawn) or your theme&apos;s product card file
            </s-list-item>
            <s-list-item>
              4. Paste the snippet near the product image or title, then Save
            </s-list-item>
          </s-unordered-list>
        </s-box>

        <s-stack direction="inline" gap="base">
          <s-button variant="primary" onClick={copySnippet}>
            {copied ? "Copied" : "Copy Liquid code"}
          </s-button>
        </s-stack>

        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background="subdued"
        >
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "12px",
              lineHeight: 1.45,
              maxHeight: "320px",
              overflow: "auto",
            }}
          >
            {WISHLIST_CARD_SNIPPET}
          </pre>
        </s-box>
      </s-stack>
    </s-section>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
