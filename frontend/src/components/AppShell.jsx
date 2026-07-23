import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, Dumbbell, Salad, Moon, ArrowLeft, Share2, Info, HelpCircle, ExternalLink, Clock, PenLine, Check, Sunrise } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function parseDurationSeconds(value) {
  if (!value) return null;
  const str = String(value).trim().toLowerCase();
  const minMatch = str.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1], 10) * 60;
  const secMatch = str.match(/(\d+)\s*s/);
  if (secMatch) return parseInt(secMatch[1], 10);
  const bareNum = str.match(/^(\d+)$/);
  if (bareNum) return parseInt(bareNum[1], 10);
  return null;
}

// Extracts the first number AND trailing unit from a logged value like
// "82.5kg" or "12 reps", so we can suggest a sensible next value in the same
// units, not just compare raw numbers.
function parseLoggedNumber(value) {
  if (!value) return null;
  const match = String(value).match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function parseLoggedUnit(value) {
  if (!value) return "";
  const match = String(value).match(/\d+(\.\d+)?\s*([a-zA-Z]+)/);
  return match ? match[2] : "";
}

// Looks at an exercise's logged history (already sorted by week ascending)
// and returns a short nudge with a colour — or null if there's not enough
// data yet, or the values aren't numeric enough to compare.
// tone: "up" (accent) | "flat" (yellow — same as last time) | "down" (red)
function getProgressNudge(exerciseHistory, currentWeek) {
  if (!exerciseHistory || exerciseHistory.length < 2) return null;

  // Only compare weeks up to and including the one currently being viewed —
  // no point nudging about a future week that hasn't happened yet.
  const relevant = currentWeek
    ? exerciseHistory.filter((h) => h.weekNumber <= currentWeek)
    : exerciseHistory;
  if (relevant.length < 2) return null;

  const latest = relevant[relevant.length - 1];
  const previous = relevant[relevant.length - 2];
  const latestNum = parseLoggedNumber(latest.value);
  const prevNum = parseLoggedNumber(previous.value);
  if (latestNum === null || prevNum === null) return null;

  if (latestNum > prevNum) {
    return { tone: "up", text: `Up from ${previous.value} last time — nice progress 💪` };
  }

  if (latestNum === prevNum) {
    return { tone: "flat", text: `Same as last time (${previous.value}) — try pushing a little more` };
  }

  return { tone: "down", text: `Lower than last time (${previous.value}) — that's fine, listen to your body` };
}

// Proactively suggests a next value BEFORE they log this week, based on
// their most recent entry. If the exercise has a configured progression rate
// (set in the builder), uses that exactly — otherwise falls back to a
// sensible generic bump in the same units they were already using. Returns
// null if there's no prior entry to build from, or nothing numeric to work
// with.
function getSuggestedValue(exerciseHistory, workout) {
  if (!exerciseHistory || exerciseHistory.length === 0) return null;
  const last = exerciseHistory[exerciseHistory.length - 1];
  const num = parseLoggedNumber(last.value);
  if (num === null) return null;
  const unit = parseLoggedUnit(last.value);

  let bump;
  if (workout?.progressionType && workout?.progressionRate) {
    const rate = Number(workout.progressionRate);
    bump = workout.progressionMode === "percent" ? num * (rate / 100) : rate;
  } else if (/kg|lb/i.test(unit)) {
    bump = 2.5;
  } else if (/rep/i.test(unit)) {
    bump = 1;
  } else {
    bump = Math.max(1, Math.round(num * 0.025)); // ~2.5% generic fallback
  }

  const suggested = Math.round((num + bump) * 100) / 100; // avoid float noise
  return `${suggested}${unit ? unit : ""}`;
}

/**
 * AppShell — phone-style container for the sample/generated training apps.
 * Includes a top bar, content area, and bottom nav with view switching.
 */
/**
 * Shown once the person has been through the whole block at least once.
 *
 * Previously the plan simply looped back to week 1 with no acknowledgement,
 * which meant the single clearest moment to offer them the next block passed
 * completely unmarked — and anyone paying attention just saw their "new" week
 * was the same as their first. This says plainly that the block repeats, keeps
 * repeating it as a legitimate free option, and gets firmer the longer they
 * stay on it, because by month three the same block genuinely is the wrong
 * training.
 */
function BlockCompleteBanner({ cycleNumber = 1, totalWeeks = 4 }) {
  const dismissKey = `planlete_block_notice_${cycleNumber}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(dismissKey) === "1";
    } catch {
      return false;
    }
  });

  if (cycleNumber < 2 || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(dismissKey, "1");
    } catch {
      /* dismissal is not worth failing over */
    }
  };

  const stale = cycleNumber >= 3;
  const weeksDone = (cycleNumber - 1) * (totalWeeks || 4);

  return (
    <div className="mx-4 mb-4 border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-overline text-[var(--accent)] mb-2">
            {stale ? `${weeksDone} weeks on this block` : "Block complete"}
          </p>
          <p className="text-sm leading-relaxed text-white/90">
            {stale
              ? `You've been running this block for ${weeksDone} weeks. It's done its job — a fresh
                 one built around where you are now will get you further than repeating this again.`
              : `Nice work — that's ${weeksDone} weeks done. This block now repeats: the same
                 sessions, but you should be beating the numbers you logged last time.`}
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <a
              href="/build"
              className="inline-block bg-[var(--accent)] text-black font-bold uppercase tracking-wider text-[11px] px-5 py-2.5"
            >
              Build my next block
            </a>
            <button
              onClick={dismiss}
              className="text-[11px] uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
            >
              Keep going with this one
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ data, mode, modeToggle = null, planId = null, weekNumber = null, absoluteWeek = null, cycleNumber = 1, totalWeeks = null, allWeeks = null, activeWeekIndex = 0, initialView = "home", initialTrainingDay = null, compact = false, brandLogo = null }) {
  const [view, setView] = useState(initialView);

  // Which week is being LOOKED at. Defaults to the one they are actually in.
  // Browsing ahead is a read-only preview: the plan they paid for is four weeks
  // long, and previously only the current week was ever visible, so a full
  // programme looked like a handful of sessions.
  const [viewingWeek, setViewingWeek] = useState(activeWeekIndex);
  const hasWeekBrowsing = Array.isArray(allWeeks) && allWeeks.length > 1;
  const isPreviewWeek = hasWeekBrowsing && viewingWeek !== activeWeekIndex;
  const navigate = useNavigate();

  // Logs and checklist ticks key off the ABSOLUTE week, which keeps climbing
  // across cycles (5, 6, 7...). During cycle 1 this is identical to weekNumber,
  // so nothing already stored is orphaned — but it stops cycle 2's "week 1"
  // overwriting cycle 1's, which would have broken every progress comparison
  // at exactly the point they start mattering.
  const logWeek = absoluteWeek || weekNumber;

  // When browsing another week, show that week's days instead of the live one.
  const days = (hasWeekBrowsing && allWeeks[viewingWeek]?.days)
    || data.days
    || (mode && data.modes?.[mode]?.days)
    || [];
  const nutrition = data.nutrition || data.modes?.[mode]?.nutrition;
  const recovery = data.recovery;
  const morningRoutine = data.morningRoutine;
  const structureType = data.structureType || "days";

  // ── Checklist completion (localStorage — losing a tick is no big deal) ──
  const checklistStorageKey = `planlete_checklist_${planId || "sample"}`;
  const [completed, setCompleted] = useState(() => {
    try {
      const raw = window.localStorage.getItem(checklistStorageKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleDone = (key) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        window.localStorage.setItem(checklistStorageKey, JSON.stringify([...next]));
      } catch {
        // localStorage unavailable — completion just won't persist, not fatal
      }
      return next;
    });
  };

  // ── Weight/effort logging (backend-stored — this is data people actually
  // want to keep, so it lives on the server, not the phone) ──
  const [logs, setLogs] = useState({}); // key: `${week}-${day}-${exerciseName}` -> latest value
  const [history, setHistory] = useState({}); // exerciseName -> [{weekNumber, value}] sorted by week

  useEffect(() => {
    if (!planId) return;
    let alive = true;
    axios
      .get(`${API}/logs/${planId}`)
      .then((res) => {
        if (!alive) return;
        const map = {};
        // API returns newest first — first occurrence per key wins, so it's the latest
        for (const entry of res.data) {
          const key = `${entry.week_number}-${entry.day}-${entry.exercise_name}`;
          if (!(key in map)) map[key] = entry.value;
        }
        setLogs(map);

        // Build per-exercise history for progressive-overload nudges: one
        // (latest) value per exercise name per week, sorted week ascending.
        const byExercise = {};
        for (const entry of res.data) {
          const list = byExercise[entry.exercise_name] || (byExercise[entry.exercise_name] = {});
          // res.data is newest-first, so the first time we see a given week
          // for this exercise is already its latest logged value that week.
          if (!(entry.week_number in list)) list[entry.week_number] = entry.value;
        }
        const historyMap = {};
        for (const [name, weekMap] of Object.entries(byExercise)) {
          historyMap[name] = Object.entries(weekMap)
            .map(([wk, value]) => ({ weekNumber: parseInt(wk, 10), value }))
            .sort((a, b) => a.weekNumber - b.weekNumber);
        }
        setHistory(historyMap);
      })
      .catch(() => {
        // Non-fatal — logging just won't show prior values this session
      });
    return () => {
      alive = false;
    };
  }, [planId]);

  const saveLog = async (day, exerciseName, value) => {
    const key = `${logWeek || 0}-${day}-${exerciseName}`;
    setLogs((prev) => ({ ...prev, [key]: value })); // optimistic
    if (!planId) return;
    try {
      await axios.post(`${API}/logs`, {
        plan_id: planId,
        week_number: logWeek || 0,
        day,
        exercise_name: exerciseName,
        value,
      });
    } catch {
      toast.error("Couldn't save that log — check your connection and try again.");
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("App link copied to clipboard");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <div className={`${compact ? "h-full" : "min-h-screen"} bg-[var(--brand-bg)] text-white ${compact ? "" : "pt-6 pb-6 md:py-12 px-3 md:px-6"}`}>
      {/* Phone frame */}
      <div
        data-testid="app-shell"
        className={`relative mx-auto w-full ${compact ? "h-full" : "max-w-[440px] min-h-[80vh]"} bg-[#0a0a0a] border border-white/10 overflow-hidden flex flex-col`}
        style={compact ? {} : { boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        {/* Planlete strip — shown on every plan, personal or business */}
        <div className="w-full bg-black py-1.5 text-center border-b border-white/5 shrink-0">
          <a
            href="https://www.planlete.co.uk/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] tracking-[0.25em] uppercase text-[var(--accent)] hover:underline"
          >
            Planlete
          </a>
        </div>

        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <button
            data-testid="app-back-button"
            onClick={() => navigate("/")}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Back to landing"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-overline text-[10px] leading-none">
              {data.brand}
            </p>
            <p className="text-xs text-white/80 mt-1">{data.tagline}</p>
          </div>
          <button
            data-testid="app-share-button"
            onClick={share}
            className="text-zinc-400 hover:text-[var(--accent)] transition-colors"
            aria-label="Share app"
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* Mode toggle (football only) */}
        {modeToggle}

        {/* Week selector — lets them see the whole programme they paid for,
            not just the week they happen to be in. Other weeks are read-only. */}
        {hasWeekBrowsing && (
          <div className="border-b border-white/10">
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 py-3">
              {allWeeks.map((w, i) => (
                <button
                  key={i}
                  onClick={() => setViewingWeek(i)}
                  className={`shrink-0 px-3 py-1.5 border text-xs uppercase tracking-wider transition-colors ${
                    i === viewingWeek
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-white/10 text-zinc-500 hover:border-white/30 hover:text-white"
                  }`}
                >
                  Week {i + 1}
                  {i === activeWeekIndex ? " · now" : ""}
                </button>
              ))}
            </div>
            {isPreviewWeek && (
              <p className="px-5 pb-3 text-xs text-zinc-500">
                Previewing week {viewingWeek + 1} — you're currently in week {activeWeekIndex + 1}.
                Ticking and logging stay on your current week.
              </p>
            )}
          </div>
        )}

        <BlockCompleteBanner cycleNumber={cycleNumber} totalWeeks={totalWeeks} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-24">
          {view === "home" && (
            <HomeView
              data={data}
              days={days}
              morningRoutine={morningRoutine}
              nutrition={nutrition}
              weekNumber={logWeek}
              completed={completed}
              onToggleDone={toggleDone}
              logs={logs}
              history={history}
              onSaveLog={saveLog}
              canLog={Boolean(planId) && !isPreviewWeek}
              setView={setView}
              brandLogo={brandLogo}
              structureType={structureType}
            />
          )}
          {view === "training" && (
            <TrainingView
              days={days}
              weekNumber={logWeek}
              completed={completed}
              onToggleDone={toggleDone}
              logs={logs}
              history={history}
              onSaveLog={saveLog}
              canLog={Boolean(planId) && !isPreviewWeek}
              initialSelectedDay={initialTrainingDay}
              structureType={structureType}
            />
          )}
          {view === "morning" && (
            <MorningView
              morningRoutine={morningRoutine}
              completed={completed}
              onToggleDone={toggleDone}
              logs={logs}
              history={history}
              onSaveLog={saveLog}
              canLog={Boolean(planId) && !isPreviewWeek}
              weekNumber={logWeek}
            />
          )}
          {view === "nutrition" && nutrition && (
            <NutritionView nutrition={nutrition} />
          )}
          {view === "recovery" && (
            <RecoveryView recovery={recovery} />
          )}
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-t border-white/10 grid grid-cols-5">
          <BottomTab
            id="home"
            label="Today"
            icon={<Home size={18} />}
            view={view}
            setView={setView}
          />
          <BottomTab
            id="training"
            label="Train"
            icon={<Dumbbell size={18} />}
            view={view}
            setView={setView}
          />
          <BottomTab
            id="morning"
            label="Morning"
            icon={<Sunrise size={18} />}
            view={view}
            setView={setView}
          />
          {nutrition && (
            <BottomTab
              id="nutrition"
              label="Fuel"
              icon={<Salad size={18} />}
              view={view}
              setView={setView}
            />
          )}
          <BottomTab
            id="recovery"
            label="Recover"
            icon={<Moon size={18} />}
            view={view}
            setView={setView}
          />
        </div>
      </div>

      <div className="text-center mt-6">
        {planId ? (
          <>
            <Link
              to="/build"
              data-testid="upgrade-cta"
              className="inline-flex items-center gap-2 border border-white/20 text-white font-bold uppercase tracking-wider text-xs px-5 py-3 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              Create your new plan — £4.99 →
            </Link>
            <p className="text-xs text-zinc-500 mt-3">
              Goals changed? Injury? Just build a fresh app whenever you need to.
            </p>
          </>
        ) : (
          <>
            <Link
              to="/build"
              data-testid="upgrade-cta"
              className="inline-flex items-center gap-2 bg-[var(--accent)] text-black font-bold uppercase tracking-wider text-xs px-5 py-3 hover:bg-white transition-colors"
            >
              Build mine — £4.99 →
            </Link>
            <p className="text-xs text-zinc-500 mt-3">
              This is a sample. Yours is fully personalised.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function BottomTab({ id, label, icon, view, setView }) {
  const active = view === id;
  return (
    <button
      data-testid={`app-tab-${id}`}
      onClick={() => setView(id)}
      className={`flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
        active ? "text-[var(--accent)]" : "text-zinc-500 hover:text-white"
      }`}
    >
      {icon}
      <span className="text-[10px] uppercase tracking-widest">{label}</span>
    </button>
  );
}

function HomeView({ data, days, morningRoutine, nutrition, weekNumber, completed, onToggleDone, logs, history, onSaveLog, canLog, setView, brandLogo, structureType = "days" }) {
  // Phases have no auto-detection (nobody knows "which phase" from a date
  // alone) — just default to the first one; day-based plans still pick
  // today's real weekday as before.
  const todayIndex = structureType === "phases" ? 0 : Math.min(new Date().getDay(), days.length - 1);
  const today = days[todayIndex] || days[0];

  const todayKeys = today.workouts.map((_, i) => `${weekNumber || 0}-${today.day}-${i}`);
  const todayDone = todayKeys.filter((k) => completed.has(k)).length;

  const heroLabel = structureType === "phases" ? `Current phase · ${today.day}` : `Today · ${today.day}`;

  return (
    <div className="flex flex-col">
      {/* Hero — business/branded plans get a short, replaceable logo strip
          with the day info below it; personal AI/self-serve apps keep the
          full photo hero with text overlaid on top. */}
      {brandLogo ? (
        <>
          <div className="w-full h-20 bg-black border-b border-white/10 flex items-center justify-center overflow-hidden">
            <img src={brandLogo} alt="" className="max-h-full max-w-[60%] object-contain" />
          </div>
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-overline">{heroLabel}</p>
            <h2 className="font-display text-2xl mt-1">{today.label}</h2>
            <p className="text-sm text-zinc-400 mt-1">{today.focus}</p>
          </div>
        </>
      ) : (
        <div className="relative h-56 overflow-hidden">
          <img
            src={data.hero}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-overline">{heroLabel}</p>
            <h2 className="font-display text-3xl mt-2">{today.label}</h2>
            <p className="text-sm text-zinc-300 mt-1">{today.focus}</p>
          </div>
        </div>
      )}

      {/* Today workouts */}
      <div className="px-5 py-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-overline">{structureType === "phases" ? "This phase" : "Today's session"}</p>
          <p className="text-[10px] font-mono-display text-zinc-500">
            {todayDone}/{today.workouts.length} done
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {today.workouts.slice(0, 4).map((w, i) => (
            <WorkoutRow
              key={i}
              w={w}
              checked={completed.has(`${weekNumber || 0}-${today.day}-${i}`)}
              onToggleChecked={() => onToggleDone(`${weekNumber || 0}-${today.day}-${i}`)}
              loggedValue={logs[`${weekNumber || 0}-${today.day}-${w.name}`]}
              exerciseHistory={history?.[w.name]}
              currentWeek={weekNumber}
              onSaveLog={(value) => onSaveLog(today.day, w.name, value)}
              canLog={canLog}
            />
          ))}
          {today.workouts.length > 4 && (
            <button
              onClick={() => setView?.("training")}
              className="text-xs text-zinc-500 mt-2 hover:text-[var(--accent)] transition-colors text-left"
            >
              + {today.workouts.length - 4} more · open Train tab
            </button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      {nutrition && (
        <div className="px-5 py-5 border-t border-white/10 grid grid-cols-4 gap-2">
          <Stat label="Cal" value={nutrition.calories} />
          <Stat label="Protein" value={`${nutrition.protein}g`} />
          <Stat label="Carbs" value={`${nutrition.carbs}g`} />
          <Stat label="Fats" value={`${nutrition.fats}g`} />
        </div>
      )}

      {/* Morning routine — compact summary, full experience lives in its own tab */}
      {morningRoutine && morningRoutine.length > 0 && (
        <button
          onClick={() => setView?.("morning")}
          className="px-5 py-5 border-t border-white/10 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Sunrise size={18} className="text-[var(--accent)]" />
            <div>
              <p className="text-overline">Morning routine</p>
              <p className="text-xs text-zinc-500 mt-0.5">{morningRoutine.length} items · timer & tips inside</p>
            </div>
          </div>
          <p className="text-[10px] font-mono-display text-zinc-500">
            {morningRoutine.filter((_, i) => completed.has(`morning-${i}`)).length}/{morningRoutine.length} done
          </p>
        </button>
      )}

      {/* Quick links to fill remaining space */}
      <div className="px-5 py-5 border-t border-white/10">
        <p className="text-overline mb-3">Jump to</p>
        <div className={`grid gap-2 ${nutrition ? "grid-cols-4" : "grid-cols-3"}`}>
          <button
            onClick={() => setView?.("training")}
            className="border border-white/10 hover:border-[var(--accent)] px-3 py-4 flex flex-col items-center gap-2 text-zinc-300 hover:text-white transition-colors"
          >
            <Dumbbell size={18} />
            <span className="text-[10px] uppercase tracking-widest">Train</span>
          </button>
          <button
            onClick={() => setView?.("morning")}
            className="border border-white/10 hover:border-[var(--accent)] px-3 py-4 flex flex-col items-center gap-2 text-zinc-300 hover:text-white transition-colors"
          >
            <Sunrise size={18} />
            <span className="text-[10px] uppercase tracking-widest">Morning</span>
          </button>
          {nutrition && (
            <button
              onClick={() => setView?.("nutrition")}
              className="border border-white/10 hover:border-[var(--accent)] px-3 py-4 flex flex-col items-center gap-2 text-zinc-300 hover:text-white transition-colors"
            >
              <Salad size={18} />
              <span className="text-[10px] uppercase tracking-widest">Fuel</span>
            </button>
          )}
          <button
            onClick={() => setView?.("recovery")}
            className="border border-white/10 hover:border-[var(--accent)] px-3 py-4 flex flex-col items-center gap-2 text-zinc-300 hover:text-white transition-colors"
          >
            <Moon size={18} />
            <span className="text-[10px] uppercase tracking-widest">Recover</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MorningView({ morningRoutine, completed, onToggleDone, logs, history, onSaveLog, canLog, weekNumber }) {
  const items = morningRoutine || [];
  const doneCount = items.filter((_, i) => completed.has(`morning-${i}`)).length;

  return (
    <div className="flex flex-col">
      <div className="px-5 py-5 border-b border-white/10">
        <p className="text-overline text-[var(--accent)] mb-2">Morning routine</p>
        <h2 className="font-display text-2xl">Start the day right.</h2>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-overline">Today&apos;s items</p>
          <p className="text-[10px] font-mono-display text-zinc-500">{doneCount}/{items.length} done</p>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">No morning routine added for this plan.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item, i) => {
              // Older test plans stored plain strings — handle gracefully.
              const w = typeof item === "string" ? { name: item, sets: "", load: "", rest: "" } : item;
              const key = `morning-${i}`;
              return (
                <WorkoutRow
                  key={i}
                  w={w}
                  checked={completed.has(key)}
                  onToggleChecked={() => onToggleDone(key)}
                  loggedValue={logs[`${weekNumber || 0}-Morning-${w.name}`]}
                  exerciseHistory={history?.[w.name]}
                  onSaveLog={(value) => onSaveLog("Morning", w.name, value)}
                  canLog={canLog}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TrainingView({ days, weekNumber, completed, onToggleDone, logs, history, onSaveLog, canLog, initialSelectedDay = null, structureType = "days" }) {
  const isPhases = structureType === "phases";
  const todayIndex = isPhases ? -1 : Math.min(new Date().getDay(), days.length - 1); // -1 = no "today" concept for phases
  const [selected, setSelected] = useState(initialSelectedDay ?? (isPhases ? 0 : todayIndex));

  // Keep following the builder's active day tab as it changes, so the live
  // preview always shows exactly what's being edited right now.
  useEffect(() => {
    if (initialSelectedDay !== null && initialSelectedDay !== undefined) {
      setSelected(initialSelectedDay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedDay]);

  const d = days[selected] || days[0];

  const dayKeys = d.workouts.map((_, j) => `${weekNumber || 0}-${d.day}-${j}`);
  const dayDone = dayKeys.filter((k) => completed.has(k)).length;

  return (
    <div className="flex flex-col">
      {/* Clickable day/phase selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 py-4 border-b border-white/10 sticky top-0 bg-[#0a0a0a] z-10">
        {days.map((day, i) => (
          <button
            key={day.day + i}
            onClick={() => setSelected(i)}
            className={`shrink-0 px-3 py-2 border text-left transition-colors ${
              i === selected
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-white"
            }`}
          >
            <p className="text-[10px] uppercase tracking-widest flex items-center gap-1">
              {day.day}
              {i === todayIndex && <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />}
            </p>
            <p className="text-xs mt-1">{day.label}</p>
            {isPhases && day.dateRange && (
              <p className="text-[9px] mt-0.5 text-zinc-600">{day.dateRange}</p>
            )}
          </button>
        ))}
      </div>

      <div className="px-5 py-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="text-overline">
              {d.day}
              {!isPhases && selected === todayIndex ? " · Today" : ""}
            </p>
            <h3 className="font-display text-xl mt-1">{d.label}</h3>
            {isPhases && d.dateRange && <p className="text-xs text-zinc-500 mt-0.5">{d.dateRange}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">{d.focus}</p>
            <p className="text-[10px] font-mono-display text-zinc-600 mt-1">
              {dayDone}/{d.workouts.length} done
            </p>
          </div>
        </div>

        {/* Workout for selected day */}
        <p className="text-overline mb-3">Workout</p>
        <div className="flex flex-col gap-2">
          {d.workouts.map((w, j) => (
            <WorkoutRow
              key={j}
              w={w}
              checked={completed.has(`${weekNumber || 0}-${d.day}-${j}`)}
              onToggleChecked={() => onToggleDone(`${weekNumber || 0}-${d.day}-${j}`)}
              loggedValue={logs[`${weekNumber || 0}-${d.day}-${w.name}`]}
              exerciseHistory={history?.[w.name]}
              currentWeek={weekNumber}
              onSaveLog={(value) => onSaveLog(d.day, w.name, value)}
              canLog={canLog}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RestTimer({ seconds }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(t);
  }, [running, remaining]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const finished = remaining <= 0;

  return (
    <div className="flex items-center justify-between gap-3">
      <p className={`font-mono-display text-2xl ${finished ? "text-white" : "text-[var(--accent)]"}`}>
        {finished ? "Done" : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`}
      </p>
      <div className="flex gap-2">
        {!finished && (
          <button
            onClick={() => setRunning((r) => !r)}
            className="border border-white/15 hover:border-[var(--accent)] text-zinc-300 hover:text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 transition-colors"
          >
            {running ? "Pause" : "Start"}
          </button>
        )}
        {!finished && (
          <button
            onClick={() => setRemaining(0)}
            className="border border-white/15 hover:border-[var(--accent)] text-zinc-300 hover:text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 transition-colors"
          >
            Skip
          </button>
        )}
        {finished && (
          <button
            onClick={() => {
              setRemaining(seconds);
              setRunning(false);
            }}
            className="border border-white/15 hover:border-[var(--accent)] text-zinc-300 hover:text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function WorkoutRow({ w, checked = false, onToggleChecked, loggedValue, exerciseHistory, currentWeek, onSaveLog, canLog = false }) {
  const [panel, setPanel] = useState(null); // null | "reason" | "lookup" | "timer" | "log"
  const [logInput, setLogInput] = useState("");
  const [timerChoice, setTimerChoice] = useState(null); // "hold" | "rest" — set on open
  const hasReason = Boolean(w.reason);
  const restSeconds = parseDurationSeconds(w.rest);
  // Isometric/hold exercises (Plank, wall sits, dead hangs) put the actual
  // work duration in "sets" (e.g. "3x45s") rather than reps — detect that so
  // the timer can time the hold itself, not just the rest between sets.
  const holdSeconds = parseDurationSeconds(w.sets);
  const hasAnyTimer = restSeconds !== null || holdSeconds !== null;
  const nudge = getProgressNudge(exerciseHistory, currentWeek);

  // The model returns a "demo" search phrase per exercise, because it knows
  // that "Wall Pass Combination" is best searched as "football wall pass drill"
  // while "Back Squat" needs nothing added. Falling back to the name keeps
  // plans generated before this field existed working unchanged.
  const demoTerm = (w.demo || `${w.name} exercise`).trim();
  const query = encodeURIComponent(demoTerm);
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(`how to do ${demoTerm}`)}`;
  const youtubeUrl = `https://www.youtube.com/results?search_query=${query}+tutorial`;

  const toggle = (key) => {
    setPanel((p) => (p === key ? null : key));
    if (key === "log") setLogInput(loggedValue || "");
    if (key === "timer") setTimerChoice(holdSeconds !== null ? "hold" : "rest");
  };

  const submitLog = () => {
    if (!logInput.trim()) return;
    onSaveLog?.(logInput.trim());
    setPanel(null);
  };

  return (
    <div className={`bg-[#121212] border-l-2 transition-colors ${checked ? "border-zinc-700" : "border-[var(--accent)]"}`}>
      {/* Line 1: checkbox + name + sets */}
      <div className="px-3 pt-3 flex items-center gap-2">
        <button
          onClick={onToggleChecked}
          aria-label={checked ? "Mark as not done" : "Mark as done"}
          className={`shrink-0 w-4 h-4 border flex items-center justify-center transition-colors ${
            checked ? "bg-[var(--accent)] border-[var(--accent)]" : "border-white/30 hover:border-[var(--accent)]"
          }`}
        >
          {checked && <Check size={11} className="text-black" />}
        </button>
        <p className={`text-sm flex-1 truncate ${checked ? "text-zinc-600 line-through" : "text-white"}`}>
          {w.name}
        </p>
        <p className="font-mono-display text-sm text-[var(--accent)] shrink-0">{w.sets}</p>
      </div>

      {/* Line 2: load/rest + icon buttons */}
      <div className="pl-9 pr-3 pb-3 pt-0.5 flex items-center justify-between gap-2">
        <p className="text-[11px] text-zinc-500">
          {w.load} · rest {w.rest}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {hasReason && (
            <button
              onClick={() => toggle("reason")}
              aria-label="Why this exercise"
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                panel === "reason"
                  ? "bg-[var(--accent)] text-black"
                  : "text-zinc-500 hover:text-[var(--accent)]"
              }`}
            >
              <Info size={13} />
            </button>
          )}
          <button
            onClick={() => toggle("lookup")}
            aria-label="What is this exercise"
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
              panel === "lookup"
                ? "bg-[var(--accent)] text-black"
                : "text-zinc-500 hover:text-[var(--accent)]"
            }`}
          >
            <HelpCircle size={13} />
          </button>
          {hasAnyTimer && (
            <button
              onClick={() => toggle("timer")}
              aria-label="Timer"
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                panel === "timer"
                  ? "bg-[var(--accent)] text-black"
                  : "text-zinc-500 hover:text-[var(--accent)]"
              }`}
            >
              <Clock size={13} />
            </button>
          )}
          {canLog && (
            <button
              onClick={() => toggle("log")}
              aria-label="Log what you did"
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                panel === "log"
                  ? "bg-[var(--accent)] text-black"
                  : "text-zinc-500 hover:text-[var(--accent)]"
              }`}
            >
              <PenLine size={13} />
            </button>
          )}
        </div>
      </div>

      {loggedValue && panel !== "log" && (
        <div className="pl-9 pr-3 -mt-2 pb-2">
          <p className="text-[10px] text-zinc-600">Last logged: <span className="text-zinc-400">{loggedValue}</span></p>
          {nudge && (
            <p className={`text-[10px] mt-1 font-bold ${
              nudge.tone === "up" ? "text-[var(--accent)]"
              : nudge.tone === "flat" ? "text-yellow-400"
              : nudge.tone === "down" ? "text-red-400"
              : "text-zinc-500"
            }`}>
              {nudge.text}
            </p>
          )}
        </div>
      )}

      {/* Reason panel */}
      {panel === "reason" && hasReason && (
        <div className="px-3 pb-3 -mt-1">
          <p className="text-[11px] text-zinc-400 leading-relaxed border-t border-white/5 pt-2">
            <span className="text-[var(--accent)] font-bold uppercase tracking-wide mr-1">Why:</span>
            {w.reason}
          </p>
        </div>
      )}

      {/* Lookup panel */}
      {panel === "lookup" && (
        <div className="px-3 pb-3 -mt-1 border-t border-white/5 pt-2">
          <p className="text-[11px] text-zinc-500 mb-2">Not sure what this is?</p>
          <div className="flex gap-2">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 border border-white/15 hover:border-[var(--accent)] text-zinc-300 hover:text-white text-[11px] font-bold uppercase tracking-wide px-2 py-2 transition-colors"
            >
              Google <ExternalLink size={11} />
            </a>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 border border-white/15 hover:border-[var(--accent)] text-zinc-300 hover:text-white text-[11px] font-bold uppercase tracking-wide px-2 py-2 transition-colors"
            >
              YouTube <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}

      {/* Timer panel */}
      {panel === "timer" && hasAnyTimer && (
        <div className="px-3 pb-3 -mt-1 border-t border-white/5 pt-3">
          {holdSeconds !== null && restSeconds !== null && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setTimerChoice("hold")}
                className={`flex-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1.5 border transition-colors ${
                  timerChoice === "hold"
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-white/15 text-zinc-500"
                }`}
              >
                Hold ({w.sets})
              </button>
              <button
                onClick={() => setTimerChoice("rest")}
                className={`flex-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1.5 border transition-colors ${
                  timerChoice === "rest"
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-white/15 text-zinc-500"
                }`}
              >
                Rest ({w.rest})
              </button>
            </div>
          )}
          <RestTimer
            key={timerChoice}
            seconds={timerChoice === "hold" ? holdSeconds : restSeconds}
          />
        </div>
      )}

      {/* Log panel */}
      {panel === "log" && canLog && (
        <div className="px-3 pb-3 -mt-1 border-t border-white/5 pt-2">
          <p className="text-[11px] text-zinc-500 mb-2">Log what you did — weight, reps, whatever's useful</p>
          {(() => {
            const suggested = getSuggestedValue(exerciseHistory, w);
            return suggested ? (
              <button
                onClick={() => setLogInput(suggested)}
                className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/10 px-2 py-1 transition-colors"
              >
                Suggested: {suggested} — tap to use
              </button>
            ) : null;
          })()}
          <div className="flex gap-2">
            <input
              type="text"
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitLog()}
              placeholder="e.g. 80kg or 12 reps"
              autoFocus
              className="flex-1 bg-black/40 border border-white/15 focus:border-[var(--accent)] outline-none text-white px-3 py-2 placeholder:text-white/20"
              style={{ fontSize: "16px" }}
            />
            <button
              onClick={submitLog}
              className="bg-[var(--accent)] text-black text-[11px] font-bold uppercase tracking-wide px-3 py-2 hover:bg-white transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NutritionView({ nutrition }) {
  const total = nutrition.protein * 4 + nutrition.carbs * 4 + nutrition.fats * 9;
  const pPct = Math.round(((nutrition.protein * 4) / total) * 100);
  const cPct = Math.round(((nutrition.carbs * 4) / total) * 100);
  const fPct = 100 - pPct - cPct;

  const FALLBACK_DISCLAIMER =
    "Always speak to your GP or a qualified healthcare professional before starting any new supplement — especially if you have an existing health condition, take medication, or are pregnant or breastfeeding.";

  return (
    <div className="flex flex-col">
      <div className="px-5 py-5 border-b border-white/10">
        <p className="text-overline">Daily target</p>
        <p className="font-display text-5xl mt-2">{nutrition.calories}</p>
        <p className="text-sm text-zinc-400 -mt-1">kcal</p>

        <div className="flex h-2 mt-5 overflow-hidden">
          <div
            className="bg-[var(--accent)]"
            style={{ width: `${pPct}%` }}
            title="Protein"
          />
          <div
            className="bg-white"
            style={{ width: `${cPct}%` }}
            title="Carbs"
          />
          <div
            className="bg-zinc-600"
            style={{ width: `${fPct}%` }}
            title="Fats"
          />
        </div>
        <div className="flex justify-between text-[11px] mt-3 text-zinc-400">
          <span>
            <span className="text-[var(--accent)]">●</span> Protein {nutrition.protein}
            g
          </span>
          <span>
            <span className="text-white">●</span> Carbs {nutrition.carbs}g
          </span>
          <span>
            <span className="text-zinc-500">●</span> Fats {nutrition.fats}g
          </span>
        </div>
      </div>

      {nutrition.note && (
        <p className="px-5 py-4 text-sm text-zinc-300 border-b border-white/10">
          {nutrition.note}
        </p>
      )}

      {nutrition.meals && (
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-overline mb-3">Meal timing</p>
          <ul className="flex flex-col gap-3">
            {nutrition.meals.map((m, i) => {
              const hasMacros =
                m.calories != null || m.protein != null || m.carbs != null || m.fats != null;
              return (
                <li
                  key={i}
                  className="flex items-start gap-4 border-b border-white/5 pb-3 last:border-0"
                >
                  <span className="font-mono-display text-[var(--accent)] text-sm w-14 shrink-0">
                    {m.time}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-white">{m.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{m.items}</p>
                    {hasMacros && (
                      <p className="text-[10px] text-zinc-500 mt-1.5 font-mono-display">
                        {m.calories != null && `${m.calories} kcal`}
                        {m.protein != null && ` · P ${m.protein}g`}
                        {m.carbs != null && ` · C ${m.carbs}g`}
                        {m.fats != null && ` · F ${m.fats}g`}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {nutrition.supplements && (
        <div className="px-5 py-5">
          <p className="text-overline mb-3">Supplement stack</p>
          <div className="flex flex-col gap-2">
            {nutrition.supplements.map((s, i) => {
              const isObject = typeof s === "object" && s !== null;
              const name = isObject ? s.name : s;
              const reason = isObject ? s.reason : null;
              return (
                <div key={i} className="border border-white/10 px-3 py-3">
                  <p className="text-sm text-white">{name}</p>
                  {reason && (
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{reason}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 border border-yellow-500/20 bg-yellow-500/5 px-3 py-3">
            <p className="text-[11px] text-yellow-200/80 leading-relaxed">
              ⚠ {nutrition.supplement_disclaimer || FALLBACK_DISCLAIMER}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function RecoveryView({ recovery }) {
  if (!recovery) {
    return (
      <div className="flex flex-col">
        <div className="px-5 py-10 text-center text-sm text-zinc-400">
          Recovery section is added in your personalised app.
        </div>
        <div className="px-5 py-5 border-t border-white/10">
          <div className="border border-yellow-500/20 bg-yellow-500/5 px-3 py-3">
            <p className="text-[11px] text-yellow-200/80 leading-relaxed">
              ⚠ This programme is generated automatically based on the information you provided
              and isn't a substitute for professional coaching or medical advice. Consult a
              doctor before starting any new exercise programme, especially if you have an
              existing injury or health condition.
            </p>
          </div>
        </div>
      </div>
    );
  }
  // HRV needs a wearable most solo customers don't own, so the model tends to
  // fill it with "not tracked — monitor via sleep/RPE instead". That's honest
  // advice but reads as a broken/empty field. Only show the tile when there's
  // a genuine tracked value; otherwise let sleep target take the full width.
  const hrvRaw = (recovery.hrvTrend || "").trim();
  const showHrv = hrvRaw && !/not tracked|n\/a|monitor|no device|unavailable/i.test(hrvRaw);

  return (
    <div className="flex flex-col">
      <div className={`px-5 py-5 border-b border-white/10 grid gap-4 ${showHrv ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <p className="text-overline">Sleep target</p>
          <p className="font-display text-3xl mt-2">{recovery.sleepTarget}</p>
        </div>
        {showHrv && (
          <div>
            <p className="text-overline">HRV trend</p>
            <p className="font-display text-3xl mt-2 text-[var(--accent)]">
              {recovery.hrvTrend}
            </p>
          </div>
        )}
      </div>
      <div className="px-5 py-5">
        <p className="text-overline mb-3">Protocols</p>
        <ul className="flex flex-col gap-2 text-sm text-zinc-300">
          {recovery.protocols.map((p, i) => (
            <li
              key={i}
              className="flex items-center justify-between border-b border-white/5 py-2"
            >
              <span>{p}</span>
              <span className="text-zinc-500 font-mono-display text-xs">
                0{i + 1}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 py-5 border-t border-white/10">
        <div className="border border-yellow-500/20 bg-yellow-500/5 px-3 py-3">
          <p className="text-[11px] text-yellow-200/80 leading-relaxed">
            ⚠ This programme is generated automatically based on the information you provided
            and isn't a substitute for professional coaching or medical advice. Consult a
            doctor before starting any new exercise programme, especially if you have an
            existing injury or health condition. If any exercise causes pain, stop
            immediately. Contact/combat elements (such as sparring) are intended only for
            suitably experienced individuals in a supervised, appropriate setting.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-center border border-white/10 py-3">
      <p className="font-display text-xl text-[var(--accent)]">{value}</p>
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
        {label}
      </p>
    </div>
  );
}
