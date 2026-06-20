import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, Dumbbell, Salad, Moon, ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";

/**
 * AppShell — phone-style container for the sample/generated training apps.
 * Includes a top bar, content area, and bottom nav with view switching.
 */
export default function AppShell({ data, mode, modeToggle = null }) {
  const [view, setView] = useState("home");
  const navigate = useNavigate();

  const days = data.days || (mode && data.modes?.[mode]?.days) || [];
  const nutrition = data.nutrition || data.modes?.[mode]?.nutrition;
  const recovery = data.recovery;
  const morningRoutine = data.morningRoutine;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("App link copied to clipboard");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-6 pb-6 md:py-12 px-3 md:px-6">
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
            className="text-zinc-400 hover:text-[#D4FF00] transition-colors"
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
            />
          )}
          {view === "training" && <TrainingView days={days} />}
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
          className="inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-5 py-3 hover:bg-white transition-colors"
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
        active ? "text-[#D4FF00]" : "text-zinc-500 hover:text-white"
      }`}
    >
      {icon}
      <span className="text-[10px] uppercase tracking-widest">{label}</span>
    </button>
  );
}

function HomeView({ data, days, morningRoutine, nutrition }) {
  const todayIndex = Math.min(new Date().getDay(), days.length - 1);
  const today = days[todayIndex] || days[0];

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
                ? "border-[#D4FF00] text-[#D4FF00]"
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
        <p className="text-overline mb-3">Today&apos;s session</p>
        <div className="flex flex-col gap-2">
          {today.workouts.slice(0, 4).map((w, i) => (
            <WorkoutRow key={i} w={w} />
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
          <p className="text-overline mb-3">Morning movement</p>
          <ul className="flex flex-col gap-2 text-sm text-zinc-300">
            {morningRoutine.map((m, i) => (
              <li
                key={i}
                className="flex items-center justify-between border-b border-white/5 py-2"
              >
                <span>{m}</span>
                <span className="text-zinc-500 font-mono-display text-xs">
                  0{i + 1}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TrainingView({ days }) {
  return (
    <div className="flex flex-col">
      {days.map((d, i) => (
        <div key={i} className="border-b border-white/10 px-5 py-5">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <p className="text-overline">{d.day}</p>
              <h3 className="font-display text-xl mt-1">{d.label}</h3>
            </div>
            <p className="text-xs text-zinc-500">{d.focus}</p>
          </div>
          <div className="flex flex-col gap-2">
            {d.workouts.map((w, j) => (
              <WorkoutRow key={j} w={w} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkoutRow({ w }) {
  return (
    <div className="bg-[#121212] border-l-2 border-[#D4FF00] px-3 py-3 flex items-center justify-between">
      <div>
        <p className="text-sm text-white">{w.name}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          {w.load} · rest {w.rest}
        </p>
      </div>
      <p className="font-mono-display text-sm text-[#D4FF00]">{w.sets}</p>
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
            className="bg-[#D4FF00]"
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
            <span className="text-[#D4FF00]">●</span> Protein {nutrition.protein}
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
                <span className="font-mono-display text-[#D4FF00] text-sm w-14 shrink-0">
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
          <p className="font-display text-3xl mt-2 text-[#D4FF00]">
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
      <p className="font-display text-xl text-[#D4FF00]">{value}</p>
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
        {label}
      </p>
    </div>
  );
}
