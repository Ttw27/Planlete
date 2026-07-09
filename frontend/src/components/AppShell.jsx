import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, Dumbbell, Salad, Moon, ArrowLeft, Share2, Info, HelpCircle, ExternalLink, Clock, PenLine, Check } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function parseRestSeconds(rest) {
  if (!rest) return null;
  const str = String(rest).trim().toLowerCase();
  const minMatch = str.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1], 10) * 60;
  const secMatch = str.match(/(\d+)\s*s/);
  if (secMatch) return parseInt(secMatch[1], 10);
  const bareNum = str.match(/^(\d+)$/);
  if (bareNum) return parseInt(bareNum[1], 10);
  return null;
}

/**
 * AppShell — phone-style container for the sample/generated training apps.
 * Includes a top bar, content area, and bottom nav with view switching.
 */
export default function AppShell({ data, mode, modeToggle = null, planId = null, weekNumber = null }) {
  const [view, setView] = useState("home");
  const navigate = useNavigate();

  const days = data.days || (mode && data.modes?.[mode]?.days) || [];
  const nutrition = data.nutrition || data.modes?.[mode]?.nutrition;
  const recovery = data.recovery;
  const morningRoutine = data.morningRoutine;

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
      })
      .catch(() => {
        // Non-fatal — logging just won't show prior values this session
      });
    return () => {
      alive = false;
    };
  }, [planId]);

  const saveLog = async (day, exerciseName, value) => {
    const key = `${weekNumber || 0}-${day}-${exerciseName}`;
    setLogs((prev) => ({ ...prev, [key]: value })); // optimistic
    if (!planId) return;
    try {
      await axios.post(`${API}/logs`, {
        plan_id: planId,
        week_number: weekNumber || 0,
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
    <div className="min-h-screen bg-[var(--brand-bg)] text-white pt-6 pb-6 md:py-12 px-3 md:px-6">
      {/* Phone frame */}
      <div
        data-testid="app-shell"
        className="relative mx-auto w-full max-w-[440px] min-h-[80vh] bg-[#0a0a0a] border border-white/10 overflow-hidden flex flex-col"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-24">
          {view === "home" && (
            <HomeView
              data={data}
              days={days}
              morningRoutine={morningRoutine}
              nutrition={nutrition}
              weekNumber={weekNumber}
              completed={completed}
              onToggleDone={toggleDone}
              logs={logs}
              onSaveLog={saveLog}
              canLog={Boolean(planId)}
            />
          )}
          {view === "training" && (
            <TrainingView
              days={days}
              weekNumber={weekNumber}
              completed={completed}
              onToggleDone={toggleDone}
              logs={logs}
              onSaveLog={saveLog}
              canLog={Boolean(planId)}
            />
          )}
          {view === "nutrition" && nutrition && (
            <NutritionView nutrition={nutrition} />
          )}
          {view === "recovery" && (
            <RecoveryView recovery={recovery} morningRoutine={morningRoutine} />
          )}
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-t border-white/10 grid grid-cols-4">
          <BottomTab
            id="home"
            label="Home"
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

function HomeView({ data, days, morningRoutine, nutrition, weekNumber, completed, onToggleDone, logs, onSaveLog, canLog }) {
  const todayIndex = Math.min(new Date().getDay(), days.length - 1);
  const today = days[todayIndex] || days[0];

  const todayKeys = today.workouts.map((_, i) => `${weekNumber || 0}-${today.day}-${i}`);
  const todayDone = todayKeys.filter((k) => completed.has(k)).length;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={data.hero}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5">
          <p className="text-overline">Today · {today.day}</p>
          <h2 className="font-display text-3xl mt-2">{today.label}</h2>
          <p className="text-sm text-zinc-300 mt-1">{today.focus}</p>
        </div>
      </div>

      {/* Days strip */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 py-4 border-b border-white/10">
        {days.map((d, i) => (
          <div
            key={d.day + i}
            className={`shrink-0 px-3 py-2 border ${
              i === todayIndex
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-white/10 text-zinc-400"
            }`}
          >
            <p className="text-[10px] uppercase tracking-widest">{d.day}</p>
            <p className="text-xs mt-1 text-white">{d.label}</p>
          </div>
        ))}
      </div>

      {/* Today workouts */}
      <div className="px-5 py-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-overline">Today&apos;s session</p>
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
              onSaveLog={(value) => onSaveLog(today.day, w.name, value)}
              canLog={canLog}
            />
          ))}
          {today.workouts.length > 4 && (
            <p className="text-xs text-zinc-500 mt-2">
              + {today.workouts.length - 4} more · open Train tab
            </p>
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

      {/* Morning routine */}
      {morningRoutine && (
        <div className="px-5 py-5 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-overline">Morning movement</p>
            <p className="text-[10px] font-mono-display text-zinc-500">
              {morningRoutine.filter((_, i) => completed.has(`morning-${i}`)).length}/{morningRoutine.length} done
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-zinc-300">
            {morningRoutine.map((m, i) => {
              const key = `morning-${i}`;
              const done = completed.has(key);
              return (
                <li
                  key={i}
                  className="flex items-center justify-between border-b border-white/5 py-2"
                >
                  <button
                    onClick={() => onToggleDone(key)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                  >
                    <span
                      className={`shrink-0 w-4 h-4 border flex items-center justify-center ${
                        done ? "bg-[var(--accent)] border-[var(--accent)]" : "border-white/30"
                      }`}
                    >
                      {done && <Check size={11} className="text-black" />}
                    </span>
                    <span className={done ? "line-through text-zinc-600" : ""}>{m}</span>
                  </button>
                  <span className="text-zinc-500 font-mono-display text-xs shrink-0">
                    0{i + 1}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function TrainingView({ days, weekNumber, completed, onToggleDone, logs, onSaveLog, canLog }) {
  return (
    <div className="flex flex-col">
      {days.map((d, i) => {
        const dayKeys = d.workouts.map((_, j) => `${weekNumber || 0}-${d.day}-${j}`);
        const dayDone = dayKeys.filter((k) => completed.has(k)).length;
        return (
          <div key={i} className="border-b border-white/10 px-5 py-5">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <p className="text-overline">{d.day}</p>
                <h3 className="font-display text-xl mt-1">{d.label}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">{d.focus}</p>
                <p className="text-[10px] font-mono-display text-zinc-600 mt-1">
                  {dayDone}/{d.workouts.length} done
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {d.workouts.map((w, j) => (
                <WorkoutRow
                  key={j}
                  w={w}
                  checked={completed.has(`${weekNumber || 0}-${d.day}-${j}`)}
                  onToggleChecked={() => onToggleDone(`${weekNumber || 0}-${d.day}-${j}`)}
                  loggedValue={logs[`${weekNumber || 0}-${d.day}-${w.name}`]}
                  onSaveLog={(value) => onSaveLog(d.day, w.name, value)}
                  canLog={canLog}
                />
              ))}
            </div>
          </div>
        );
      })}
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

function WorkoutRow({ w, checked = false, onToggleChecked, loggedValue, onSaveLog, canLog = false }) {
  const [panel, setPanel] = useState(null); // null | "reason" | "lookup" | "timer" | "log"
  const [logInput, setLogInput] = useState("");
  const hasReason = Boolean(w.reason);
  const restSeconds = parseRestSeconds(w.rest);

  const query = encodeURIComponent(`${w.name} exercise`);
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(`how to do ${w.name} exercise`)}`;
  const youtubeUrl = `https://www.youtube.com/results?search_query=${query}+tutorial`;

  const toggle = (key) => {
    setPanel((p) => (p === key ? null : key));
    if (key === "log") setLogInput(loggedValue || "");
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
          {restSeconds !== null && (
            <button
              onClick={() => toggle("timer")}
              aria-label="Rest timer"
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
      {panel === "timer" && restSeconds !== null && (
        <div className="px-3 pb-3 -mt-1 border-t border-white/5 pt-3">
          <RestTimer seconds={restSeconds} />
        </div>
      )}

      {/* Log panel */}
      {panel === "log" && canLog && (
        <div className="px-3 pb-3 -mt-1 border-t border-white/5 pt-2">
          <p className="text-[11px] text-zinc-500 mb-2">Log what you did — weight, reps, whatever's useful</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitLog()}
              placeholder="e.g. 80kg or 12 reps"
              autoFocus
              className="flex-1 bg-black/40 border border-white/15 focus:border-[var(--accent)] outline-none text-xs text-white px-3 py-2 placeholder:text-white/20"
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
            {nutrition.meals.map((m, i) => (
              <li
                key={i}
                className="flex items-start gap-4 border-b border-white/5 pb-3 last:border-0"
              >
                <span className="font-mono-display text-[var(--accent)] text-sm w-14 shrink-0">
                  {m.time}
                </span>
                <div>
                  <p className="text-sm text-white">{m.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{m.items}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nutrition.supplements && (
        <div className="px-5 py-5">
          <p className="text-overline mb-3">Supplement stack</p>
          <div className="grid grid-cols-2 gap-2">
            {nutrition.supplements.map((s, i) => (
              <div
                key={i}
                className="border border-white/10 px-3 py-2 text-xs text-zinc-300"
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecoveryView({ recovery, morningRoutine }) {
  if (!recovery) {
    return (
      <div className="px-5 py-10 text-center text-sm text-zinc-400">
        Recovery section is added in your personalised app.
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <div className="px-5 py-5 border-b border-white/10 grid grid-cols-2 gap-4">
        <div>
          <p className="text-overline">Sleep target</p>
          <p className="font-display text-3xl mt-2">{recovery.sleepTarget}</p>
        </div>
        <div>
          <p className="text-overline">HRV trend</p>
          <p className="font-display text-3xl mt-2 text-[var(--accent)]">
            {recovery.hrvTrend}
          </p>
        </div>
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
      {morningRoutine && (
        <div className="px-5 py-5 border-t border-white/10">
          <p className="text-overline mb-3">Morning movement</p>
          <ul className="flex flex-col gap-2 text-sm text-zinc-300">
            {morningRoutine.map((m, i) => (
              <li key={i} className="border-b border-white/5 py-2">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
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
