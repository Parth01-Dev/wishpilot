/**
 * Liquid merchants paste into card-product.liquid (or equivalent).
 * Requires the WishPilot app embed so CSS/JS load on every page.
 */
export const WISHLIST_CARD_SNIPPET = `{% comment %}
  WishPilot — Add to Wishlist button
  Paste into snippets/card-product.liquid (or your theme's product card).
  Place near the product image or title. Uses "card_product" or "product".
{% endcomment %}
{% assign wp_product = product %}
{% if card_product %}
  {% assign wp_product = card_product %}
{% endif %}
{% if wp_product %}
  <div
    class="wishpilot-add wishpilot-add--card"
    data-wishpilot-add
    data-product-id="{{ wp_product.id }}"
    data-variant-id="{{ wp_product.selected_or_first_available_variant.id }}"
    data-product-title="{{ wp_product.title | escape }}"
    data-product-handle="{{ wp_product.handle }}"
    data-product-image="{{ wp_product.featured_image | image_url: width: 200 }}"
    data-vendor="{{ wp_product.vendor | escape }}"
    data-price="{{ wp_product.selected_or_first_available_variant.price | money_without_currency }}"
    data-customer-id="{% if customer %}{{ customer.id }}{% endif %}"
    data-customer-email="{% if customer %}{{ customer.email }}{% endif %}"
  >
    <button
      type="button"
      class="wishpilot-add__button"
      data-wishpilot-add-btn
      aria-label="Add to wishlist"
    >
      <span class="wishpilot-add__icon" aria-hidden="true">❤️</span>
    </button>
    <p class="wishpilot-add__toast" data-wishpilot-toast hidden></p>
  </div>
{% endif %}`;

