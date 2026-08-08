const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * First-party, cookieless funnel tracking. Sends an event name and the
 * current path — nothing identifying, no cookie, no third party, so it
 * needs no consent banner.
 *
 * Deliberately fire-and-forget: analytics must never delay a page or
 * surface an error to someone trying to buy something.
 */
export function track(event, meta) {
  try {
    const body = JSON.stringify({
      event,
      path: window.location.pathname,
      meta: meta || {},
    });
    // sendBeacon survives the page being navigated away from, which matters
    // for checkout_opened — that fires immediately before a redirect to Stripe.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        `${BACKEND_URL}/api/events`,
        new Blob([body], { type: "application/json" })
      );
      return;
    }
    fetch(`${BACKEND_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let tracking break anything.
  }
}
