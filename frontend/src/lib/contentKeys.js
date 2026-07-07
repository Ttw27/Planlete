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
          "Stop screenshot-ing workout plans from Instagram. Get a proper training app — personalised to you, on your phone, ready to go. Built on protocols from longevity doctors, biohackers, physios and sport-specific coaches.",
        long: true,
      },
      { key: "hero_primary_cta", label: "Primary CTA button", default: "Get my free plan" },
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
      { key: "card_athlete_title", label: "Athlete card title", default: "For people training\nseriously.", long: true },
      { key: "card_athlete_body", label: "Athlete card body", default: "Strength, conditioning, recovery and nutrition all in one place." },
      { key: "card_longevity_title", label: "Longevity card title", default: "Look good. Feel\ngreat. For years.", long: true },
      { key: "card_longevity_body", label: "Longevity card body", default: "Training that fits around life. Joints, posture, energy." },
      { key: "card_football_title", label: "Football card title", default: "Built around the\ncalendar.", long: true },
      { key: "card_football_body", label: "Football card body", default: "Off-season, pre-season, in-season. Toggle inside the app." },
      { key: "card_sprinter_title", label: "Sprinter card title", default: "Faster.\nSharper. Reactive.", long: true },
      { key: "card_sprinter_body", label: "Sprinter card body", default: "Acceleration, max velocity, plyometrics and the recovery that holds it all up." },
    ],
  },
  {
    id: "sample_apps",
    label: "Sample apps — brand & tagline",
    fields: [
      { key: "app_athlete_brand", label: "Athlete app brand", default: "Athlete Performance" },
      { key: "app_athlete_tagline", label: "Athlete app tagline", default: "Elite training, every day." },
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
  {
    id: "sample_links",
    label: "Sample plan links (emailed to leads)",
    fields: [
      { key: "sample_link_athlete", label: "Athlete sample link", default: "https://planlete.vercel.app/app/athlete" },
      { key: "sample_link_longevity", label: "Longevity sample link", default: "https://planlete.vercel.app/app/longevity" },
      { key: "sample_link_football", label: "Football sample link", default: "https://planlete.vercel.app/app/football" },
      { key: "sample_link_sprinter", label: "Sprinter sample link", default: "https://planlete.vercel.app/app/sprinter" },
    ],
  },
];

export const CONTENT_DEFAULTS = CONTENT_GROUPS.reduce((acc, g) => {
  g.fields.forEach((f) => {
    acc[f.key] = f.default;
  });
  return acc;
}, {});
