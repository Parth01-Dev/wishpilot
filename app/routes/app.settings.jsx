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
import { SetupChecklist } from "../components/SetupChecklist";
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

      <div className={admin.shell}>
        <div className={admin.pageMeta}>
          <div className={admin.pageMetaCopy}>
            <p className={admin.kicker}>Configuration</p>
            <h2 className={admin.title}>Wishlist settings</h2>
            <p className={admin.subtitle}>
              Control behaviour and appearance so WishPilot feels native to your
              storefront.
            </p>
          </div>
        </div>

        <SetupChecklist enableWishlist={current.enableWishlist} />

        <Form id="wishpilot-settings-form" method="post" data-save-bar>
          <s-banner
            heading={
              current.enableWishlist
                ? "Wishlist is live"
                : "Wishlist is currently disabled"
            }
            tone={current.enableWishlist ? "success" : "warning"}
          >
            {current.enableWishlist
              ? "Shoppers can save products. Adjust controls and appearance below."
              : "Enable wishlist to start collecting product demand from shoppers."}
          </s-banner>

          <s-section heading="Wishlist controls">
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
                description="Show saved-item count on the header wishlist icon."
                name="showWishlistCount"
                checked={current.showWishlistCount}
              />
            </s-stack>
          </s-section>

          <s-section heading="Appearance">
            <s-stack gap="base">
              <div className={admin.settingsBlock}>
                <s-stack gap="base">
                  <s-heading>Button style</s-heading>
                  <s-choice-list
                    label="Wishlist Button Style"
                    name="buttonStyle"
                  >
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

              <div className={admin.settingsBlock}>
                <s-stack gap="base">
                  <s-heading>Brand color</s-heading>
                  <s-paragraph>
                    Used for filled hearts and active wishlist states.
                  </s-paragraph>
                  <s-color-field
                    label="Primary Color"
                    name="primaryColor"
                    value={current.primaryColor}
                  />
                </s-stack>
              </div>

              <div className={admin.settingsBlock}>
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
            <div className={admin.settingsBlock}>
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
      </div>

      <s-section heading="Status" slot="aside">
        <div className={admin.settingsBlock}>
          <s-stack gap="small">
            <s-heading>Wishlist status</s-heading>
            <s-badge tone={current.enableWishlist ? "success" : "attention"}>
              {current.enableWishlist ? "Enabled" : "Disabled"}
            </s-badge>
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
        </div>
      </s-section>

      <s-section heading="Coming soon" slot="aside">
        <s-stack gap="small">
          {futureFeatures.slice(0, 4).map((feature) => (
            <div key={feature.id} className={admin.settingsBlock}>
              <s-stack gap="small-100">
                <s-text type="strong">{feature.title}</s-text>
                <s-text>{feature.description}</s-text>
              </s-stack>
            </div>
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
    <div className={admin.settingsRow}>
      <s-stack gap="small">
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-heading>{title}</s-heading>
          {badge ? <s-badge tone={badgeTone || "info"}>{badge}</s-badge> : null}
        </s-stack>
        <s-paragraph>{description}</s-paragraph>
      </s-stack>
      <s-checkbox
        label={title}
        name={name}
        labelAccessibilityVisibility="exclusive"
        {...(checked ? { checked: true } : {})}
      />
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
          Paste this snippet into your product card Liquid for collection and
          search grids.
        </s-paragraph>

        <div className={admin.settingsBlock}>
          <s-unordered-list>
            <s-list-item>
              Themes → Customize → App embeds → enable WishPilot
            </s-list-item>
            <s-list-item>Themes → Edit code</s-list-item>
            <s-list-item>
              Open snippets/card-product.liquid and paste near the image
            </s-list-item>
          </s-unordered-list>
        </div>

        <s-button variant="primary" onClick={copySnippet}>
          {copied ? "Copied" : "Copy Liquid code"}
        </s-button>

        <pre className={admin.code}>{WISHLIST_CARD_SNIPPET}</pre>
      </s-stack>
    </s-section>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
