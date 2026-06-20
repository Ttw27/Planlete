import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import SiteHeader from "@/components/SiteHeader";
import OfferBar from "@/components/OfferBar";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const QUESTIONS = [
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
      "Look good & stay healthy (longevity)",
      "Football specific",
      "Rehab / return from injury",
      "Build muscle",
      "Lose fat",
    ],
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
    id: "email",
    label: "Where should we send your live app link?",
    type: "email",
    placeholder: "you@email.com",
    hint: "We'll email you a link you can bookmark — no spam.",
  },
];

export default function BuildApp() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const q = QUESTIONS[step];
  const progress = ((step + 1) / (QUESTIONS.length + 1)) * 100;

  const setAnswer = (val) => setAnswers((a) => ({ ...a, [q.id]: val }));

  const next = () => {
    if (!answers[q.id]) {
      toast.error("Pick or type an answer to continue");
      return;
    }
    if (q.type === "email" && !answers[q.id].includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      submit();
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else navigate("/");
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/plans/generate`, { answers });
      const id = res.data.id;
      toast.success("Plan ready. Redirecting to payment…");
      // For now skip Stripe and go straight to generated app preview
      setTimeout(() => navigate(`/app/u/${id}?preview=1`), 600);
    } catch {
      toast.error("Couldn't build your plan. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
              {String(QUESTIONS.length).padStart(2, "0")}
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
              ? "Building…"
              : step === QUESTIONS.length - 1
              ? "Build my app"
              : "Continue"}
            <ArrowRight size={16} />
          </button>
        </div>

        <p className="text-xs text-zinc-500 mt-10 text-center">
          By continuing you agree to a one-off launch-offer charge of £4.99
          (normally £20) to receive your personalised app.{" "}
          <Link to="/" className="text-zinc-300 underline hover:text-white">
            Cancel
          </Link>
        </p>
      </div>
    </div>
  );
}
