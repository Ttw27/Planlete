import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { useContent } from "../hooks/useContent";
import { useImages } from "../hooks/useImages";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

// ─── Marquee ────────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  "Athlete Performance", "Longevity & Fitness", "Football Specific",
  "Sprint Training", "Rehab & Recovery", "Strength & Conditioning",
  "Personalised Plans", "Built For You",
];

function Marquee() {
  return (
    <div className="overflow-hidden border-y border-white/10 py-4 bg-black/40 backdrop-blur">
      <div className="flex gap-12 animate-marquee whitespace-nowrap">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <span key={i} className="text-overline text-zinc-400 shrink-0">
            <span className="text-[#D4FF00] mr-3">·</span>{item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Plan Cards ──────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "athlete",
    label: "Athlete Performance",
    body: "Six day split. Strength, power, conditioning and recovery all in one place.",
    href: "/app/athlete",
    imageKey: "card_athlete",
    fallback: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    tag: "Free sample",
  },
  {
    id: "longevity",
    label: "Longevity & Fitness",
    body: "Four days per week. Built around joints, posture, energy and the long game.",
    href: "/app/longevity",
    imageKey: "card_longevity",
    fallback: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    tag: "Free sample",
  },
  {
    id: "football",
    label: "Football Player",
    body: "Off-season, pre-season and in-season. Toggle between phases inside the app.",
    href: "/app/football",
    imageKey: "card_football",
    fallback: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
    tag: "3 modes inside",
  },
  {
    id: "sprinter",
    label: "Sprint Training",
    body: "Acceleration, max velocity, plyometrics and the recovery that holds it together.",
    href: "/app/sprinter",
    imageKey: "card_sprinter",
    fallback: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    tag: "Free sample",
  },
];

function PlanCard({ plan, images }) {
  const img = images?.[plan.imageKey] || plan.fallback;
  return (
    <Link
      to={plan.href}
      className="group relative overflow-hidden border border-white/10 hover:border-[#D4FF00] transition-colors block"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={img}
          alt={plan.label}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
      </div>
      <div className="absolute top-4 left-4">
        <span className="bg-[#D4FF00] text-black text-[10px] font-bold uppercase tracking-widest px-2 py-1">
          {plan.tag}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="font-display text-xl uppercase tracking-tight mb-1">{plan.label}</h3>
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">{plan.body}</p>
        <span className="inline-flex items-center gap-2 text-[#D4FF00] text-xs font-bold uppercase tracking-wide group-hover:gap-3 transition-all">
          View sample <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function Landing() {
  const c = useContent();
  const { images } = useImages();

  return (
    <div className="min-h-screen bg-black text-white font-body">
      <SiteHeader />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col justify-end pb-24 pt-32 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={images?.hero_bg || "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=80"}
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <p className="text-overline text-[#D4FF00] mb-6">
            {c("hero_overline", "Planlete · Built for You")}
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl uppercase leading-none tracking-tight mb-8 max-w-4xl">
            <span className="block">{c("hero_h1_line1", "Your training plan.")}</span>
            <span className="block text-[#D4FF00]">{c("hero_h1_line2", "Built as an app.")}</span>
            <span className="block">{c("hero_h1_line3", "In minutes.")}</span>
          </h1>
          <p className="text-zinc-300 text-lg md:text-xl max-w-xl leading-relaxed mb-10">
            {c("hero_subhead", "Stop screenshot-ing workout plans from Instagram. Get a proper training plan — personalised to you, on your phone, ready to go.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/build"
              className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-sm px-8 py-4 hover:bg-white transition-colors"
            >
              {c("hero_primary_cta", "Build my plan — £4.99")}
              <ArrowRight size={16} />
            </Link>
            <a
              href="#samples"
              className="inline-flex items-center gap-3 border border-white/30 text-white font-bold uppercase tracking-wide text-sm px-8 py-4 hover:border-white transition-colors"
            >
              {c("hero_secondary_cta", "Try a free sample")}
            </a>
          </div>
          <p className="mt-4 text-zinc-500 text-xs uppercase tracking-widest">
            Free samples below · £4.99 for your own · not £20
          </p>
        </div>
      </section>

      <Marquee />

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-24 md:py-32 max-w-7xl mx-auto px-5 md:px-8">
        <p className="text-overline text-zinc-500 mb-4">— How it works</p>
        <h2 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-16">
          <span className="block">Three steps.</span>
          <span className="block text-[#D4FF00]">No friction.</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-12">
          {[
            { n: "01", title: "Pick your goal", body: "Athlete, longevity, football, sprint or something else entirely." },
            { n: "02", title: "Answer a few questions", body: "Eight questions. Two minutes. We do the rest." },
            { n: "03", title: "Get your app", body: "Live link, on your phone, ready to use. Yours to keep." },
          ].map((step) => (
            <div key={step.n}>
              <span className="font-mono-display text-5xl text-[#D4FF00] opacity-40 block mb-4">{step.n}</span>
              <h3 className="font-display text-xl uppercase tracking-tight mb-3">{step.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SAMPLE PLANS ── */}
      <section id="samples" className="py-24 md:py-32 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <p className="text-overline text-zinc-500 mb-4">— Free sample plans</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <h2 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight">
              <span className="block">Try one free.</span>
              <span className="block text-[#D4FF00]">No sign up needed.</span>
            </h2>
            <p className="text-zinc-400 max-w-sm leading-relaxed">
              Browse the sample plans. Save one to your phone. See exactly what your personalised app could look like — then build yours for £4.99.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} images={images} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 md:py-32 max-w-7xl mx-auto px-5 md:px-8">
        <div className="inline-flex items-center gap-2 bg-[#D4FF00]/10 border border-[#D4FF00]/30 px-4 py-2 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
          <span className="text-overline text-[#D4FF00]">
            {c("pricing_badge", "Launch offer · 75% off · Limited time")}
          </span>
        </div>
        <h2 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-6">
          <span className="block">Your own app.</span>
          <span className="block text-[#D4FF00]">Normally £20. Now £4.99.</span>
        </h2>
        <p className="text-zinc-400 max-w-lg leading-relaxed mb-16">
          {c("pricing_explainer", "Launch offer to seed the first wave of users. Once we hit our cap, the price reverts to £20.")}
        </p>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
          {/* Free */}
          <div className="border border-white/10 p-8">
            <p className="text-overline text-zinc-500 mb-2">Free</p>
            <p className="font-display text-4xl uppercase mb-6">Sample plans</p>
            <ul className="space-y-3 mb-8">
              {["Athlete performance plan", "Longevity & fitness plan", "Football player plan", "Sprint training plan", "Save to your phone"].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-zinc-300">
                  <Check size={14} className="text-[#D4FF00] shrink-0" />{f}
                </li>
              ))}
            </ul>
            <a href="#samples" className="block border border-white/20 text-white font-bold uppercase tracking-wide text-xs px-6 py-3 text-center hover:border-white transition-colors">
              Browse free plans
            </a>
          </div>
          {/* Paid */}
          <div className="border border-[#D4FF00] p-8 relative">
            <div className="absolute -top-3 left-6 bg-[#D4FF00] text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1">
              Most popular
            </div>
            <p className="text-overline text-[#D4FF00] mb-2">
              <span className="line-through text-zinc-500 mr-2">£20</span>£4.99
            </p>
            <p className="font-display text-4xl uppercase mb-6">Your plan</p>
            <ul className="space-y-3 mb-8">
              {["Answer 8 questions", "AI builds your personalised app", "Your name, your goals, your sessions", "Nutrition plan built around your training", "Live link — bookmark it, use it daily", "Yours to keep"].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-zinc-300">
                  <Check size={14} className="text-[#D4FF00] shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link to="/build" className="block bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-6 py-3 text-center hover:bg-white transition-colors">
              Build my plan — £4.99
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOR COACHES ── */}
      <section id="b2b" className="py-24 md:py-32 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <p className="text-overline text-zinc-500 mb-4">— For coaches & gyms</p>
          <h2 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-8 max-w-2xl">
            <span className="block">Build branded plans</span>
            <span className="block text-[#D4FF00]">for your clients.</span>
          </h2>
          <p className="text-zinc-400 max-w-xl leading-relaxed mb-4">
            PTs, gyms, sports clubs and rehab clinics — create fully branded training apps for your clients with your own logo, colours and content.
          </p>
          <p className="text-zinc-500 text-sm max-w-xl leading-relaxed mb-10">
            No monthly subscription. No lock-in. Pay only when you create a client plan.
          </p>
          <Link
            to="/coach"
            className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-sm px-8 py-4 hover:bg-white transition-colors"
          >
            Create your first client — free
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="py-24 md:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 text-center">
          <h2 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-8 max-w-3xl mx-auto">
            Stop saving plans to your camera roll. Get an app that actually works.
          </h2>
          <Link
            to="/build"
            className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-sm px-10 py-5 hover:bg-white transition-colors"
          >
            Build my plan — £4.99
            <ArrowRight size={16} />
          </Link>
          <p className="mt-6 text-zinc-600 text-xs uppercase tracking-widest">
            No subscription · One-off payment · Yours to keep
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
