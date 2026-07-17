/**
 * Swish-style setup checklist for WishPilot admin.
 */
import admin from "../styles/admin.module.css";

const STEPS = [
  {
    id: "enable",
    title: "Enable wishlist",
    description: "Turn on wishlist in Settings so shoppers can save products.",
    href: "/app/settings",
    action: "Open Settings",
  },
  {
    id: "product",
    title: "Add product page button",
    description: "Place the Add to Wishlist block on your product template.",
    href: "/app/settings",
    action: "Theme setup",
  },
  {
    id: "collection",
    title: "Enable collection hearts",
    description: "Turn on the WishPilot app embed and paste the card snippet.",
    href: "/app/settings",
    action: "Copy snippet",
  },
  {
    id: "page",
    title: "Create wishlist page",
    description: "Add the Wishlist Page section to a storefront page.",
    href: "/app/settings",
    action: "View guide",
  },
];

export function SetupChecklist({
  enableWishlist = false,
  hasActivity = false,
}) {
  const completed = {
    enable: enableWishlist,
    product: enableWishlist,
    collection: enableWishlist,
    page: hasActivity || enableWishlist,
  };

  const doneCount = Object.values(completed).filter(Boolean).length;

  return (
    <div className={admin.card}>
      <div className={admin.cardHead}>
        <div>
          <h3 className={admin.cardTitle}>Get started</h3>
          <p className={admin.cardHint}>
            {doneCount} of {STEPS.length} steps complete
          </p>
        </div>
        <s-badge tone={doneCount === STEPS.length ? "success" : "attention"}>
          {doneCount === STEPS.length ? "Ready" : "Setup"}
        </s-badge>
      </div>
      <div className={admin.cardBody}>
        <div className={admin.setupList}>
          {STEPS.map((step, index) => {
            const isDone = completed[step.id];
            return (
              <div key={step.id} className={admin.setupStep}>
                <span
                  className={`${admin.stepNum}${isDone ? ` ${admin.stepDone}` : ""}`}
                >
                  {isDone ? "✓" : index + 1}
                </span>
                <div>
                  <p className={admin.stepTitle}>{step.title}</p>
                  <p className={admin.stepDesc}>{step.description}</p>
                </div>
                <s-button href={step.href} variant="tertiary">
                  {step.action}
                </s-button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
