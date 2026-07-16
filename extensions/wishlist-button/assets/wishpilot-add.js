(function () {
  if (window.__wishpilotAddBound) return;
  window.__wishpilotAddBound = true;

  var PROXY_BASE = "/apps/wish-pilot";

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

  function setActive(btn, active) {
    if (!btn) return;
    if (active) {
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
    } else {
      btn.classList.remove("is-active");
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

    return {
      productId: root.getAttribute("data-product-id"),
      variantId: root.getAttribute("data-variant-id"),
      productTitle: root.getAttribute("data-product-title"),
      productHandle: root.getAttribute("data-product-handle"),
      productImage: root.getAttribute("data-product-image"),
      vendor: root.getAttribute("data-vendor"),
      price: price,
      customerId: root.getAttribute("data-customer-id") || "",
      customerEmail: root.getAttribute("data-customer-email") || "",
    };
  }

  function addToWishlist(root, btn) {
    var payload = buildPayload(root);
    if (!payload.customerId) {
      showToast(root, "Please sign in to save to your wishlist");
      return;
    }

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
        setActive(btn, true);
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
    var payload = buildPayload(root);
    if (!payload.customerId) {
      showToast(root, "Please sign in to save to your wishlist");
      return;
    }

    btn.disabled = true;

    postJson("/remove", {
      productId: payload.productId,
      variantId: payload.variantId,
      customerId: payload.customerId,
    })
      .then(function (result) {
        if (!result.ok) {
          showToast(root, (result.data && result.data.error) || "Could not update wishlist");
          return;
        }
        setActive(btn, false);
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

  function syncActiveButtons() {
    var roots = document.querySelectorAll("[data-wishpilot-add]");
    if (!roots.length) return;

    var customerId = "";
    roots.forEach(function (root) {
      if (!customerId) {
        customerId = root.getAttribute("data-customer-id") || "";
      }
    });
    if (!customerId) return;

    var params = new URLSearchParams();
    params.set("customerId", customerId);
    params.set("pageSize", "250");

    fetch(PROXY_BASE + "?" + params.toString(), {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then(parseJsonResponse)
      .then(function (result) {
        if (!result.ok || !result.data || !result.data.items) return;

        var wishlistIds = (result.data.items || []).map(function (item) {
          return item.productId;
        });

        roots.forEach(function (root) {
          var productId = root.getAttribute("data-product-id");
          var btn = root.querySelector("[data-wishpilot-add-btn]");
          var inWishlist = wishlistIds.some(function (id) {
            return productIdMatches(id, productId);
          });
          setActive(btn, inWishlist);
        });
      })
      .catch(function () {
        /* silent — page still usable */
      });
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-wishpilot-add-btn]");
    if (!btn) return;
    var root = btn.closest("[data-wishpilot-add]");
    if (!root) return;
    event.preventDefault();
    event.stopPropagation();

    if (btn.classList.contains("is-active")) {
      removeFromWishlist(root, btn);
    } else {
      addToWishlist(root, btn);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncActiveButtons);
  } else {
    syncActiveButtons();
  }

  document.addEventListener("wishpilot:updated", function () {
    syncActiveButtons();
  });
})();
