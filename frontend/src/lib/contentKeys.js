/**
 * Defines every editable copy field on the site, grouped by section.
 * The Admin Content page renders these. The pages call useContent(key, default).
 */
export const CONTENT_GROUPS = [
  {
    id: "hero",
    label: "Hero section",
    fields: [
      { key: "hero_overline", label: "Overline (top label)", default: "Planlete · Built for You — Training apps" },
      { key: "hero_h1_line1", label: "Headline line 1", default: "Your training plan." },
      { key: "hero_h1_line2", label: "Headline line 2 (accent)", default: "Built as an app." },
      { key: "hero_h1_line3", label: "Headline line 3", default: "In minutes." },
      {
        key: "hero_subhead",
        label: "Sub-headline",
        default:
          "Stop screenshot-ing workout plans from Instagram. Get a proper training app — personalised to you, on your phone, ready to go. Built on a foundation of widely published training science and coaching methodology.",
        long: true,
      },
      { key: "hero_primary_cta", label: "Primary CTA button", default: "Build my plan — £4.99" },
      { key: "hero_secondary_cta", label: "Secondary CTA button", default: "Try a free sample" },
    ],
  },
  {
    id: "howitworks",
    label: "How it works",
    fields: [
      { key: "how_overline", label: "Overline", default: "— How it works" },
      { key: "how_headline_a", label: "Headline line 1", default: "Three steps." },
      { key: "how_headline_b", label: "Headline line 2 (accent)", default: "No friction." },
      { key: "how_step1_title", label: "Step 1 title", default: "Pick your goal" },
      { key: "how_step1_body", label: "Step 1 body", default: "Athlete, longevity, football, sprint or rehab — or something else entirely.", long: true },
      { key: "how_step2_title", label: "Step 2 title", default: "Answer a few questions" },
      { key: "how_step2_body", label: "Step 2 body", default: "Eight questions. Two minutes. We do the rest.", long: true },
      { key: "how_step3_title", label: "Step 3 title", default: "Get your app" },
      { key: "how_step3_body", label: "Step 3 body", default: "Live link, on your phone, ready to use. Yours to keep.", long: true },
    ],
  },
  {
    id: "samples",
    label: "Sample cards",
    fields: [
      { key: "card_rehab_title", label: "Rehab card title", default: "Back from injury.\nProperly.", long: true },
      { key: "card_rehab_body", label: "Rehab card body", default: "Structured return to training with load management built in." },
      { key: "card_longevity_title", label: "Longevity card title", default: "Look good. Feel\ngreat. For years.", long: true },
      { key: "card_longevity_body", label: "Longevity card body", default: "Training that fits around life. Joints, posture, energy." },
      { key: "card_football_title", label: "Football card title", default: "Built around the\ncalendar.", long: true },
      { key: "card_football_body", label: "Football card body", default: "Off-season, pre-season, in-season. Toggle inside the app." },
      { key: "card_sprinter_title", label: "Sprinter card title", default: "Faster.\nSharper. Reactive.", long: true },
      { key: "card_sprinter_body", label: "Sprinter card body", default: "Acceleration, max velocity, plyometrics and the recovery that holds it all up." },
    ],
  },
  {
    id: "progressive",
    label: "Progressive programme section",
    fields: [
      { key: "progressive_overline", label: "Overline", default: "Built to progress" },
      { key: "progressive_headline_a", label: "Headline line 1", default: "Not a one-week PDF." },
      { key: "progressive_headline_b", label: "Headline line 2 (accent)", default: "A programme that builds." },
      { key: "progressive_point1_title", label: "Point 1 title", default: "4 weeks, not 1" },
      { key: "progressive_point1_body", label: "Point 1 body", default: "Three weeks of progressive overload, then a deload week to recover — before it cycles again. A real programme, not a single static week repeated forever.", long: true },
      { key: "progressive_point2_title", label: "Point 2 title", default: "Every exercise explained" },
      { key: "progressive_point2_body", label: "Point 2 body", default: "Tap the (i) next to any exercise in your app and see exactly why it's there — for your goal, your experience level, or any injury you told us about. Nothing thrown in at random.", long: true },
      { key: "progressive_point3_title", label: "Point 3 title", default: "Progressive overload, worked out for you" },
      { key: "progressive_point3_body", label: "Point 3 body", default: "Log your weights each week and your app tells you when to push harder, when you've stalled, and roughly how much more to aim for next time — not just a static number you re-read every week.", long: true },
      { key: "progressive_point4_title", label: "Point 4 title", default: "Built-in timers, for everything" },
      { key: "progressive_point4_body", label: "Point 4 body", default: "Rest timers between sets, hold timers for planks and isometric work — no separate stopwatch app, it's already in your plan.", long: true },
      { key: "progressive_point5_title", label: "Point 5 title", default: "Stuck on a move? One tap away" },
      { key: "progressive_point5_body", label: "Point 5 body", default: "Every exercise has a quick Google or YouTube lookup built right in — nobody's left guessing what an unfamiliar name actually means.", long: true },
    ],
  },
  {
    id: "sports",
    label: "Sports covered section",
    fields: [
      { key: "sports_overline", label: "Overline", default: "Most sports covered" },
      { key: "sports_headline_a", label: "Headline line 1", default: "Whatever you train for," },
      { key: "sports_headline_b", label: "Headline line 2 (accent)", default: "it's covered." },
      { key: "sports_footnote", label: "Footnote", default: "Don't see yours listed? Pick \"Something else\" in the questionnaire and tell us — we'll still build it around your sport.", long: true },
    ],
  },
  {
    id: "flexibility",
    label: "One-off payment section",
    fields: [
      { key: "flex_overline", label: "Overline", default: "One payment. Built to last." },
      { key: "flex_headline_a", label: "Headline line 1", default: "Life changes." },
      { key: "flex_headline_b", label: "Headline line 2 (accent)", default: "So can your plan." },
      {
        key: "flex_body",
        label: "Body paragraph",
        default: "One-off payment, nothing recurring. If your goals shift, your lifestyle changes, or you pick up an injury or health condition — just build again. Same £4.99, brand new app, made for where you are now.",
        long: true,
      },
    ],
  },
  {
    id: "sample_apps",
    label: "Sample apps — brand & tagline",
    fields: [
      { key: "app_rehab_brand", label: "Rehab app brand", default: "Rehab & Recovery" },
      { key: "app_rehab_tagline", label: "Rehab app tagline", default: "Back to full training, safely." },
      { key: "app_longevity_brand", label: "Longevity app brand", default: "Longevity & Fitness" },
      { key: "app_longevity_tagline", label: "Longevity app tagline", default: "Look good. Feel great. For decades." },
      { key: "app_football_brand", label: "Football app brand", default: "Football Player" },
      { key: "app_football_tagline", label: "Football app tagline", default: "Built around the calendar." },
      { key: "app_sprinter_brand", label: "Sprinter app brand", default: "Sprinter" },
      { key: "app_sprinter_tagline", label: "Sprinter app tagline", default: "Faster. Sharper. Sub-second decisions." },
    ],
  },
  {
    id: "pricing",
    label: "Pricing section",
    fields: [
      { key: "pricing_badge", label: "Badge text", default: "Launch offer · 75% off · Limited time" },
      { key: "pricing_headline_a", label: "Headline line 1", default: "Your own app." },
      { key: "pricing_headline_b", label: "Headline line 2 (accent)", default: "Normally £20. Now £4.99." },
      {
        key: "pricing_explainer",
        label: "Explainer paragraph",
        default: "We're running a launch offer to seed the first wave of users with real feedback. Once we hit our cap, the price reverts to £20.",
        long: true,
      },
    ],
  },
  {
    id: "coaches",
    label: "For Coaches section",
    fields: [
      { key: "coaches_overline", label: "Overline", default: "— For coaches & gyms" },
      { key: "coaches_headline_a", label: "Headline line 1", default: "Build branded plans" },
      { key: "coaches_headline_b", label: "Headline line 2 (accent)", default: "for your clients." },
      {
        key: "coaches_body",
        label: "Body paragraph",
        default: "PTs, personal trainers, gyms, sports clubs and rehab clinics — create fully branded training apps for your clients with your own logo, brand colours and content. Same expert-led foundation, your brand on top.",
        long: true,
      },
      {
        key: "coaches_no_subscription",
        label: "No-subscription line",
        default: "No monthly subscription. No lock-in. Pay only when you create a client plan. Cancel by simply not coming back.",
        long: true,
      },
      { key: "coaches_cta", label: "CTA button", default: "Create your first client — free" },
    ],
  },
  {
    id: "footer",
    label: "Footer CTA",
    fields: [
      {
        key: "footer_headline",
        label: "Footer headline",
        default: "Stop saving plans to your camera roll. Get an app that actually works.",
        long: true,
      },
      { key: "footer_cta", label: "Footer CTA button", default: "Build my plan — £4.99" },
    ],
  },
];

export const CONTENT_DEFAULTS = CONTENT_GROUPS.reduce((acc, g) => {
  g.fields.forEach((f) => {
    acc[f.key] = f.default;
  });
  return acc;
}, {});
