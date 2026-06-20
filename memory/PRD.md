# Built.For.You — PRD

## Original problem statement
Web platform where anyone can get a personalised training app.
- Free sample apps to get people in
- £4.99 to generate their own personalised app
- B2B tier later (PTs, gyms, rehab, coaches)
- Pages: Landing sales funnel, 3 sample apps (Athlete, Longevity, Football w/ off/pre/in-season toggle), Build flow (questionnaire → AI plan → £4.99 paywall → live link), B2B waitlist
- Mobile-first throughout
- Brand: Built.For.You

## User-confirmed choices
- AI provider: **Claude (Sonnet)** — defer integration, focus on look first
- Payments: **Stripe** — defer integration
- Email: **Resend** — defer integration
- Design: User wanted samples → design agent produced "Performance Pro" dark/volt-green aesthetic
- Generated app: each personalised app gets its own unique shareable URL (`/app/u/:id`)

## Architecture
- **Frontend**: React (CRA + craco), Tailwind, shadcn primitives available, lucide-react icons, sonner toasts, react-router. Fonts: Cabinet Grotesk (display), Manrope (body), JetBrains Mono.
- **Backend**: FastAPI + Motor (Mongo), `/api/*` prefix. Endpoints: `GET /api/`, `POST /api/waitlist`, `GET /api/waitlist/count`, `POST /api/plans/generate`, `GET /api/plans/{id}`.
- **DB**: MongoDB (`MONGO_URL`, `DB_NAME`). Collections: `waitlist`, `plans`.

## User personas
- **Solo trainee** — wants a personal training app for £4.99 (athlete / longevity / football / rehab)
- **Curious browser** — wants to try a free sample before committing
- **B2B coach/PT/gym/rehab clinic** — joins waitlist for white-label

## Core requirements
1. Sales-funnel landing page (hero, social proof marquee, how-it-works, sample bento grid, pricing, B2B waitlist, footer CTA)
2. 3 functional sample apps with phone-frame mobile-first UI (Home, Train, Fuel, Recover tabs)
3. Football sample app: off/pre/in-season toggle that swaps schedule + nutrition
4. 8-question build flow with progress bar → submits plan stub to backend → returns unique URL
5. B2B email waitlist capture (POST to backend)

## What's been implemented (2026-02 — iteration 1)
- Landing page complete with all 6 sections, volt-green editorial design
- All 3 sample apps with full workouts, nutrition (macro bar + meals + supplements), recovery, morning routine
- Football mode toggle (off/pre/in-season)
- Build questionnaire flow (text + email + 6 choice questions) with progress bar
- Generated app placeholder route `/app/u/:id` using Athlete app template with user name
- Waitlist + plan-stub backend endpoints (Mongo persistence)
- Mobile-first responsive design throughout
- All interactive elements have `data-testid`s

## Iteration 2 (2026-02)
- Added "Built by experts" section (8-tile expert grid + 3-stat credibility row)
- Added "Why it works" methodology section (3 pillars)
- Sharpened hero subhead with expert-network angle

## Iteration 3 (2026-02)
- **Sprinter sample app** at `/app/sprinter` — 7-day split (Acceleration, Power, Tempo, Max Velocity, Posterior, Speed Endurance, Recovery), nutrition (3000 kcal · 200g protein), supplement stack with beta-alanine + beetroot, recovery protocols, sprint-specific morning routine
- Landing samples grid expanded to 4 cards (Athlete · Longevity · Football · Sprinter)
- **Admin login** at `/admin` — single password (env `ADMIN_PASSWORD`)
- **Admin image manager** at `/admin/images` — 9 editable image slots (landing hero + 4 card images + 4 inside-app heroes). Upload files via Emergent object storage OR paste URL. Per-slot reset to default.
- Backend image endpoints + Emergent object storage integration
- 18/18 backend tests passing; admin auth + image overrides end-to-end verified by testing agent

## Deferred / Backlog
### P0 (next sprint)
- **Claude Sonnet** integration: replace plan stub with real AI-generated personalised training plan
- **Stripe** paywall between questionnaire submission and plan delivery
- **Resend** transactional email: send live link to user after payment, B2B waitlist confirmation
- Mobile menu polish + scroll-spy nav

### P1
- Rehab sample app (4th sample)
- "Something else entirely" custom-goal build path
- Save/share progress in the generated app (offline / PWA)
- Admin view for B2B waitlist + plan analytics

### P2
- B2B white-label dashboard (logo/colour upload, bulk client creation, branded app builder)
- Stripe Connect for B2B payouts
- iOS/Android wrapper (PWA → Capacitor)

## Test credentials
No auth yet. See `/app/memory/test_credentials.md`.
