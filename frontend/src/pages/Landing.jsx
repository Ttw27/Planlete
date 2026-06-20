import { Link } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Sparkles,
  Stethoscope,
  Activity,
  Brain,
  Trophy,
  HeartPulse,
  Salad,
  Dumbbell,
  ShieldPlus,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HERO_IMG =
  "https://images.pexels.com/photos/33360904/pexels-photo-33360904.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const SAMPLE_CARDS = [
  {
    id: "athlete",
    overline: "01 / Athlete Performance",
    title: "For people training\nseriously.",
    body: "Strength, conditioning, recovery and nutrition all in one place.",
    img: "https://images.pexels.com/photos/9944894/pexels-photo-9944894.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    cta: "View Athlete app",
    href: "/app/athlete",
    span: "md:col-span-7 md:row-span-2",
  },
  {
    id: "longevity",
    overline: "02 / Longevity & Fitness",
    title: "Look good. Feel\ngreat. For years.",
    body: "Training that fits around life. Joints, posture, energy.",
    img: "https://images.pexels.com/photos/6922129/pexels-photo-6922129.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    cta: "View Longevity app",
    href: "/app/longevity",
    span: "md:col-span-5",
  },
  {
    id: "football",
    overline: "03 / Football Player",
    title: "Built around the\ncalendar.",
    body: "Off-season, pre-season, in-season. Toggle inside the app.",
    img: "https://images.pexels.com/photos/6409107/pexels-photo-6409107.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    cta: "View Football app",
    href: "/app/football",
    span: "md:col-span-5",
  },
];

export default function Landing() {
  return (
    <div className="bg-[#050505] text-white overflow-x-hidden">
      <SiteHeader />
      <Hero />
      <SocialProofMarquee />
      <BuiltBy />
      <HowItWorks />
      <SampleApps />
      <Methodology />
      <Pricing />
      <B2B />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section
      data-testid="hero-section"
      className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden"
    >
      <div className="absolute inset-0">
        <img
          src={HERO_IMG}
          alt=""
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black" />
        <div className="absolute inset-0 grain" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full px-5 md:px-8 pb-16 md:pb-24 pt-32">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-8 h-px bg-[#D4FF00]" />
          <p className="text-overline text-[#D4FF00]">
            Built · For · You — Training apps
          </p>
        </div>

        <h1
          data-testid="hero-headline"
          className="font-display text-5xl sm:text-7xl lg:text-[8.5rem] text-white max-w-5xl"
        >
          Your training plan.
          <br />
          <span className="text-[#D4FF00]">Built as an app.</span>
          <br />
          In minutes.
        </h1>

        <p className="text-base md:text-lg text-zinc-300 mt-8 max-w-xl leading-relaxed">
          Stop screenshot-ing workout plans from Instagram. Get a proper
          training app — personalised to you, on your phone, ready to go. Built
          on protocols from longevity doctors, biohackers, physios and
          sport-specific coaches.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/build"
            data-testid="hero-primary-cta"
            className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-7 py-4 hover:bg-white transition-colors active:scale-[0.98]"
          >
            Get my free plan
            <ArrowRight size={18} />
          </Link>
          <a
            href="#samples"
            data-testid="hero-secondary-cta"
            className="inline-flex items-center gap-3 border border-white/20 text-white font-bold uppercase tracking-wider text-sm px-7 py-4 hover:bg-white/5 transition-colors"
          >
            Try a free sample
          </a>
        </div>
        <p className="text-sm text-zinc-400 mt-5">
          Or build your own for{" "}
          <span className="text-white font-semibold">£4.99</span> — not £20.
        </p>
      </div>
    </section>
  );
}

function SocialProofMarquee() {
  const items = [
    "Used by athletes, everyday people and rehab clients",
    "Built in minutes — not weeks",
    "Your plan · Your app · No gym required",
    "One-off · No subscription",
    "Mobile-first · Bookmark & go",
  ];
  return (
    <section
      data-testid="social-proof-section"
      className="border-y border-white/10 bg-black py-5 overflow-hidden"
    >
      <div className="flex gap-12 animate-marquee whitespace-nowrap will-change-transform">
        {[...items, ...items, ...items].map((t, i) => (
          <div key={i} className="flex items-center gap-3 text-zinc-300">
            <Check size={14} className="text-[#D4FF00]" />
            <span className="text-overline text-zinc-300">{t}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Pick your goal",
      body: "Athlete, longevity, football, rehab — or something else entirely.",
    },
    {
      n: "02",
      title: "Answer a few questions",
      body: "Eight questions. Two minutes. We do the rest.",
    },
    {
      n: "03",
      title: "Get your app",
      body: "Live link, on your phone, ready to use. Yours to keep.",
    },
  ];
  return (
    <section
      id="how"
      data-testid="how-it-works-section"
      className="max-w-7xl mx-auto px-5 md:px-8 py-24 md:py-32"
    >
      <div className="flex items-baseline justify-between mb-12 md:mb-20 flex-wrap gap-4">
        <div>
          <p className="text-overline mb-4">— How it works</p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl max-w-2xl">
            Three steps.
            <br />
            <span className="text-[#D4FF00]">No friction.</span>
          </h2>
        </div>
        <Link
          to="/build"
          className="text-overline hover:text-[#D4FF00] transition-colors"
        >
          Start building →
        </Link>
      </div>

      <div className="grid md:grid-cols-3 border border-white/10">
        {steps.map((s, i) => (
          <div
            key={s.n}
            className={`p-8 md:p-10 ${
              i !== steps.length - 1 ? "md:border-r border-white/10" : ""
            } ${i !== 0 ? "border-t md:border-t-0 border-white/10" : ""}`}
          >
            <p className="font-mono-display text-5xl md:text-7xl text-[#D4FF00]">
              {s.n}
            </p>
            <h3 className="font-display text-2xl md:text-3xl mt-8">{s.title}</h3>
            <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SampleApps() {
  return (
    <section
      id="samples"
      data-testid="samples-section"
      className="border-t border-white/10 bg-[#070707]"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-24 md:py-32">
        <div className="flex items-baseline justify-between mb-12 md:mb-16 flex-wrap gap-4">
          <div>
            <p className="text-overline mb-4">— Free samples</p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl max-w-3xl">
              Try one free.
              <br />
              <span className="text-[#D4FF00]">No sign up needed.</span>
            </h2>
            <p className="text-base text-zinc-400 mt-6 max-w-xl">
              See exactly what your app could look like — then build yours for
              £4.99.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-12 md:grid-rows-2 gap-px bg-white/10">
          {SAMPLE_CARDS.map((c) => (
            <Link
              key={c.id}
              to={c.href}
              data-testid={`sample-card-${c.id}`}
              className={`group relative overflow-hidden bg-[#0a0a0a] min-h-[320px] md:min-h-[400px] ${c.span}`}
            >
              <div className="absolute inset-0">
                <img
                  src={c.img}
                  alt={c.title}
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              </div>
              <div className="relative h-full flex flex-col justify-between p-6 md:p-8">
                <p className="text-overline text-[#D4FF00]">{c.overline}</p>
                <div>
                  <h3 className="font-display text-3xl md:text-4xl whitespace-pre-line">
                    {c.title}
                  </h3>
                  <p className="text-sm text-zinc-300 mt-4 max-w-sm">{c.body}</p>
                  <span className="inline-flex items-center gap-2 mt-6 text-white group-hover:text-[#D4FF00] transition-colors">
                    <span className="text-overline">{c.cta}</span>
                    <ArrowRight size={16} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section
      id="pricing"
      data-testid="pricing-section"
      className="border-t border-white/10"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-24 md:py-32">
        <div className="mb-12 md:mb-16">
          <p className="text-overline mb-4">— Pricing</p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl max-w-3xl">
            Your own app.
            <br />
            <span className="text-[#D4FF00]">Built for you. £4.99.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 border border-white/10">
          <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/10">
            <p className="text-overline">Free</p>
            <p className="font-display text-6xl mt-4">£0</p>
            <ul className="mt-8 flex flex-col gap-3 text-sm text-zinc-300">
              <PricingLi>3 sample apps to explore</PricingLi>
              <PricingLi>Athlete, longevity and football plans</PricingLi>
              <PricingLi>Use as your own — no sign up</PricingLi>
            </ul>
            <a
              href="#samples"
              data-testid="pricing-free-cta"
              className="mt-10 inline-flex items-center gap-2 border border-white/20 text-white font-bold uppercase tracking-wider text-sm px-6 py-3 hover:bg-white/5 transition-colors"
            >
              Try a sample
            </a>
          </div>

          <div className="relative p-8 md:p-12 bg-[#0a0a0a]">
            <span className="absolute top-0 right-0 bg-[#D4FF00] text-black text-[10px] uppercase tracking-widest font-bold px-3 py-1">
              Most popular
            </span>
            <p className="text-overline text-[#D4FF00]">£4.99 plan</p>
            <div className="mt-4 flex items-baseline gap-3">
              <p className="font-display text-6xl">£4.99</p>
              <p className="font-display text-2xl text-zinc-500 line-through">
                £20
              </p>
            </div>
            <ul className="mt-8 flex flex-col gap-3 text-sm text-zinc-300">
              <PricingLi accent>Answer 8 questions</PricingLi>
              <PricingLi accent>AI builds your personalised app</PricingLi>
              <PricingLi accent>Your name, your goals, your sessions</PricingLi>
              <PricingLi accent>Live link to bookmark and share</PricingLi>
              <PricingLi accent>Nutrition built around your training</PricingLi>
              <PricingLi accent>Yours to keep — no subscription</PricingLi>
            </ul>
            <Link
              to="/build"
              data-testid="pricing-paid-cta"
              className="mt-10 inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-7 py-4 hover:bg-white transition-colors active:scale-[0.98]"
            >
              <Sparkles size={16} />
              Build my plan
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingLi({ children, accent = false }) {
  return (
    <li className="flex items-start gap-3">
      <Check
        size={16}
        className={accent ? "text-[#D4FF00] mt-0.5" : "text-white/60 mt-0.5"}
      />
      <span>{children}</span>
    </li>
  );
}

function BuiltBy() {
  const experts = [
    {
      icon: <HeartPulse size={20} />,
      role: "Longevity doctors",
      note: "Joint health, hormones, sleep architecture",
    },
    {
      icon: <Activity size={20} />,
      role: "Sports physicians",
      note: "Load management, injury prevention",
    },
    {
      icon: <Brain size={20} />,
      role: "Biohackers",
      note: "HRV, zone 2, supplementation, light",
    },
    {
      icon: <ShieldPlus size={20} />,
      role: "Physiotherapists",
      note: "Rehab, mobility, return-to-play",
    },
    {
      icon: <Trophy size={20} />,
      role: "Sport-specific coaches",
      note: "Football, rugby, combat, endurance",
    },
    {
      icon: <Dumbbell size={20} />,
      role: "S&C coaches",
      note: "Periodisation, power, conditioning",
    },
    {
      icon: <Salad size={20} />,
      role: "Performance nutritionists",
      note: "Body comp, fuelling, anti-inflammatory",
    },
    {
      icon: <Stethoscope size={20} />,
      role: "Rehab specialists",
      note: "Post-surgery, chronic pain, return-to-sport",
    },
  ];
  return (
    <section
      data-testid="built-by-section"
      className="border-t border-white/10 bg-[#070707]"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-24 md:py-32">
        <div className="grid md:grid-cols-12 gap-12 mb-14">
          <div className="md:col-span-7">
            <p className="text-overline mb-4">— Built by experts</p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl">
              Not pulled off
              <br />
              Instagram. Pulled
              <br />
              from a database of
              <br />
              <span className="text-[#D4FF00]">people who actually know.</span>
            </h2>
          </div>
          <div className="md:col-span-5 md:pl-10 md:border-l border-white/10 flex flex-col justify-end">
            <p className="text-base text-zinc-300 leading-relaxed">
              Every plan is generated from a curated database of protocols built
              by{" "}
              <span className="text-white">longevity specialists, sports
              doctors, biohackers, physiotherapists, sport-specific coaches and
              performance nutritionists</span>{" "}
              — people with decades of experience and clinical results to back
              it.
            </p>
            <p className="text-sm text-zinc-500 mt-5 leading-relaxed">
              We take their methods, plug them into your goals, your schedule,
              your equipment — and build you an app you&apos;ll actually open
              tomorrow morning.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10">
          {experts.map((e) => (
            <div
              key={e.role}
              data-testid={`expert-${e.role.toLowerCase().replace(/\s+/g, "-")}`}
              className="bg-[#0a0a0a] p-6 md:p-7 hover:bg-[#111] transition-colors"
            >
              <div className="text-[#D4FF00] mb-5">{e.icon}</div>
              <p className="font-display text-lg leading-tight">{e.role}</p>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                {e.note}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-px bg-white/10">
          <StatBlock value="200+" label="Protocols in the database" />
          <StatBlock value="40+" label="Practitioners contributing" />
          <StatBlock
            value="0"
            label="Generic Instagram screenshots used"
            accent
          />
        </div>
      </div>
    </section>
  );
}

function StatBlock({ value, label, accent = false }) {
  return (
    <div
      className={`bg-[#0a0a0a] p-8 md:p-10 ${
        accent ? "border-l-2 border-[#D4FF00]" : ""
      }`}
    >
      <p
        className={`font-display text-5xl md:text-7xl ${
          accent ? "text-[#D4FF00]" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="text-overline mt-4 max-w-[14ch] leading-snug">{label}</p>
    </div>
  );
}

function Methodology() {
  const pillars = [
    {
      n: "01",
      title: "Evidence-led, not influencer-led",
      body: "Every block — strength, conditioning, mobility, nutrition, supplements — is sourced from clinicians and coaches working with elite athletes and chronic-condition patients. No fad protocols.",
    },
    {
      n: "02",
      title: "Personalised, not generic",
      body: "Your equipment, your training age, your time per session, your goal. The AI assembles a plan that respects the constraints of your real life — not a 6-day bodybuilder split when you've got 3 days and a set of dumbbells.",
    },
    {
      n: "03",
      title: "Built as an app, not a PDF",
      body: "Live link, mobile-first, day-by-day. Track today's session, today's macros, today's recovery — without scrolling through a 40-page document at the rack.",
    },
  ];
  return (
    <section
      data-testid="methodology-section"
      className="border-t border-white/10"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-24 md:py-32">
        <div className="mb-14">
          <p className="text-overline mb-4">— Why it works</p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl max-w-3xl">
            The methodology
            <br />
            <span className="text-[#D4FF00]">behind every app.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-white/10">
          {pillars.map((p) => (
            <div key={p.n} className="bg-[#050505] p-8 md:p-10">
              <p className="font-mono-display text-3xl text-[#D4FF00]">{p.n}</p>
              <h3 className="font-display text-2xl md:text-3xl mt-6">
                {p.title}
              </h3>
              <p className="text-sm text-zinc-400 mt-4 leading-relaxed">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function B2B() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/waitlist`, { email, source: "b2b" });
      setDone(true);
      toast.success("You're on the waitlist. We'll be in touch.");
      setEmail("");
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="b2b"
      data-testid="b2b-section"
      className="border-t border-white/10 bg-[#070707]"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-24 md:py-32 grid md:grid-cols-12 gap-12">
        <div className="md:col-span-6">
          <p className="text-overline mb-4">— For coaches & gyms</p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl">
            Are you a PT,
            <br />
            coach, gym or
            <br />
            <span className="text-[#D4FF00]">rehab specialist?</span>
          </h2>
        </div>
        <div className="md:col-span-6 md:pl-12 md:border-l border-white/10 flex flex-col justify-center">
          <p className="text-base text-zinc-300 leading-relaxed">
            Built.For.You isn&apos;t just for individuals. PTs, personal
            trainers, gyms, sports clubs and rehab clinics can use the platform
            to create fully branded training apps for their clients — with
            their own logo, colours and content. Same expert-led foundation, your
            brand on top.
          </p>
          <p className="text-sm text-zinc-500 mt-4 leading-relaxed">
            White-label · client management · bulk creation · revenue share.
            Coming soon.
          </p>

          {done ? (
            <div
              data-testid="b2b-waitlist-success"
              className="mt-8 border border-[#D4FF00]/40 px-5 py-4 text-sm text-[#D4FF00] flex items-center gap-3"
            >
              <Check size={16} /> You&apos;re on the waitlist. We&apos;ll email
              you when B2B opens.
            </div>
          ) : (
            <form
              data-testid="b2b-waitlist-form"
              onSubmit={submit}
              className="mt-8 flex flex-col sm:flex-row gap-3"
            >
              <input
                data-testid="b2b-waitlist-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent border border-white/15 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-[#D4FF00] focus:outline-none"
              />
              <button
                data-testid="b2b-waitlist-submit"
                disabled={loading}
                className="bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-6 py-3 hover:bg-white transition-colors disabled:opacity-50"
              >
                {loading ? "Joining…" : "Join the waitlist →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
