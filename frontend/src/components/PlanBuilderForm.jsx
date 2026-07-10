import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Clock, Info } from "lucide-react";
import AppShell from "@/components/AppShell";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function emptyDay(day) {
  return { day, label: "", focus: "", workouts: [] };
}

function emptyPhase(n) {
  return { day: `Phase ${n}`, label: "", focus: "", dateRange: "", workouts: [] };
}

function emptyWorkout() {
  return {
    name: "", sets: "", load: "", rest: "", reason: "", timerEnabled: true,
    progressionType: "", progressionMode: "fixed", progressionRate: "",
  };
}

function emptyMeal() {
  return { time: "", name: "", items: "", calories: "", protein: "", carbs: "", fats: "" };
}

function emptySupplement() {
  return { name: "", reason: "" };
}

const inputClass =
  "w-full bg-black/40 border border-white/15 focus:border-[#D4FF00] outline-none text-sm text-white px-3 py-2 placeholder:text-white/20";
const labelClass = "text-[10px] uppercase tracking-widest text-zinc-500 block mb-1.5";
const captionClass = "text-[11px] text-zinc-600 mt-1.5 leading-relaxed";

/**
 * The shared plan-building form — used identically by the coach/physio
 * builder, the admin builder, and (later) the customer self-serve builder.
 * Only the wrapper page differs: who's allowed to open it, what happens on
 * submit, and the exact disclaimer wording. The data shape produced here
 * matches AppShell's schema exactly, so the live preview is the real
 * component, not a mockup of it.
 *
 * Props:
 *   mode            — "coach" | "admin" | "self" (controls disclaimer wording
 *                      and whether client name/email fields show)
 *   initialData      — existing plan data, for editing
 *   onSubmit(data)   — called with the full structured payload on save
 *   submitting       — bool, loading state from the parent
 *   submitLabel      — button text
 */
export default function PlanBuilderForm({
  mode = "coach",
  initialData = null,
  onSubmit,
  submitting = false,
  submitLabel = "Save plan",
  brandLogo = null,
}) {
  const [clientName, setClientName] = useState(initialData?.client_name || "");
  const [clientEmail, setClientEmail] = useState(initialData?.client_email || "");
  const [notes, setNotes] = useState(initialData?.notes || "");

  // "days" (Mon-Sun, standard) or "phases" (Phase 1, Phase 2... — for things
  // like rehab that progress by recovery stage, not day of week).
  const [structureType, setStructureType] = useState(initialData?.structureType || "days");

  const [days, setDays] = useState(() => {
    if (initialData?.days?.length) return initialData.days;
    return DAY_NAMES.map((d) => emptyDay(d));
  });

  const switchStructureType = (next) => {
    if (next === structureType) return;
    setStructureType(next);
    // Reset to a sensible default for whichever structure they're switching
    // to — carrying over the old day/phase data across the switch would be
    // confusing since the two shapes mean different things.
    if (next === "phases") {
      setDays([emptyPhase(1), emptyPhase(2), emptyPhase(3)]);
    } else {
      setDays(DAY_NAMES.map((d) => emptyDay(d)));
    }
    setSelectedDay(0);
  };

  const addPhase = () => {
    setDays((prev) => [...prev, emptyPhase(prev.length + 1)]);
  };

  const removePhase = (index) => {
    if (days.length <= 1) return;
    setDays((prev) => prev.filter((_, i) => i !== index));
    setSelectedDay((s) => Math.max(0, Math.min(s, days.length - 2)));
  };

  const [nutrition, setNutrition] = useState(
    initialData?.nutrition || {
      calories: "", protein: "", carbs: "", fats: "", note: "",
      meals: [], supplements: [], supplement_disclaimer: "",
    }
  );
  const [recovery, setRecovery] = useState(
    initialData?.recovery || { sleepTarget: "", hrvTrend: "", protocols: [] }
  );
  const [morningRoutine, setMorningRoutine] = useState(initialData?.morningRoutine || []);
  const [allowLogging, setAllowLogging] = useState(initialData?.allow_logging ?? true);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const [section, setSection] = useState("details"); // details | train | fuel | recover
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [showPreview, setShowPreview] = useState(false);

  // ── Day/exercise editing ──
  const updateDay = (index, patch) => {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };
  const addWorkout = (dayIndex) => {
    setDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, workouts: [...d.workouts, emptyWorkout()] } : d))
    );
  };
  const updateWorkout = (dayIndex, workoutIndex, patch) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d;
        const workouts = d.workouts.map((w, j) => (j === workoutIndex ? { ...w, ...patch } : w));
        return { ...d, workouts };
      })
    );
  };
  const removeWorkout = (dayIndex, workoutIndex) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, workouts: d.workouts.filter((_, j) => j !== workoutIndex) } : d
      )
    );
  };

  // ── Nutrition editing ──
  const addMeal = () => setNutrition((n) => ({ ...n, meals: [...n.meals, emptyMeal()] }));
  const updateMeal = (i, patch) =>
    setNutrition((n) => ({ ...n, meals: n.meals.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));
  const removeMeal = (i) =>
    setNutrition((n) => ({ ...n, meals: n.meals.filter((_, j) => j !== i) }));

  const addSupplement = () =>
    setNutrition((n) => ({ ...n, supplements: [...n.supplements, emptySupplement()] }));
  const updateSupplement = (i, patch) =>
    setNutrition((n) => ({
      ...n,
      supplements: n.supplements.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));
  const removeSupplement = (i) =>
    setNutrition((n) => ({ ...n, supplements: n.supplements.filter((_, j) => j !== i) }));

  // ── Recovery / morning routine editing ──
  const addProtocol = () => setRecovery((r) => ({ ...r, protocols: [...r.protocols, ""] }));
  const updateProtocol = (i, value) =>
    setRecovery((r) => ({ ...r, protocols: r.protocols.map((p, j) => (j === i ? value : p)) }));
  const removeProtocol = (i) =>
    setRecovery((r) => ({ ...r, protocols: r.protocols.filter((_, j) => j !== i) }));

  const addMorningItem = () => setMorningRoutine((m) => [...m, ""]);
  const updateMorningItem = (i, value) =>
    setMorningRoutine((m) => m.map((item, j) => (j === i ? value : item)));
  const removeMorningItem = (i) => setMorningRoutine((m) => m.filter((_, j) => j !== i));

  const numOrUndef = (v) => (v === "" || v === null || v === undefined ? undefined : Number(v));

  const buildPayload = () => ({
    client_name: clientName || "Your plan",
    client_email: clientEmail || null,
    notes: notes || null,
    structureType,
    days: days.map((d) => ({
      ...d,
      workouts: d.workouts.map((w) => ({
        ...w,
        progressionType: w.progressionType || null,
        progressionMode: w.progressionMode || "fixed",
        progressionRate: w.progressionType ? numOrUndef(w.progressionRate) : undefined,
      })),
    })),
    nutrition: {
      ...nutrition,
      calories: numOrUndef(nutrition.calories),
      protein: numOrUndef(nutrition.protein),
      carbs: numOrUndef(nutrition.carbs),
      fats: numOrUndef(nutrition.fats),
      meals: nutrition.meals.map((m) => ({
        ...m,
        calories: numOrUndef(m.calories),
        protein: numOrUndef(m.protein),
        carbs: numOrUndef(m.carbs),
        fats: numOrUndef(m.fats),
      })),
    },
    recovery,
    morningRoutine,
    allow_logging: allowLogging,
    disclaimer_accepted: disclaimerAccepted,
  });

  const previewData = {
    brand: clientName ? `${clientName}'s App` : "Your App",
    tagline: "Your plan",
    hero: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
    structureType,
    days,
    nutrition: {
      ...nutrition,
      calories: numOrUndef(nutrition.calories) || 0,
      protein: numOrUndef(nutrition.protein) || 0,
      carbs: numOrUndef(nutrition.carbs) || 0,
      fats: numOrUndef(nutrition.fats) || 0,
    },
    recovery,
    morningRoutine,
  };

  const disclaimerText =
    mode === "coach"
      ? "I confirm I hold the appropriate professional qualification to give this advice, and that everything in this plan is entirely my own professional work — Planlete has not reviewed, checked, or contributed to this content in any way."
      : mode === "self"
      ? "This is my own plan — Planlete doesn't check, review, or endorse this content, it's simply running what I've entered myself."
      : "Confirmed for internal/admin use.";

  const SECTIONS = [
    { id: "details", label: "Details" },
    { id: "train", label: "Train" },
    { id: "fuel", label: "Fuel" },
    { id: "recover", label: "Recover" },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── Builder ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex gap-1 border border-white/10">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                  section === s.id
                    ? "bg-[#D4FF00] text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex items-center gap-2 border border-white/15 hover:border-[#D4FF00] text-xs font-bold uppercase tracking-wide px-4 py-2 text-zinc-300 hover:text-white transition-colors lg:hidden"
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? "Hide preview" : "Preview as client"}
          </button>
        </div>

        {/* ── Details ── */}
        {section === "details" && (
          <div className="flex flex-col gap-4 max-w-xl">
            {mode === "self" && (
              <div className="border border-[#D4FF00]/20 bg-[#D4FF00]/5 p-4 mb-2">
                <p className="text-sm text-white font-bold mb-1.5">New to building your own plan?</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Don't worry about getting every field perfect — just fill in what you know.
                  Each field has a quick example underneath it. Use the <strong className="text-zinc-300">Train</strong>,{" "}
                  <strong className="text-zinc-300">Fuel</strong>, and <strong className="text-zinc-300">Recover</strong> tabs
                  above to add your workouts, nutrition, and recovery — you can always come back and edit later.
                </p>
              </div>
            )}
            {mode !== "admin" && (
              <>
                <div>
                  <label className={labelClass}>{mode === "self" ? "Your name" : "Client name"}</label>
                  <input className={inputClass} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Sarah Jones" />
                </div>
                <div>
                  <label className={labelClass}>{mode === "self" ? "Your email" : "Client email (optional)"}</label>
                  <input className={inputClass} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="you@email.com" />
                  {mode === "self" && (
                    <p className={captionClass}>We'll send your app link here once you've paid.</p>
                  )}
                </div>
              </>
            )}
            {mode === "admin" && (
              <div>
                <label className={labelClass}>Plan name</label>
                <input className={inputClass} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Test plan" />
              </div>
            )}
            <div>
              <label className={labelClass}>Notes</label>
              <textarea className={inputClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any context worth keeping with this plan" />
            </div>
            <label className="flex items-center gap-3 text-sm text-zinc-300 mt-2">
              <input type="checkbox" checked={allowLogging} onChange={(e) => setAllowLogging(e.target.checked)} className="w-4 h-4" />
              Let them log weights/reps in the app
            </label>

            {mode !== "admin" && (
              <div className="mt-4 border border-yellow-500/20 bg-yellow-500/5 p-4">
                <label className="flex items-start gap-3 text-xs text-yellow-100/90 leading-relaxed cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="w-4 h-4 mt-0.5 shrink-0"
                  />
                  {disclaimerText}
                </label>
              </div>
            )}
          </div>
        )}

        {/* ── Train ── */}
        {section === "train" && (
          <div>
            {/* Structure type toggle */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <div className="flex border border-white/10">
                <button
                  onClick={() => switchStructureType("days")}
                  className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                    structureType === "days" ? "bg-[#D4FF00] text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Day of week
                </button>
                <button
                  onClick={() => switchStructureType("phases")}
                  className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                    structureType === "phases" ? "bg-[#D4FF00] text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Recovery phase
                </button>
              </div>
              <p className="text-[11px] text-zinc-600">
                {structureType === "days"
                  ? "Standard Mon–Sun weekly structure."
                  : "For things like rehab, organised by stage instead of weekday."}
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-4 border-b border-white/10">
              {days.map((d, i) => (
                <div key={i} className="relative shrink-0 group">
                  <button
                    onClick={() => setSelectedDay(i)}
                    className={`px-3 py-2 border text-left transition-colors ${
                      selectedDay === i
                        ? "border-[#D4FF00] text-[#D4FF00]"
                        : "border-white/10 text-zinc-400 hover:border-white/30"
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-widest">{d.day}</p>
                    <p className="text-xs mt-1 text-white truncate max-w-[80px]">{d.label || "—"}</p>
                    {structureType === "phases" && d.dateRange && (
                      <p className="text-[9px] mt-0.5 text-zinc-500">{d.dateRange}</p>
                    )}
                  </button>
                  {structureType === "phases" && days.length > 1 && (
                    <button
                      onClick={() => removePhase(i)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/80 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove phase"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {structureType === "phases" && (
                <button
                  onClick={addPhase}
                  className="shrink-0 px-3 py-2 border border-dashed border-white/20 hover:border-[#D4FF00] text-zinc-400 hover:text-[#D4FF00] transition-colors flex items-center gap-1.5"
                >
                  <Plus size={12} />
                  <span className="text-[10px] uppercase tracking-widest">Add phase</span>
                </button>
              )}
            </div>

            <div className={`grid sm:grid-cols-2 ${structureType === "phases" ? "lg:grid-cols-3" : ""} gap-3 mb-5 max-w-xl`}>
              <div>
                <label className={labelClass}>{structureType === "phases" ? "Phase name" : "Day label"}</label>
                <input
                  className={inputClass}
                  value={days[selectedDay].day}
                  onChange={(e) => updateDay(selectedDay, { day: e.target.value })}
                  placeholder={structureType === "phases" ? "e.g. Phase 1 — Protect" : "Mon"}
                  disabled={structureType === "days"}
                />
                {structureType === "phases" && (
                  <p className={captionClass}>The tab name shown, e.g. "Phase 1" or "Early Mobility".</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Session label</label>
                <input
                  className={inputClass}
                  value={days[selectedDay].label}
                  onChange={(e) => updateDay(selectedDay, { label: e.target.value })}
                  placeholder="e.g. Lower Body"
                />
                <p className={captionClass}>
                  {structureType === "phases"
                    ? "What this phase focuses on, e.g. \"Range of Motion\"."
                    : "What this day's session is called — or \"Rest\" if it's a rest day."}
                </p>
              </div>
              {structureType === "phases" && (
                <div>
                  <label className={labelClass}>Date range (optional)</label>
                  <input
                    className={inputClass}
                    value={days[selectedDay].dateRange || ""}
                    onChange={(e) => updateDay(selectedDay, { dateRange: e.target.value })}
                    placeholder="e.g. Weeks 1-2, or 1-14 Jul"
                  />
                  <p className={captionClass}>Just shown as a guide — you'll still pick the phase manually, nothing switches automatically.</p>
                </div>
              )}
              <div>
                <label className={labelClass}>Focus</label>
                <input
                  className={inputClass}
                  value={days[selectedDay].focus}
                  onChange={(e) => updateDay(selectedDay, { focus: e.target.value })}
                  placeholder="e.g. Strength"
                />
                <p className={captionClass}>One or two words summing up the {structureType === "phases" ? "phase" : "day"}.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {days[selectedDay].workouts.map((w, wi) => (
                <div key={wi} className="border border-white/10 p-4 relative">
                  <button
                    onClick={() => removeWorkout(selectedDay, wi)}
                    className="absolute top-3 right-3 text-zinc-600 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="grid sm:grid-cols-2 gap-3 mb-3">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Exercise name</label>
                      <input className={inputClass} value={w.name} onChange={(e) => updateWorkout(selectedDay, wi, { name: e.target.value })} placeholder="e.g. Back Squat" />
                    </div>
                    <div>
                      <label className={labelClass}>Sets</label>
                      <input className={inputClass} value={w.sets} onChange={(e) => updateWorkout(selectedDay, wi, { sets: e.target.value })} placeholder="e.g. 4x8" />
                      <p className={captionClass}>"4x8" = 4 sets of 8 reps. For a timed hold (like a Plank), use "3x45s".</p>
                    </div>
                    <div>
                      <label className={labelClass}>Load</label>
                      <input className={inputClass} value={w.load} onChange={(e) => updateWorkout(selectedDay, wi, { load: e.target.value })} placeholder="e.g. Moderate" />
                      <p className={captionClass}>How heavy — a word like "Light"/"Heavy"/"Bodyweight", or an actual weight.</p>
                    </div>
                    <div>
                      <label className={labelClass}><Clock size={10} className="inline mr-1" />Rest</label>
                      <input className={inputClass} value={w.rest} onChange={(e) => updateWorkout(selectedDay, wi, { rest: e.target.value })} placeholder="e.g. 90s" />
                      <p className={captionClass}>How long to rest before the next set, e.g. "90s" or "2min".</p>
                    </div>
                    <div className="flex items-start pt-6">
                      <label className="flex items-center gap-2 text-xs text-zinc-400">
                        <input type="checkbox" checked={w.timerEnabled} onChange={(e) => updateWorkout(selectedDay, wi, { timerEnabled: e.target.checked })} className="w-4 h-4" />
                        Show rest timer
                      </label>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}><Info size={10} className="inline mr-1" />Why this exercise (shown to client)</label>
                      <input className={inputClass} value={w.reason} onChange={(e) => updateWorkout(selectedDay, wi, { reason: e.target.value })} placeholder="Optional but recommended" />
                      {mode === "self" && (
                        <p className={captionClass}>A note to your future self — e.g. "helps my knee stability".</p>
                      )}
                    </div>

                    <div className="sm:col-span-2 border-t border-white/10 pt-3 mt-1">
                      <label className={labelClass}>Progressive overload — suggest an increase each time they log</label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          className={inputClass}
                          value={w.progressionType || ""}
                          onChange={(e) => updateWorkout(selectedDay, wi, { progressionType: e.target.value })}
                        >
                          <option value="">Off</option>
                          <option value="load">Load (weight)</option>
                          <option value="reps">Reps</option>
                          <option value="hold">Hold time</option>
                          <option value="distance">Distance</option>
                        </select>
                        <select
                          className={inputClass}
                          value={w.progressionMode || "fixed"}
                          onChange={(e) => updateWorkout(selectedDay, wi, { progressionMode: e.target.value })}
                          disabled={!w.progressionType}
                        >
                          <option value="fixed">+ fixed amount</option>
                          <option value="percent">+ percentage</option>
                        </select>
                        <input
                          className={inputClass}
                          type="number"
                          step="0.1"
                          value={w.progressionRate}
                          onChange={(e) => updateWorkout(selectedDay, wi, { progressionRate: e.target.value })}
                          disabled={!w.progressionType}
                          placeholder={w.progressionMode === "percent" ? "e.g. 2.5%" : "e.g. 2.5"}
                        />
                      </div>
                      <p className={captionClass}>
                        {w.progressionType
                          ? `Each time you log this, the app will suggest ${w.progressionRate || "…"}${w.progressionMode === "percent" ? "%" : ""} more than last time.`
                          : "Leave off if you'd rather decide the increase yourself each week."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => addWorkout(selectedDay)}
                className="inline-flex items-center gap-2 border border-white/15 hover:border-[#D4FF00] text-xs font-bold uppercase tracking-wide px-4 py-3 text-zinc-300 hover:text-white transition-colors self-start"
              >
                <Plus size={14} /> Add exercise
              </button>
            </div>
          </div>
        )}

        {/* ── Fuel ── */}
        {section === "fuel" && (
          <div className="max-w-xl flex flex-col gap-6">
            <div>
              <p className={labelClass}>Daily targets</p>
              <div className="grid grid-cols-4 gap-2">
                <input className={inputClass} type="number" value={nutrition.calories} onChange={(e) => setNutrition((n) => ({ ...n, calories: e.target.value }))} placeholder="Cal" />
                <input className={inputClass} type="number" value={nutrition.protein} onChange={(e) => setNutrition((n) => ({ ...n, protein: e.target.value }))} placeholder="Protein g" />
                <input className={inputClass} type="number" value={nutrition.carbs} onChange={(e) => setNutrition((n) => ({ ...n, carbs: e.target.value }))} placeholder="Carbs g" />
                <input className={inputClass} type="number" value={nutrition.fats} onChange={(e) => setNutrition((n) => ({ ...n, fats: e.target.value }))} placeholder="Fats g" />
              </div>
              <p className={captionClass}>
                Roughly how much to eat per day — total calories, then protein/carbs/fats in grams.
                {mode === "self" && " Not sure? Skip it and just fill in the meals below instead."}
              </p>
            </div>

            <div>
              <label className={labelClass}>Nutrition note</label>
              <textarea className={inputClass} rows={2} value={nutrition.note} onChange={(e) => setNutrition((n) => ({ ...n, note: e.target.value }))} placeholder="e.g. Focus on whole foods, drink plenty of water" />
            </div>

            <div>
              <p className={labelClass}>Meals</p>
              <p className={`${captionClass} mb-2`}>What to eat and roughly when — the macro fields (Cal/P/C/F) per meal are optional.</p>
              <div className="flex flex-col gap-3">
                {nutrition.meals.map((m, i) => (
                  <div key={i} className="border border-white/10 p-4 relative">
                    <button onClick={() => removeMeal(i)} className="absolute top-3 right-3 text-zinc-600 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <input className={inputClass} value={m.time} onChange={(e) => updateMeal(i, { time: e.target.value })} placeholder="Time e.g. 08:00" />
                      <input className={inputClass} value={m.name} onChange={(e) => updateMeal(i, { name: e.target.value })} placeholder="Meal name" />
                    </div>
                    <input className={`${inputClass} mb-2`} value={m.items} onChange={(e) => updateMeal(i, { items: e.target.value })} placeholder="What's in it, e.g. Oats, banana, protein shake" />
                    <div className="grid grid-cols-4 gap-2">
                      <input className={inputClass} type="number" value={m.calories} onChange={(e) => updateMeal(i, { calories: e.target.value })} placeholder="Cal" />
                      <input className={inputClass} type="number" value={m.protein} onChange={(e) => updateMeal(i, { protein: e.target.value })} placeholder="P" />
                      <input className={inputClass} type="number" value={m.carbs} onChange={(e) => updateMeal(i, { carbs: e.target.value })} placeholder="C" />
                      <input className={inputClass} type="number" value={m.fats} onChange={(e) => updateMeal(i, { fats: e.target.value })} placeholder="F" />
                    </div>
                  </div>
                ))}
                <button onClick={addMeal} className="inline-flex items-center gap-2 border border-white/15 hover:border-[#D4FF00] text-xs font-bold uppercase tracking-wide px-4 py-3 text-zinc-300 hover:text-white transition-colors self-start">
                  <Plus size={14} /> Add meal
                </button>
              </div>
            </div>

            <div>
              <p className={labelClass}>Supplements</p>
              <p className={`${captionClass} mb-2`}>
                Optional. A disclaimer to consult a doctor first is always shown automatically — no need to add your own.
              </p>
              <div className="flex flex-col gap-3">
                {nutrition.supplements.map((s, i) => (
                  <div key={i} className="border border-white/10 p-4 relative">
                    <button onClick={() => removeSupplement(i)} className="absolute top-3 right-3 text-zinc-600 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                    <input className={`${inputClass} mb-2`} value={s.name} onChange={(e) => updateSupplement(i, { name: e.target.value })} placeholder="Supplement name" />
                    <input className={inputClass} value={s.reason} onChange={(e) => updateSupplement(i, { reason: e.target.value })} placeholder="Why you take it" />
                  </div>
                ))}
                <button onClick={addSupplement} className="inline-flex items-center gap-2 border border-white/15 hover:border-[#D4FF00] text-xs font-bold uppercase tracking-wide px-4 py-3 text-zinc-300 hover:text-white transition-colors self-start">
                  <Plus size={14} /> Add supplement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Recover ── */}
        {section === "recover" && (
          <div className="max-w-xl flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Sleep target</label>
                <input className={inputClass} value={recovery.sleepTarget} onChange={(e) => setRecovery((r) => ({ ...r, sleepTarget: e.target.value }))} placeholder="e.g. 7-9h" />
              </div>
              <div>
                <label className={labelClass}>Recovery note</label>
                <input className={inputClass} value={recovery.hrvTrend} onChange={(e) => setRecovery((r) => ({ ...r, hrvTrend: e.target.value }))} placeholder="Optional" />
              </div>
            </div>

            <div>
              <p className={labelClass}>Recovery protocols</p>
              <p className={`${captionClass} mb-2`}>Things to do to recover well — cold showers, stretching, sauna, whatever you actually do.</p>
              <div className="flex flex-col gap-2">
                {recovery.protocols.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <input className={inputClass} value={p} onChange={(e) => updateProtocol(i, e.target.value)} placeholder="e.g. Cold shower 3min post-training" />
                    <button onClick={() => removeProtocol(i)} className="text-zinc-600 hover:text-red-400 px-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={addProtocol} className="inline-flex items-center gap-2 border border-white/15 hover:border-[#D4FF00] text-xs font-bold uppercase tracking-wide px-4 py-2.5 text-zinc-300 hover:text-white transition-colors self-start">
                  <Plus size={14} /> Add protocol
                </button>
              </div>
            </div>

            <div>
              <p className={labelClass}>Morning routine</p>
              <p className={`${captionClass} mb-2`}>Shows on the Home tab every day — whatever you want to start each morning with.</p>
              <div className="flex flex-col gap-2">
                {morningRoutine.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input className={inputClass} value={m} onChange={(e) => updateMorningItem(i, e.target.value)} placeholder="e.g. 10min sunlight exposure" />
                    <button onClick={() => removeMorningItem(i)} className="text-zinc-600 hover:text-red-400 px-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={addMorningItem} className="inline-flex items-center gap-2 border border-white/15 hover:border-[#D4FF00] text-xs font-bold uppercase tracking-wide px-4 py-2.5 text-zinc-300 hover:text-white transition-colors self-start">
                  <Plus size={14} /> Add item
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => onSubmit(buildPayload())}
          disabled={submitting}
          className="mt-8 inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-6 py-3.5 hover:bg-white transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>

      {/* ── Live preview (always visible on desktop, toggled on mobile) ── */}
      <div className={`w-full lg:w-[380px] shrink-0 ${showPreview ? "block" : "hidden lg:block"}`}>
        <p className="text-overline mb-3 hidden lg:block">Preview — what the client sees</p>
        <div className="border border-white/10 bg-black rounded-[28px] overflow-hidden" style={{ height: 680 }}>
          <AppShell
            data={previewData}
            compact
            brandLogo={mode === "coach" ? brandLogo : null}
            initialView={
              section === "train" ? "training"
              : section === "fuel" ? "nutrition"
              : section === "recover" ? "recovery"
              : "home"
            }
            initialTrainingDay={section === "train" ? selectedDay : null}
          />
        </div>
      </div>
    </div>
  );
}
