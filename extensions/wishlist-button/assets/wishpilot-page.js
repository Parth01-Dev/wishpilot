(function () {
  var PROXY_BASE = "/apps/wish-pilot";

  function qs(root, sel) {
    return root.querySelector(sel);
  }

  function showToast(root, message) {
    var toast = qs(root, "[data-wishpilot-toast]");
    if (!toast) return;
    toast.hidden = false;
    toast.textContent = message;
    setTimeout(function () {
      toast.hidden = true;
    }, 2500);
  }

  function money(value) {
    if (value == null || value === "") return "—";
    var num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return "$" + num.toFixed(2);
  }

  function cardHtml(item) {
    var image = item.productImage
      ? '<img class="wishpilot-card__image" src="' +
        item.productImage +
        '" alt="' +
        (item.productTitle || "") +
        '" />'
      : '<div class="wishpilot-card__image"></div>';

    var handle = item.productHandle || "";
    var url = handle ? "/products/" + handle : "#";

    return (
      '<article class="wishpilot-card" data-id="' +
      item.id +
      '">' +
      '<a href="' +
      url +
      '">' +
      image +
      "</a>" +
      '<div class="wishpilot-card__body">' +
      '<h3 class="wishpilot-card__title"><a href="' +
      url +
      '">' +
      (item.productTitle || "Product") +
      "</a></h3>" +
      '<p class="wishpilot-card__meta">' +
      money(item.price) +
      "</p>" +
      '<p class="wishpilot-card__meta">' +
      (item.vendor || "") +
      "</p>" +
      '<p class="wishpilot-card__meta">Availability: Check product page</p>' +
      '<div class="wishpilot-card__actions">' +
      '<button type="button" data-remove="' +
      item.id +
      '" class="is-danger">Remove</button>' +
      '<button type="button" class="wishpilot-move-cart" data-move-cart="' +
        item.id +
        '" data-variant="' +
        (item.variantId || "") +
        '">Move to Cart</button>' +
      '<button type="button" data-share="' +
      item.id +
      '">Share</button>' +
      "</div></div></article>"
    );
  }

  document.querySelectorAll("[data-wishpilot-page]").forEach(function (root) {
    var state = { page: 1, totalPages: 1, sort: "newest", search: "" };
    var customerId = root.getAttribute("data-customer-id");
    var grid = qs(root, "[data-wishpilot-grid]");
    var pagination = qs(root, "[data-wishpilot-pagination]");
    var pageLabel = qs(root, "[data-wishpilot-page-label]");
    var loading = qs(root, "[data-wishpilot-loading]");

    if (!customerId) {
      if (grid) grid.innerHTML = "";
      return;
    }
    function moveToCart(wishlistId, variantId, button) {
      console.log("Wishlist ID:", wishlistId);
console.log("Variant ID:", variantId);

  if (!variantId) {
    showToast(root, "Product variant not found");
    return;
  }

  if (button.dataset.loading === "true") {
    return;
  }

  button.dataset.loading = "true";
  button.disabled = true;
  button.textContent = "Moving...";

  // Convert Shopify GraphQL GID to numeric variant ID
var numericVariantId = variantId;

if (
  typeof numericVariantId === "string" &&
  numericVariantId.startsWith("gid://")
) {
  numericVariantId = numericVariantId.split("/").pop();
}

console.log("Original Variant ID:", variantId);
console.log("Numeric Variant ID:", numericVariantId);

  fetch("/cart/add.js", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          id: Number(numericVariantId),
          quantity: 1,
        },
      ],
      sections: ["cart-drawer", "cart-icon-bubble"],
      sections_url: window.location.pathname,
    }),
  })
    .then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          throw new Error(data.description || "Unable to add product");
        }
        return data;
      });
    })

    .then(function (cartData) {

  const drawer = document.querySelector("cart-drawer");

  if (drawer) {
    drawer.renderContents(cartData);
  }

  return fetch(PROXY_BASE + "/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          id: Number(wishlistId),
          customerId: customerId,
        }),
      });

    })

    .then(function (res) {
      return res.json();
    })

    .then(function () {

  document.dispatchEvent(
    new CustomEvent("wishpilot:updated")
  );

  // Refresh Dawn cart drawer

  showToast(root, "Product moved to cart");

  load();

})

    .catch(function (error) {

      showToast(root, error.message);

      button.disabled = false;
      button.textContent = "Move to Cart";

    })

    .finally(function () {

      delete button.dataset.loading;

    });

}

function refreshCartDrawer() {

  fetch("/?sections=cart-drawer,cart-icon-bubble")
    .then(function (response) {
      return response.json();
    })
    .then(function (sections) {

      var cartDrawer = document.querySelector("cart-drawer");
      if (cartDrawer && sections["cart-drawer"]) {

        var parser = new DOMParser();

        var drawerDoc = parser.parseFromString(
          sections["cart-drawer"],
          "text/html"
        );

        cartDrawer.innerHTML =
          drawerDoc.querySelector("cart-drawer").innerHTML;
      }

      var bubble = document.getElementById("cart-icon-bubble");

      if (bubble && sections["cart-icon-bubble"]) {

        var parser = new DOMParser();

        var bubbleDoc = parser.parseFromString(
          sections["cart-icon-bubble"],
          "text/html"
        );

        bubble.innerHTML =
          bubbleDoc.getElementById("cart-icon-bubble").innerHTML;
      }

    });

}

    function load() {
      if (loading) loading.hidden = false;
      var params = new URLSearchParams();
      params.set("customerId", customerId);
      params.set("page", String(state.page));
      params.set("sort", state.sort);
      if (state.search) params.set("q", state.search);

      fetch(PROXY_BASE + "?" + params.toString(), {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (loading) loading.hidden = true;
          if (!data.ok) {
            grid.innerHTML =
              '<p class="wishpilot-page__empty">' +
              (data.error || "Unable to load wishlist") +
              "</p>";
            return;
          }

          state.totalPages = data.totalPages || 1;
          state.page = data.page || 1;

          if (!data.items || !data.items.length) {
            grid.innerHTML =
              '<p class="wishpilot-page__empty">Your wishlist is empty.</p>';
            pagination.hidden = true;
            return;
          }

          grid.innerHTML = data.items.map(cardHtml).join("");
          pageLabel.textContent = "Page " + state.page + " of " + state.totalPages;
          pagination.hidden = state.totalPages <= 1;

          grid.querySelectorAll("[data-remove]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              removeItem(btn.getAttribute("data-remove"));
            });
          });

          grid.querySelectorAll("[data-move-cart]").forEach(function (btn) {

            btn.addEventListener("click", function () {

              moveToCart(
                btn.getAttribute("data-move-cart"),
                btn.getAttribute("data-variant"),
                btn
              );

            });

          });

          grid.querySelectorAll("[data-share]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var card = btn.closest(".wishpilot-card");
              var handle = "";

              if (card) {
                var link = card.querySelector(".wishpilot-card__title a");
                if (link) {
                  handle = link.getAttribute("href") || "";
                }
              }

              if (!handle || handle === "#") {
                showToast(root, "Product link not available");
                return;
              }

              var url = handle.indexOf("http") === 0
                ? handle
                : window.location.origin + handle;

              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function () {
                  showToast(root, "Product link copied");
                }).catch(function () {
                  showToast(root, "Product link copied");
                });
              } else {
                showToast(root, "Product link copied");
              }
            });
          });
        })
        .catch(function () {
          if (loading) loading.hidden = true;
          grid.innerHTML =
            '<p class="wishpilot-page__empty">Network error loading wishlist.</p>';
        });
    }

    function removeItem(id) {
      fetch(PROXY_BASE + "/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ id: Number(id), customerId: customerId }),
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          showToast(root, (data && data.toast) || "Wishlist Removed");
          document.dispatchEvent(new CustomEvent("wishpilot:updated"));
          load();
        })
        .catch(function () {
          showToast(root, "Could not remove item");
        });
    }

    var searchInput = qs(root, "[data-wishpilot-search]");
    var sortSelect = qs(root, "[data-wishpilot-sort]");
    var prevBtn = qs(root, "[data-wishpilot-prev]");
    var nextBtn = qs(root, "[data-wishpilot-next]");
    var searchTimer;

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          state.search = searchInput.value.trim();
          state.page = 1;
          load();
        }, 300);
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        state.sort = sortSelect.value;
        state.page = 1;
        load();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (state.page > 1) {
          state.page -= 1;
          load();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (state.page < state.totalPages) {
          state.page += 1;
          load();
        }
      });
    }

    load();
  });
})();
