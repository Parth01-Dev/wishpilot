(function () {
  if (window.__wishpilotAddBound) return;
  window.__wishpilotAddBound = true;

  var PROXY_BASE = "/apps/wish-pilot";
  var GUEST_KEY = "wishpilot_guest_id";
  var POP_MS = 380;
  var settingsCache = null;
  /** Cached wishlist product IDs (normalized) for fast re-sync after AJAX filter/sort. */
  var wishlistIdCache = null;
  var syncTimer = null;
  var syncInFlight = false;
  var syncQueued = false;

  function showToast(root, message) {
    var toast = root.querySelector("[data-wishpilot-toast]");
    if (!toast) return;
    toast.hidden = false;
    toast.textContent = message;
    setTimeout(function () {
      toast.hidden = true;
    }, 2500);
  }

  function parseJsonResponse(res) {
    return res.text().then(function (text) {
      var data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { error: "Invalid server response" };
        }
      }
      return { ok: res.ok, status: res.status, data: data };
    });
  }

  function postJson(path, body) {
    return fetch(PROXY_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    }).then(parseJsonResponse);
  }

  function normalizeProductId(id) {
    if (!id) return "";
    return String(id).replace(/^gid:\/\/shopify\/Product\//, "");
  }

  function productIdMatches(storedId, buttonId) {
    return normalizeProductId(storedId) === normalizeProductId(buttonId);
  }

  function getGuestId() {
    try {
      var existing = localStorage.getItem(GUEST_KEY);
      if (existing) return existing;
      var id =
        "guest_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 10);
      localStorage.setItem(GUEST_KEY, id);
      return id;
    } catch (e) {
      return null;
    }
  }

  function applyAdminColor(color) {
    if (!color) return;
    document.documentElement.style.setProperty("--wishpilot-color", color);
    document.querySelectorAll("[data-wishpilot-add]").forEach(function (root) {
      if (
        !root.getAttribute("style") ||
        root.getAttribute("style").indexOf("--wishpilot-color") === -1
      ) {
        root.style.setProperty("--wishpilot-color", color);
      }
    });
  }

  function loadSettings() {
    return fetch(PROXY_BASE + "/settings", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then(parseJsonResponse)
      .then(function (result) {
        if (!result.ok || !result.data || !result.data.settings) return null;
        settingsCache = result.data.settings;
        applyAdminColor(settingsCache.primaryColor);
        return settingsCache;
      })
      .catch(function () {
        return null;
      });
  }

  function setActive(btn, active, animate) {
    if (!btn) return;
    if (active) {
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      if (animate) {
        btn.classList.remove("is-popping");
        void btn.offsetWidth;
        btn.classList.add("is-popping");
        setTimeout(function () {
          btn.classList.remove("is-popping");
        }, POP_MS);
      }
    } else {
      btn.classList.remove("is-active", "is-popping");
      btn.setAttribute("aria-pressed", "false");
    }
  }

  function buildPayload(root) {
    var rawPrice = root.getAttribute("data-price");
    var price = null;
    if (rawPrice) {
      var cleaned = String(rawPrice).replace(/[^0-9.]/g, "");
      var num = Number(cleaned);
      if (!Number.isNaN(num)) price = num;
    }

    var customerId = root.getAttribute("data-customer-id") || "";
    var guestId = "";
    if (!customerId) {
      guestId = getGuestId() || "";
    }

    return {
      productId: root.getAttribute("data-product-id"),
      variantId: root.getAttribute("data-variant-id"),
      productTitle: root.getAttribute("data-product-title"),
      productHandle: root.getAttribute("data-product-handle"),
      productImage: root.getAttribute("data-product-image"),
      vendor: root.getAttribute("data-vendor"),
      price: price,
      customerId: customerId,
      customerEmail: root.getAttribute("data-customer-email") || "",
      guestId: guestId,
    };
  }

  function resolveIdentity(root) {
    var customerId = root.getAttribute("data-customer-id") || "";
    if (customerId) {
      return { customerId: customerId, guestId: "" };
    }

    var allowGuest =
      settingsCache && settingsCache.allowGuestWishlist === true;
    if (!allowGuest) {
      return { customerId: "", guestId: "", loginRequired: true };
    }

    var guestId = getGuestId();
    if (!guestId) {
      return { customerId: "", guestId: "", loginRequired: true };
    }

    return { customerId: "", guestId: guestId };
  }

  function getIdentityParams() {
    var roots = document.querySelectorAll("[data-wishpilot-add]");
    var customerId = "";
    roots.forEach(function (root) {
      if (!customerId) {
        customerId = root.getAttribute("data-customer-id") || "";
      }
    });

    if (customerId) {
      return { customerId: customerId, guestId: null };
    }

    if (settingsCache && settingsCache.allowGuestWishlist) {
      var guestId = getGuestId();
      if (!guestId) return null;
      return { customerId: null, guestId: guestId };
    }

    return null;
  }

  /**
   * Apply cached wishlist IDs to whatever buttons are currently in the DOM.
   * Themes re-render cards on filter/sort, so we must re-query every time.
   */
  function applyActiveFromCache() {
    if (!wishlistIdCache) return;

    document.querySelectorAll("[data-wishpilot-add]").forEach(function (root) {
      var productId = root.getAttribute("data-product-id");
      var btn = root.querySelector("[data-wishpilot-add-btn]");
      var inWishlist = wishlistIdCache.some(function (id) {
        return productIdMatches(id, productId);
      });
      setActive(btn, inWishlist, false);
    });

    if (settingsCache && settingsCache.primaryColor) {
      applyAdminColor(settingsCache.primaryColor);
    }
  }

  function scheduleSync(delay) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      syncActiveButtons();
    }, typeof delay === "number" ? delay : 120);
  }

  function syncActiveButtons() {
    var roots = document.querySelectorAll("[data-wishpilot-add]");
    if (!roots.length) return;

    // Instant paint from cache while we refresh from the API.
    applyActiveFromCache();

    var identity = getIdentityParams();
    if (!identity) return;

    if (syncInFlight) {
      syncQueued = true;
      return;
    }
    syncInFlight = true;

    var params = new URLSearchParams();
    params.set("pageSize", "250");
    if (identity.customerId) {
      params.set("customerId", identity.customerId);
    } else {
      params.set("guestId", identity.guestId);
    }

    fetch(PROXY_BASE + "?" + params.toString(), {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then(parseJsonResponse)
      .then(function (result) {
        if (!result.ok || !result.data || !result.data.items) return;

        if (result.data.settings) {
          settingsCache = result.data.settings;
          if (result.data.settings.primaryColor) {
            applyAdminColor(result.data.settings.primaryColor);
          }
        }

        wishlistIdCache = (result.data.items || []).map(function (item) {
          return item.productId;
        });

        // Always re-query DOM — filter/sort may have replaced cards mid-request.
        applyActiveFromCache();
      })
      .catch(function () {
        /* silent — page still usable */
      })
      .finally(function () {
        syncInFlight = false;
        if (syncQueued) {
          syncQueued = false;
          scheduleSync(50);
        }
      });
  }

  function addToWishlist(root, btn) {
    var identity = resolveIdentity(root);
    if (identity.loginRequired) {
      showToast(root, "Please sign in to save to your wishlist");
      return;
    }

    var payload = buildPayload(root);
    payload.customerId = identity.customerId;
    payload.guestId = identity.guestId;

    btn.disabled = true;

    postJson("/add", payload)
      .then(function (result) {
        if (
          result.status === 401 &&
          result.data &&
          result.data.code === "LOGIN_REQUIRED"
        ) {
          showToast(root, "Please sign in to save to your wishlist");
          return;
        }
        if (!result.ok) {
          showToast(
            root,
            (result.data && result.data.error) || "Could not update wishlist",
          );
          return;
        }

        var productId = payload.productId;
        if (productId) {
          wishlistIdCache = wishlistIdCache || [];
          var already = wishlistIdCache.some(function (id) {
            return productIdMatches(id, productId);
          });
          if (!already) wishlistIdCache.push(productId);
        }

        setActive(btn, true, true);
        showToast(
          root,
          (result.data && result.data.toast) ||
            (result.data && result.data.alreadyExists
              ? "Already in Wishlist"
              : "Added to Wishlist"),
        );
        document.dispatchEvent(new CustomEvent("wishpilot:updated"));
      })
      .catch(function () {
        showToast(root, "Network error");
      })
      .finally(function () {
        btn.disabled = false;
      });
  }

  function removeFromWishlist(root, btn) {
    var identity = resolveIdentity(root);
    if (identity.loginRequired) {
      showToast(root, "Please sign in to save to your wishlist");
      return;
    }

    var payload = buildPayload(root);
    btn.disabled = true;

    postJson("/remove", {
      productId: payload.productId,
      variantId: payload.variantId,
      customerId: identity.customerId || undefined,
      guestId: identity.guestId || undefined,
    })
      .then(function (result) {
        if (!result.ok) {
          showToast(
            root,
            (result.data && result.data.error) || "Could not update wishlist",
          );
          return;
        }

        if (wishlistIdCache && payload.productId) {
          wishlistIdCache = wishlistIdCache.filter(function (id) {
            return !productIdMatches(id, payload.productId);
          });
        }

        setActive(btn, false, false);
        showToast(
          root,
          (result.data && result.data.toast) || "Removed from Wishlist",
        );
        document.dispatchEvent(new CustomEvent("wishpilot:updated"));
      })
      .catch(function () {
        showToast(root, "Network error");
      })
      .finally(function () {
        btn.disabled = false;
      });
  }

  function nodeHasWishpilot(node) {
    if (!node || node.nodeType !== 1) return false;
    if (node.matches && node.matches("[data-wishpilot-add]")) return true;
    if (node.querySelector && node.querySelector("[data-wishpilot-add]")) {
      return true;
    }
    return false;
  }

  function watchDomForRerenders() {
    if (!window.MutationObserver) return;

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (nodeHasWishpilot(added[j])) {
            // Apply cache immediately so hearts don't flash as empty.
            applyActiveFromCache();
            scheduleSync(150);
            return;
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function watchThemeAjaxEvents() {
    // Shopify section rendering / common theme filter events
    [
      "shopify:section:load",
      "shopify:section:reorder",
      "collection:updated",
      "facet:updated",
      "filters:updated",
      "theme:loading:end",
      "ajaxProductGridReloaded",
    ].forEach(function (eventName) {
      document.addEventListener(eventName, function () {
        applyActiveFromCache();
        scheduleSync(100);
      });
    });

    // Many themes update collection via History API (filter/sort URL change)
    window.addEventListener("popstate", function () {
      applyActiveFromCache();
      scheduleSync(150);
    });

    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    history.pushState = function () {
      var result = originalPushState.apply(this, arguments);
      applyActiveFromCache();
      scheduleSync(200);
      return result;
    };

    history.replaceState = function () {
      var result = originalReplaceState.apply(this, arguments);
      applyActiveFromCache();
      scheduleSync(200);
      return result;
    };
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-wishpilot-add-btn]");
    if (!btn) return;
    var root = btn.closest("[data-wishpilot-add]");
    if (!root) return;
    event.preventDefault();
    event.stopPropagation();

    var run = function () {
      if (btn.classList.contains("is-active")) {
        removeFromWishlist(root, btn);
      } else {
        addToWishlist(root, btn);
      }
    };

    if (settingsCache) {
      run();
      return;
    }

    loadSettings().finally(run);
  });

  function boot() {
    loadSettings().finally(function () {
      syncActiveButtons();
      watchDomForRerenders();
      watchThemeAjaxEvents();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("wishpilot:updated", function () {
    syncActiveButtons();
  });
})();
