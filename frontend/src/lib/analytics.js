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

function send(event, meta) {
  try {
    const body = JSON.stringify({
      event,
      session_id: sessionId(),
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
      metadata: meta || {},
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
