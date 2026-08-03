(function () {
  if (window.__wishpilotAddBound) return;
  window.__wishpilotAddBound = true;

  var PROXY_BASE = "/apps/wish-pilot";
  var GUEST_KEY = "wishpilot_guest_id";
  var CACHE_KEY = "wishpilot_wishlist_ids";
  var POP_MS = 380;
  var settingsCache = null;
  /** Normalized product ID strings currently on the wishlist. */
  var wishlistIdCache = loadPersistedIds();
  var syncTimer = null;
  var applyTimer = null;
  var syncInFlight = false;
  var syncQueued = false;
  var lastButtonCount = 0;

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
    return String(id).replace(/^gid:\/\/shopify\/Product\//, "").trim();
  }

  function productIdMatches(storedId, buttonId) {
    return normalizeProductId(storedId) === normalizeProductId(buttonId);
  }

  function loadPersistedIds() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeProductId).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function persistIds(ids) {
    wishlistIdCache = (ids || []).map(normalizeProductId).filter(Boolean);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(wishlistIdCache));
    } catch (e) {
      /* private mode / quota */
    }
  }

  function addIdToCache(productId) {
    var id = normalizeProductId(productId);
    if (!id) return;
    wishlistIdCache = wishlistIdCache || [];
    if (
      !wishlistIdCache.some(function (existing) {
        return existing === id;
      })
    ) {
      wishlistIdCache.push(id);
      persistIds(wishlistIdCache);
    }
  }

  function removeIdFromCache(productId) {
    var id = normalizeProductId(productId);
    if (!id || !wishlistIdCache) return;
    persistIds(
      wishlistIdCache.filter(function (existing) {
        return existing !== id;
      }),
    );
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
   * Re-apply liked state to every heart currently in the DOM.
   * Themes replace product cards on filter/sort, so buttons lose is-active.
   */
  function applyActiveFromCache() {
    var ids = wishlistIdCache;
    if (!ids || !ids.length) {
      // Still reset aria on fresh buttons when list is empty.
      document.querySelectorAll("[data-wishpilot-add-btn]").forEach(function (btn) {
        if (!btn.classList.contains("is-active")) {
          btn.setAttribute("aria-pressed", "false");
        }
      });
      return;
    }

    document.querySelectorAll("[data-wishpilot-add]").forEach(function (root) {
      var productId = root.getAttribute("data-product-id");
      var btn = root.querySelector("[data-wishpilot-add-btn]");
      if (!btn) return;
      var inWishlist = ids.some(function (id) {
        return productIdMatches(id, productId);
      });
      setActive(btn, inWishlist, false);
    });

    if (settingsCache && settingsCache.primaryColor) {
      applyAdminColor(settingsCache.primaryColor);
    }

    lastButtonCount = document.querySelectorAll("[data-wishpilot-add]").length;
  }

  /** Apply now + a few follow-up passes after theme AJAX finishes painting. */
  function restoreHeartsSoon() {
    applyActiveFromCache();
    if (window.requestAnimationFrame) {
      requestAnimationFrame(function () {
        applyActiveFromCache();
        requestAnimationFrame(applyActiveFromCache);
      });
    }
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyActiveFromCache, 50);
    setTimeout(applyActiveFromCache, 200);
    setTimeout(applyActiveFromCache, 500);
    setTimeout(applyActiveFromCache, 1000);
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

    restoreHeartsSoon();

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
        if (!result.ok || !result.data || !Array.isArray(result.data.items)) {
          return;
        }

        if (result.data.settings) {
          settingsCache = result.data.settings;
          if (result.data.settings.primaryColor) {
            applyAdminColor(result.data.settings.primaryColor);
          }
        }

        persistIds(
          (result.data.items || []).map(function (item) {
            return item.productId;
          }),
        );

        restoreHeartsSoon();
      })
      .catch(function () {
        /* keep local cache */
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

        addIdToCache(payload.productId);
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

        removeIdFromCache(payload.productId);
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
    if (node.matches && node.matches("[data-wishpilot-add], [data-wishpilot-add-btn]")) {
      return true;
    }
    if (node.querySelector && node.querySelector("[data-wishpilot-add]")) {
      return true;
    }
    return false;
  }

  function onGridPossiblyUpdated() {
    restoreHeartsSoon();
    scheduleSync(180);
  }

  function watchDomForRerenders() {
    if (!window.MutationObserver) return;

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        if (mutation.type === "childList") {
          var added = mutation.addedNodes;
          for (var j = 0; j < added.length; j++) {
            if (nodeHasWishpilot(added[j])) {
              onGridPossiblyUpdated();
              return;
            }
          }
        }
      }

      // Some themes swap card contents without adding a wishpilot root as a new node.
      var count = document.querySelectorAll("[data-wishpilot-add]").length;
      if (count !== lastButtonCount) {
        lastButtonCount = count;
        onGridPossiblyUpdated();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function isCollectionAjaxUrl(url) {
    if (!url) return false;
    var href = String(url);
    return (
      href.indexOf("/collections/") !== -1 ||
      href.indexOf("section_id=") !== -1 ||
      href.indexOf("sections=") !== -1 ||
      href.indexOf("sort_by=") !== -1 ||
      href.indexOf("filter.") !== -1 ||
      href.indexOf("/search") !== -1
    );
  }

  function watchThemeAjaxEvents() {
    [
      "shopify:section:load",
      "shopify:section:reorder",
      "shopify:section:select",
      "collection:updated",
      "facet:updated",
      "facets:updated",
      "filters:updated",
      "theme:loading:end",
      "ajaxProductGridReloaded",
    ].forEach(function (eventName) {
      document.addEventListener(eventName, onGridPossiblyUpdated);
    });

    window.addEventListener("popstate", onGridPossiblyUpdated);

    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    history.pushState = function () {
      var result = originalPushState.apply(this, arguments);
      onGridPossiblyUpdated();
      return result;
    };

    history.replaceState = function () {
      var result = originalReplaceState.apply(this, arguments);
      onGridPossiblyUpdated();
      return result;
    };

    // Dawn / OS 2.0 facets + sort often update via fetch(section rendering)
    if (typeof window.fetch === "function") {
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
        if (isCollectionAjaxUrl(url)) {
          promise
            .then(function (response) {
              // Clone not needed — we only care that the request finished.
              onGridPossiblyUpdated();
              return response;
            })
            .catch(function () {
              /* ignore */
            });
        }
        return promise;
      };
    }

    // Sort / filter UI changes (capture so we catch theme handlers too)
    document.addEventListener(
      "change",
      function (event) {
        var el = event.target;
        if (!el) return;
        var name = (el.getAttribute("name") || "").toLowerCase();
        var id = (el.id || "").toLowerCase();
        if (
          name.indexOf("sort") !== -1 ||
          name.indexOf("filter") !== -1 ||
          id.indexOf("sort") !== -1 ||
          id.indexOf("filter") !== -1 ||
          id.indexOf("facet") !== -1 ||
          (el.form &&
            (el.form.id || "").toLowerCase().indexOf("facet") !== -1)
        ) {
          onGridPossiblyUpdated();
        }
      },
      true,
    );

    document.addEventListener(
      "submit",
      function (event) {
        var form = event.target;
        if (!form) return;
        var formId = (form.id || "").toLowerCase();
        var formClass = (form.className || "").toLowerCase();
        if (
          formId.indexOf("facet") !== -1 ||
          formClass.indexOf("facet") !== -1 ||
          formClass.indexOf("filter") !== -1
        ) {
          onGridPossiblyUpdated();
        }
      },
      true,
    );
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
    wishlistIdCache = loadPersistedIds();
    applyActiveFromCache();
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
