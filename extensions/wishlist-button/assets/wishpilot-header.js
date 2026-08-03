(function () {
  var PROXY_BASE = "/apps/wish-pilot";
  var GUEST_KEY = "wishpilot_guest_id";
  var mergeAttempted = false;

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

  function peekGuestId() {
    try {
      return localStorage.getItem(GUEST_KEY);
    } catch (e) {
      return null;
    }
  }

  function clearGuestId() {
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function mergeGuestWishlistIfNeeded(customerId, customerEmail) {
    if (!customerId || mergeAttempted) return Promise.resolve();
    var guestId = peekGuestId();
    if (!guestId) return Promise.resolve();
    mergeAttempted = true;

    return fetch(PROXY_BASE + "/merge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        customerId: customerId,
        guestId: guestId,
        customerEmail: customerEmail || "",
      }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.ok) clearGuestId();
      })
      .catch(function () {
        mergeAttempted = false;
      });
  }

  function refreshCounts() {
    document.querySelectorAll("[data-wishpilot-header]").forEach(function (el) {
      var countEl = el.querySelector("[data-wishpilot-count]");
      if (!countEl) return;

      var customerId = el.getAttribute("data-customer-id");
      var customerEmail = el.getAttribute("data-customer-email") || "";
      var params = new URLSearchParams();
      params.set("pageSize", "1");

      var afterIdentity = function () {
        if (customerId) {
          params.set("customerId", customerId);
        } else {
          var guestId = getGuestId();
          if (!guestId) {
            countEl.textContent = "0";
            return;
          }
          params.set("guestId", guestId);
        }

        fetch(PROXY_BASE + "?" + params.toString(), {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        })
          .then(function (res) {
            return res.json();
          })
          .then(function (data) {
            if (data.code === "LOGIN_REQUIRED") {
              countEl.textContent = "0";
              return;
            }
            countEl.textContent = String(data.count || data.total || 0);
          })
          .catch(function () {
            /* silent */
          });
      };

      if (customerId) {
        mergeGuestWishlistIfNeeded(customerId, customerEmail).finally(
          afterIdentity,
        );
      } else {
        afterIdentity();
      }
    });
  }

  refreshCounts();
  document.addEventListener("wishpilot:updated", refreshCounts);
})();
