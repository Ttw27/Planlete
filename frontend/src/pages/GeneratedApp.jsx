import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import AppShell from "@/components/AppShell";
import ContactSupportPanel from "@/components/ContactSupportPanel";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Pick a hero image loosely matching the person's stated goal, so generated
// apps still feel visually tailored even without per-user image generation.
function heroForGoal(goal = "") {
  const g = goal.toLowerCase();
  if (g.includes("football")) {
    return "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80";
  }
  if (g.includes("rehab") || g.includes("injury")) {
    return "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80";
  }
  if (g.includes("longevity") || g.includes("healthy")) {
    return "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80";
  }
  if (g.includes("sprint")) {
    return "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80";
  }
  // Athlete / muscle / fat loss / general fallback
  return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80";
}

/**
 * Personalised generated app. Fetches the AI-generated plan (a 4-week
 * periodised programme) and figures out which of the 4 weeks to show based
 * on how long ago the plan was created — then loops back to week 1 once the
 * cycle finishes, so the programme keeps running indefinitely.
 */
export default function GeneratedApp() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    axios
      .get(`${API}/plans/${id}`)
      .then((res) => {
        if (alive) setPlan(res.data);
      })
      .catch(() => alive && setError("Plan not found"));
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
        <div className="text-center max-w-md w-full">
          <p className="text-overline mb-4">404</p>
          <h2 className="font-display text-4xl mb-8">This plan doesn&apos;t exist.</h2>

          <ContactSupportPanel
            context={`Plan link not found on Planlete.\nPlan ID in URL: ${id}`}
          />

          <Link
            to="/build"
            className="inline-block mt-6 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-6 py-3"
          >
            Build a new one
          </Link>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <p className="text-overline text-[#D4FF00] animate-pulse">
          Loading your app…
        </p>
      </div>
    );
  }

  const name = plan.answers?.name || "Your";
  const goal = plan.answers?.goal || plan.tagline || "General fitness";
  const weeks = Array.isArray(plan.weeks) ? plan.weeks : [];

  // Work out which week of the cycle to show, looping once the cycle ends.
  // Single-week plans (manually authored, no auto-progression) just show
  // that one week forever — no point labelling it "Week 1/1".
  let currentWeek = weeks[0];
  let weekLabel = "";
  let weekIndex = 0;
  if (weeks.length > 1) {
    const createdAt = plan.created_at ? new Date(plan.created_at) : new Date();
    const daysElapsed = Math.max(
      0,
      Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );
    weekIndex = Math.floor(daysElapsed / 7) % weeks.length;
    currentWeek = weeks[weekIndex] || weeks[0];
    weekLabel = ` · Week ${weekIndex + 1}/${weeks.length}${
      currentWeek?.theme ? ` — ${currentWeek.theme}` : ""
    }`;
  }

  const data = {
    brand: plan.brand || `${name}'s App`,
    tagline: `${goal}${weekLabel}`,
    hero: heroForGoal(goal),
    days: currentWeek?.days || [],
    nutrition: plan.nutrition,
    recovery: plan.recovery,
    morningRoutine: plan.morningRoutine,
  };

  return <AppShell data={data} planId={plan.id} weekNumber={weekIndex + 1} />;
}
