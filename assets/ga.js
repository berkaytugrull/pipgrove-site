// Google Analytics 4 for pipgrove.com, loaded after the page is idle so it never slows the first view.
(function () {
  var ID = "G-LD9KCGX48E";
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  function load() {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
    document.head.appendChild(s);
  }
  function later() { "requestIdleCallback" in window ? requestIdleCallback(load, { timeout: 2500 }) : setTimeout(load, 1200); }
  if (document.readyState === "complete") later(); else addEventListener("load", later, { once: true });
  // App Store taps are the main conversion
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href*="apps.apple.com"]');
    if (a) gtag("event", "app_store_click", { link_location: a.className || "link", page_path: location.pathname });
  }, true);
})();
