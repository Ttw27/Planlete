import { useEffect, useState } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Single source of truth for prices on the frontend.
 *
 * Prices are set once, as env vars on the backend, and read from
 * /api/config/pricing. Nothing in the UI should ever contain a hardcoded
 * price string — change the env var on Railway and every price on the site
 * follows, with no redeploy.
 *
 * The defaults below exist only so a price renders instantly on first paint
 * rather than flashing a placeholder. They are corrected the moment the
 * fetch resolves, so they are a fallback, never the source of truth.
 */
const DEFAULTS = {
  plan_pence: 499,
  plan_standard_pence: 2000,
  coach_client_pence: 899,
  coach_client_standard_pence: 2599,
  currency: "GBP",
};

let cache = { ...DEFAULTS };
let inflight = null;
const listeners = new Set();

export function formatPence(pence) {
  const pounds = pence / 100;
  // £20 rather than £20.00, but £4.99 stays £4.99.
  return pounds % 1 === 0 ? `£${pounds.toFixed(0)}` : `£${pounds.toFixed(2)}`;
}

function load() {
  if (inflight) return inflight;
  inflight = fetch(`${BACKEND_URL}/api/config/pricing`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data) {
        cache = { ...cache, ...data };
        listeners.forEach((fn) => fn(cache));
      }
      return cache;
    })
    .catch(() => cache);
  return inflight;
}

/**
 * usePricing() — returns formatted price strings, ready to drop into JSX.
 *
 *   const { plan, planStandard } = usePricing();
 *   <button>Build my plan — {plan}</button>
 */
export function usePricing() {
  const [prices, setPrices] = useState(cache);

  useEffect(() => {
    let alive = true;
    const onChange = (next) => alive && setPrices({ ...next });
    listeners.add(onChange);
    load();
    return () => {
      alive = false;
      listeners.delete(onChange);
    };
  }, []);

  return {
    plan: formatPence(prices.plan_pence),
    planStandard: formatPence(prices.plan_standard_pence),
    coachClient: formatPence(prices.coach_client_pence),
    coachClientStandard: formatPence(prices.coach_client_standard_pence),
    raw: prices,
  };
}
