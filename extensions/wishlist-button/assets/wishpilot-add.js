(function () {
  var VERSION = "guest-allow-v4";
  window.WishPilot = window.WishPilot || {};
  window.WishPilot.version = VERSION;

  // Newer hosted script must win over a stale theme-extension copy.
  if (window.__wishpilotAddVersion === VERSION) {
    if (typeof window.WishPilot.reapplyWishlistState === "function") {
      try {
        window.WishPilot.reapplyWishlistState();
      } catch (e) {
        /* ignore */
      }
    }
    return;
  }
  window.__wishpilotAddVersion = VERSION;
  window.__wishpilotAddBound = true;

  /**
   * guest-allow-v4
   * - Allow guest wishlist when merchant setting is ON
   * - Robust guest id (localStorage → sessionStorage → cookie → memory)
   * - Merge guest wishlist into customer account after login
   * - Newer script version replaces older binders
   */
  var PROXY_BASE = "/apps/wish-pilot";
  var GUEST_KEY = "wishpilot_guest_id";
  var CACHE_KEY = "wishpilot_wishlist_ids";
  var POP_MS = 380;
  var memoryGuestId = null;

  var settingsCache = null;
  var wishlistIds = Object.create(null);
  var syncInFlight = false;
  var syncQueued = false;
  var applyTimer = null;
  var watchersReady = false;

  function normalizeProductId(id) {
    if (!id) return "";
    return String(id)
      .replace(/^gid:\/\/shopify\/Product\//, "")
      .replace(/[^0-9]/g, "")
      .trim();
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

  function isGuestWishlistBlocked(settings) {
    if (!settings) return false;
    return (
      settings.allowGuestWishlist === false ||
      settings.allowGuestWishlist === "false" ||
      settings.allowGuestWishlist === 0 ||
      settings.allowGuestWishlist === "0"
    );
  }

  function getCustomerMeta() {
    var customerId = "";
    var customerEmail = "";
    document.querySelectorAll("[data-wishpilot-add]").forEach(function (root) {
      if (!customerId) customerId = root.getAttribute("data-customer-id") || "";
      if (!customerEmail) {
        customerEmail = root.getAttribute("data-customer-email") || "";
      }
    });
    if (!customerId) {
      var meta = document.querySelector(
        "[data-wishpilot-page], [data-wishpilot-header]",
      );
      if (meta) {
        customerId = meta.getAttribute("data-customer-id") || "";
        customerEmail =
          customerEmail || meta.getAttribute("data-customer-email") || "";
      }
    }
    return { customerId: customerId, customerEmail: customerEmail };
  }

  /**
   * After login, move guest wishlist rows onto the customer account.
   */
  function mergeGuestWishlistIfNeeded() {
    var meta = getCustomerMeta();
    if (!meta.customerId) return Promise.resolve(false);
    var guestId = peekGuestId();
    if (!guestId) return Promise.resolve(false);

    return postJson("/merge", {
      customerId: meta.customerId,
      guestId: guestId,
      customerEmail: meta.customerEmail || "",
    })
      .then(function (result) {
        if (result.ok) {
          clearGuestId();
          try {
            localStorage.removeItem(CACHE_KEY);
          } catch (e) {
            /* ignore */
          }
          return true;
        }
        return false;
      })
      .catch(function () {
        return false;
      });
  }

  function hydrateIdsFromStorage() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
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

  function applyWishlistState() {
    // Always merge latest localStorage (survives late paints / new script loads)
    hydrateIdsFromStorage();

    var buttons = document.querySelectorAll("[data-wishpilot-add]");
    for (var i = 0; i < buttons.length; i++) {
      var root = buttons[i];
      var productId = root.getAttribute("data-product-id");
      var btn =
        root.querySelector("[data-wishpilot-add-btn]") ||
        root.querySelector("button");
      if (!btn) continue;
      setActive(btn, isWishlisted(productId), false);
      root.setAttribute("data-wishpilot-synced", "1");
    }

    if (settingsCache && settingsCache.primaryColor) {
      applyAdminColor(settingsCache.primaryColor);
    }
  }

  function onCollectionGridUpdated() {
    applyWishlistState();
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyWishlistState, 30);
    setTimeout(applyWishlistState, 120);
    setTimeout(applyWishlistState, 350);
    setTimeout(applyWishlistState, 800);
    if (window.requestAnimationFrame) {
      requestAnimationFrame(function () {
        applyWishlistState();
        requestAnimationFrame(applyWishlistState);
      });
    }
  }

  function reconcileLikedIcons() {
    hydrateIdsFromStorage();
    var mismatched = false;
    document.querySelectorAll("[data-wishpilot-add]").forEach(function (root) {
      var btn =
        root.querySelector("[data-wishpilot-add-btn]") ||
        root.querySelector("button");
      if (!btn) return;
      var should = isWishlisted(root.getAttribute("data-product-id"));
      var has = btn.classList.contains("is-active");
      if (should !== has) mismatched = true;
    });
    if (mismatched) applyWishlistState();
  }

  function getIdentityParams() {
    var meta = getCustomerMeta();
    if (meta.customerId) {
      return { customerId: meta.customerId, guestId: null };
    }
    // Block guests only when settings explicitly disallow them
    if (isGuestWishlistBlocked(settingsCache)) {
      return null;
    }
    // Allowed, or settings not loaded yet (API enforces LOGIN_REQUIRED)
    var guestId = getGuestId();
    if (!guestId) return null;
    return { customerId: null, guestId: guestId };
  }

  function fetchWithTimeout(url, options, ms) {
    var controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, ms || 8000);
    var opts = options || {};
    if (controller) opts.signal = controller.signal;
    return fetch(url, opts).finally(function () {
      clearTimeout(timer);
    });
  }

  function fetchWishlistFromServer(options) {
    var isBoot = !!(options && options.boot);
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

    return fetchWithTimeout(
      PROXY_BASE + "?" + params.toString(),
      {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      },
      8000,
    )
      .then(parseJsonResponse)
      .then(function (result) {
        if (!result.ok || !result.data || !Array.isArray(result.data.items)) {
          applyWishlistState();
          return;
        }
        if (result.data.settings) {
          settingsCache = result.data.settings;
          applyAdminColor(settingsCache.primaryColor);
        }
        if (result.data.items.length > 0 || isBoot) {
          setWishlistIdsFromServer(result.data.items);
        }
        applyWishlistState();
      })
      .catch(function () {
        applyWishlistState();
      })
      .finally(function () {
        syncInFlight = false;
        if (syncQueued) {
          syncQueued = false;
          fetchWishlistFromServer(options);
        }
      });
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
    // Only require login when merchant explicitly disabled guest wishlist.
    // If settings are still loading, allow guest and let the API enforce.
    if (isGuestWishlistBlocked(settingsCache)) {
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

    // Optimistic UI + cache so filter/sort keep is-active even if API is slow
    markWishlisted(payload.productId, true);
    setActive(btn, true, true);

    postJson("/add", payload)
      .then(function (result) {
        if (
          result.status === 401 &&
          result.data &&
          result.data.code === "LOGIN_REQUIRED"
        ) {
          markWishlisted(payload.productId, false);
          setActive(btn, false, false);
          showToast(root, "Please sign in to save to your wishlist");
          return;
        }
        if (!result.ok) {
          markWishlisted(payload.productId, false);
          setActive(btn, false, false);
          showToast(
            root,
            (result.data && result.data.error) || "Could not update wishlist",
          );
          return;
        }
        markWishlisted(payload.productId, true);
        setActive(btn, true, false);
        root.setAttribute("data-wishpilot-synced", "1");
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
        markWishlisted(payload.productId, false);
        setActive(btn, false, false);
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

    markWishlisted(payload.productId, false);
    setActive(btn, false, false);

    postJson("/remove", {
      productId: payload.productId,
      variantId: payload.variantId,
      customerId: identity.customerId || undefined,
      guestId: identity.guestId || undefined,
    })
      .then(function (result) {
        if (!result.ok) {
          markWishlisted(payload.productId, true);
          setActive(btn, true, false);
          showToast(
            root,
            (result.data && result.data.error) || "Could not update wishlist",
          );
          return;
        }
        document.dispatchEvent(new CustomEvent("wishpilot:updated"));
        showToast(
          root,
          (result.data && result.data.toast) || "Removed from Wishlist",
        );
      })
      .catch(function () {
        markWishlisted(payload.productId, true);
        setActive(btn, true, false);
        showToast(root, "Network error");
      })
      .finally(function () {
        btn.disabled = false;
      });
  }

  function findProductGridRoot() {
    return (
      document.getElementById("ProductGridContainer") ||
      document.querySelector(".product-grid-container") ||
      document.getElementById("main-collection-product-grid") ||
      document.getElementById("product-grid") ||
      document.querySelector("#product-grid") ||
      document.querySelector(".collection .product-grid") ||
      document.querySelector("ul#product-grid") ||
      document.querySelector("[data-product-grid]") ||
      null
    );
  }

  function nodeLooksLikeGridUpdate(node) {
    if (!node || node.nodeType !== 1 && node.nodeType !== 11) return false;
    if (node.nodeType === 11) {
      return !!(
        node.querySelector &&
        node.querySelector(
          "[data-wishpilot-add], #ProductGridContainer, #product-grid, .product-grid",
        )
      );
    }
    if (node.id === "ProductGridContainer" || node.id === "product-grid") {
      return true;
    }
    if (
      node.classList &&
      (node.classList.contains("product-grid") ||
        node.classList.contains("product-grid-container") ||
        node.classList.contains("collection"))
    ) {
      return true;
    }
    if (node.matches && node.matches("[data-wishpilot-add]")) return true;
    return !!(
      node.querySelector &&
      node.querySelector(
        "[data-wishpilot-add], #ProductGridContainer, #product-grid, .product-grid",
      )
    );
  }

  function isProductGridAjaxUrl(url) {
    if (!url) return false;
    var href = String(url);
    if (href.indexOf("/apps/wish-pilot") !== -1) return false;
    if (href.indexOf("/wishpilot/") !== -1) return false;
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

    function observeGrid(el) {
      if (!el || !window.MutationObserver || el.__wishpilotObserved) return;
      el.__wishpilotObserved = true;
      new MutationObserver(function () {
        onCollectionGridUpdated();
      }).observe(el, { childList: true, subtree: true });
    }

    observeGrid(findProductGridRoot());

    // Re-bind if theme replaces the grid node; also catch any wishpilot buttons
    if (window.MutationObserver) {
      new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            if (nodeLooksLikeGridUpdate(added[j])) {
              observeGrid(findProductGridRoot());
              onCollectionGridUpdated();
              return;
            }
          }
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    }

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
              onCollectionGridUpdated();
            },
            function () {},
          );
        }
        return promise;
      };
    }

    // Some themes still use XHR for facets
    if (
      typeof XMLHttpRequest !== "undefined" &&
      !window.__wishpilotXhrPatched
    ) {
      window.__wishpilotXhrPatched = true;
      var open = XMLHttpRequest.prototype.open;
      var send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        this.__wishpilotUrl = url;
        return open.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function () {
        var xhr = this;
        if (isProductGridAjaxUrl(xhr.__wishpilotUrl)) {
          xhr.addEventListener("load", function () {
            onCollectionGridUpdated();
          });
        }
        return send.apply(this, arguments);
      };
    }

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
          formId.indexOf("facet") !== -1 ||
          formId.indexOf("filter") !== -1
        ) {
          onCollectionGridUpdated();
        }
      },
      true,
    );

    // Safety net — if Dawn paints after our handlers, fix within ~150ms
    setInterval(reconcileLikedIcons, 150);
  }

  if (window.__wishpilotClickHandler) {
    document.removeEventListener("click", window.__wishpilotClickHandler, true);
  }
  window.__wishpilotClickHandler = function (event) {
    var btn = event.target.closest("[data-wishpilot-add-btn]");
    if (!btn) return;
    var root = btn.closest("[data-wishpilot-add]");
    if (!root) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    var run = function () {
      if (btn.classList.contains("is-active")) removeFromWishlist(root, btn);
      else addToWishlist(root, btn);
    };
    // Always refresh settings so Allow guest toggle applies immediately
    loadSettings().finally(run);
  };
  document.addEventListener("click", window.__wishpilotClickHandler, true);

  document.addEventListener("wishpilot:updated", function () {
    // Merge from server without blocking UI; never wait to install watchers
    fetchWishlistFromServer({ boot: false });
  });

  window.WishPilot.reapplyWishlistState = onCollectionGridUpdated;
  window.WishPilot.refreshWishlist = function () {
    return fetchWishlistFromServer({ boot: true });
  };
  window.WishPilot.ids = function () {
    hydrateIdsFromStorage();
    return Object.keys(wishlistIds);
  };
  window.WishPilot.version = VERSION;

  function boot() {
    hydrateIdsFromStorage();
    applyWishlistState();
    // CRITICAL: watchers must start even if wishlist API is slow/hanging
    installGridWatchers();
    loadSettings()
      .then(function () {
        return mergeGuestWishlistIfNeeded();
      })
      .finally(function () {
        fetchWishlistFromServer({ boot: true }).then(function () {
          document.dispatchEvent(new CustomEvent("wishpilot:updated"));
        });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
