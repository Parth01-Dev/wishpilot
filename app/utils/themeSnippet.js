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
      aria-pressed="false"
    >
      <span class="wishpilot-add__icon" aria-hidden="true">
        <svg class="wishpilot-heart" width="22" height="22" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" focusable="false">
          <path class="wishpilot-heart__outline" d="M25 39.7l-.6-.5C11.5 28.7 8 25 8 19c0-5 4-9 9-9 4.1 0 6.4 2.3 8 4.1 1.6-1.8 3.9-4.1 8-4.1 5 0 9 4 9 9 0 6-3.5 9.7-16.4 20.2l-.6.5zM17 12c-3.9 0-7 3.1-7 7 0 5.1 3.2 8.5 15 18.1 11.8-9.6 15-13 15-18.1 0-3.9-3.1-7-7-7-3.5 0-5.4 2.1-6.9 3.8L25 17.1l-1.1-1.3C22.4 14.1 20.5 12 17 12z"/>
          <path class="wishpilot-heart__fill" d="M25 39.7l-.6-.5C11.5 28.7 8 25 8 19c0-5 4-9 9-9 4.1 0 6.4 2.3 8 4.1 1.6-1.8 3.9-4.1 8-4.1 5 0 9 4 9 9 0 6-3.5 9.7-16.4 20.2l-.6.5z"/>
        </svg>
      </span>
    </button>
    <p class="wishpilot-add__toast" data-wishpilot-toast hidden></p>
  </div>
{% endif %}`;
