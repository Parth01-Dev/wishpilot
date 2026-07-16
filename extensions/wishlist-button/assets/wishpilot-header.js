(function () {
  var PROXY_BASE = "/apps/wish-pilot";

  function refreshCounts() {
    document.querySelectorAll("[data-wishpilot-header]").forEach(function (el) {
      var countEl = el.querySelector("[data-wishpilot-count]");
      if (!countEl) return;

      var customerId = el.getAttribute("data-customer-id");
      if (!customerId) {
        countEl.textContent = "0";
        return;
      }

      var params = new URLSearchParams();
      params.set("customerId", customerId);
      params.set("pageSize", "1");

      fetch(PROXY_BASE + "?" + params.toString(), {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          countEl.textContent = String(data.count || data.total || 0);
        })
        .catch(function () {
          /* silent */
        });
    });
  }

  refreshCounts();
  document.addEventListener("wishpilot:updated", refreshCounts);
})();
