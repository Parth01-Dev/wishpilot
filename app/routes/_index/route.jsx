import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

const FEATURES = [
  {
    icon: "♥",
    title: "Wishlist buttons everywhere",
    description:
      "Add hearts to product pages, collection cards, and custom theme sections.",
  },
  {
    icon: "✦",
    title: "Simple shopper experience",
    description:
      "Customers can save, remove, share, and revisit products from one wishlist page.",
  },
  {
    icon: "⚡",
    title: "Merchant-friendly setup",
    description:
      "Use theme app blocks or copy-paste code snippets with minimal theme editing.",
  },
];

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <main className={styles.shell}>
        <section className={styles.hero}>
          <span className={styles.badge}>Shopify wishlist app</span>
          <h1 className={styles.heading}>
            Wish<span className={styles.headingAccent}>Pilot</span>
          </h1>
          <p className={styles.lead}>
            Help shoppers save favorite products, revisit them later, and turn
            product interest into more returning sales.
          </p>

          {showForm && (
            <Form className={styles.form} method="post" action="/auth/login">
              <div className={styles.formCard}>
                <label className={styles.label}>
                  <span className={styles.labelTitle}>Shop domain</span>
                  <input
                    className={styles.input}
                    type="text"
                    name="shop"
                    placeholder="your-store.myshopify.com"
                    autoComplete="url"
                  />
                  <span className={styles.labelHint}>
                    Enter your .myshopify.com store URL to continue.
                  </span>
                </label>
                <button className={styles.button} type="submit">
                  Open WishPilot
                  <span className={styles.buttonArrow} aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
            </Form>
          )}
        </section>

        <section className={styles.features} aria-label="Features">
          {FEATURES.map((feature) => (
            <article key={feature.title} className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                {feature.icon}
              </span>
              <h2 className={styles.featureTitle}>{feature.title}</h2>
              <p className={styles.featureText}>{feature.description}</p>
            </article>
          ))}
        </section>

        <footer className={styles.footer}>
          Built for Shopify merchants who want wishlists that feel native to
          their storefront.
        </footer>
      </main>
    </div>
  );
}
