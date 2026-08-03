(function () {
  if (window.__wishpilotAddBound) return;
  window.__wishpilotAddBound = true;

  var PROXY_BASE = "/apps/wish-pilot";
  var GUEST_KEY = "wishpilot_guest_id";
  var CACHE_KEY = "wishpilot_wishlist_ids";
  var POP_MS = 380;

  var settingsCache = null;
  var wishlistIds = Object.create(null); // normalizedId -> true
  var syncInFlight = false;
  var syncQueued = false;
  var applyTimer = null;
  var lastGridSignature = "";
  var watchersReady = false;

  /* ---------------- helpers ---------------- */

  function normalizeProductId(id) {
    if (!id) return "";
    return String(id).replace(/^gid:\/\/shopify\/Product\//, "").trim();
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

  function showToast(root, message) {
    var toast = root.querySelector("[data-wishpilot-toast]");
    if (!toast) return;
    toast.hidden = false;
    toast.textContent = message;
    setTimeout(function () {
      toast.hidden = true;
    }, 2500);
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

  function loadPersistedIds() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      wishlistIds = Object.create(null);
      parsed.forEach(function (id) {
        var n = normalizeProductId(id);
        if (n) wishlistIds[n] = true;
      });
    } catch (e) {
      /* ignore */
    }
  }

  function persistIds() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.keys(wishlistIds)));
    } catch (e) {
      /* ignore */
    }
  }

  function setWishlistIdsFromServer(items) {
    wishlistIds = Object.create(null);
    (items || []).forEach(function (item) {
      var n = normalizeProductId(item && item.productId);
      if (n) wishlistIds[n] = true;
    });
    persistIds();
  }

  function markWishlisted(productId, wished) {
    var n = normalizeProductId(productId);
    if (!n) return;
    if (wished) wishlistIds[n] = true;
    else delete wishlistIds[n];
    persistIds();
  }

  function isWishlisted(productId) {
    return !!wishlistIds[normalizeProductId(productId)];
  }

  function applyAdminColor(color) {
    if (!color) return;
    document.documentElement.style.setProperty("--wishpilot-color", color);
    document.querySelectorAll("[data-wishpilot-add]").forEach(function (root) {
      root.style.setProperty("--wishpilot-color", color);
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

  function getGridSignature() {
    var parts = [];
    document.querySelectorAll("[data-wishpilot-add]").forEach(function (root) {
      parts.push(root.getAttribute("data-product-id") || "");
    });
    return parts.join("|");
  }

  /**
   * Apply liked/unliked from in-memory cache to every visible button.
   * No network — safe to call after every AJAX grid re-render.
   */
  function applyWishlistState() {
    document.querySelectorAll("[data-wishpilot-add]").forEach(function (root) {
      var productId = root.getAttribute("data-product-id");
      var btn = root.querySelector("[data-wishpilot-add-btn]");
      if (!btn) return;
      setActive(btn, isWishlisted(productId), false);
    });
    if (settingsCache && settingsCache.primaryColor) {
      applyAdminColor(settingsCache.primaryColor);
    }
    lastGridSignature = getGridSignature();
  }

  /**
   * Re-apply immediately and again after the theme finishes painting
   * (Section Rendering / filter AJAX often updates DOM after fetch resolves).
   */
  function reapplyAfterGridUpdate() {
    applyWishlistState();
    if (window.requestAnimationFrame) {
      requestAnimationFrame(function () {
        applyWishlistState();
        requestAnimationFrame(applyWishlistState);
      });
    }
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyWishlistState, 0);
    setTimeout(applyWishlistState, 100);
    setTimeout(applyWishlistState, 300);
    setTimeout(applyWishlistState, 700);
  }

  function getIdentityParams() {
    var customerId = "";
    document.querySelectorAll("[data-wishpilot-add]").forEach(function (root) {
      if (!customerId) {
        customerId = root.getAttribute("data-customer-id") || "";
      }
    });
    if (!customerId) {
      var page = document.querySelector("[data-wishpilot-page], [data-wishpilot-header]");
      if (page) customerId = page.getAttribute("data-customer-id") || "";
    }

    if (customerId) return { customerId: customerId, guestId: null };

    if (settingsCache && settingsCache.allowGuestWishlist) {
      var guestId = getGuestId();
      if (!guestId) return null;
      return { customerId: null, guestId: guestId };
    }
    return null;
  }

  /**
   * Fetch wishlist from server once (boot / after add-remove).
   * Filter/sort must NOT call this — only applyWishlistState().
   */
  function fetchWishlistFromServer() {
    var identity = getIdentityParams();
    if (!identity) {
      applyWishlistState();
      return Promise.resolve();
    }

    if (syncInFlight) {
      syncQueued = true;
      return Promise.resolve();
    }
    syncInFlight = true;

    var params = new URLSearchParams();
    params.set("pageSize", "250");
    if (identity.customerId) params.set("customerId", identity.customerId);
    else params.set("guestId", identity.guestId);

    return fetch(PROXY_BASE + "?" + params.toString(), {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then(parseJsonResponse)
      .then(function (result) {
        if (!result.ok || !result.data || !Array.isArray(result.data.items)) {
          return;
        }
        if (result.data.settings) {
          settingsCache = result.data.settings;
          applyAdminColor(settingsCache.primaryColor);
        }
        setWishlistIdsFromServer(result.data.items);
        applyWishlistState();
      })
      .catch(function () {
        applyWishlistState();
      })
      .finally(function () {
        syncInFlight = false;
        if (syncQueued) {
          syncQueued = false;
          fetchWishlistFromServer();
        }
      });
  }

  /* ---------------- click actions ---------------- */

  function buildPayload(root) {
    var rawPrice = root.getAttribute("data-price");
    var price = null;
    if (rawPrice) {
      var cleaned = String(rawPrice).replace(/[^0-9.]/g, "");
      var num = Number(cleaned);
      if (!Number.isNaN(num)) price = num;
    }
    var customerId = root.getAttribute("data-customer-id") || "";
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
      guestId: customerId ? "" : getGuestId() || "",
    };
  }

  function resolveIdentity(root) {
    var customerId = root.getAttribute("data-customer-id") || "";
    if (customerId) return { customerId: customerId, guestId: "" };
    if (!(settingsCache && settingsCache.allowGuestWishlist)) {
      return { customerId: "", guestId: "", loginRequired: true };
    }
    var guestId = getGuestId();
    if (!guestId) return { customerId: "", guestId: "", loginRequired: true };
    return { customerId: "", guestId: guestId };
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
        if (result.status === 401 && result.data && result.data.code === "LOGIN_REQUIRED") {
          showToast(root, "Please sign in to save to your wishlist");
          return;
        }
        if (!result.ok) {
          showToast(root, (result.data && result.data.error) || "Could not update wishlist");
          return;
        }
        markWishlisted(payload.productId, true);
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
          showToast(root, (result.data && result.data.error) || "Could not update wishlist");
          return;
        }
        markWishlisted(payload.productId, false);
        setActive(btn, false, false);
        showToast(root, (result.data && result.data.toast) || "Removed from Wishlist");
        document.dispatchEvent(new CustomEvent("wishpilot:updated"));
      })
      .catch(function () {
        showToast(root, "Network error");
      })
      .finally(function () {
        btn.disabled = false;
      });
  }

  /* ---------------- grid update detection ---------------- */

  function nodeContainsWishpilot(node) {
    if (!node) return false;
    // Element
    if (node.nodeType === 1) {
      if (node.matches && node.matches("[data-wishpilot-add]")) return true;
      if (node.querySelector && node.querySelector("[data-wishpilot-add]")) return true;
      return false;
    }
    // DocumentFragment (innerHTML parse batches)
    if (node.nodeType === 11 && node.querySelector) {
      return !!node.querySelector("[data-wishpilot-add]");
    }
    return false;
  }

  function onCollectionGridUpdated() {
    reapplyAfterGridUpdate();
  }

  function maybeReapplyIfGridChanged() {
    var signature = getGridSignature();
    if (signature !== lastGridSignature) {
      onCollectionGridUpdated();
    } else {
      // Same product IDs can be re-mounted as fresh nodes without is-active.
      applyWishlistState();
    }
  }

  function isProductGridAjaxUrl(url) {
    if (!url) return false;
    var href = String(url);
    // Ignore our own wishlist API
    if (href.indexOf("/apps/wish-pilot") !== -1) return false;
    return (
      href.indexOf("section_id=") !== -1 ||
      href.indexOf("sections=") !== -1 ||
      href.indexOf("sort_by=") !== -1 ||
      href.indexOf("filter.") !== -1 ||
      href.indexOf("/collections/") !== -1 ||
      href.indexOf("/search") !== -1
    );
  }

  function installGridWatchers() {
    if (watchersReady) return;
    watchersReady = true;

    // 1) DOM mutations — covers Section Rendering API, infinite scroll, pagination
    if (window.MutationObserver) {
      var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          if (!added || !added.length) continue;
          for (var j = 0; j < added.length; j++) {
            if (nodeContainsWishpilot(added[j])) {
              onCollectionGridUpdated();
              return;
            }
          }
        }
        // Fallback: product order/set changed without matching our selector check
        maybeReapplyIfGridChanged();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    // 2) Theme / Shopify events
    [
      "shopify:section:load",
      "shopify:section:reorder",
      "collection:updated",
      "facet:updated",
      "facets:updated",
      "filters:updated",
      "theme:loading:end",
      "ajaxProductGridReloaded",
    ].forEach(function (name) {
      document.addEventListener(name, onCollectionGridUpdated);
    });

    window.addEventListener("popstate", onCollectionGridUpdated);

    // 3) History API (Dawn facets update URL without full reload)
    var pushState = history.pushState;
    var replaceState = history.replaceState;
    history.pushState = function () {
      var result = pushState.apply(this, arguments);
      onCollectionGridUpdated();
      return result;
    };
    history.replaceState = function () {
      var result = replaceState.apply(this, arguments);
      onCollectionGridUpdated();
      return result;
    };

    // 4) Section Rendering / collection fetch — apply AFTER response, then again for late DOM paint
    if (typeof window.fetch === "function" && !window.__wishpilotFetchPatched) {
      window.__wishpilotFetchPatched = true;
      var originalFetch = window.fetch;
      window.fetch = function () {
        var input = arguments[0];
        var url =
          typeof input === "string"
            ? input
            : input && input.url
              ? input.url
              : "";
        var promise = originalFetch.apply(this, arguments);
        if (isProductGridAjaxUrl(url)) {
          promise.then(
            function () {
              // Theme usually injects HTML after this; schedule multi-pass apply.
              onCollectionGridUpdated();
            },
            function () {
              /* ignore */
            },
          );
        }
        return promise;
      };
    }

    // 5) Sort / filter controls
    document.addEventListener(
      "change",
      function (event) {
        var el = event.target;
        if (!el) return;
        var name = (el.getAttribute("name") || "").toLowerCase();
        var id = (el.id || "").toLowerCase();
        var formId = el.form ? (el.form.id || "").toLowerCase() : "";
        if (
          name.indexOf("sort") !== -1 ||
          name.indexOf("filter") !== -1 ||
          id.indexOf("sort") !== -1 ||
          id.indexOf("facet") !== -1 ||
          formId.indexOf("facet") !== -1
        ) {
          onCollectionGridUpdated();
        }
      },
      true,
    );
  }

  /* ---------------- boot ---------------- */

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-wishpilot-add-btn]");
    if (!btn) return;
    var root = btn.closest("[data-wishpilot-add]");
    if (!root) return;
    event.preventDefault();
    event.stopPropagation();

    var run = function () {
      if (btn.classList.contains("is-active")) removeFromWishlist(root, btn);
      else addToWishlist(root, btn);
    };

    if (settingsCache) run();
    else loadSettings().finally(run);
  });

  document.addEventListener("wishpilot:updated", function () {
    // Count badge etc. — refresh server list once after mutations
    fetchWishlistFromServer();
  });

  // Public hook for themes that dispatch custom events after AJAX
  window.WishPilot = window.WishPilot || {};
  window.WishPilot.reapplyWishlistState = function () {
    reapplyAfterGridUpdate();
  };
  window.WishPilot.refreshWishlist = function () {
    return fetchWishlistFromServer();
  };

  function boot() {
    loadPersistedIds();
    applyWishlistState();
    loadSettings().finally(function () {
      fetchWishlistFromServer().finally(function () {
        installGridWatchers();
        applyWishlistState();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
