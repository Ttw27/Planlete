import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, Dumbbell, Salad, Moon, ArrowLeft, Share2, Info, HelpCircle, ExternalLink, Clock, PenLine, Check, Sunrise, Lock } from "lucide-react";
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
 * Pulls a short "here's what you've actually done" summary out of the logs.
 *
 * This is the honest argument for a new block: rather than telling someone
 * their plan is stale, show them their own numbers moving and let the case
 * make itself.
 */
/**
 * The most recent value logged for an exercise, whichever week it came from.
 *
 * Logs are keyed by week, so jumping from week 1 to week 3 used to show an
 * empty box on a trap bar deadlift they had already loaded twice. What a lifter
 * needs is "what did I do last time on this movement", not "what did I do in
 * this particular week", so this falls back to their history when the week on
 * screen has nothing.
 */
function lastLoggedFor(logs, history, weekNumber, day, name) {
  const exact = logs[`${weekNumber || 0}-${day}-${name}`];
  if (exact) return { value: exact, fromWeek: null };
  const entries = history?.[name] || [];
  if (!entries.length) return { value: undefined, fromWeek: null };
  const latest = entries[entries.length - 1];
  return { value: latest.value, fromWeek: latest.weekNumber };
}

function getProgressSummary(history, logs) {
  const sessionsLogged = Object.keys(logs || {}).length;
  const improvements = [];

  for (const [name, entries] of Object.entries(history || {})) {
    if (!entries || entries.length < 2) continue;
    const first = entries[0];
    const last = entries[entries.length - 1];
    const a = parseLoggedNumber(first.value);
    const b = parseLoggedNumber(last.value);
    if (a === null || b === null || b <= a) continue;
    improvements.push({ name, from: first.value, to: last.value, gain: (b - a) / a });
  }

  improvements.sort((x, y) => y.gain - x.gain);
  return { sessionsLogged, improvements: improvements.slice(0, 3) };
}

/**
 * The "Week 4+" tab. Answers the question the week tabs otherwise raise and
 * never answer — what happens when week 4 is done — from day one rather than
 * on day 29, and gives the case for a fresh block somewhere the person has
 * chosen to look.
 */
/**
 * NO LONGER RENDERED. Kept only so the progress-summary helpers above have a
 * reference implementation to point at.
 *
 * This was a screen of prose explaining what week 5 would look like, shown
 * instead of week 5. It is now a real, loggable week with a short banner above
 * it, which is what people expected every time they tapped the tab.
 */
function OngoingPanel({ history, logs, totalWeeks, cycleNumber, sampleMode = false, weekOneDays = [] }) {
  const { sessionsLogged, improvements } = getProgressSummary(history, logs);
  const weeksDone = cycleNumber > 1 ? (cycleNumber - 1) * (totalWeeks || 4) : 0;

  return (
    <div className="px-5 py-6">
      <p className="text-overline text-[var(--accent)] mb-2">After week {totalWeeks || 4}</p>
      <h2 className="font-display text-2xl leading-tight mb-4">
        It doesn't stop. It goes round again, heavier.
      </h2>
      <p className="text-sm text-zinc-400 leading-relaxed mb-6">
        Week {(totalWeeks || 4) + 1} starts the block over — the same sessions below, in the same
        order. Stop following the weekly increases and go by feel instead: add a little when a
        session is comfortably within reach, hold the weight when it isn't.
      </p>

      <div className="border-t border-white/10 pt-4 mb-6">
        <p className="text-overline text-zinc-500 mb-3">Where you've got to</p>
        {sampleMode ? (
          <p className="text-sm text-zinc-600 leading-relaxed">
            In your own plan this fills with your logged sets, and each cycle sets targets from
            your own numbers.
          </p>
        ) : sessionsLogged === 0 ? (
          <p className="text-sm text-zinc-600 leading-relaxed">
            Nothing logged yet. Once you start logging sets, your numbers show up here so you can
            see what's moved.
          </p>
        ) : (
          <>
            <div className="flex justify-between py-1">
              <span className="text-sm text-zinc-400">Sessions logged</span>
              <span className="text-sm text-white">{sessionsLogged}</span>
            </div>
            {weeksDone > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-sm text-zinc-400">Weeks completed</span>
                <span className="text-sm text-white">{weeksDone}</span>
              </div>
            )}
            {improvements.map((imp) => (
              <div key={imp.name} className="flex justify-between py-1 gap-3">
                <span className="text-sm text-zinc-400 truncate">{imp.name}</span>
                <span className="text-sm text-[var(--accent)] shrink-0">
                  {imp.from} → {imp.to}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="text-overline text-zinc-500 mb-3">When to build a fresh block</p>
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">
          Repeating earns its keep for a couple of cycles. After that the gap starts to show —
          you're stronger than the person who filled the questionnaire in, your season has moved
          on, and the plan hasn't. A new block is built around where you are now, not where you
          started.
        </p>
        <a
          href="/build"
          className="block text-center bg-[var(--accent)] text-black font-bold uppercase tracking-wider text-xs py-3 hover:bg-white transition-colors"
        >
          {sampleMode ? "Build my own plan" : "Build my next block"}
        </a>
        {sessionsLogged > 0 && (
          <p className="text-xs text-zinc-600 leading-relaxed mt-3 text-center">
            Take your numbers above into the questionnaire — it asks what you're lifting now.
          </p>
        )}
      </div>

      {/* The sessions themselves, not a description of them. This used to be
          prose explaining that week 5 repeats week 1, which left the person
          reading about their plan rather than looking at it. */}
      {weekOneDays.length > 0 && (
        <div className="border-t border-white/10 pt-4 mt-6">
          <p className="text-overline text-zinc-500 mb-1">What week {(totalWeeks || 4) + 1} looks like</p>
          <p className="text-xs text-zinc-600 leading-relaxed mb-4">
            The same week you started on. Numbers are where week 1 had them — go by feel from here.
          </p>
          <div className="flex flex-col gap-2">
            {weekOneDays.map((d) => {
              const items = d.workouts || [];
              const isRest = /rest|recovery|off/i.test(d.label || "");
              return (
                <div key={d.day} className="border border-white/10 px-3 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-overline text-[var(--accent)] shrink-0">{d.day}</p>
                    <p className="text-sm text-white text-right leading-snug">{d.label}</p>
                  </div>
                  {!isRest && items.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1">
                      {items.map((w, i) => (
                        <div key={i} className="flex items-baseline justify-between gap-3">
                          <span className="text-[11px] text-zinc-400 truncate">{w.name}</span>
                          <span className="font-mono-display text-[11px] text-zinc-500 shrink-0">
                            {w.sets}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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

export default function AppShell({ data, mode, modeToggle = null, planId = null, weekNumber = null, absoluteWeek = null, cycleNumber = 1, totalWeeks = null, allWeeks = null, activeWeekIndex = 0, sampleMode = false, initialView = "home", initialTrainingDay = null, compact = false, brandLogo = null }) {
  const [view, setRawView] = useState(initialView);

  // Which week is being LOOKED at. Defaults to the one they are actually in.
  // Browsing ahead is a read-only preview: the plan they paid for is four weeks
  // long, and previously only the current week was ever visible, so a full
  // programme looked like a handful of sessions. "ongoing" is the trailing
  // Week 4+ tab rather than a week.
  const [viewingWeek, setViewingWeek] = useState(activeWeekIndex);
  const hasWeekBrowsing = Array.isArray(allWeeks) && allWeeks.length > 1;
  const isOngoing = viewingWeek === "ongoing";
  const isPreviewWeek = hasWeekBrowsing && !isOngoing && viewingWeek !== activeWeekIndex;
  // Ongoing weeks keep counting up (5, 6, 7...) purely as a log key, so each
  // session builds a real timeline instead of overwriting week 1's entries.
  const ongoingWeekNumber = (absoluteWeek || weekNumber || (totalWeeks || 4)) + 1;

  // The week note earns its place the first time it's read and becomes wallpaper
  // by day five. Collapsible rather than dismissible: the coaching is still
  // worth a glance later, so it folds to a line instead of disappearing.
  const noteKey = `planlete_note_collapsed_${planId || "sample"}`;
  const [noteCollapsed, setNoteCollapsed] = useState(() => {
    try {
      return localStorage.getItem(noteKey) === "1";
    } catch {
      return false;
    }
  });
  const toggleNote = () => {
    setNoteCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(noteKey, next ? "1" : "0");
      } catch {
        /* a collapsed note isn't worth failing over */
      }
      return next;
    });
  };

  const ongoingSeenKey = `planlete_ongoing_seen_${planId || "sample"}`;
  const [ongoingSeen, setOngoingSeen] = useState(() => {
    try {
      return localStorage.getItem(ongoingSeenKey) === "1";
    } catch {
      return false;
    }
  });
  // Only nudge once they've actually rolled into a second cycle — before that
  // the tab is available but there's nothing new to point at.
  const showOngoingDot = hasWeekBrowsing && cycleNumber >= 2 && !ongoingSeen && !isOngoing;

  // On a public sample, week 1 is shown in full to prove the quality and the
  // rest is held back. All four weeks still exist on the record — this only
  // changes what's rendered.
  const isLockedWeek = sampleMode && !isOngoing && viewingWeek !== 0;

  // The bottom nav used to drop you out of the Week 4+ panel, because that panel
  // had no Train or Fuel view of its own and the nav would otherwise look dead.
  // Ongoing is now a real week with all the normal views, so switching tabs must
  // keep you in it — otherwise tapping Train mid-session throws you back to the
  // block you have already finished.
  const setView = (next) => setRawView(next);
  const navigate = useNavigate();

  // Logs and checklist ticks key off the ABSOLUTE week, which keeps climbing
  // across cycles (5, 6, 7...). During cycle 1 this is identical to weekNumber,
  // so nothing already stored is orphaned — but it stops cycle 2's "week 1"
  // overwriting cycle 1's, which would have broken every progress comparison
  // at exactly the point they start mattering.
  const logWeek = isOngoing ? ongoingWeekNumber : (absoluteWeek || weekNumber);
  const experience = data?.answers?.experience || null;

  // When browsing another week, show that week's days instead of the live one.
  // Once the block has run its course the plan doesn't stop, it carries on with
  // the same week. Progression stops being scheduled and becomes autoregulated,
  // which is why the notes are suppressed rather than left saying "add 5kg".
  const blockFinished = (() => {
    // Derived from when they STARTED, not when the plan was generated.
    // No start means no finish. block_ends_at is written at generation time, so
    // trusting it here would expire a block that was never opened — the same
    // bug the week counter had, and it survived in this one check.
    if (!data.started_at) return false;
    const ends = new Date(data.started_at);
    if (isNaN(ends)) return false;
    ends.setDate(ends.getDate() + (data.blockWeeks || 4) * 7);
    return ends < new Date();
  })();

  const rawDays = (isOngoing && allWeeks?.[0]?.days)
    || (hasWeekBrowsing && !isOngoing && allWeeks[viewingWeek]?.days)
    || data.days
    || (mode && data.modes?.[mode]?.days)
    || [];
  // The note for whichever week is on screen, so it follows the week switcher.
  const weekNote = (hasWeekBrowsing && !isOngoing && allWeeks[viewingWeek]?.note) || "";
  // Strip the scheduled progression notes once the block is over. "Add 5kg next
  // week" is a promise the plan can no longer keep — there is no next week in
  // the block — and the banner above says what to do instead.
  const days = isOngoing
    ? rawDays.map((d) => ({
        ...d,
        workouts: (d.workouts || []).map(({ progressionNote, ...w }) => w),
      }))
    : rawDays;

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

    // Ticking starts the block, not just logging. A bodyweight plan has nothing
    // to log, runners keep their times elsewhere, and plenty of people only
    // ever tick — all of them would otherwise sit on week 1 forever, never
    // progressing or ending. Fire and forget: the endpoint is idempotent and a
    // failed call must never stop a tick registering.
    if (planId && !sampleMode && !data.started_at) {
      axios.post(`${API}/plans/${planId}/start`).catch(() => {});
    }
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
          if (!(entry.week_number in list)) {
            list[entry.week_number] = { value: entry.value, rpe: entry.rpe || null };
          }
        }
        const historyMap = {};
        for (const [name, weekMap] of Object.entries(byExercise)) {
          historyMap[name] = Object.entries(weekMap)
            .map(([wk, v]) => ({ weekNumber: parseInt(wk, 10), value: v.value, rpe: v.rpe }))
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

  const [movingWeek, setMovingWeek] = useState(false);

  const moveToWeek = async (week) => {
    if (!planId) return;
    setMovingWeek(true);
    try {
      await axios.post(`${API}/plans/${planId}/set-current-week`, { week });
      toast.success(`You're on week ${week} now`);
      // Reload so every week-derived value agrees, rather than patching some
      // of them here and leaving the rest reading from the old timestamp.
      window.location.reload();
    } catch {
      toast.error("Couldn't move you to that week — check your connection.");
      setMovingWeek(false);
    }
  };

  const saveLog = async (day, exerciseName, value, rpe = null) => {
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
        rpe,
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
            not just the week they happen to be in. Other weeks are read-only.
            The trailing "Week 4+" tab answers what happens after the block
            ends, which nothing else in the app does until day 29. */}
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
                  {sampleMode && i !== 0 ? " ·" : ""}
                  {sampleMode && i !== 0 ? <Lock size={10} className="inline ml-1 -mt-0.5" /> : null}
                  {!sampleMode && i === activeWeekIndex ? " · now" : ""}
                </button>
              ))}
              {/* Past the block, this is just the week carrying on: the same
                  sessions, fully loggable, progressed by feel rather than by a
                  schedule that has run out. It used to be a panel explaining
                  what week 5 WOULD look like instead of simply being it. */}
              {blockFinished && (
                <button
                  onClick={() => {
                    setViewingWeek("ongoing");
                    setOngoingSeen(true);
                    try {
                      localStorage.setItem(ongoingSeenKey, "1");
                    } catch {
                      /* dismissal isn't worth failing over */
                    }
                  }}
                  className={`shrink-0 relative px-3 py-1.5 border text-xs uppercase tracking-wider transition-colors ${
                    isOngoing
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-white/10 text-zinc-500 hover:border-white/30 hover:text-white"
                  }`}
                >
                  Ongoing
                  {showOngoingDot && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--accent)]" />
                  )}
                </button>
              )}
            </div>
            {isPreviewWeek && (
              <div className="px-5 pb-3 flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-500">
                  Viewing week {viewingWeek + 1} — you're on week {activeWeekIndex + 1}.
                  Ticking and logging stay on your current week.
                </p>
                {/* Training isn't a calendar. People miss a week, repeat one, or
                    come back after a fortnight wanting to pick up where they
                    left off rather than where the clock says. This moves them,
                    by shifting the single timestamp everything derives from. */}
                {!sampleMode && planId && (
                  <button
                    onClick={() => moveToWeek(viewingWeek + 1)}
                    disabled={movingWeek}
                    className="shrink-0 border border-[var(--accent)]/50 text-[var(--accent)] text-[10px] uppercase tracking-wider px-3 py-1.5 hover:bg-[var(--accent)]/10 transition-colors disabled:opacity-40"
                  >
                    {movingWeek ? "Moving..." : "I'm on this week"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <BlockCompleteBanner cycleNumber={cycleNumber}
              experience={experience} totalWeeks={totalWeeks} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-24">
          {isLockedWeek && (
            <div className="px-5 py-10 text-center">
              <Lock size={22} className="mx-auto text-[var(--accent)] mb-4" />
              <p className="text-overline text-zinc-500 mb-3">Week {viewingWeek + 1} — sample</p>
              <h2 className="font-display text-2xl leading-tight mb-4">
                The rest of the block is in the full version.
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-xs mx-auto">
                Weeks 2 to {allWeeks.length} build on week 1 — same movements, climbing loads, and a
                deload week to recover before it starts again. Build your own and it's made around
                your sport, your kit and your schedule.
              </p>
              <a
                href="/build"
                className="inline-block bg-[var(--accent)] text-black font-bold uppercase tracking-wider text-xs px-8 py-3 hover:bg-white transition-colors"
              >
                Build my own plan
              </a>
            </div>
          )}
          {/* A short banner, then the actual week. This replaced a full screen of
              prose describing what week 5 would look like — the sessions are
              right underneath now, and they're loggable. */}
          {isOngoing && !isLockedWeek && (
            <div className="mx-5 mt-5 border border-[var(--accent)]/40 bg-[var(--accent)]/[0.06] px-4 py-4">
              <p className="text-overline text-[var(--accent)]">Carrying on</p>
              <p className="text-sm text-white mt-2 leading-relaxed">
                Your block is done, so the weekly increases stop here. Same sessions, logged the
                same way — add a little when one feels comfortably within reach, and hold when it
                doesn't.
              </p>
              <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                This works for a few weeks. After that you're stronger than the person who filled
                in the questionnaire, and a new block built from what you've logged will take you
                further.
              </p>
              <a
                href="/build"
                className="mt-3 inline-block bg-[var(--accent)] text-black font-bold uppercase tracking-wider text-xs px-6 py-2.5 hover:bg-white transition-colors"
              >
                Build my next block
              </a>
            </div>
          )}
          {!isLockedWeek && view === "home" && (
            <HomeView
              data={data}
              days={days}
              weekNote={weekNote}
              noteCollapsed={noteCollapsed}
              onToggleNote={toggleNote}
              morningRoutine={morningRoutine}
              nutrition={nutrition}
              weekNumber={logWeek}
              completed={completed}
              onToggleDone={toggleDone}
              logs={logs}
              history={history}
              onSaveLog={saveLog}
              canLog={Boolean(planId) && !isPreviewWeek && !sampleMode}
              totalWeeks={totalWeeks}
              cycleNumber={cycleNumber}
              experience={experience}
              setView={setView}
              brandLogo={brandLogo}
              structureType={structureType}
            />
          )}
          {!isLockedWeek && view === "training" && (
            <TrainingView
              days={days}
              weekNumber={logWeek}
              completed={completed}
              onToggleDone={toggleDone}
              logs={logs}
              history={history}
              onSaveLog={saveLog}
              canLog={Boolean(planId) && !isPreviewWeek && !sampleMode}
              totalWeeks={totalWeeks}
              cycleNumber={cycleNumber}
              experience={experience}
              initialSelectedDay={initialTrainingDay}
              structureType={structureType}
            />
          )}
          {!isLockedWeek && view === "morning" && (
            <MorningView
              morningRoutine={morningRoutine}
              completed={completed}
              onToggleDone={toggleDone}
              logs={logs}
              history={history}
              onSaveLog={saveLog}
              canLog={Boolean(planId) && !isPreviewWeek && !sampleMode}
              totalWeeks={totalWeeks}
              cycleNumber={cycleNumber}
              experience={experience}
              weekNumber={logWeek}
            />
          )}
          {!isLockedWeek && view === "nutrition" && nutrition && (
            <NutritionView nutrition={nutrition} />
          )}
          {!isLockedWeek && view === "recovery" && (
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
          // Deliberately quiet. The page below already has "Build my next
          // block", which carries their answers and history forward — this
          // starts the questionnaire from scratch and is almost always the
          // wrong choice. Three competing buttons in a row made a finished
          // plan look like a sales page.
          <p className="text-xs text-zinc-600">
            Want to start over from scratch instead?{" "}
            <Link
              to="/build"
              data-testid="upgrade-cta"
              className="text-zinc-400 underline underline-offset-2 hover:text-[var(--accent)] transition-colors"
            >
              Build a fresh plan
            </Link>
          </p>
        ) : (
          <>
            <Link
              to="/build"
              data-testid="upgrade-cta"
              className="inline-flex items-center gap-2 bg-[var(--accent)] text-black font-bold uppercase tracking-wider text-xs px-5 py-3 hover:bg-white transition-colors"
            >
              Build mine →
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

function HomeView({ data, days, weekNote = "", noteCollapsed = false, onToggleNote = () => {}, morningRoutine, nutrition, weekNumber, completed, onToggleDone, logs, history, onSaveLog, canLog, setView, brandLogo, structureType = "days" , totalWeeks = null, cycleNumber = 1, experience = null}) {
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

      {/* The block-complete message used to live here too. It now lives in one
          place only — the Ongoing week — so the same thing isn't said three
          times on one screen. */}
      {weekNote && (
        <div className="px-5 pt-5">
          <div className="border-l-2 border-[var(--accent)]/50 pl-3">
            <button
              onClick={onToggleNote}
              aria-expanded={!noteCollapsed}
              className="w-full text-left flex items-start justify-between gap-3 group"
            >
              <p className={`text-[11px] text-zinc-400 leading-relaxed ${noteCollapsed ? "truncate" : ""}`}>
                {weekNote}
              </p>
              <span className="shrink-0 text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors mt-0.5">
                {noteCollapsed ? "more" : "less"}
              </span>
            </button>
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
              loggedValue={lastLoggedFor(logs, history, weekNumber, today.day, w.name).value}
              loggedFromWeek={lastLoggedFor(logs, history, weekNumber, today.day, w.name).fromWeek}
              exerciseHistory={history?.[w.name]}
              currentWeek={weekNumber}
              totalWeeks={totalWeeks}
              cycleNumber={cycleNumber}
              experience={experience}
              onSaveLog={(value, rpe) => onSaveLog(today.day, w.name, value, rpe)}
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

      {/* Quick stats — hidden when the plan carries no numeric targets (under-18
          plans), where showing "0g" everywhere would be both broken and wrong. */}
      {nutrition && Number(nutrition.calories) > 0 && (
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

function MorningView({ morningRoutine, completed, onToggleDone, logs, history, onSaveLog, canLog, weekNumber , totalWeeks = null, cycleNumber = 1, experience = null}) {
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
                  loggedValue={lastLoggedFor(logs, history, weekNumber, "Morning", w.name).value}
                  loggedFromWeek={lastLoggedFor(logs, history, weekNumber, "Morning", w.name).fromWeek}
                  exerciseHistory={history?.[w.name]}
                  onSaveLog={(value, rpe) => onSaveLog("Morning", w.name, value, rpe)}
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

function TrainingView({ days, weekNumber, completed, onToggleDone, logs, history, onSaveLog, canLog, initialSelectedDay = null, structureType = "days" , totalWeeks = null, cycleNumber = 1, experience = null}) {
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
              loggedValue={lastLoggedFor(logs, history, weekNumber, d.day, w.name).value}
              loggedFromWeek={lastLoggedFor(logs, history, weekNumber, d.day, w.name).fromWeek}
              exerciseHistory={history?.[w.name]}
              currentWeek={weekNumber}
              totalWeeks={totalWeeks}
              cycleNumber={cycleNumber}
              experience={experience}
              onSaveLog={(value, rpe) => onSaveLog(d.day, w.name, value, rpe)}
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

/**
 * Works out what to aim for THIS cycle, based on what they actually logged in
 * the equivalent session last cycle.
 *
 * Without this, cycle 2 shows the identical prescription to cycle 1 — same
 * "65-70% 1RM", same 3x5 — which reads as being sent back to the start even
 * though a repeating block is correct periodisation. Driving the target from
 * their own logged numbers makes each cycle measurably harder than the last,
 * and turns a static plan into one that adapts to the person using it.
 */
function getCycleTarget(exerciseHistory, currentWeek, totalWeeks, cycleNumber, experience) {
  if (!exerciseHistory?.length || cycleNumber < 2 || !totalWeeks) return null;

  // Compare like with like: the same week of the previous cycle.
  const lastCycleWeek = currentWeek - totalWeeks;
  let reference = exerciseHistory.find((h) => h.weekNumber === lastCycleWeek);

  // If they skipped that exact session, fall back to their best effort so far
  // rather than showing nothing.
  if (!reference) {
    const scored = exerciseHistory
      .filter((h) => h.weekNumber < currentWeek && parseLoggedNumber(h.value) !== null)
      .sort((a, b) => parseLoggedNumber(b.value) - parseLoggedNumber(a.value));
    reference = scored[0];
  }
  if (!reference) return null;

  const num = parseLoggedNumber(reference.value);
  if (num === null) return null;
  const unit = parseLoggedUnit(reference.value).toLowerCase();

  // How that last effort FELT decides whether we push, hold, or ease off. Without
  // this the target only ever climbs, which is how a plan pushes a struggling or
  // older lifter toward injury — it would tell them to go heavier after a set
  // they barely finished.
  const rpe = reference.rpe; // "easy" | "right" | "hard" | undefined

  // Base jump scales with experience: a novice adds weight far faster than an
  // intermediate, so a flat number is wrong for most people.
  const exp = (experience || "").toLowerCase();
  const isNovice = exp.includes("brand new") || exp.includes("<1") || exp.includes("less than");
  const isAdvanced = exp.includes("5+") || exp.includes("3-5") || exp.includes("3–5");

  // Weight-based work gets a concrete number to beat. Everything else (reps,
  // holds, bodyweight) can't be loaded, so aim to match or exceed instead.
  const isWeight = ["kg", "kgs", "lb", "lbs"].includes(unit);
  if (isWeight) {
    let base = num >= 60 ? 2.5 : 1;
    if (isNovice) base = num >= 60 ? 5 : 2.5;
    else if (isAdvanced) base = num >= 60 ? 2.5 : 1;

    if (rpe === "hard") {
      // Last time was a grind — hold the weight and consolidate rather than push.
      return {
        text: `Hold ${num}${unit}`,
        sub: "last cycle felt hard — nail it before adding weight",
      };
    }
    if (rpe === "easy") base *= 2; // room to move faster

    const target = Math.round((num + base) * 2) / 2;
    return {
      text: `Target ${target}${unit}`,
      sub: `you did ${reference.value} last cycle`,
    };
  }

  if (rpe === "hard") {
    return {
      text: `Repeat ${reference.value}`,
      sub: "last cycle felt hard — match it cleanly first",
    };
  }
  return {
    text: `Match or beat ${reference.value}`,
    sub: "from last cycle",
  };
}

function WorkoutRow({ w, checked = false, onToggleChecked, loggedValue, loggedFromWeek = null, exerciseHistory, currentWeek, totalWeeks = null, cycleNumber = 1, experience = null, onSaveLog, canLog = false }) {
  const [panel, setPanel] = useState(null); // null | "reason" | "lookup" | "timer" | "log"
  const [logInput, setLogInput] = useState("");
  const [logRpe, setLogRpe] = useState(null); // "easy" | "right" | "hard"
  const [timerChoice, setTimerChoice] = useState(null); // "hold" | "rest" — set on open
  // Some rows are not things you "did" at an intensity. A fuelling note, a
  // stretch, a coach-led club session — offering a weight field and asking how
  // hard it felt reads as though the app has not understood its own content.
  const isLoggable = (w.progression?.type || "none") !== "none";

  // What to log depends on what the movement is. Asking for "80kg or 12 reps"
  // on a 4x20m sprint, or on a pre-match fuelling note, tells the person the
  // app has not understood what it just prescribed.
  const logPrompt = (() => {
    const type = w.progression?.type || "none";
    if (type === "measure") {
      return { label: "Log your time or distance — this one is about the number",
               placeholder: "e.g. 3.4s, or 2.15m" };
    }
    if (type === "time") {
      return { label: "Log how long you went for", placeholder: "e.g. 24min" };
    }
    if (type === "distance") {
      return { label: "Log the distance you covered", placeholder: "e.g. 5.2km" };
    }
    if (type === "reps") {
      // A timed hold is typed as "reps" because it progresses in the same
      // slot, but it progresses in SECONDS — the row above a wall sit says
      // "add 5 seconds to each hold" while the box underneath asked for reps.
      if (/^\s*\d+\s*[xX]\s*\d+\s*(s|sec|secs|seconds)\b/.test(String(w.sets || ""))) {
        return { label: "Log how long you held it", placeholder: "e.g. 3x35s" };
      }
      return { label: "Log the reps you managed", placeholder: "e.g. 3x8" };
    }
    if (type === "rounds") {
      return { label: "Log the rounds you completed", placeholder: "e.g. 4 rounds" };
    }
    return { label: "Log what you lifted", placeholder: "e.g. 80kg x 6" };
  })();

  const hasReason = Boolean(w.reason);
  const restSeconds = parseDurationSeconds(w.rest);
  // Isometric/hold exercises (Plank, wall sits, dead hangs) put the actual
  // work duration in "sets" (e.g. "3x45s") rather than reps — detect that so
  // the timer can time the hold itself, not just the rest between sets.
  const holdSeconds = parseDurationSeconds(w.sets);
  const hasAnyTimer = restSeconds !== null || holdSeconds !== null;
  const nudge = getProgressNudge(exerciseHistory, currentWeek);
  const cycleTarget = getCycleTarget(exerciseHistory, currentWeek, totalWeeks, cycleNumber, experience);

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
    onSaveLog?.(logInput.trim(), logRpe);
    setLogRpe(null);
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
        {/* A long "sets" value used to be laid out shrink-0 against a flex-1
            truncating name, so it took the whole row and squeezed the name to
            "A.." or to nothing at all. Anything longer than a normal volume
            figure now drops onto its own line and the name keeps the width.
            Threshold is 16 rather than 14: "3x20s each side" is 15 characters,
            fits inline perfectly well, and was being wrapped for no reason. */}
        {String(w.sets || "").length > 16 ? (
          <p className={`text-sm flex-1 min-w-0 break-words ${checked ? "text-zinc-600 line-through" : "text-white"}`}>
            {w.name}
          </p>
        ) : (
          <>
            <p className={`text-sm flex-1 min-w-0 truncate ${checked ? "text-zinc-600 line-through" : "text-white"}`}>
              {w.name}
            </p>
            <p className="font-mono-display text-sm text-[var(--accent)] shrink-0">{w.sets}</p>
          </>
        )}
      </div>

      {String(w.sets || "").length > 16 && (
        <p className="px-3 pt-1 pl-9 font-mono-display text-xs text-[var(--accent)] break-words">
          {w.sets}
        </p>
      )}

      {/* Line 2: load/rest + icon buttons */}
      <div className="pl-9 pr-3 pb-3 pt-0.5 flex items-center justify-between gap-2">
        <p className="text-[11px] text-zinc-500">
          {cycleTarget ? (
            <>
              <span className="text-[var(--accent)]">{cycleTarget.text}</span>
              <span className="text-zinc-600"> · {cycleTarget.sub}</span>
            </>
          ) : (
            <>{w.load}</>
          )}
          {" · rest "}{w.rest}
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
          {canLog && isLoggable && (
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
          <p className="text-[10px] text-zinc-600">
            Last logged: <span className="text-zinc-400">{loggedValue}</span>
            {/* Say which week it came from when it isn't this one, so jumping
                weeks shows real context rather than a number with no origin. */}
            {loggedFromWeek ? <span className="text-zinc-600"> · week {loggedFromWeek}</span> : null}
          </p>
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

      {w.progressionNote && (
        <div className="pl-9 pr-3 -mt-2 pb-2">
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            <span className="text-[var(--accent)]">↗</span> {w.progressionNote}
          </p>
        </div>
      )}

      {/* Reason panel — now also carries the coaching detail the one-week
          template freed up room for: how to do it, what people get wrong, and
          what to do instead if they can't manage it yet. */}
      {panel === "reason" && hasReason && (
        <div className="px-3 pb-3 -mt-1">
          <div className="border-t border-white/5 pt-2 flex flex-col gap-2">
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              <span className="text-[var(--accent)] font-bold uppercase tracking-wide mr-1">Why:</span>
              {w.reason}
            </p>
            {w.cues && (
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                <span className="text-[var(--accent)] font-bold uppercase tracking-wide mr-1">How:</span>
                {w.cues}
              </p>
            )}
            {w.mistake && (
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                <span className="text-yellow-400 font-bold uppercase tracking-wide mr-1">Watch:</span>
                {w.mistake}
              </p>
            )}
            {(w.easier || w.harder) && (
              <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                {w.easier && (
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    <span className="text-zinc-400 font-bold uppercase tracking-wide mr-1">Easier:</span>
                    {w.easier}
                  </p>
                )}
                {w.harder && (
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    <span className="text-zinc-400 font-bold uppercase tracking-wide mr-1">Harder:</span>
                    {w.harder}
                  </p>
                )}
              </div>
            )}
          </div>
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
      {panel === "log" && canLog && isLoggable && (
        <div className="px-3 pb-3 -mt-1 border-t border-white/5 pt-2">
          <p className="text-[11px] text-zinc-500 mb-2">{logPrompt.label}</p>
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
              placeholder={logPrompt.placeholder}
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

          {/* How the set felt. Steers next cycle's target — a "hard" set holds
              the weight rather than pushing it up, which is what stops the plan
              driving a struggling lifter into heavier and heavier loads. */}
          <div className="mt-3">
            <p className="text-[11px] text-zinc-500 mb-1.5">How did that feel?</p>
            <div className="flex gap-2">
              {[
                { key: "easy", label: "Easy" },
                { key: "right", label: "About right" },
                { key: "hard", label: "Hard" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setLogRpe((r) => (r === opt.key ? null : opt.key))}
                  className={`text-[11px] px-3 py-1.5 border transition-colors ${
                    logRpe === opt.key
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-white/15 text-zinc-400 hover:border-white/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NutritionView({ nutrition }) {
  // Under-18 plans deliberately carry no calorie or macro targets, so every
  // figure comes back as 0. Rendering the block anyway divides by zero, gives
  // NaN bar widths, and shows a child a "0 kcal" daily target — the exact
  // opposite of the intent. Guidance replaces the numbers instead.
  const hasTargets =
    Number(nutrition.calories) > 0 ||
    Number(nutrition.protein) > 0 ||
    Number(nutrition.carbs) > 0 ||
    Number(nutrition.fats) > 0;

  const total =
    nutrition.protein * 4 + nutrition.carbs * 4 + nutrition.fats * 9;
  const pPct = total > 0 ? Math.round(((nutrition.protein * 4) / total) * 100) : 0;
  const cPct = total > 0 ? Math.round(((nutrition.carbs * 4) / total) * 100) : 0;
  const fPct = total > 0 ? 100 - pPct - cPct : 0;

  const FALLBACK_DISCLAIMER =
    "Always speak to your GP or a qualified healthcare professional before starting any new supplement — especially if you have an existing health condition, take medication, or are pregnant or breastfeeding.";

  return (
    <div className="flex flex-col">
      {hasTargets && (
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
      )}

      {nutrition.note && (
        <p className="px-5 py-4 text-sm text-zinc-300 border-b border-white/10">
          {nutrition.note}
        </p>
      )}

      {nutrition.adjustments?.length > 0 && (
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-overline mb-1">Days that differ</p>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            The targets above are your baseline for a normal training day. These are the
            days that change.
          </p>
          <div className="flex flex-col gap-2">
            {nutrition.adjustments.map((a, i) => (
              <div key={i} className="border border-white/10 px-3 py-3">
                <p className="text-overline text-[var(--accent)]">{a.when}</p>
                <p className="text-sm text-white mt-1.5 leading-relaxed">{a.change}</p>
                {a.why && (
                  <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{a.why}</p>
                )}
              </div>
            ))}
          </div>
        </div>
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
