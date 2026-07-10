import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { coachApi, resolveAssetUrl } from "@/lib/coachApi";

function PayToUnlock({ coach, client, onPaid }) {
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    setLoading(true);
    try {
      const res = await coachApi.post(`/coach/clients/${client.id}/checkout/create-session`);
      window.location.href = res.data.checkout_url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {coach.logo_url && (
          <img
            src={resolveAssetUrl(coach.logo_url)}
            alt={coach.brand_name}
            className="w-16 h-16 object-contain bg-white p-2 mx-auto mb-6"
          />
        )}
        <p className="text-overline mb-3" style={{ color: coach.primary_color || "#D4FF00" }}>
          {coach.brand_name}
        </p>
        <h2 className="font-display text-3xl mb-4">
          {client.client_name}'s plan is ready.
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          One-off payment to unlock your app — training, nutrition, and recovery, built by{" "}
          {coach.brand_name}.
        </p>
        <button
          onClick={startCheckout}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-8 py-4 hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? "Redirecting…" : "Unlock my plan"}
        </button>
      </div>
    </div>
  );
}

export default function PublicBrandedPlan() {
  const { coachSlug, clientSlug } = useParams();
  const [searchParams] = useSearchParams();
  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const load = () => {
    coachApi
      .get(`/c/${coachSlug}/${clientSlug}`)
      .then((res) => setBundle(res.data))
      .catch(() => setError("Plan not found"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachSlug, clientSlug]);

  // If Stripe just redirected back from a successful client-pays checkout,
  // confirm it before showing anything else.
  useEffect(() => {
    const sessionId = searchParams.get("paid_session_id");
    if (!sessionId || !bundle?.client?.id) return;
    setConfirming(true);
    coachApi
      .get(`/coach/clients/${bundle.client.id}/checkout/confirm`, { params: { session_id: sessionId } })
      .then(() => load())
      .finally(() => setConfirming(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, bundle?.client?.id]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <p className="text-overline mb-4">404</p>
          <h2 className="font-display text-4xl">This plan doesn&apos;t exist.</h2>
          <Link
            to="/"
            className="inline-block mt-8 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-6 py-3"
          >
            Back to Planlete
          </Link>
        </div>
      </div>
    );
  }

  if (!bundle || confirming) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#050505", color: "#fafafa" }}
      >
        <p className="text-overline text-[#D4FF00] animate-pulse">
          {confirming ? "Confirming payment…" : "Loading…"}
        </p>
      </div>
    );
  }

  const { coach, client } = bundle;

  if (client.payment_status === "pending_payment") {
    return <PayToUnlock coach={coach} client={client} />;
  }

  const data = {
    brand: coach.brand_name,
    tagline: `${client.client_name}'s plan`,
    structureType: client.structureType || "days",
    days: client.days || [],
    nutrition: client.nutrition,
    recovery: client.recovery,
    morningRoutine: client.morningRoutine || [],
  };

  const themeStyle = {
    "--accent": coach.primary_color || "#D4FF00",
    "--brand-bg": coach.secondary_color || "#050505",
  };

  return (
    <div style={themeStyle}>
      {/* Coach banner */}
      <div className="w-full" style={{ background: coach.secondary_color || "#050505" }}>
        <div className="max-w-[440px] mx-auto px-3 md:px-6 pt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {coach.logo_url && (
              <img
                src={resolveAssetUrl(coach.logo_url)}
                alt={coach.brand_name}
                className="w-10 h-10 object-contain bg-white p-1"
              />
            )}
            <div>
              <p className="text-overline text-[10px]" style={{ color: coach.primary_color || "#D4FF00" }}>
                Coached by
              </p>
              <p className="text-sm font-bold text-white">{coach.brand_name}</p>
            </div>
          </div>
          <Link
            to="/coach"
            className="text-overline text-[10px] text-zinc-500 hover:text-white"
            target="_blank"
          >
            via Planlete
          </Link>
        </div>
      </div>

      <AppShell
        data={data}
        planId={client.id}
        brandLogo={coach.logo_url ? resolveAssetUrl(coach.logo_url) : null}
      />

      {client.notes && (
        <div className="max-w-[440px] mx-auto px-3 md:px-6 pb-6">
          <div
            className="border-l-2 px-4 py-4 text-sm text-zinc-300 leading-relaxed"
            style={{
              borderColor: coach.primary_color || "#D4FF00",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <p className="text-overline mb-2" style={{ color: coach.primary_color || "#D4FF00" }}>
              Coach note for {client.client_name}
            </p>
            {client.notes}
          </div>
        </div>
      )}
    </div>
  );
}
