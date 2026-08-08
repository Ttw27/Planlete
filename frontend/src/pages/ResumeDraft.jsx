import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import PlanBuilderForm from "@/components/PlanBuilderForm";
import SiteHeader from "@/components/SiteHeader";
import { usePricing } from "@/lib/pricing";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Landing point for the "email me a link to finish later" link. Pulls the
 * saved draft back out and hands it straight to the builder as initialData,
 * so they carry on exactly where they stopped — on any device.
 */
export default function ResumeDraft() {
  const { token } = useParams();
  const { plan, planStandard } = usePricing();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/drafts/${token}`)
      .then((res) => setDraft(res.data))
      .catch((e) =>
        setError(e?.response?.data?.detail || "That link has expired or doesn't exist.")
      );
  }, [token]);

  const handleSubmit = async (planData) => {
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/checkout/create-session`, {
        manual_plan: planData,
      });
      window.location.href = res.data.checkout_url;
    } catch {
      toast.error("Couldn't start checkout. Try again.");
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-zinc-400 mb-4">{error}</p>
          <Link to="/build/manual" className="text-[#D4FF00] underline">
            Start a new plan
          </Link>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <p className="text-overline text-zinc-500">Finding your plan…</p>
      </div>
    );
  }

  // The builder expects snake_case for the two client fields.
  const initialData = {
    ...draft.draft,
    client_name: draft.draft?.clientName,
    client_email: draft.draft?.clientEmail,
    allow_logging: draft.draft?.allowLogging,
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <SiteHeader />
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-28 pb-20">
        <p className="text-overline mb-4">— Picking up where you left off</p>
        <h1 className="font-display text-3xl sm:text-4xl mb-2">
          Right, back to it.
        </h1>
        <p className="text-sm text-zinc-400 mb-10 max-w-xl">
          Everything you'd entered is still here. Nothing has been charged — you only
          pay when you finish.
        </p>

        <PlanBuilderForm
          mode={draft.mode || "self"}
          initialData={initialData}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={`Continue to payment — ${plan}`}
        />
      </div>
    </div>
  );
}
