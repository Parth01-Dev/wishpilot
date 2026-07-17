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

const THEME_STEPS = [
  {
    title: "Enable the WishPilot app embed",
    description:
      "Online Store → Themes → Customize → App embeds → turn on WishPilot.",
  },
  {
    title: "Add the product page button",
    description:
      "On the product template, add the Add to Wishlist app block near the buy button.",
  },
  {
    title: "Add the header wishlist icon",
    description:
      "In the header section, add the Wishlist Icon block so shoppers can open their list.",
  },
  {
    title: "Create a wishlist page",
    description:
      "Add a page with the Wishlist Page section, then link it from your navigation.",
  },
];

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

function buttonStyleLabel(style) {
  if (style === "heart") return "Heart icon";
  if (style === "button") return "Text button";
  return "Heart + text";
}

function buttonPositionLabel(position) {
  if (position === "product_form") return "Near product form";
  if (position === "below_price") return "Below price";
  return "Custom (theme editor)";
}

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
    <s-page heading="Settings">
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
              Manage wishlist behaviour, button styling, and theme setup from one
              place.
            </p>
          </div>
        </div>

        <Form
          id="wishpilot-settings-form"
          method="post"
          data-save-bar
          className={admin.settingsForm}
        >
          <s-banner
            heading={
              current.enableWishlist
                ? "Wishlist is live on your storefront"
                : "Wishlist is currently disabled"
            }
            tone={current.enableWishlist ? "success" : "warning"}
          >
            {current.enableWishlist
              ? "Shoppers can save products. Update controls and appearance below."
              : "Enable wishlist below to start collecting product demand."}
          </s-banner>

          <div className={admin.card}>
            <div className={admin.cardHead}>
              <div>
                <h3 className={admin.cardTitle}>General</h3>
                <p className={admin.cardHint}>
                  Core wishlist behaviour for your store
                </p>
              </div>
            </div>
            <div className={admin.cardBody}>
              <div className={admin.settingsToggleList}>
                <SettingToggle
                  title="Enable wishlist"
                  description="Turn wishlist on across your storefront."
                  name="enableWishlist"
                  checked={current.enableWishlist}
                  badge={current.enableWishlist ? "Active" : "Off"}
                  badgeTone={current.enableWishlist ? "success" : "attention"}
                />
                <SettingToggle
                  title="Show heart icon"
                  description="Display the heart on wishlist buttons and product cards."
                  name="showHeartIcon"
                  checked={current.showHeartIcon}
                />
                <SettingToggle
                  title="Allow guest wishlist"
                  description="Let shoppers save products without signing in."
                  name="allowGuestWishlist"
                  checked={current.allowGuestWishlist}
                />
                <SettingToggle
                  title="Show wishlist count"
                  description="Display saved-item count on the header wishlist icon."
                  name="showWishlistCount"
                  checked={current.showWishlistCount}
                />
              </div>
            </div>
          </div>

          <div className={admin.card}>
            <div className={admin.cardHead}>
              <div>
                <h3 className={admin.cardTitle}>Appearance</h3>
                <p className={admin.cardHint}>
                  Button style, brand color, and placement
                </p>
              </div>
            </div>
            <div className={admin.cardBody}>
              <div className={admin.settingsAppearanceGrid}>
                <div className={admin.settingsField}>
                  <p className={admin.settingsFieldTitle}>Button style</p>
                  <p className={admin.settingsFieldHint}>
                    How the wishlist control appears on product pages.
                  </p>
                  <s-choice-list
                    label="Wishlist button style"
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
                </div>

                <div className={admin.settingsField}>
                  <p className={admin.settingsFieldTitle}>Brand color</p>
                  <p className={admin.settingsFieldHint}>
                    Used for filled hearts and active wishlist states.
                  </p>
                  <s-color-field
                    label="Primary color"
                    name="primaryColor"
                    value={current.primaryColor}
                  />
                </div>

                <div
                  className={admin.settingsField}
                  style={{ gridColumn: "1 / -1" }}
                >
                  <p className={admin.settingsFieldTitle}>Button position</p>
                  <p className={admin.settingsFieldHint}>
                    Where the wishlist button sits on the product page.
                  </p>
                  <s-choice-list label="Button position" name="buttonPosition">
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
                </div>
              </div>
            </div>
          </div>

          <div className={admin.card}>
            <div className={admin.cardHead}>
              <div>
                <h3 className={admin.cardTitle}>Storefront setup</h3>
                <p className={admin.cardHint}>
                  Add WishPilot blocks and embeds in your theme
                </p>
              </div>
            </div>
            <div className={admin.cardBody}>
              <div className={admin.settingsSteps}>
                {THEME_STEPS.map((step, index) => (
                  <div key={step.title} className={admin.settingsStep}>
                    <span className={admin.settingsStepNum}>{index + 1}</span>
                    <div>
                      <p className={admin.settingsStepTitle}>{step.title}</p>
                      <p className={admin.settingsStepDesc}>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Form>

        <ThemeSnippetSection />
      </div>

      <s-section heading="Summary" slot="aside">
        <div className={admin.settingsAsideCard}>
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-heading>Live status</s-heading>
            <s-badge tone={current.enableWishlist ? "success" : "attention"}>
              {current.enableWishlist ? "Enabled" : "Disabled"}
            </s-badge>
          </s-stack>

          <div className={admin.settingsPreviewRow}>
            <p className={admin.settingsPreviewLabel}>Button style</p>
            <p className={admin.settingsPreviewValue}>
              {buttonStyleLabel(current.buttonStyle)}
            </p>
          </div>

          <div className={admin.settingsPreviewRow}>
            <p className={admin.settingsPreviewLabel}>Position</p>
            <p className={admin.settingsPreviewValue}>
              {buttonPositionLabel(current.buttonPosition)}
            </p>
          </div>

          <div className={admin.settingsPreviewRow}>
            <p className={admin.settingsPreviewLabel}>Brand color</p>
            <s-stack direction="inline" gap="small" alignItems="center">
              <span
                className={admin.colorSwatch}
                style={{ background: current.primaryColor || "#000" }}
                aria-hidden="true"
              />
              <p className={admin.settingsPreviewValue}>
                {current.primaryColor || "#000000"}
              </p>
            </s-stack>
          </div>

          <div className={admin.settingsPreviewRow}>
            <p className={admin.settingsPreviewLabel}>Guest wishlist</p>
            <p className={admin.settingsPreviewValue}>
              {current.allowGuestWishlist ? "Allowed" : "Off"}
            </p>
          </div>
        </div>
      </s-section>

      <s-section heading="Coming soon" slot="aside">
        <div className={admin.comingSoonList}>
          {futureFeatures.slice(0, 4).map((feature) => (
            <div key={feature.id} className={admin.comingSoonItem}>
              <p className={admin.comingSoonTitle}>{feature.title}</p>
              <p className={admin.comingSoonDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
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
    <div className={admin.settingsToggle}>
      <div className={admin.settingsToggleCopy}>
        <div className={admin.settingsToggleHead}>
          <p className={admin.settingsToggleTitle}>{title}</p>
          {badge ? (
            <s-badge tone={badgeTone || "info"}>{badge}</s-badge>
          ) : null}
        </div>
        <p className={admin.settingsToggleDesc}>{description}</p>
      </div>
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
    <div className={admin.card}>
      <div className={admin.cardHead}>
        <div>
          <h3 className={admin.cardTitle}>Collection card button</h3>
          <p className={admin.cardHint}>
            Paste into product card Liquid for collection and search grids
          </p>
        </div>
        <s-button variant="primary" onClick={copySnippet}>
          {copied ? "Copied" : "Copy code"}
        </s-button>
      </div>
      <div className={admin.cardBody}>
        <div className={admin.settingsSteps}>
          <div className={admin.settingsStep}>
            <span className={admin.settingsStepNum}>1</span>
            <div>
              <p className={admin.settingsStepTitle}>Enable the app embed</p>
              <p className={admin.settingsStepDesc}>
                Themes → Customize → App embeds → turn on WishPilot.
              </p>
            </div>
          </div>
          <div className={admin.settingsStep}>
            <span className={admin.settingsStepNum}>2</span>
            <div>
              <p className={admin.settingsStepTitle}>Edit product card snippet</p>
              <p className={admin.settingsStepDesc}>
                Themes → Edit code → open snippets/card-product.liquid and paste
                near the product image.
              </p>
            </div>
          </div>
        </div>
        <pre className={admin.code}>{WISHLIST_CARD_SNIPPET}</pre>
      </div>
    </div>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
