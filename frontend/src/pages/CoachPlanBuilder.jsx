import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { coachApi, setCoachToken, formatApiError } from "@/lib/coachApi";
import PlanBuilderForm from "@/components/PlanBuilderForm";

export default function CoachPlanBuilder() {
  const navigate = useNavigate();
  const { clientId } = useParams(); // present when editing an existing client
  const [coach, setCoach] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(Boolean(clientId));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    coachApi
      .get("/coach/me")
      .then((res) => setCoach(res.data))
      .catch(() => {
        setCoachToken(null);
        navigate("/coach", { replace: true });
      });
  }, [navigate]);

  useEffect(() => {
    if (!clientId) return;
    coachApi
      .get(`/coach/clients/${clientId}`)
      .then((res) => setInitialData(res.data))
      .catch(() => toast.error("Couldn't load that client's plan"))
      .finally(() => setLoading(false));
  }, [clientId]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (clientId) {
        await coachApi.patch(`/coach/clients/${clientId}`, payload);
        toast.success("Plan updated");
      } else {
        await coachApi.post("/coach/clients", payload);
        toast.success("Plan created");
      }
      navigate("/coach/dashboard");
    } catch (err) {
      toast.error(formatApiError(err, "Couldn't save this plan"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!coach || loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }

  const noActiveSubscription = coach.subscription_status !== "active";

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/10 sticky top-0 z-40 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link to="/coach/dashboard" className="inline-flex items-center gap-2 text-overline hover:text-[#D4FF00]">
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
          <span className="text-overline text-[#D4FF00]">{coach.brand_name}</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10">
        <p className="text-overline mb-4">— {clientId ? "Edit plan" : "New client plan"}</p>
        <h1 className="font-display text-3xl sm:text-4xl mb-2">
          {clientId ? "Update their plan" : "Build a plan, exercise by exercise."}
        </h1>
        <p className="text-sm text-zinc-400 mb-8 max-w-xl">
          Everything here is entirely your own professional input — Planlete doesn't generate,
          check, or suggest any of this content.
        </p>

        {noActiveSubscription && !clientId && (
          <div className="mb-8 border border-[#D4FF00]/30 bg-[#D4FF00]/5 p-4 max-w-xl">
            <p className="text-sm text-white">
              You don't have an active subscription — this client's plan will need a one-off
              payment from them before it unlocks. Subscribe from your dashboard for unlimited
              clients included.
            </p>
          </div>
        )}

        <PlanBuilderForm
          mode="coach"
          initialData={initialData}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={clientId ? "Save changes" : "Create plan"}
          brandLogo={coach.logo_url}
        />
      </div>
    </div>
  );
}
