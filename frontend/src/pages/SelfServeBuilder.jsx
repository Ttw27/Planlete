import { useState } from "react";
import { Link } from "react-router-dom";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import PlanBuilderForm from "@/components/PlanBuilderForm";
import { usePricing } from "@/lib/pricing";
import { useSeo } from "@/lib/useSeo";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * The customer-facing self-serve builder — for people who already know
 * exactly what they want and don't need the AI questionnaire. Same builder
 * component as the coach/admin versions, same price, same real app on
 * the other end. Payment happens before anything is saved, same as the AI
 * path — /checkout/create-session just receives manual_plan instead of
 * answers, and the backend branches accordingly after payment confirms.
 */
export default function SelfServeBuilder() {
  useSeo({
    title: "Build Your Own Plan Your Way — Planlete",
    description:
      "Already know what you want to train? Enter your own sessions and get them as an app on your phone, with logging and rest timers built in.",
    canonical: "https://www.planlete.co.uk/build/manual",
  });

  const { plan, planStandard } = usePricing();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload) => {
    if (!payload.disclaimer_accepted) {
      toast.error("Please confirm this is your own plan before continuing.");
      return;
    }
    if (!payload.client_email) {
      toast.error("Add your email so we know where to send your app.");
      return;
    }
    setSubmitting(true);
    try {
      track("builder_completed", { kind: "manual" });
      track("checkout_opened", { kind: "manual" });
      const res = await axios.post(`${API}/checkout/create-session`, {
        manual_plan: payload,
      });
      window.location.href = res.data.checkout_url;
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Couldn't start checkout. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <SiteHeader />
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-28 pb-20">
        <Link to="/build" className="inline-flex items-center gap-2 text-overline text-zinc-400 hover:text-[#D4FF00] mb-8">
          <ArrowLeft size={14} /> Back
        </Link>
        <p className="text-overline mb-4">— Build it your way</p>
        <h1 className="font-display text-3xl sm:text-4xl mb-2">
          Type it in. We'll build the app.
        </h1>
        <p className="text-sm text-zinc-400 mb-10 max-w-xl">
          Same features as the AI-built apps — timer, logging, progress tracking — just running
          exactly what you enter. {plan}, one-off, yours to keep.
        </p>

        <PlanBuilderForm
          mode="self"
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={`Continue to payment — ${plan}`}
        />

        {/* Shown before payment, deliberately. Finding out what you bought
            after being charged is how refund requests start. */}
        <div className="mt-10 border border-white/10 bg-white/[0.02] p-5 max-w-2xl">
          <p className="text-overline text-zinc-500 mb-3">Before you pay</p>
          <ul className="text-sm text-zinc-400 leading-relaxed space-y-2">
            <li>One payment of {plan}. No subscription, nothing renews.</li>
            <li>The app is yours to keep and comes back whenever you open the link.</li>
            <li>
              You've got <span className="text-white">48 hours</span> after it's built to
              change what you entered, or until you log your first session, whichever
              comes first. After that it's fixed, and changes mean a new plan at {plan}.
            </li>
          </ul>
          <p className="text-xs text-zinc-600 mt-4">
            By continuing you agree to our{" "}
            <Link to="/terms" className="underline hover:text-zinc-400">Terms</Link>,{" "}
            <Link to="/privacy" className="underline hover:text-zinc-400">Privacy Policy</Link>{" "}
            and <Link to="/refunds" className="underline hover:text-zinc-400">Refund Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
