# Planlete

> **Built for You.** A personalised training-plan web platform.

Planlete is a premium training-app builder. Users answer a few questions and get a personalised training app — workouts, nutrition, recovery, all in one place, on their phone, ready to use. PTs, gyms, sports clubs and rehab clinics can also build branded plans for their clients without a subscription or any tie-ins.

---

## Highlights

- **Sales-funnel landing page** with editorial dark design, animated marquee, expert-credibility grid, methodology section and £4.99 launch-offer pricing.
- **4 fully functional sample training apps** rendered inside a phone-style mobile shell:
  - **Athlete Performance** — 6-day split, VO2/Z2 cardio, recovery, nutrition stack
  - **Longevity & Fitness** — sustainable 4-day week, mobility, joint health
  - **Football Player** — toggle between **Off-Season · Pre-Season · In-Season**, MD-1/MD/MD+1 structure
  - **Sprinter** — acceleration, max velocity, plyometrics, sprint-specific nutrition
- **8-question Build wizard** that takes a user from goal → personalised app (questionnaire → plan stub → unique shareable link).
- **Admin back-office** at `/admin` to edit any text content and swap any image on the public site live.
- **Coach builder** at `/coach` — coaches sign up free, customise brand logo + colours, and create unlimited branded client plans on a unique URL like `/c/{coach}/{client}`. **No subscription. No tie-ins. Pay-per-client.**
- **Mobile-first** throughout. All interactive elements have `data-testid` attributes for E2E testing.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19 (CRA + craco), Tailwind CSS, shadcn/ui, lucide-react, sonner, react-router |
| Fonts | Cabinet Grotesk (display), Manrope (body), JetBrains Mono (numbers/labels) |
| Backend | FastAPI, Motor (async MongoDB), PyJWT, bcrypt |
| Database | MongoDB |
| Object storage | Emergent object storage (images + coach logos) |
| Auth | Admin: shared-secret token. Coaches: bcrypt + JWT (30-day) |
| LLM (planned) | Claude Sonnet (Anthropic) via Emergent universal key |
| Payments (planned) | Stripe |
| Email (planned) | Resend |

---

## Project structure

```
.
├── backend/
│   ├── server.py            # FastAPI app, all /api/* routes, auth, storage, models
│   ├── requirements.txt
│   └── .env                 # MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_PASSWORD, EMERGENT_LLM_KEY
├── frontend/
│   ├── package.json
│   ├── craco.config.js
│   ├── tailwind.config.js
│   ├── public/index.html    # Fonts + page title
│   └── src/
│       ├── App.js           # Routes
│       ├── index.css        # Global theme + CSS variables (--accent, --brand-bg)
│       ├── components/
│       │   ├── AppShell.jsx          # Phone-frame mobile UI for sample/branded apps
│       │   ├── SiteHeader.jsx
│       │   ├── SiteFooter.jsx
│       │   ├── OfferBar.jsx          # Launch-offer top sticky bar
│       │   └── AdminLayout.jsx       # Shared admin chrome (sidebar nav)
│       ├── pages/
│       │   ├── Landing.jsx           # Full sales funnel
│       │   ├── AthleteApp.jsx        # /app/athlete
│       │   ├── LongevityApp.jsx      # /app/longevity
│       │   ├── FootballApp.jsx       # /app/football (mode toggle)
│       │   ├── SprinterApp.jsx       # /app/sprinter
│       │   ├── BuildApp.jsx          # /build (8-question wizard)
│       │   ├── GeneratedApp.jsx      # /app/u/:id
│       │   ├── AdminLogin.jsx        # /admin
│       │   ├── AdminContent.jsx      # /admin/content
│       │   ├── AdminImages.jsx       # /admin/images
│       │   ├── CoachAuth.jsx         # /coach (login + signup)
│       │   ├── CoachDashboard.jsx    # /coach/dashboard
│       │   └── PublicBrandedPlan.jsx # /c/:coachSlug/:clientSlug
│       └── lib/
│           ├── sampleData.js   # Workouts, nutrition, recovery data for all 4 sample apps
│           ├── contentKeys.js  # Source of truth for every editable text field
│           ├── templates.js    # Template id → sample data resolver
│           ├── useContent.js   # Hook + cache for text overrides
│           ├── useImages.js    # Hook + cache for image overrides
│           └── coachApi.js     # Axios instance with Bearer interceptor
└── memory/
    ├── PRD.md
    └── test_credentials.md
```

---

## Routes

### Public
| Path | Page |
|---|---|
| `/` | Landing (full sales funnel) |
| `/build` | 8-question build wizard (£4.99 personal plan) |
| `/app/athlete` | Athlete Performance sample app |
| `/app/longevity` | Longevity & Fitness sample app |
| `/app/football` | Football sample app (off/pre/in-season toggle) |
| `/app/sprinter` | Sprinter sample app |
| `/app/u/:id` | Generated personal plan (after questionnaire) |
| `/c/:coachSlug/:clientSlug` | Public branded client plan |

### Admin (single password)
| Path | Purpose |
|---|---|
| `/admin` | Login |
| `/admin/content` | Edit ~35 copy fields grouped into 7 sections |
| `/admin/images` | Upload / paste-URL / reset all 9 site images |

### Coach
| Path | Purpose |
|---|---|
| `/coach` | Coach login + signup (free) |
| `/coach/dashboard` | Client plans list + Brand & logo settings |

---

## API

All endpoints are prefixed with `/api`.

### Public
- `GET /api/` — health
- `POST /api/waitlist` — generic waitlist capture
- `POST /api/plans/generate` — generate a (stub) personal plan
- `GET /api/plans/{id}` — fetch generated plan
- `GET /api/content` — all admin text overrides
- `GET /api/images` — all admin image overrides
- `GET /api/files/{path}` — serve uploaded files from object storage
- `GET /api/c/{coach_slug}/{client_slug}` — public branded client plan bundle

### Admin (shared-secret `X-Admin-Token`)
- `POST /api/admin/login` — exchange password for token
- `GET /api/admin/verify` — verify current token
- `POST /api/admin/content` — set a text override
- `DELETE /api/admin/content/{key}` — reset text to default
- `POST /api/admin/images/upload` — upload an image
- `POST /api/admin/images/url` — set image override by URL
- `DELETE /api/admin/images/{key}` — reset image to default

### Coach (Bearer JWT)
- `POST /api/coach/signup`
- `POST /api/coach/login`
- `POST /api/coach/logout`
- `GET /api/coach/me`
- `PATCH /api/coach/me` — update brand name + colours
- `POST /api/coach/logo` — upload a logo
- `POST /api/coach/clients` — create a client plan
- `GET /api/coach/clients` — list client plans
- `DELETE /api/coach/clients/{id}` — delete a client plan

---

## Local setup

### Prerequisites
- Node 18+ and **yarn** (do not use npm)
- Python 3.10+
- A MongoDB instance (local or hosted)

### Backend

```bash
cd backend
pip install -r requirements.txt
# Configure .env (see below)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### `backend/.env`
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="planlete"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="<generate a long random string>"
ADMIN_PASSWORD="<your admin password>"
ADMIN_TOKEN="<long random string — shared secret returned on admin login>"
APP_NAME="planlete"
EMERGENT_LLM_KEY="<your Emergent universal LLM key, required for object storage>"
```

### Frontend

```bash
cd frontend
yarn install
yarn start
```

#### `frontend/.env`
```
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=443
```

---

## Brand system

- Accent colour (volt green by default): `--accent` (CSS variable)
- Background (near-black by default): `--brand-bg`
- These are set globally in `index.css` and overridden by `PublicBrandedPlan.jsx` per coach so the AppShell instantly re-themes to a coach's brand colours.

---

## Known mocked / deferred work

| Area | Status |
|---|---|
| AI plan generation (Claude Sonnet) | **MOCKED** — questionnaire stores answers but the generated app uses the Athlete template |
| Stripe £4.99 consumer paywall | **MOCKED** — questionnaire submits straight through |
| Stripe per-client coach billing | **FREE / MOCKED** — coaches can create unlimited plans for now |
| Resend transactional emails | **NOT WIRED** — waitlist, coach welcome, client link delivery |
| 4th rehab sample app | Backlog |
| Real practitioner database backing "200+ protocols" | Backlog |

These are well isolated and each is a 30–90 minute integration thanks to the existing architecture (Emergent integrations for LLM/Stripe/Resend).

---

## License

Proprietary — © Planlete. All rights reserved.
