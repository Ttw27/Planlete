import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { useContent } from "../hooks/useContent";
import { useImages } from "../hooks/useImages";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import OfferBar from "../components/OfferBar";

// ─── Marquee ────────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  "Rehab & Recovery", "Longevity & Fitness", "Football Specific",
  "Sprint Training", "Strength & Conditioning", "One-off payment",
  "Personalised Plans", "Built For You",
];

function Marquee() {
  return (
    <div className="bg-black/40 border-y border-white/5 py-4 overflow-hidden">
      <div className="flex gap-6 whitespace-nowrap animate-scroll">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <span key={i} className="text-xs text-zinc-500 uppercase tracking-widest">
            • {item}
          </span>
        ))}
      </div>
    </div>
  );
}

const SPORTS = [
  "Bodybuilding", "Hybrid athlete / HYROX", "Boxing", "Kickboxing & martial arts",
  "Football", "Rugby", "Sprinting & athletics", "Powerlifting", "Marathon & half marathon",
  "Triathlon & Ironman", "Tennis & racket sports", "Getting into running",
  "Longevity & general fitness", "Fat loss", "Muscle building", "CrossFit-style training",
  "Endurance & running", "And more",
];

// ─── Sample Plans ────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "rehab",
    label: "Rehab & Recovery",
    body: "Written by a qualified physio, not AI. An example of what a practitioner can build for their client on Planlete.",
    href: "/app/rehab",
    imageKey: "card_rehab",
    fallback: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    tag: "Physio built",
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

function PlanCard({ plan, images, c }) {
  const img = images?.[plan.imageKey] || plan.fallback;
  const body = c(`card_${plan.id}_body`, plan.body);
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
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">{body}</p>
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
      <OfferBar />
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
        <h2 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-16 max-w-2xl">
          <span className="block">{c("how_headline_a", "Three steps.")}</span>
          <span className="block text-[#D4FF00]">{c("how_headline_b", "No friction.")}</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((n) => (
            <div key={n}>
              <p className="text-overline text-[#D4FF00] mb-3">{n.toString().padStart(2, "0")}</p>
              <h3 className="font-display text-2xl mb-3">{c(`how_step${n}_title`, `Step ${n}`)}</h3>
              <p className="text-zinc-400">{c(`how_step${n}_body`, `Do step ${n} here.`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROGRESSIVE PROGRAMME ── */}
      <section id="progressive" className="py-24 md:py-32 bg-zinc-950 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <p className="text-overline text-zinc-500 mb-4">— {c("progressive_overline", "Built to progress")}</p>
          <h2 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-12 max-w-2xl">
            <span className="block">{c("progressive_headline_a", "Not a one-week PDF.")}</span>
            <span className="block text-[#D4FF00]">{c("progressive_headline_b", "A programme that builds.")}</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <p className="text-overline text-[#D4FF00] mb-3">01</p>
              <h3 className="font-display text-xl mb-3">{c("progressive_point1_title", "4 weeks, not 1")}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {c("progressive_point1_body", "Three weeks of progressive overload, then a deload week to recover — before it cycles again. A real programme, not a single static week repeated forever.")}
              </p>
            </div>
            <div>
              <p className="text-overline text-[#D4FF00] mb-3">02</p>
              <h3 className="font-display text-xl mb-3">{c("progressive_point2_title", "Every exercise explained")}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {c("progressive_point2_body", "Tap the (i) next to any exercise in your app and see exactly why it's there — for your goal, your experience level, or any injury you told us about. Nothing thrown in at random.")}
              </p>
            </div>
            <div>
              <p className="text-overline text-[#D4FF00] mb-3">03</p>
              <h3 className="font-display text-xl mb-3">{c("progressive_point3_title", "Progressive overload, worked out for you")}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {c("progressive_point3_body", "Log your weights each week and your app tells you when to push harder, when you've stalled, and roughly how much more to aim for next time — not just a static number you re-read every week.")}
              </p>
            </div>
            <div>
              <p className="text-overline text-[#D4FF00] mb-3">04</p>
              <h3 className="font-display text-xl mb-3">{c("progressive_point4_title", "Built-in timers, for everything")}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {c("progressive_point4_body", "Rest timers between sets, hold timers for planks and isometric work — no separate stopwatch app, it's already in your plan.")}
              </p>
            </div>
            <div>
              <p className="text-overline text-[#D4FF00] mb-3">05</p>
              <h3 className="font-display text-xl mb-3">{c("progressive_point5_title", "Stuck on a move? One tap away")}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {c("progressive_point5_body", "Every exercise has a quick Google or YouTube lookup built right in — nobody's left guessing what an unfamiliar name actually means.")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SPORTS COVERED ── */}
      <section id="sports" className="py-24 md:py-32 bg-black">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <p className="text-overline text-zinc-500 mb-4">— {c("sports_overline", "Most sports covered")}</p>
          <h2 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-10 max-w-2xl">
            <span className="block">{c("sports_headline_a", "Whatever you train for,")}</span>
            <span className="block text-[#D4FF00]">{c("sports_headline_b", "it's covered.")}</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {SPORTS.map((sport) => (
              <span
                key={sport}
                className="border border-white/15 text-zinc-300 text-sm px-4 py-2 hover:border-[#D4FF00] hover:text-white transition-colors"
              >
                {sport}
              </span>
            ))}
          </div>
          <p className="text-zinc-500 text-sm mt-8 max-w-xl">
            {c("sports_footnote", "Don't see yours listed? Pick \"Something else\" in the questionnaire and tell us — we'll still build it around your sport.")}
          </p>
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
              <PlanCard key={plan.id} plan={plan} images={images} c={c} />
            ))}
          </div>

          {/* Four samples can't show everything the questionnaire covers, so
              say so plainly rather than letting people assume we don't do
              their sport. */}
          <p className="text-sm text-zinc-500 mt-8 text-center leading-relaxed">
            Also covering marathon, triathlon, HYROX, tennis, boxing, powerlifting, getting into
            running and plenty more —{" "}
            <Link to="/build" className="text-[var(--accent)] hover:underline">
              build yours in a couple of minutes
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 md:py-32 bg-zinc-950 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 text-center">
          <span className="inline-block bg-[#D4FF00] text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 mb-8">
            {c("pricing_badge", "Launch offer · 75% off · Limited time")}
          </span>
          <h2 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-6">
            <span className="block">{c("pricing_headline_a", "Your own app.")}</span>
            <span className="block text-[#D4FF00]">{c("pricing_headline_b", "Normally £20. Now £4.99.")}</span>
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto leading-relaxed mb-10">
            {c(
              "pricing_explainer",
              "We're running a launch offer to seed the first wave of users with real feedback. Once we hit our cap, the price reverts to £20."
            )}
          </p>
          <Link
            to="/build"
            className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-sm px-8 py-4 hover:bg-white transition-colors"
          >
            Build my plan — £4.99
            <ArrowRight size={16} />
          </Link>
          <p className="mt-4 text-zinc-600 text-xs uppercase tracking-widest">
            One-off payment · No subscription · Yours to keep
          </p>
        </div>
      </section>

      {/* ── FLEXIBILITY / ONE-OFF ── */}
      <section id="flexibility" className="py-24 md:py-32 bg-black border-y border-white/10">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <p className="text-overline text-zinc-500 mb-4">— {c("flex_overline", "One payment. Built to last.")}</p>
          <h2 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-8 max-w-2xl">
            <span className="block">{c("flex_headline_a", "Life changes.")}</span>
            <span className="block text-[#D4FF00]">{c("flex_headline_b", "So can your plan.")}</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl leading-relaxed text-lg">
            {c(
              "flex_body",
              "One-off payment, nothing recurring. If your goals shift, your lifestyle changes, or you pick up an injury or health condition — just build again. Same £4.99, brand new app, made for where you are now."
            )}
          </p>
        </div>
      </section>

      {/* ── FOR COACHES ── */}
      <section id="b2b" className="py-24 md:py-32 bg-black">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <p className="text-overline text-zinc-500 mb-4">— For coaches & gyms</p>
          <h2 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-8 max-w-2xl">
            <span className="block">Build branded plans</span>
            <span className="block text-[#D4FF00]">for your clients.</span>
          </h2>
          <p className="text-zinc-400 max-w-xl leading-relaxed mb-4">
            {c("coaches_body", "PTs, gyms, sports clubs and rehab clinics — create fully branded training apps for your clients with your own logo, colours and content.")}
          </p>
          <p className="text-zinc-500 text-sm max-w-xl leading-relaxed mb-10">
            {c("coaches_no_subscription", "No monthly subscription. No lock-in. Pay only when you create a client plan.")}
          </p>
          <Link
            to="/coach"
            className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-sm px-8 py-4 hover:bg-white transition-colors"
          >
            {c("coaches_cta", "Create your first client — free")}
            <ArrowRight size={16} />
          </Link>
          {/* Gyms and clinics need more than the single-coach flow — send them
              somewhere that speaks to that rather than into the signup. */}
          <p className="text-sm text-zinc-500 mt-6">
            Running a gym, clinic or team?{" "}
            <Link to="/for-coaches" className="text-[#D4FF00] hover:underline">
              See what we're building for you
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="py-24 md:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 text-center">
          <h2 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-8 max-w-3xl mx-auto">
            {c("footer_headline", "Stop saving plans to your camera roll. Get an app that actually works.")}
          </h2>
          <Link
            to="/build"
            className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-sm px-8 py-4 hover:bg-white transition-colors"
          >
            {c("footer_cta", "Build my plan — £4.99")}
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
