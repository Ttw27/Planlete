const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Unique session ID persisted for the duration of the session
let sessionId = null;

function getSessionId() {
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
}

/**
 * Track a page view or user action
 * @param {string} event - Event name (e.g., "page_view", "build_start", "checkout_attempt")
 * @param {object} metadata - Additional context (optional)
 */
export async function trackEvent(event, metadata = {}) {
  try {
    const payload = {
      event,
      session_id: getSessionId(),
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    // Fire and forget — don't block the user's interaction
    await fetch(`${API}/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Silently fail — analytics should never disrupt the app
    console.debug("Analytics track failed (expected if offline):", error);
  }
}

/**
 * Track page load automatically
 */
export function trackPageView() {
  const pageName = document.title || window.location.pathname;
  trackEvent("page_view", { page_name: pageName });
}

/**
 * Track user entering the build flow
 */
export function trackBuildStart() {
  trackEvent("build_start");
}

/**
 * Track user leaving build flow without completing
 */
export function trackBuildDropoff(reason = "unspecified") {
  trackEvent("build_dropoff", { reason });
}

/**
 * Track sample plan view
 */
export function trackSampleView(planType) {
  trackEvent("sample_view", { plan_type: planType });
}

/**
 * Track checkout attempt
 */
export function trackCheckoutAttempt(checkoutType = "general") {
  trackEvent("checkout_attempt", { checkout_type: checkoutType });
}

/**
 * Track successful payment
 */
export function trackPaymentSuccess(amount, currency = "GBP") {
  trackEvent("payment_success", { amount, currency });
}
