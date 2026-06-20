import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import AppShell from "@/components/AppShell";
import { ATHLETE_APP } from "@/lib/sampleData";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Personalised generated app placeholder. For first pass we fetch the plan
 * metadata and render a sample-app shell with the user's name. Full AI plan
 * generation arrives in a later iteration.
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
        <div className="text-center max-w-md">
          <p className="text-overline mb-4">404</p>
          <h2 className="font-display text-4xl">This plan doesn&apos;t exist.</h2>
          <Link
            to="/build"
            className="inline-block mt-8 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-6 py-3"
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

  // Until AI generation arrives, use Athlete app as the personalised template
  const name = plan.answers?.name || "Your";
  const data = {
    ...ATHLETE_APP,
    brand: `${name}'s App`,
    tagline: plan.answers?.goal || ATHLETE_APP.tagline,
  };

  return <AppShell data={data} />;
}
