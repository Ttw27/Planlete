import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
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
        if (alive) {
          setPlan(res.data);
          track("plan_opened");
        }
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
  let cycleNumber = 1;
  if (weeks.length > 1) {
    const createdAt = plan.created_at ? new Date(plan.created_at) : new Date();
    const daysElapsed = Math.max(
      0,
      Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );
    const weeksElapsed = Math.floor(daysElapsed / 7);
    weekIndex = weeksElapsed % weeks.length;
    // Which time through the block they are on. Past the first cycle the plan
    // repeats — saying so plainly is better than relabelling the same sessions
    // as though they were new programming, which they would notice anyway.
    cycleNumber = Math.floor(weeksElapsed / weeks.length) + 1;
    currentWeek = weeks[weekIndex] || weeks[0];

    if (cycleNumber === 1) {
      weekLabel = ` · Week ${weekIndex + 1}/${weeks.length}${
        currentWeek?.theme ? ` — ${currentWeek.theme}` : ""
      }`;
    } else {
      weekLabel = ` · Cycle ${cycleNumber} · Week ${weekIndex + 1}/${weeks.length} — same sessions, aim heavier`;
    }
  }

  const data = {
    brand: plan.brand || `${name}'s App`,
    tagline: `${goal}${weekLabel}`,
    hero: heroForGoal(goal),
    structureType: plan.structureType || "days",
    days: currentWeek?.days || [],
    nutrition: plan.nutrition,
    recovery: plan.recovery,
    morningRoutine: plan.morningRoutine,
  };

  // absoluteWeek keeps climbing across cycles (5, 6, 7...) so logged-weight
  // comparisons don't collide when the week number resets to 1 on cycle 2.
  const absoluteWeek = (cycleNumber - 1) * weeks.length + weekIndex + 1;

  // Follow-on blocks only make sense for generated plans — a manually
  // authored one has no questionnaire behind it to derive from.
  const canRebuild = Boolean(plan.answers?.goal) && !plan.manually_authored && !plan.sample_mode;

  return (
    <>
      <AppShell
        data={data}
        planId={plan.id}
        weekNumber={weekIndex + 1}
        absoluteWeek={absoluteWeek}
        cycleNumber={cycleNumber}
        totalWeeks={weeks.length}
        allWeeks={weeks}
        activeWeekIndex={weekIndex}
        sampleMode={Boolean(plan.sample_mode)}
      />
      {canRebuild && <PlanFooterActions plan={plan} />}
    </>
  );
}

/**
 * Everything that lives beneath the plan itself: the correction window while
 * it's still open, and the follow-on block route once it isn't. Deliberately
 * one component — from the customer's point of view "something's wrong" and
 * "something's changed" are the same impulse arriving at different times.
 */
function PlanFooterActions({ plan }) {
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/plans/${plan.id}/edit-status`)
      .then((res) => setStatus(res.data))
      .catch(() => setStatus({ editable: false, reason: "not_available" }));
  }, [plan.id]);

  const submitTweak = async () => {
    if (message.trim().length < 10) {
      toast.error("Tell us a bit more about what's wrong");
      return;
    }
    setSending(true);
    try {
      await axios.post(`${API}/plans/${plan.id}/tweak-request`, { message: message.trim() });
      setSent(true);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't send that. Try again.");
    } finally {
      setSending(false);
    }
  };

  const deadline = status?.until
    ? new Date(status.until).toLocaleString("en-GB", {
        weekday: "long", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div className="bg-[#050505] border-t border-white/10 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {status?.editable && (
          <div className="border border-[#D4FF00]/30 bg-[#D4FF00]/5 p-5">
            <p className="text-overline text-[#D4FF00] mb-2">
              Correctable until {deadline}
            </p>
            {sent ? (
              <p className="text-sm text-zinc-300 leading-relaxed">
                Got it — we'll look at your plan personally and come back to you by email.
                Your plan stays exactly as it is in the meantime.
              </p>
            ) : (
              <>
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                  Something not right? Tell us now and we'll fix it. This closes after
                  48 hours, or once you log your first session.
                </p>
                {open ? (
                  <div className="space-y-3">
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. I said 3 days but it's given me 5, or the volume is far too low for my experience"
                      className="w-full bg-transparent border border-white/15 focus:border-[#D4FF00] outline-none px-4 py-3 text-sm text-white placeholder:text-white/25"
                    />
                    <button
                      onClick={submitTweak}
                      disabled={sending}
                      className="bg-[#D4FF00] text-black text-[11px] font-bold uppercase tracking-wide px-5 py-3 hover:bg-white transition-colors disabled:opacity-40"
                    >
                      {sending ? "Sending…" : "Send it"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setOpen(true)}
                    className="border border-[#D4FF00]/40 text-[#D4FF00] text-[11px] font-bold uppercase tracking-wide px-5 py-3 hover:bg-[#D4FF00] hover:text-black transition-colors"
                  >
                    Something's wrong with my plan
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div>
          <p className="text-overline text-[#D4FF00] mb-3">Something changed?</p>
          <p className="text-zinc-400 text-sm leading-relaxed mb-5 max-w-xl">
            Picked up an injury, lost a training day, away for a fortnight, or just
            finished the four weeks? We'll build your next block from this one — same
            goal, same history, adjusted. No questionnaire to fill in again.
          </p>
          <Link
            to={`/app/u/${plan.id}/next`}
            className="inline-block border border-[#D4FF00]/40 text-[#D4FF00] text-[11px] font-bold uppercase tracking-wide px-5 py-3 hover:bg-[#D4FF00] hover:text-black transition-colors"
          >
            Build my next block
          </Link>
        </div>
      </div>
    </div>
  );
}
