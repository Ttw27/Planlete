const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * First-party, cookieless analytics.
 *
 * Everything goes to the existing /api/analytics/track endpoint and the
 * analytics_events collection — one system, not two. No cookies, no third
 * party, nothing that identifies a person, which is why the site needs no
 * consent banner.
 *
 * Exports:
 *   trackPageView()     — route changes, called from App.js
 *   track(event, meta)  — funnel steps (builder_started, checkout_opened…)
 *   trackEvent          — alias of track, kept for older call sites
 */

// Per-tab id so one visit's steps can be grouped without identifying anyone.
// sessionStorage, so it dies with the tab and never persists.
function sessionId() {
  try {
    let id = sessionStorage.getItem("pl_sid");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("pl_sid", id);
    }
    return id;
  } catch {
    return "no-session";
  }
}

// Where this visit came from, worked out once per tab from the landing URL's utm_ tags or the referrer,
// so the funnel can say "Instagram sent 40 visits and 2 sales". sessionStorage only, like the session id:
// nothing persists after the tab closes and nothing identifies a person.
const REFERRERS = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$/, "facebook"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, "x"],
  [/(^|\.)youtube\.com$/, "youtube"],
];

function source() {
  try {
    const saved = sessionStorage.getItem("pl_src");
    if (saved) return JSON.parse(saved);
    const params = new URLSearchParams(window.location.search);
    let s = (params.get("utm_source") || "").toLowerCase().trim();
    if (!s && document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (host && host !== window.location.hostname.replace(/^www\./, "")) {
        const hit = REFERRERS.find(([re]) => re.test(host));
        s = hit ? hit[1] : host;
      }
    }
    const src = {
      s: s || "direct",
      m: (params.get("utm_medium") || "").toLowerCase().trim() || undefined,
      c: (params.get("utm_campaign") || "").toLowerCase().trim() || undefined,
    };
    sessionStorage.setItem("pl_src", JSON.stringify(src));
    return src;
  } catch {
    return { s: "unknown" };
  }
}

function send(event, meta) {
  try {
    const body = JSON.stringify({
      event,
      session_id: sessionId(),
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
      metadata: { ...(meta || {}), src: source() },
    });
    const url = `${BACKEND_URL}/api/analytics/track`;

    // sendBeacon survives the page being navigated away from, which matters
    // for checkout_opened — that fires immediately before a Stripe redirect.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must never break the page or delay someone trying to buy.
  }
}

export function trackPageView() {
  send("page_view");
}

export function track(event, meta) {
  send(event, meta);
}

export const trackEvent = track;
