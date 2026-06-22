import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { getTemplateData } from "@/lib/templates";
import { coachApi, resolveAssetUrl } from "@/lib/coachApi";

export default function PublicBrandedPlan() {
  const { coachSlug, clientSlug } = useParams();
  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    coachApi
      .get(`/c/${coachSlug}/${clientSlug}`)
      .then((res) => setBundle(res.data))
      .catch(() => setError("Plan not found"));
  }, [coachSlug, clientSlug]);

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

  if (!bundle) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#050505", color: "#fafafa" }}
      >
        <p className="text-overline text-[#D4FF00] animate-pulse">Loading…</p>
      </div>
    );
  }

  const { coach, client } = bundle;
  const tpl = getTemplateData(client.template);
  const isFootball = client.template === "football";

  const data = {
    ...tpl,
    brand: coach.brand_name,
    tagline: `${client.client_name}'s plan`,
  };

  const themeStyle = {
    "--accent": coach.primary_color || "#D4FF00",
    "--brand-bg": coach.secondary_color || "#050505",
  };

  // Football needs the off-season mode by default
  const footballProps = isFootball
    ? { mode: "off", modeToggle: null }
    : {};

  // Use season-specific nutrition for football mode
  const footballData = isFootball
    ? { ...data, nutrition: tpl.modes.off.nutrition }
    : data;

  return (
    <div style={themeStyle}>
      {/* Coach banner */}
      <div
        className="w-full"
        style={{ background: coach.secondary_color || "#050505" }}
      >
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
              <p
                className="text-overline text-[10px]"
                style={{ color: coach.primary_color || "#D4FF00" }}
              >
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

      <AppShell data={footballData} {...footballProps} />

      {client.notes && (
        <div className="max-w-[440px] mx-auto px-3 md:px-6 pb-6">
          <div
            className="border-l-2 px-4 py-4 text-sm text-zinc-300 leading-relaxed"
            style={{
              borderColor: coach.primary_color || "#D4FF00",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <p
              className="text-overline mb-2"
              style={{ color: coach.primary_color || "#D4FF00" }}
            >
              Coach note for {client.client_name}
            </p>
            {client.notes}
          </div>
        </div>
      )}
    </div>
  );
}
