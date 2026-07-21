import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import SiteHeader from "@/components/SiteHeader";
import OfferBar from "@/components/OfferBar";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const BASE_QUESTIONS = [
  {
    id: "name",
    label: "What's your first name?",
    type: "text",
    placeholder: "e.g. Alex",
    hint: "We'll put this on your app.",
  },
  {
    id: "goal",
    label: "What's your main goal?",
    type: "choice",
    options: [
      "Athlete performance",
      "Bodybuilding / muscle building",
      "Hybrid athlete / HYROX",
      "Boxing",
      "Kickboxing / martial arts",
      "Football specific",
      "Sprint / athletics",
      "Look good & stay healthy (longevity)",
      "Rehab / return from injury",
      "Lose fat",
      "Something else (tell us below)",
    ],
  },
  {
    id: "age",
    label: "What's your age range?",
    type: "choice",
    options: ["Under 18", "18–24", "25–34", "35–44", "45–54", "55+"],
  },
  {
    id: "sex",
    label: "What's your sex?",
    type: "choice",
    options: ["Male", "Female", "Prefer not to say"],
    hint: "Helps us set accurate calorie and training targets.",
  },
  {
    id: "experience",
    label: "How long have you been training?",
    type: "choice",
    options: ["Brand new", "<1 year", "1–3 years", "3–5 years", "5+ years"],
  },
  {
    id: "days",
    label: "How many days a week can you commit?",
    type: "choice",
    options: ["2", "3", "4", "5", "6"],
  },
  {
    id: "equipment",
    label: "What equipment do you have?",
    type: "choice",
    options: [
      "Full gym",
      "Home gym (barbell + rack)",
      "Dumbbells only",
      "Bodyweight only",
    ],
  },
  {
    id: "session",
    label: "How long is a typical session?",
    type: "choice",
    options: ["30 min", "45 min", "60 min", "75+ min"],
  },
  {
    id: "nutrition",
    label: "Do you want nutrition built in?",
    type: "choice",
    options: ["Yes — full plan", "Yes — just targets", "No — training only"],
  },
  {
    id: "match_day",
    label: "Which day do you usually play or compete?",
    type: "choice",
    options: ["Saturday", "Sunday", "Midweek", "Varies", "Not currently competing"],
    hint: "So we never put a hard session on top of your match.",
    goals: [
      "Football specific",
      "Athlete performance",
      "Sprint / athletics",
      "Boxing",
      "Kickboxing / martial arts",
    ],
  },
  {
    id: "training_with",
    label: "Who do you train with?",
    type: "choice",
    options: ["On my own", "With a training partner", "With my team or squad"],
    hint: "This matters — if you train alone we'll never give you a drill that needs someone else.",
  },
  {
    id: "injury",
    label: "Any injuries or areas we should train around?",
    type: "text",
    placeholder: "e.g. dodgy left knee, recovering shoulder — or leave blank",
    hint: "We'll build around it and leave that area alone. This isn't rehab — for that you need a physio.",
    optional: true,
  },
  {
    id: "notes",
    label: "Anything else we should know?",
    type: "text",
    placeholder: "e.g. avoid dairy, only free weekday mornings, training for a specific event",
    hint: "Optional — allergies, schedule quirks, or your sport if you picked 'Something else'.",
    optional: true,
  },
  {
    id: "email",
    label: "Where should we send your live app link?",
    type: "email",
    placeholder: "you@email.com",
    hint: "We'll email you a link you can bookmark — no spam.",
  },
];

// Goals with a real "stage" — the same discipline can look very different
// depending on where someone is in their season, camp, or event build-up.
// A "no specific stage" option is always included so nobody's forced to
// pick something that doesn't fit their situation.
export const STAGE_CONFIG = {
  "Football specific": {
    id: "stage",
    label: "What part of your season are you in?",
    options: [
      "Off-season — building a base",
      "Pre-season — ramping up",
      "In-season — competing/playing regularly",
      "No specific season — just build me a well-rounded plan",
    ],
  },
  "Athlete performance": {
    id: "stage",
    label: "What part of your season are you in?",
    options: [
      "Off-season — building a base",
      "Pre-season — ramping up",
      "In-season — competing/playing regularly",
      "No specific season — just build me a well-rounded plan",
    ],
  },
  "Sprint / athletics": {
    id: "stage",
    label: "What part of your season are you in?",
    options: [
      "Off-season — building a base",
      "Pre-season — ramping up",
      "In-season — competing regularly",
      "No specific season — just build me a well-rounded plan",
    ],
  },
  Boxing: {
    id: "stage",
    label: "Are you training for a specific fight?",
    options: [
      "No — general training",
      "Yes — 8+ weeks out",
      "Yes — final 4 weeks (fight camp peak)",
    ],
  },
  "Kickboxing / martial arts": {
    id: "stage",
    label: "Are you training for a specific fight?",
    options: [
      "No — general training",
      "Yes — 8+ weeks out",
      "Yes — final 4 weeks (fight camp peak)",
    ],
  },
  "Hybrid athlete / HYROX": {
    id: "stage",
    label: "Do you have a race or event coming up?",
    options: [
      "No — general training",
      "Yes — several weeks out (building)",
      "Yes — final weeks (peaking/tapering)",
    ],
  },
};

// Activities where an advisory is warranted before someone starts training
// hard. This is a notice, not a screen — it does not gate the purchase or
// record a confirmation. It exists because combat and long-distance endurance
// carry real cardiovascular and impact risk, and a £4.99 plan is no substitute
// for a GP knowing what you are about to do.
const GP_ADVISORY = [
  { match: ["boxing", "kickboxing", "mma", "muay thai", "fight", "combat", "bjj", "wrestling"],
    text: "Combat sports are physically demanding and carry a real injury risk. If you have any existing health condition, or you're new to training at this intensity, please speak to your GP before you start." },
  { match: ["marathon", "ultra", "ironman", "triathlon", "half marathon"],
    text: "Endurance events place sustained load on your heart and joints. If you have any existing health condition, or you're returning after time off, please speak to your GP before starting this plan." },
];

function advisoryFor(goal) {
  const lowered = (goal || "").toLowerCase();
  return GP_ADVISORY.find((a) => a.match.some((m) => lowered.includes(m))) || null;
}

export function buildQuestions(goal) {
  // Some questions only make sense for certain goals — a marathon runner has
  // no match day. A question with a `goals` list is shown only for those.
  const relevant = BASE_QUESTIONS.filter((q) => !q.goals || q.goals.includes(goal));

  const stageConfig = STAGE_CONFIG[goal];
  if (!stageConfig) return relevant;

  const goalIndex = relevant.findIndex((q) => q.id === "goal");
  const stageQuestion = {
    ...stageConfig,
    type: "choice",
    hint: "This shapes how your plan is built — pick whatever's actually true right now.",
  };
  return [
    ...relevant.slice(0, goalIndex + 1),
    stageQuestion,
    ...relevant.slice(goalIndex + 1),
  ];
}

export default function BuildApp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [path, setPath] = useState(null); // null (choosing) | "ai"
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("cancelled") === "1") {
      toast.info("No problem — checkout was cancelled. Pick up where you left off whenever you're ready.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const questions = buildQuestions(answers.goal);
  const q = questions[step];
  const progress = ((step + 1) / (questions.length + 1)) * 100;

  const setAnswer = (val) => setAnswers((a) => ({ ...a, [q.id]: val }));

  const next = () => {
    if (!answers[q.id] && !q.optional) {
      toast.error("Pick or type an answer to continue");
      return;
    }
    if (q.type === "email" && !answers[q.id].includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      submit();
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else setPath(null);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/checkout/create-session`, { answers });
      // Send them to Stripe's hosted checkout — the plan is generated only
      // after payment is confirmed, on the /build/success page.
      window.location.href = res.data.checkout_url;
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Couldn't start checkout. Try again.");
      setSubmitting(false);
    }
  };

  if (path === null) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <OfferBar />
        <SiteHeader />
        <div className="max-w-3xl mx-auto px-5 md:px-8 pt-32 pb-20">
          <p className="text-overline mb-5">— Let's build your app</p>
          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl mb-4">
            How do you want<br />to build your plan?
          </h2>
          <p className="text-zinc-400 mb-12 max-w-xl">
            Same price either way — £4.99, one-off, either app is yours to keep.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => setPath("ai")}
              className="text-left border border-white/15 hover:border-[#D4FF00] p-6 transition-colors group"
            >
              <p className="text-overline text-[#D4FF00] mb-3">Not sure what you need?</p>
              <h3 className="font-display text-2xl mb-3">Answer a few questions.</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                We'll build a personalised 4-week programme for you — training, nutrition,
                recovery, all worked out based on what you tell us.
              </p>
              <span className="inline-flex items-center gap-2 text-[#D4FF00] text-xs font-bold uppercase tracking-wide group-hover:gap-3 transition-all">
                Start the questionnaire <ArrowRight size={14} />
              </span>
            </button>

            <Link
              to="/build/manual"
              className="text-left border border-white/15 hover:border-[#D4FF00] p-6 transition-colors group block"
            >
              <p className="text-overline text-[#D4FF00] mb-3">Know exactly what you want?</p>
              <h3 className="font-display text-2xl mb-3">Build it yourself.</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Already have a plan from your PT, a program you follow, or just know exactly
                what you want? Type it straight in — same app, same features, your content.
              </p>
              <span className="inline-flex items-center gap-2 text-[#D4FF00] text-xs font-bold uppercase tracking-wide group-hover:gap-3 transition-all">
                Open the builder <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <OfferBar />
      <SiteHeader />

      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-32 pb-20">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <p className="text-overline">
              Question {String(step + 1).padStart(2, "0")} /{" "}
              {String(questions.length).padStart(2, "0")}
            </p>
            <p className="text-overline text-[#D4FF00]">
              Launch offer · £4.99{" "}
              <span className="line-through text-zinc-600">£20</span>
            </p>
          </div>
          <div className="h-px bg-white/10 relative overflow-hidden">
            <div
              data-testid="build-progress-bar"
              className="absolute inset-y-0 left-0 bg-[#D4FF00] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div key={q.id} className="fade-up">
          <p className="text-overline mb-5">— Tell us about you</p>
          <h2
            data-testid="build-question-label"
            className="font-display text-3xl sm:text-5xl lg:text-6xl mb-10"
          >
            {q.label}
          </h2>

          {q.type === "text" || q.type === "email" ? (
            <input
              data-testid={`build-input-${q.id}`}
              type={q.type}
              placeholder={q.placeholder}
              value={answers[q.id] || ""}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && next()}
              autoFocus
              className="w-full bg-transparent border-b border-white/20 focus:border-[#D4FF00] outline-none font-display text-3xl sm:text-4xl py-4 placeholder:text-white/20 lowercase"
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {q.options.map((opt) => {
                const active = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    data-testid={`build-option-${q.id}-${opt
                      .replace(/[^a-z0-9]/gi, "-")
                      .toLowerCase()}`}
                    onClick={() => setAnswer(opt)}
                    className={`text-left px-5 py-4 border transition-all ${
                      active
                        ? "border-[#D4FF00] bg-[#D4FF00]/5 text-white"
                        : "border-white/15 text-zinc-300 hover:border-white/40 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{opt}</span>
                      {active && <Check size={16} className="text-[#D4FF00]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {q.hint && <p className="text-sm text-zinc-500 mt-4">{q.hint}</p>}

          {q.id === "goal" && advisoryFor(answers.goal) && (
            <div className="mt-6 border border-[#D4FF00]/25 bg-[#D4FF00]/5 p-4">
              <p className="text-overline text-[#D4FF00] mb-2">Before you start</p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {advisoryFor(answers.goal).text}
              </p>
            </div>
          )}
          {q.id === "notes" && (
            <p className="text-xs text-zinc-600 mt-3">
              Anything health-related you share here (like an injury) is only ever used to
              personalise your plan safely. See our{" "}
              <Link to="/privacy" className="underline hover:text-zinc-400">Privacy Policy</Link> for details.
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-12 flex items-center justify-between">
          <button
            data-testid="build-back-button"
            onClick={back}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-overline"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <button
            data-testid="build-next-button"
            onClick={next}
            disabled={submitting}
            className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-7 py-4 hover:bg-white transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {submitting
              ? "Taking you to checkout…"
              : step === questions.length - 1
              ? "Continue to payment — £4.99"
              : q.optional && !answers[q.id]
              ? "Skip"
              : "Continue"}
            <ArrowRight size={16} />
          </button>
        </div>

        <p className="text-xs text-zinc-500 mt-10 text-center">
          By continuing you agree to a one-off launch-offer charge of £4.99
          (normally £20) to receive your personalised app, our{" "}
          <Link to="/terms" className="text-zinc-300 underline hover:text-white">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/refunds" className="text-zinc-300 underline hover:text-white">
            Refund Policy
          </Link>.{" "}
          <Link to="/" className="text-zinc-300 underline hover:text-white">
            Cancel
          </Link>
        </p>
      </div>
    </div>
  );
}
