import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Check, ArrowLeft } from "lucide-react";
import { track } from "@/lib/analytics";
import { usePricing } from "@/lib/pricing";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Follow-on block. Someone who already owns a generated plan comes back
 * because something changed — an injury, fewer days, different equipment, a
 * trip, or they simply finished the four weeks. Rather than making them sit
 * through the questionnaire again, this inherits everything they told us the
 * first time and only asks what is different.
 *
 * The same price as any other plan. The backend receives derived_from plus
 * this change request and builds the next block from the previous one.
 */

const REASONS = [
  { id: "injury", label: "Something's injured or sore", detailPrompt: "What's up, and what does it stop you doing?" },
  { id: "days", label: "My training days have changed", detailPrompt: "What does your week look like now?" },
  { id: "equipment", label: "My equipment or gym has changed", detailPrompt: "What have you got access to now?" },
  { id: "travel", label: "I'm away and need to train elsewhere", detailPrompt: "Where are you, and what's the gym like?" },
  { id: "finished", label: "I've finished the four weeks", detailPrompt: "How did it go? Anything you'd change?" },
  { id: "harder", label: "I want it harder or easier", detailPrompt: "Which way, and where?" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function RebuildPlan() {
  const { id } = useParams();
  const { plan: planPrice } = usePricing();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [reasons, setReasons] = useState([]);
  const [detail, setDetail] = useState("");
  const [keep, setKeep] = useState("");
  const [days, setDays] = useState("");
  const [clubDays, setClubDays] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/plans/${id}`)
      .then((res) => setPlan(res.data))
      .catch(() => setError("We couldn't find that plan."));
  }, [id]);

  const toggleReason = (r) =>
    setReasons((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const toggleClubDay = (d) =>
    setClubDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const submit = async () => {
    if (!reasons.length) {
      toast.error("Tell us what's changed first");
      return;
    }
    setSubmitting(true);
    track("rebuild_started", { reasons });
    track("checkout_opened", { kind: "derived" });
    try {
      const res = await axios.post(`${API}/checkout/create-session`, {
        derived_from: id,
        change_request: {
          reasons: reasons.map((r) => REASONS.find((x) => x.id === r)?.label || r),
          detail: detail.trim(),
          keep: keep.trim(),
          ...(days ? { days } : {}),
          ...(clubDays.length ? { club_days: clubDays } : {}),
        },
      });
      window.location.href = res.data.checkout_url;
    } catch (e) {
      console.error("Follow-on checkout failed:", e);
      toast.error(
        e?.response?.data?.detail || "Couldn't start checkout. Try again."
      );
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">{error}</p>
          <Link to="/" className="text-[#D4FF00] underline">Back to Planlete</Link>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <p className="text-overline text-zinc-500">Loading your plan…</p>
      </div>
    );
  }

  const selectedDetailPrompt =
    REASONS.find((r) => r.id === reasons[0])?.detailPrompt ||
    "Anything else we should know?";

  const optionClass = (active) =>
    `text-left px-5 py-4 border transition-all ${
      active
        ? "border-[#D4FF00] bg-[#D4FF00]/5 text-white"
        : "border-white/15 text-zinc-300 hover:border-white/40 hover:text-white"
    }`;

  const inputClass =
    "w-full bg-transparent border border-white/15 focus:border-[#D4FF00] outline-none px-4 py-3 text-sm text-white placeholder:text-white/25";

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          to={`/app/u/${id}`}
          className="inline-flex items-center gap-2 text-overline text-zinc-500 hover:text-white transition-colors mb-10"
        >
          <ArrowLeft size={14} /> Back to my plan
        </Link>

        <p className="text-overline text-[#D4FF00] mb-4">Your next block</p>
        <h1 className="font-display text-4xl sm:text-6xl mb-5">
          Something changed?
        </h1>
        <p className="text-zinc-400 leading-relaxed mb-10 max-w-xl">
          We'll build your next four weeks from the plan you've already got — same goal,
          same history, adjusted for whatever's different. You won't have to answer the
          questionnaire again.
        </p>

        {/* What changed */}
        <p className="text-overline text-zinc-500 mb-4">What's changed?</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          {REASONS.map((r) => {
            const active = reasons.includes(r.id);
            return (
              <button key={r.id} onClick={() => toggleReason(r.id)} className={optionClass(active)}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base">{r.label}</span>
                  {active && <Check size={16} className="text-[#D4FF00] shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Conditional: days changed */}
        {reasons.includes("days") && (
          <div className="mb-10">
            <p className="text-overline text-zinc-500 mb-4">How many days can you train now?</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {["2", "3", "4", "5", "6"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-5 py-3 border transition-all ${
                    days === d
                      ? "border-[#D4FF00] bg-[#D4FF00]/5 text-white"
                      : "border-white/15 text-zinc-300 hover:border-white/40"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
            <p className="text-overline text-zinc-500 mb-3">
              Club or squad training days, if any
            </p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleClubDay(d)}
                  className={`px-4 py-2 text-sm border transition-all ${
                    clubDays.includes(d)
                      ? "border-[#D4FF00] bg-[#D4FF00]/5 text-white"
                      : "border-white/15 text-zinc-400 hover:border-white/40"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Detail */}
        <div className="mb-8">
          <p className="text-overline text-zinc-500 mb-3">{selectedDetailPrompt}</p>
          <textarea
            rows={4}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="The more specific you are, the better the next block will be."
            className={inputClass}
          />
          <p className="text-xs text-zinc-600 mt-3">
            Anything health-related you mention is only ever used to build your plan safely.
            If something's painful, get it looked at by a professional — this doesn't replace that.
          </p>
        </div>

        <div className="mb-10">
          <p className="text-overline text-zinc-500 mb-3">
            Anything you want kept? <span className="text-zinc-600">(optional)</span>
          </p>
          <textarea
            rows={2}
            value={keep}
            onChange={(e) => setKeep(e.target.value)}
            placeholder="e.g. keep the Tuesday upper session, I've been loving it"
            className={inputClass}
          />
        </div>

        <div className="border-t border-white/10 pt-8">
          <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
            Your new block is a separate plan at its own link — the one you're on now
            keeps working, so nothing you've logged is lost.
          </p>
          <button
            onClick={submit}
            disabled={submitting || !reasons.length}
            className="w-full sm:w-auto bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-sm px-8 py-4 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Starting checkout…" : `Build my next block — ${planPrice}`}
          </button>
        </div>
      </div>
    </div>
  );
}
