import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import PlanBuilderForm from "@/components/PlanBuilderForm";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * The customer-facing self-serve builder — for people who already know
 * exactly what they want and don't need the AI questionnaire. Same builder
 * component as the coach/admin versions, same £4.99 price, same real app on
 * the other end. Payment happens before anything is saved, same as the AI
 * path — /checkout/create-session just receives manual_plan instead of
 * answers, and the backend branches accordingly after payment confirms.
 */
export default function SelfServeBuilder() {
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
          exactly what you enter. £4.99, one-off, yours to keep.
        </p>

        <PlanBuilderForm
          mode="self"
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel="Continue to payment — £4.99"
        />
      </div>
    </div>
  );
}
