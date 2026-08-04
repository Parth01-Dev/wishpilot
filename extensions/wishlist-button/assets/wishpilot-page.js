(function () {
  var PROXY_BASE = "/apps/wish-pilot";
  var GUEST_KEY = "wishpilot_guest_id";
  var memoryGuestId = null;

  function qs(root, sel) {
    return root.querySelector(sel);
  }

  function readCookie(name) {
    try {
      var match = document.cookie.match(
        new RegExp(
          "(?:^|; )" + name.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&") + "=([^;]*)",
        ),
      );
      return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
      return null;
    }
  }

  function writeCookie(name, value) {
    try {
      document.cookie =
        name +
        "=" +
        encodeURIComponent(value) +
        "; path=/; max-age=31536000; SameSite=Lax";
    } catch (e) {
      /* ignore */
    }
  }

  function createGuestId() {
    return (
      "guest_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  function peekGuestId() {
    try {
      var fromLs = localStorage.getItem(GUEST_KEY);
      if (fromLs) return fromLs;
    } catch (e) {
      /* ignore */
    }
    try {
      var fromSs = sessionStorage.getItem(GUEST_KEY);
      if (fromSs) return fromSs;
    } catch (e) {
      /* ignore */
    }
    var fromCookie = readCookie(GUEST_KEY);
    if (fromCookie) return fromCookie;
    return memoryGuestId;
  }

  function persistGuestId(id) {
    if (!id) return;
    memoryGuestId = id;
    try {
      localStorage.setItem(GUEST_KEY, id);
    } catch (e) {
      /* ignore */
    }
    try {
      sessionStorage.setItem(GUEST_KEY, id);
    } catch (e) {
      /* ignore */
    }
    writeCookie(GUEST_KEY, id);
  }

  function getGuestId() {
    var existing = peekGuestId();
    if (existing) {
      persistGuestId(existing);
      return existing;
    }
    var id = createGuestId();
    persistGuestId(id);
    return id;
  }

  function clearGuestId() {
    memoryGuestId = null;
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch (e) {
      /* ignore */
    }
    try {
      sessionStorage.removeItem(GUEST_KEY);
    } catch (e) {
      /* ignore */
    }
    try {
      document.cookie = GUEST_KEY + "=; path=/; max-age=0; SameSite=Lax";
    } catch (e) {
      /* ignore */
    }
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
    var customerId = root.getAttribute("data-customer-id") || "";
    var customerEmail = root.getAttribute("data-customer-email") || "";
    var guestId = "";
    var grid = qs(root, "[data-wishpilot-grid]");
    var pagination = qs(root, "[data-wishpilot-pagination]");
    var pageLabel = qs(root, "[data-wishpilot-page-label]");
    var loading = qs(root, "[data-wishpilot-loading]");
    var loginPrompt = qs(root, "[data-wishpilot-login-prompt]");
    var toolbar = qs(root, ".wishpilot-page__toolbar");

    function showLoginRequired() {
      if (loginPrompt) loginPrompt.hidden = false;
      if (toolbar) toolbar.hidden = true;
      if (pagination) pagination.hidden = true;
      if (loading) loading.hidden = true;
      if (grid) {
        grid.innerHTML =
          '<p class="wishpilot-page__empty">Sign in to view and manage your wishlist.</p>';
      }
    }

    function mergeGuestWishlist() {
      if (!customerId) return Promise.resolve();
      var existingGuestId = peekGuestId();
      if (!existingGuestId) return Promise.resolve();

      return fetch(PROXY_BASE + "/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          customerId: customerId,
          guestId: existingGuestId,
          customerEmail: customerEmail || "",
        }),
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (data && data.ok) {
            clearGuestId();
            guestId = "";
            try {
              // Force hearts/count to rehydrate from the customer list next
              localStorage.removeItem("wishpilot_wishlist_ids");
            } catch (e) {
              /* ignore */
            }
            if (data.merged > 0) {
              showToast(
                root,
                data.toast || "Wishlist items merged into your account",
              );
            }
          }
        })
        .catch(function () {
          /* keep guest id; list still loads customer items */
        });
    }

    function moveToCart(wishlistId, variantId, button) {
      if (!variantId) {
        showToast(root, "Product variant not found");
        return;
      }
      if (button.dataset.loading === "true") return;

      button.dataset.loading = "true";
      button.disabled = true;
      button.textContent = "Moving...";

      var numericVariantId = variantId;
      if (
        typeof numericVariantId === "string" &&
        numericVariantId.startsWith("gid://")
      ) {
        numericVariantId = numericVariantId.split("/").pop();
      }

      fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(numericVariantId),
          quantity: 1,
        }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          button.dataset.loading = "false";
          button.disabled = false;
          button.textContent = "Move to Cart";
          if (!result.ok) {
            showToast(
              root,
              (result.data && result.data.description) || "Could not add to cart",
            );
            return;
          }
          showToast(root, "Added to cart");
          document.dispatchEvent(new CustomEvent("wishpilot:updated"));
        })
        .catch(function () {
          button.dataset.loading = "false";
          button.disabled = false;
          button.textContent = "Move to Cart";
          showToast(root, "Could not add to cart");
        });
    }

    function load() {
      if (!customerId && !guestId) {
        if (grid) {
          grid.innerHTML =
            '<p class="wishpilot-page__empty">Sign in to view your wishlist.</p>';
        }
        if (pagination) pagination.hidden = true;
        return;
      }

      if (loading) loading.hidden = false;
      var params = new URLSearchParams();
      if (customerId) params.set("customerId", customerId);
      else params.set("guestId", guestId);
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
          if (pageLabel) {
            pageLabel.textContent =
              "Page " + state.page + " of " + state.totalPages;
          }
          if (pagination) pagination.hidden = state.totalPages <= 1;

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
                btn,
              );
            });
          });

          grid.querySelectorAll("[data-share]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var card = btn.closest(".wishpilot-card");
              var handle = "";
              if (card) {
                var link = card.querySelector(".wishpilot-card__title a");
                if (link) handle = link.getAttribute("href") || "";
              }
              if (!handle || handle === "#") {
                showToast(root, "Product link not available");
                return;
              }
              var shareUrl =
                handle.indexOf("http") === 0
                  ? handle
                  : window.location.origin + handle;
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareUrl).then(
                  function () {
                    showToast(root, "Product link copied");
                  },
                  function () {
                    showToast(root, "Product link copied");
                  },
                );
              } else {
                showToast(root, "Product link copied");
              }
            });
          });
        })
        .catch(function () {
          if (loading) loading.hidden = true;
          if (grid) {
            grid.innerHTML =
              '<p class="wishpilot-page__empty">Network error loading wishlist.</p>';
          }
        });
    }

    function removeItem(id) {
      var body = { id: Number(id) };
      if (customerId) body.customerId = customerId;
      if (guestId) body.guestId = guestId;

      fetch(PROXY_BASE + "/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(body),
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

    function bootAsGuestOrLogin(settings) {
      // Logged-in customer: merge any guest items, then show their list
      if (customerId) {
        if (loginPrompt) loginPrompt.hidden = true;
        if (toolbar) toolbar.hidden = false;
        mergeGuestWishlist().finally(function () {
          load();
          document.dispatchEvent(new CustomEvent("wishpilot:updated"));
        });
        return;
      }

      // Allow guest wishlist → guests can add and view without login
      if (settings && settings.allowGuestWishlist) {
        guestId = getGuestId() || "";
        if (loginPrompt) loginPrompt.hidden = true;
        if (toolbar) toolbar.hidden = false;
        load();
        return;
      }

      // Guests disabled → login required
      showLoginRequired();
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

    fetch(PROXY_BASE + "/settings", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        bootAsGuestOrLogin((data && data.settings) || null);
      })
      .catch(function () {
        bootAsGuestOrLogin(null);
      });
  });
})();
