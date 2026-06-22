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
import OfferBar from "@/components/OfferBar";
import { useImageOverride } from "@/lib/useImages";
import { useContent } from "@/lib/useContent";
import { CONTENT_DEFAULTS } from "@/lib/contentKeys";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DEFAULT_HERO =
  "https://images.pexels.com/photos/33360904/pexels-photo-33360904.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const SAMPLE_CARDS = [
  {
    id: "athlete",
    overline: "01 / Athlete Performance",
    titleKey: "card_athlete_title",
    defaultTitle: "For people training\nseriously.",
    bodyKey: "card_athlete_body",
    defaultBody: "Strength, conditioning, recovery and nutrition all in one place.",
    imgKey: "card_athlete",
    defaultImg: "https://images.pexels.com/photos/9944894/pexels-photo-9944894.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    cta: "View Athlete app",
    href: "/app/athlete",
    span: "md:col-span-7",
  },
  {
    id: "longevity",
    overline: "02 / Longevity & Fitness",
    titleKey: "card_longevity_title",
    defaultTitle: "Look good. Feel\ngreat. For years.",
    bodyKey: "card_longevity_body",
    defaultBody: "Training that fits around life. Joints, posture, energy.",
    imgKey: "card_longevity",
    defaultImg: "https://images.pexels.com/photos/6922129/pexels-photo-6922129.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    cta: "View Longevity app",
    href: "/app/longevity",
    span: "md:col-span-5",
  },
  {
    id: "football",
    overline: "03 / Football Player",
    titleKey: "card_football_title",
    defaultTitle: "Built around the\ncalendar.",
    bodyKey: "card_football_body",
    defaultBody: "Off-season, pre-season, in-season. Toggle inside the app.",
    imgKey: "card_football",
    defaultImg: "https://images.pexels.com/photos/6409107/pexels-photo-6409107.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    cta: "View Football app",
    href: "/app/football",
    span: "md:col-span-5",
  },
  {
    id: "sprinter",
    overline: "04 / Sprinter",
    titleKey: "card_sprinter_title",
    defaultTitle: "Faster.\nSharper. Reactive.",
    bodyKey: "card_sprinter_body",
    defaultBody: "Acceleration, max velocity, plyometrics and the recovery that holds it all up.",
    imgKey: "card_sprinter",
    defaultImg: "https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    cta: "View Sprinter app",
    href: "/app/sprinter",
    span: "md:col-span-7",
  },
];

export default function Landing() {
  return (
    <div className="bg-[#050505] text-white overflow-x-hidden">
      <OfferBar />
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
  const heroImg = useImageOverride("hero_landing", DEFAULT_HERO);
  const overline = useContent("hero_overline", CONTENT_DEFAULTS.hero_overline);
  const h1a = useContent("hero_h1_line1", CONTENT_DEFAULTS.hero_h1_line1);
  const h1b = useContent("hero_h1_line2", CONTENT_DEFAULTS.hero_h1_line2);
  const h1c = useContent("hero_h1_line3", CONTENT_DEFAULTS.hero_h1_line3);
  const subhead = useContent("hero_subhead", CONTENT_DEFAULTS.hero_subhead);
  const primaryCta = useContent("hero_primary_cta", CONTENT_DEFAULTS.hero_primary_cta);
  const secondaryCta = useContent("hero_secondary_cta", CONTENT_DEFAULTS.hero_secondary_cta);
  return (
    <section
      data-testid="hero-section"
      className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden"
    >
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt=""
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black" />
        <div className="absolute inset-0 grain" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full px-5 md:px-8 pb-16 md:pb-24 pt-32">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-8 h-px bg-[#D4FF00]" />
          <p className="text-overline text-[#D4FF00]">{overline}</p>
        </div>

        <h1
          data-testid="hero-headline"
          className="font-display text-5xl sm:text-7xl lg:text-[8.5rem] text-white max-w-5xl"
        >
          {h1a}
          <br />
          <span className="text-[#D4FF00]">{h1b}</span>
          <br />
          {h1c}
        </h1>

        <p className="text-base md:text-lg text-zinc-300 mt-8 max-w-xl leading-relaxed">
          {subhead}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/build"
            data-testid="hero-primary-cta"
            className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-7 py-4 hover:bg-white transition-colors active:scale-[0.98]"
          >
            {primaryCta}
            <ArrowRight size={18} />
          </Link>
          <a
            href="#samples"
            data-testid="hero-secondary-cta"
            className="inline-flex items-center gap-3 border border-white/20 text-white font-bold uppercase tracking-wider text-sm px-7 py-4 hover:bg-white/5 transition-colors"
          >
            {secondaryCta}
          </a>
        </div>
        <p className="text-sm text-zinc-400 mt-5">
          <span className="inline-flex items-center gap-2 mr-2">
            <span className="w-1.5 h-1.5 bg-[#D4FF00] rounded-full animate-pulse" />
            <span className="text-[#D4FF00] text-overline">Launch offer</span>
          </span>
          Build your own for{" "}
          <span className="text-white font-semibold">£4.99</span>{" "}
          <span className="line-through text-zinc-600">£20</span> — limited time.
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
  const overline = useContent("how_overline", CONTENT_DEFAULTS.how_overline);
  const ha = useContent("how_headline_a", CONTENT_DEFAULTS.how_headline_a);
  const hb = useContent("how_headline_b", CONTENT_DEFAULTS.how_headline_b);
  const s1t = useContent("how_step1_title", CONTENT_DEFAULTS.how_step1_title);
  const s1b = useContent("how_step1_body", CONTENT_DEFAULTS.how_step1_body);
  const s2t = useContent("how_step2_title", CONTENT_DEFAULTS.how_step2_title);
  const s2b = useContent("how_step2_body", CONTENT_DEFAULTS.how_step2_body);
  const s3t = useContent("how_step3_title", CONTENT_DEFAULTS.how_step3_title);
  const s3b = useContent("how_step3_body", CONTENT_DEFAULTS.how_step3_body);
  const steps = [
    { n: "01", title: s1t, body: s1b },
    { n: "02", title: s2t, body: s2b },
    { n: "03", title: s3t, body: s3b },
  ];
  return (
    <section
      id="how"
      data-testid="how-it-works-section"
      className="max-w-7xl mx-auto px-5 md:px-8 py-24 md:py-32"
    >
      <div className="flex items-baseline justify-between mb-12 md:mb-20 flex-wrap gap-4">
        <div>
          <p className="text-overline mb-4">{overline}</p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl max-w-2xl">
            {ha}
            <br />
            <span className="text-[#D4FF00]">{hb}</span>
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

        <div className="grid md:grid-cols-12 gap-px bg-white/10">
          {SAMPLE_CARDS.map((c) => (
            <SampleCard key={c.id} c={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SampleCard({ c }) {
  const img = useImageOverride(c.imgKey, c.defaultImg);
  const title = useContent(c.titleKey, c.defaultTitle);
  const body = useContent(c.bodyKey, c.defaultBody);
  return (
    <Link
      to={c.href}
      data-testid={`sample-card-${c.id}`}
      className={`group relative overflow-hidden bg-[#0a0a0a] min-h-[320px] md:min-h-[420px] ${c.span}`}
    >
      <div className="absolute inset-0">
        <img
          src={img}
          alt={title}
          className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>
      <div className="relative h-full flex flex-col justify-between p-6 md:p-8">
        <p className="text-overline text-[#D4FF00]">{c.overline}</p>
        <div>
          <h3 className="font-display text-3xl md:text-4xl whitespace-pre-line">
            {title}
          </h3>
          <p className="text-sm text-zinc-300 mt-4 max-w-sm">{body}</p>
          <span className="inline-flex items-center gap-2 mt-6 text-white group-hover:text-[#D4FF00] transition-colors">
            <span className="text-overline">{c.cta}</span>
            <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Pricing() {
  const badge = useContent("pricing_badge", CONTENT_DEFAULTS.pricing_badge);
  const ha = useContent("pricing_headline_a", CONTENT_DEFAULTS.pricing_headline_a);
  const hb = useContent("pricing_headline_b", CONTENT_DEFAULTS.pricing_headline_b);
  const explainer = useContent("pricing_explainer", CONTENT_DEFAULTS.pricing_explainer);
  return (
    <section
      id="pricing"
      data-testid="pricing-section"
      className="border-t border-white/10"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-24 md:py-32">
        <div className="mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 mb-5 border border-[#D4FF00]/40 bg-[#D4FF00]/5 px-3 py-1.5">
            <span className="w-1.5 h-1.5 bg-[#D4FF00] rounded-full animate-pulse" />
            <p className="text-overline text-[#D4FF00] text-[10px]">
              {badge}
            </p>
          </div>
          <p className="text-overline mb-4">— Pricing</p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl max-w-3xl">
            {ha}
            <br />
            <span className="text-[#D4FF00]">{hb}</span>
          </h2>
          <p className="text-sm text-zinc-400 mt-5 max-w-xl">{explainer}</p>
        </div>

        <div className="grid md:grid-cols-2 border border-white/10">
          <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/10">
            <p className="text-overline">Free</p>
            <p className="font-display text-6xl mt-4">£0</p>
            <ul className="mt-8 flex flex-col gap-3 text-sm text-zinc-300">
              <PricingLi>4 sample apps to explore</PricingLi>
              <PricingLi>Athlete, longevity, football & sprinter plans</PricingLi>
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
            <div className="absolute top-0 right-0 flex">
              <span className="bg-white text-black text-[10px] uppercase tracking-widest font-bold px-3 py-1">
                Most popular
              </span>
              <span className="bg-[#D4FF00] text-black text-[10px] uppercase tracking-widest font-bold px-3 py-1">
                Save 75%
              </span>
            </div>
            <p className="text-overline text-[#D4FF00]">Launch offer</p>
            <div className="mt-4 flex items-baseline gap-3">
              <p className="font-display text-6xl">£4.99</p>
              <p className="font-display text-2xl text-zinc-500 line-through">
                £20
              </p>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Was £20 — limited-time launch price.
            </p>
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
  const overline = useContent("coaches_overline", CONTENT_DEFAULTS.coaches_overline);
  const ha = useContent("coaches_headline_a", CONTENT_DEFAULTS.coaches_headline_a);
  const hb = useContent("coaches_headline_b", CONTENT_DEFAULTS.coaches_headline_b);
  const body = useContent("coaches_body", CONTENT_DEFAULTS.coaches_body);
  const noSub = useContent("coaches_no_subscription", CONTENT_DEFAULTS.coaches_no_subscription);
  const cta = useContent("coaches_cta", CONTENT_DEFAULTS.coaches_cta);

  const perks = [
    "Your logo · your brand colours",
    "4 expert-led training templates to start from",
    "Unique shareable link per client",
    "No subscription · no tie-ins · no cancellation calls",
  ];

  return (
    <section
      id="b2b"
      data-testid="b2b-section"
      className="border-t border-white/10 bg-[#070707]"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-24 md:py-32 grid md:grid-cols-12 gap-12">
        <div className="md:col-span-6">
          <p className="text-overline mb-4">{overline}</p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl">
            {ha}
            <br />
            <span className="text-[#D4FF00]">{hb}</span>
          </h2>
          <p className="text-base text-zinc-300 leading-relaxed mt-8 max-w-lg">
            {body}
          </p>
        </div>

        <div className="md:col-span-6 md:pl-12 md:border-l border-white/10 flex flex-col justify-center">
          <div className="border border-[#D4FF00]/30 bg-[#D4FF00]/5 p-5 mb-8 flex gap-3">
            <Sparkles size={18} className="text-[#D4FF00] shrink-0 mt-0.5" />
            <p className="text-sm text-white leading-relaxed">
              <span className="text-[#D4FF00] font-bold uppercase tracking-widest text-[11px] block mb-1">
                No subscription
              </span>
              {noSub}
            </p>
          </div>

          <ul className="flex flex-col gap-3 mb-8">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-zinc-300">
                <Check size={16} className="text-[#D4FF00] mt-0.5" />
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/coach"
              data-testid="coaches-signup-cta"
              className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-7 py-4 hover:bg-white transition-colors active:scale-[0.98]"
            >
              {cta}
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/coach"
              data-testid="coaches-signin"
              className="text-overline text-zinc-400 hover:text-[#D4FF00] transition-colors"
            >
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
