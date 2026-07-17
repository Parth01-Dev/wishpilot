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
import admin from "../styles/admin.module.css";

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
  const enabledCount = [
    current.enableWishlist,
    current.showHeartIcon,
    current.allowGuestWishlist,
    current.showWishlistCount,
  ].filter(Boolean).length;

  return (
    <s-page heading="Settings" inlineSize="small">
      <s-button
        slot="primary-action"
        type="submit"
        form="wishpilot-settings-form"
        variant="primary"
        {...(isSaving ? { loading: true } : {})}
      >
        Save settings
      </s-button>

      <Form
        id="wishpilot-settings-form"
        method="post"
        data-save-bar
      >
        <div className={admin.pageIntro} style={{ marginBottom: "0.75rem" }}>
          <p className={admin.pageEyebrow}>Configuration</p>
          <h2 className={admin.pageTitle}>Wishlist settings</h2>
          <p className={admin.pageSubtitle}>
            Control storefront behavior, brand styling, and theme installation.
          </p>
        </div>

        <s-banner
          heading={
            current.enableWishlist
              ? "Wishlist is live"
              : "Wishlist is currently disabled"
          }
          tone={current.enableWishlist ? "success" : "warning"}
        >
          {current.enableWishlist
            ? "Shoppers can save products from your storefront. Tune appearance and theme setup below."
            : "Enable wishlist below to start collecting saved products from customers."}
        </s-banner>

        <s-section heading="Wishlist controls">
          <s-paragraph>
            Choose what shoppers and merchants experience across the storefront
            and admin.
          </s-paragraph>

          <s-stack gap="base">
            <SettingToggle
              title="Enable Wishlist"
              description="Turn wishlist features on across your storefront."
              name="enableWishlist"
              checked={current.enableWishlist}
              badge={current.enableWishlist ? "Active" : "Off"}
              badgeTone={current.enableWishlist ? "success" : "attention"}
            />
            <SettingToggle
              title="Show Heart Icon"
              description="Display the heart icon on wishlist buttons and product cards."
              name="showHeartIcon"
              checked={current.showHeartIcon}
            />
            <SettingToggle
              title="Allow Guest Wishlist"
              description="Let shoppers save products without signing in."
              name="allowGuestWishlist"
              checked={current.allowGuestWishlist}
            />
            <SettingToggle
              title="Show Wishlist Count"
              description="Show the number of saved items on the header wishlist icon."
              name="showWishlistCount"
              checked={current.showWishlistCount}
            />
          </s-stack>
        </s-section>

        <s-section heading="Appearance">
          <s-paragraph>
            Match WishPilot to your brand. The primary color fills the heart
            when a product is saved.
          </s-paragraph>

          <s-stack gap="large">
            <div className={admin.settingsCard}>
              <s-stack gap="base">
                <s-heading>Button style</s-heading>
                <s-choice-list label="Wishlist Button Style" name="buttonStyle">
                  <s-choice
                    value="heart"
                    {...(current.buttonStyle === "heart"
                      ? { selected: true }
                      : {})}
                  >
                    Heart icon only
                  </s-choice>
                  <s-choice
                    value="button"
                    {...(current.buttonStyle === "button"
                      ? { selected: true }
                      : {})}
                  >
                    Text button
                  </s-choice>
                  <s-choice
                    value="icon_text"
                    {...(current.buttonStyle === "icon_text"
                      ? { selected: true }
                      : {})}
                  >
                    Heart + text
                  </s-choice>
                </s-choice-list>
              </s-stack>
            </div>

            <div className={admin.settingsCard}>
              <s-stack gap="base">
                <s-heading>Brand color</s-heading>
                <s-paragraph>
                  Used for filled hearts and active wishlist states on the
                  storefront.
                </s-paragraph>
                <s-color-field
                  label="Primary Color"
                  name="primaryColor"
                  value={current.primaryColor}
                />
              </s-stack>
            </div>

            <div className={admin.settingsCard}>
              <s-stack gap="base">
                <s-heading>Button position</s-heading>
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
              </s-stack>
            </div>
          </s-stack>
        </s-section>

        <s-section heading="Theme setup">
          <s-paragraph>
            Add WishPilot blocks in the theme editor for product pages, header
            icon, and wishlist page.
          </s-paragraph>

          <div className={admin.settingsCard}>
            <s-unordered-list>
              <s-list-item>
                Add <s-text type="strong">Add to Wishlist</s-text> on the
                product template
              </s-list-item>
              <s-list-item>
                Add <s-text type="strong">Wishlist Icon</s-text> to the header
              </s-list-item>
              <s-list-item>
                Create a page and add the{" "}
                <s-text type="strong">Wishlist Page</s-text> section
              </s-list-item>
              <s-list-item>
                Enable the <s-text type="strong">WishPilot</s-text> app embed
                for collection cards
              </s-list-item>
            </s-unordered-list>
          </div>
        </s-section>
      </Form>

      <ThemeSnippetSection />

      <s-section heading="Setup status" slot="aside">
        <s-stack gap="base">
          <s-box
            padding="base"
            border="base"
            borderRadius="base"
            background="subdued"
          >
            <s-stack gap="small">
              <s-heading>Wishlist status</s-heading>
              <s-badge tone={current.enableWishlist ? "success" : "attention"}>
                {current.enableWishlist ? "Enabled" : "Disabled"}
              </s-badge>
              <s-text>
                {enabledCount} of 4 options turned on
              </s-text>
              <s-text>
                Style:{" "}
                {current.buttonStyle === "heart"
                  ? "Heart icon"
                  : current.buttonStyle === "button"
                    ? "Text button"
                    : "Heart + text"}
              </s-text>
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-text>Color</s-text>
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    background: current.primaryColor || "#000",
                    border: "1px solid rgba(0,0,0,0.15)",
                  }}
                />
                <s-text>{current.primaryColor || "#000000"}</s-text>
              </s-stack>
            </s-stack>
          </s-box>

          <s-box padding="base" border="base" borderRadius="base">
            <s-stack gap="small">
              <s-heading>Quick links</s-heading>
              <s-link href="/app">Dashboard</s-link>
              <s-link href="/app/wishlist">Wishlist</s-link>
              <s-link href="/app/analytics">Analytics</s-link>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Coming soon" slot="aside">
        <s-paragraph>
          Premium features already scaffolded for upcoming WishPilot releases.
        </s-paragraph>
        <s-stack gap="small">
          {futureFeatures.slice(0, 5).map((feature) => (
            <s-box
              key={feature.id}
              padding="small"
              border="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack gap="small-100">
                <s-text type="strong">{feature.title}</s-text>
                <s-text>{feature.description}</s-text>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>
    </s-page>
  );
}

function SettingToggle({
  title,
  description,
  name,
  checked,
  badge,
  badgeTone,
}) {
  return (
    <div className={admin.settingsCard}>
      <s-stack
        direction="inline"
        gap="base"
        alignItems="start"
        justifyContent="space-between"
      >
        <s-stack gap="small">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-heading>{title}</s-heading>
            {badge ? (
              <s-badge tone={badgeTone || "info"}>{badge}</s-badge>
            ) : null}
          </s-stack>
          <s-paragraph>{description}</s-paragraph>
        </s-stack>
        <s-checkbox
          label={title}
          name={name}
          labelAccessibilityVisibility="exclusive"
          {...(checked ? { checked: true } : {})}
        />
      </s-stack>
    </div>
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
    <s-section heading="Collection card button">
      <s-stack gap="base">
        <s-paragraph>
          Paste this snippet into your product card Liquid to show a wishlist
          heart on collection, search, and homepage grids.
        </s-paragraph>

        <div className={admin.settingsCard}>
          <s-stack gap="small">
            <s-heading>Install steps</s-heading>
            <s-unordered-list>
              <s-list-item>
                Themes → Customize → <s-text type="strong">App embeds</s-text> →
                enable <s-text type="strong">WishPilot</s-text>
              </s-list-item>
              <s-list-item>
                Themes → <s-text type="strong">Edit code</s-text>
              </s-list-item>
              <s-list-item>
                Open{" "}
                <s-text type="strong">snippets/card-product.liquid</s-text> (or
                your product card file)
              </s-list-item>
              <s-list-item>
                Paste near the product image or title, then Save
              </s-list-item>
            </s-unordered-list>
          </s-stack>
        </div>

        <s-stack direction="inline" gap="base">
          <s-button variant="primary" onClick={copySnippet}>
            {copied ? "Copied" : "Copy Liquid code"}
          </s-button>
        </s-stack>

        <pre className={admin.codeBlock}>{WISHLIST_CARD_SNIPPET}</pre>
      </s-stack>
    </s-section>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
