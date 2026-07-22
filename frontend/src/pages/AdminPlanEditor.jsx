import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "@/components/AdminLayout";
import PlanBuilderForm from "@/components/PlanBuilderForm";
import { ExternalLink, Copy, Check, Search, AlertTriangle } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Loads an already-generated customer plan and lets you hand-edit it week by
 * week using the same builder the manual/coach flows use, then saves it back
 * to the SAME link. Built for one job: salvaging a plan a customer isn't happy
 * with, instead of refunding.
 *
 * A generated plan is four weeks, each with its own days — the builder form
 * handles one set of days at a time, so a week picker sits on top and we edit
 * one week at a time. Everything else (nutrition, recovery) is shared across
 * the plan and edited once.
 */
export default function AdminPlanEditor() {
  const navigate = useNavigate();
  const [token] = useState(() => localStorage.getItem("bfy_admin_token"));
  const [planId, setPlanId] = useState("");
  const [plan, setPlan] = useState(null);
  const [weekIndex, setWeekIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!token) {
    navigate("/admin", { replace: true });
    return null;
  }

  // Accept a full link or a bare ID — pasting the whole customer link is the
  // natural thing to do when someone sends you their plan.
  const extractId = (input) => {
    const m = input.trim().match(/app\/u\/([0-9a-f-]{8,})/i);
    return m ? m[1] : input.trim();
  };

  const load = async () => {
    const id = extractId(planId);
    if (!id) return;
    setLoading(true);
    setNote(null);
    setPlan(null);
    try {
      const res = await axios.get(`${API}/admin/plans/${id}/edit`, {
        headers: { "X-Admin-Token": token },
      });
      if (!Array.isArray(res.data.weeks) || !res.data.weeks.length) {
        setNote({
          type: "error",
          text: "That plan has no editable weeks — it may be a manually built plan. Use the manual builder for those.",
        });
        return;
      }
      setPlan(res.data);
      setWeekIndex(0);
    } catch (err) {
      setNote({
        type: "error",
        text: err.response?.status === 404 ? "No plan with that ID." : "Couldn't load that plan.",
      });
    } finally {
      setLoading(false);
    }
  };

  // The builder form works in {days}. A plan week is {weekNumber, theme, days}.
  // Adapt in and back out so the form never needs to know about weeks.
  const currentWeek = plan?.weeks?.[weekIndex];
  const weekAsFormData = currentWeek
    ? {
        client_name: plan.tagline || "Customer plan",
        structureType: plan.structureType || "days",
        days: currentWeek.days || [],
        nutrition: plan.nutrition || null,
        recovery: plan.recovery || null,
        morningRoutine: plan.morningRoutine || [],
        allow_logging: true,
      }
    : null;

  const saveWeek = async (payload) => {
    setSaving(true);
    setNote(null);
    try {
      // Merge the edited week back into the full plan, leaving the other
      // weeks untouched. Nutrition/recovery/morning are plan-level, so an edit
      // in any week updates them for the whole plan.
      const updatedWeeks = plan.weeks.map((w, i) =>
        i === weekIndex ? { ...w, days: payload.days } : w
      );

      const body = {
        weeks: updatedWeeks,
        nutrition: payload.nutrition,
        recovery: payload.recovery,
        morningRoutine: payload.morningRoutine,
        structureType: payload.structureType,
      };

      await axios.put(`${API}/admin/plans/${plan.id}/edit`, body, {
        headers: { "X-Admin-Token": token },
      });

      setPlan((p) => ({ ...p, ...body }));
      setNote({ type: "ok", text: `Week ${weekIndex + 1} saved. The customer's link now shows the update.` });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setNote({
        type: "error",
        text: err.response?.data?.detail || "Couldn't save. Check every day has at least one entry.",
      });
    } finally {
      setSaving(false);
    }
  };

  const link = plan ? `${window.location.origin}/app/u/${plan.id}` : "";
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <AdminLayout title="Edit a plan">
      <div className="mb-8">
        <p className="text-overline mb-4">— Fix, don't refund</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          Edit a
          <br />
          <span className="text-[#D4FF00]">generated plan.</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-5 max-w-xl leading-relaxed">
          Paste a customer's plan link or ID, adjust anything that needs it, and save. Their
          existing link updates — no new link, no refund. Edit one week at a time.
        </p>
      </div>

      {note && (
        <div
          className={`mb-6 p-4 text-sm border max-w-2xl ${
            note.type === "error"
              ? "border-red-500/30 bg-red-500/5 text-red-300"
              : "border-[#D4FF00]/30 bg-[#D4FF00]/5 text-[#D4FF00]"
          }`}
        >
          {note.text}
        </div>
      )}

      {/* Load */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mb-10">
        <input
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Paste plan link or ID…"
          className="flex-1 bg-black/40 border border-white/15 focus:border-[#D4FF00] outline-none text-sm text-white px-4 py-3"
        />
        <button
          onClick={load}
          disabled={loading || !planId.trim()}
          className="inline-flex items-center justify-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-6 py-3 hover:bg-white transition-colors disabled:opacity-40"
        >
          <Search size={14} />
          {loading ? "Loading…" : "Load plan"}
        </button>
      </div>

      {plan && (
        <>
          {/* Link + provenance */}
          <div className="border border-white/10 p-5 max-w-2xl mb-8">
            <div className="flex items-center gap-2 mb-3">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-4 py-3 hover:bg-white transition-colors"
              >
                Open customer view <ExternalLink size={14} />
              </a>
              <button
                onClick={copyLink}
                className="flex items-center gap-2 border border-white/20 hover:border-[#D4FF00] text-xs font-bold uppercase tracking-wide px-4 py-3 text-white transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            {plan.answers?.goal && (
              <p className="text-xs text-zinc-500">
                {plan.answers.goal}
                {plan.answers.experience ? ` · ${plan.answers.experience}` : ""}
                {plan.edited_by_admin ? " · previously edited" : ""}
              </p>
            )}
            {plan.needs_review && (
              <div className="flex items-start gap-2 text-xs text-yellow-200/90 mt-3 border-t border-white/10 pt-3">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  This plan was delivered after automated checks flagged something they couldn't
                  auto-fix{plan.review_reason ? `: ${plan.review_reason.replace(/^Soft QA issue: /, "")}` : ""}.
                  Worth a quick look.
                </span>
              </div>
            )}
          </div>

          {/* Week picker */}
          <div className="flex flex-wrap gap-2 mb-6">
            {plan.weeks.map((w, i) => (
              <button
                key={i}
                onClick={() => setWeekIndex(i)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wide border transition-colors ${
                  i === weekIndex
                    ? "border-[#D4FF00] text-[#D4FF00] bg-[#D4FF00]/5"
                    : "border-white/15 text-zinc-400 hover:border-white/40"
                }`}
              >
                Week {i + 1}
                {w.theme ? ` · ${w.theme}` : ""}
              </button>
            ))}
          </div>

          <div className="flex items-start gap-2 text-xs text-zinc-500 mb-8 max-w-2xl">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              Renaming an exercise resets that exercise's logged history for the customer, since
              logs are matched by name. Fine for a fresh complaint; avoid wholesale renaming if
              they're already weeks in.
            </span>
          </div>

          {/* The builder, one week at a time. Keyed on weekIndex so switching
              week fully re-initialises the form with that week's days. */}
          <PlanBuilderForm
            key={`${plan.id}-${weekIndex}`}
            mode="admin"
            initialData={weekAsFormData}
            onSubmit={saveWeek}
            submitting={saving}
            submitLabel={`Save week ${weekIndex + 1}`}
          />
        </>
      )}
    </AdminLayout>
  );
}
