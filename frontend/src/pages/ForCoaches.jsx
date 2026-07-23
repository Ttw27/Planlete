import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Check, ArrowRight } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BUSINESS_TYPES = [
  "Personal trainer",
  "Gym or studio",
  "Physiotherapy clinic",
  "Boxing / martial arts gym",
  "Sports club or team",
  "Something else",
];

// What genuinely works today. Nothing here is aspirational — a coach can sign
// up this afternoon and do all of it.
const AVAILABLE_NOW = [
  {
    title: "Build a plan for a client in minutes",
    body: "Your programming, your exercises, your notes. Delivered as an app they save to their phone — no app store, no download, no login for them to forget.",
  },
  {
    title: "Your name on it, not ours",
    body: "Client plans carry your branding. As far as they're concerned, it's your system.",
  },
  {
    title: "They log, you see the numbers",
    body: "Weights and reps logged against every exercise, so progress is visible rather than remembered.",
  },
  {
    title: "Pay per client, nothing recurring",
    body: "No monthly fee sitting on your card in a quiet month. You pay when you build a plan, or your client pays for their own.",
  },
];

// Deliberately separated and clearly labelled. A gym that signs up expecting
// this to exist and finds a waiting list doesn't come back.
const IN_DEVELOPMENT = [
  {
    title: "Your own branded system",
    body: "Your logo, your colours, your own web address. A system your members think you built.",
  },
  {
    title: "Multiple coaches, one account",
    body: "Every trainer in the gym working from the same place, with the owner able to see across all of it.",
  },
  {
    title: "Reusable templates",
    body: "Write your beginner block once, assign it fifty times, adjust per client where it matters.",
  },
  {
    title: "Edit any plan, any time",
    body: "Change a session after it's gone out. The client's link updates — no resending, no version confusion.",
  },
  {
    title: "Built for clinics",
    body: "Physios writing genuine rehab programming, with their own protocols and their own professional judgement. Something we deliberately don't let AI near.",
  },
  {
    title: "Volume pricing",
    body: "Sensible rates for gyms running dozens of clients rather than a handful.",
  },
];

export default function ForCoaches() {
  const [businessType, setBusinessType] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email.trim()) {
      setError("We'll need an email to get back to you.");
      return;
    }
    setSending(true);
    setError("");
    try {
      // Routed through support so enquiries land somewhere already monitored,
      // rather than creating a second inbox that gets forgotten.
      await axios.post(`${API}/support/contact`, {
        email: email.trim(),
        message: `COACH / GYM INTEREST\nBusiness type: ${businessType || "not given"}\n\n${details.trim() || "No further detail given."}`,
      });
      setSent(true);
    } catch {
      setError("That didn't send. Try again, or email us directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-body">
      <SiteHeader />

      <section className="max-w-5xl mx-auto px-5 md:px-8 pt-28 pb-16">
        <p className="text-overline text-[#D4FF00] mb-5">— For coaches, gyms and clinics</p>
        <h1 className="font-display text-5xl md:text-7xl uppercase leading-[0.95] tracking-tight mb-8">
          Your programming.
          <br />
          <span className="text-[#D4FF00]">Your name on it.</span>
        </h1>
        <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl">
          Planlete turns the plan you'd write anyway into an app your client keeps on their phone —
          logging their sets, showing them why each exercise is there, and carrying your branding
          rather than ours.
        </p>
        <div className="flex flex-wrap gap-3 mt-10">
          <Link
            to="/coach"
            className="inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-8 py-4 hover:bg-white transition-colors"
          >
            Start building <ArrowRight size={16} />
          </Link>
          <a
            href="#interest"
            className="inline-flex items-center border border-white/20 text-white font-bold uppercase tracking-wider text-sm px-8 py-4 hover:border-white transition-colors"
          >
            Talk to us about your gym
          </a>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 md:px-8 py-16 border-t border-white/10">
        <p className="text-overline text-[#D4FF00] mb-4">— Available today</p>
        <h2 className="font-display text-3xl md:text-4xl uppercase mb-10">
          What you can do right now
        </h2>
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
          {AVAILABLE_NOW.map((f) => (
            <div key={f.title}>
              <div className="flex items-start gap-3">
                <Check size={16} className="text-[#D4FF00] shrink-0 mt-1" />
                <div>
                  <h3 className="text-white text-base mb-2">{f.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 md:px-8 py-16 border-t border-white/10">
        <p className="text-overline text-zinc-500 mb-4">— In development</p>
        <h2 className="font-display text-3xl md:text-4xl uppercase mb-4">
          What we're building next
        </h2>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl mb-10">
          None of this exists yet — we're being straight about that. It's what we'd build for gyms
          and clinics running this at scale, and we'd rather hear from you first than guess.
        </p>
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
          {IN_DEVELOPMENT.map((f) => (
            <div key={f.title} className="border-l-2 border-white/10 pl-4">
              <h3 className="text-white text-base mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="interest" className="max-w-3xl mx-auto px-5 md:px-8 py-16 border-t border-white/10">
        <p className="text-overline text-[#D4FF00] mb-4">— Register interest</p>
        <h2 className="font-display text-3xl md:text-4xl uppercase mb-5">
          Tell us what you'd need
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-10">
          If any of the above would be useful, say so and we'll build it properly rather than
          guessing. Early businesses help shape it and get first access.
        </p>

        {sent ? (
          <div className="border border-[#D4FF00]/30 bg-[#D4FF00]/5 p-6">
            <p className="text-[#D4FF00] text-sm mb-2">Got it — thanks.</p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We'll be in touch. If you want to see it working in the meantime, the coach builder is
              live now and free to look around.
            </p>
            <Link
              to="/coach"
              className="inline-flex items-center gap-2 text-[#D4FF00] text-sm mt-4 hover:underline"
            >
              Open the coach builder <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-overline mb-3">What kind of business?</label>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setBusinessType(t)}
                    className={`px-4 py-2 border text-sm transition-colors ${
                      businessType === t
                        ? "border-[#D4FF00] text-[#D4FF00]"
                        : "border-white/15 text-zinc-400 hover:border-white/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-overline mb-3">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourgym.co.uk"
                className="w-full bg-transparent border-b border-white/20 focus:border-[#D4FF00] outline-none py-3 text-base"
              />
            </div>

            <div>
              <label className="block text-overline mb-3">
                What would you need it to do? <span className="text-zinc-600">(optional)</span>
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                placeholder="How many coaches, how many clients, and what would make this worth using"
                className="w-full bg-transparent border border-white/20 focus:border-[#D4FF00] outline-none p-4 text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}

            <button
              onClick={submit}
              disabled={sending}
              className="inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-8 py-4 hover:bg-white transition-colors disabled:opacity-50"
            >
              {sending ? "Sending…" : "Register interest"}
            </button>
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
