# Planlete — working notes for Claude Code

Read this first. It is the handover from roughly three months of development done in
Claude chat sessions, where I could not touch the repo directly and Tim uploaded every
file by hand through the GitHub web UI. That constraint shaped a lot of what follows.

---

## What Planlete is

A UK fitness platform at **planlete.co.uk**, run solo by Tim under **TEZL GROUP LTD**
(company 13372142, Unit 1 Thurmaston Village Court, 651 Melton Road, Leicester, LE4 8EB).

It generates personalised four-week training plans delivered as **bookmarkable web apps**,
not PDFs. One-off fee per plan, no subscription. Two routes in: an AI questionnaire, and a
self-serve builder for coaches and physios.

There is a sister project, **Build for Longevity** (buildforlongevity.com), on the same
one-off model, in its own repo and deployed via Netlify.

### Stack

| Layer | Choice |
|---|---|
| Frontend | React (CRA + Craco + Tailwind) → Vercel |
| Backend | FastAPI (Python) → Railway, port 8080 |
| Database | MongoDB Atlas |
| Storage | Cloudflare R2 |
| Payments | Stripe |
| Email | Resend |
| AI | Anthropic API, `claude-sonnet-5` |
| Social scheduling | SocialPilot (external, not integrated) |

Repo: `github.com/Ttw27/Planlete`, main branch.

---

## The one architectural decision that matters

**Claude generates one week plus progression rules. Python expands it to four weeks.**

The original design asked the model for all 28 days in a single JSON response. That
produced roughly 45,000 characters per call, took five to eight minutes, and failed
constantly: truncation at the token limit, unescaped quotes, missing commas, malformed
nesting. Every failure cost a full retry.

The split-then-expand approach cut the payload to 11,000–18,000 characters and made
progression **deterministic** rather than something the model has to remember across 28
days. `expand_template()` in `backend/server.py` builds weeks 1–4 from the template.

Anything that touches progression logic belongs in Python, not the prompt. Every time we
asked the model to do arithmetic or counting, it eventually got it wrong. Two examples
worth internalising:

- Asked to explain why it prescribed fewer sessions than requested, it wrote "four
  well-placed sessions" on a plan containing three. Now computed in code and appended.
- Asked to make week 4 a deload, it repeatedly produced week 4 identical to week 3. Now
  the expansion overwrites week 4 unconditionally.

---

## Where the bodies are buried

### `backend/tests/test_plan_logic.py` — read this before changing plan logic

26 tests, runs in about a second, no network and no database. It lifts the pure functions
out of `server.py` with `ast` rather than importing it, because importing `server.py`
opens Mongo and Stripe connections.

**Every test in it is a bug that actually shipped**, and several were caused by the fix
for the previous one. That history is the point of the file:

- Fixing umbrella exercise names caused the mobile layout to overflow.
- Fixing "World's Greatest Stretch" matching "test" (grea-**test**-retch) with word
  boundaries caused "Pogo Hops" to stop matching, because `\bhop\b` misses the plural.
- Adding the deload produced "Bodyweight — hold last week's weight" on planks.
- A fixed 45-minute endurance ceiling froze a 5k/10k plan's long run, which *started* at
  45 minutes, so every increment was clamped away for four weeks.

Run it after every change to plan logic. It has already caught a regression that reached a
customer-facing plan.

### Contract changes break callers you forgot about

The worst evening of the project: I changed `/plans/generate` to return immediately and
generate in the background (necessary — the proxy was cutting the request off at five
minutes). I updated **one of its three callers**. `AdminOrders` and `AdminLoadingPreview`
carried on handing out the link instantly, so opening a plan showed "Loading your app…"
forever, and in one case a white screen because `days` was empty.

`grep` for every caller before changing what an endpoint returns. In chat I was working
from a clone and could not do this reliably. You can.

### Deploy races

Vercel deploys in seconds, Railway takes longer. For that window the new frontend talks to
the old backend. Several "bugs" were this. If something fails immediately after an upload,
check both deploys finished before investigating.

### Error reporting was hidden in production

`ErrorBoundary` had its details panel behind `NODE_ENV === "development"`, so every live
crash arrived as "Something went wrong" with nothing attached. Each one cost several
rounds of guessing. It now shows in production, collapsed. Leave it that way.

---

## Current state

### Working and tested

Plan generation across football, fat loss, under-18, muscle building, running/endurance and
calisthenics — all checked across the full 28 days against real generated JSON.

Progression engine: `measure` type for sprints and plyometrics (volume held, not increased),
timed-hold detection progressing in seconds, deload holding reps and cutting sets from the
week 3 peak, bodyweight exercises blocked from kilo increments, duplicate movements
progressing once per week.

Block lifecycle: `started_at` set on first log **or first tick** (a bodyweight plan has
nothing to log, so ticking has to count), `block_ends_at` written at the same moment,
"I'm on this week" control, logged weights following exercises across weeks, Ongoing tab
after the block completes, next-block builder reading logged weights and RPE.

Promo codes: free plans skipping Stripe entirely (a 100% discount cannot go through
Checkout in payment mode — zero amounts are rejected). The use cap is a single atomic
`find_one_and_update`; a naive check-then-increment gave away 53 places out of 50 under a
simulated race.

Internal scheduler: stuck-order sweep every 15 minutes, block-end reminder emails daily.
Runs inside the app, no external cron. Startup recovery picks up orders orphaned by a
deploy — confirmed working on a real orphaned order.

Admin suite at `/admin`: plan JSON viewer with download, promo codes, orders, test plan
generator, loading preview, funnel analytics.

### Outstanding

- The 4 sample plan URLs are not generated or wired up.
- Self-serve and coach client-pays payment paths never tested with real transactions.
- Coach signup and the client-pays screen have no Terms agreement.
- **Solicitor review of the legal suite.** Tim has decided against this. I made Terms,
  Privacy and Refund internally consistent with the product and added parental-consent
  wording for under-18s, backed by an actual blocking question in the questionnaire. That
  is not the same as them being legally sound, and he knows my view.
- A dead `/coach/subscribe/create-session` endpoint. Unreachable from the UI, but
  `subscription_status` is read in six places including the Stripe webhook, so removing it
  is a payment-path refactor. Marked, not deleted.

### Two open coaching questions, not bugs

A beginner asking for six days gets six days — 38 exercises in week one including
muscle-up and planche work. There is no rule for "this is more than a beginner should do".
And the deload keys off experience only, so that same six-day beginner gets none.

Both are policy calls for Tim, not defects.

---

## How Tim works

- **Complete files, never snippets.** No suffix renaming, no "add this to line 340".
  Each batch is treated as a git commit.
- **Decisions before code.** Upstream questions get answered, then implementation.
- **He finds bugs in real output.** Nearly every significant bug came from him pasting
  generated plan JSON or a Railway log, not from fixtures. The admin JSON viewer and
  Railway logs are the real debugging tools.
- **Direct correction.** He states what is wrong plainly and is usually right. When he
  said "it worked when I retyped it", that single observation was worth more than two
  messages of my speculation about deploy mismatches — it was a race in my own debounce.
- **He pushes back on over-engineering.** Listen when he does.

### House style

- **No em dashes** in anything customer-facing. They are an AI tell. This applies to
  social copy, emails and site content.
- Design system: `#050505` ground, `#D4FF00` volt accent, Manrope 800 display at
  `-0.04em`, JetBrains Mono overlines. Dark ground = B2C, volt ground = B2B.
- Prices come from `pricing.js` and Railway env vars. Never hardcode them;
  `contentKeys.js` once overrode dynamic pricing and it took a while to spot.

---

## What Claude Code changes

Most of the friction in this project was mechanical and is about to disappear:

1. **No more manual uploads.** Every "have you uploaded it yet" exchange was wasted.
2. **Run the tests yourself** before handing anything over. In chat I could only run them
   in a sandbox against a copy.
3. **Real git history.** I was rebuilding a working copy from a shallow clone plus the last
   batch of outputs, and lost it entirely at least twice to container resets.
4. **grep the whole repo** before changing a contract. See the three-callers bug above.

What does not change: Tim still deploys, still watches Railway logs, and still finds things
in real output that no test will catch.

---

## Social content — what already exists

Built in a previous session and **already uploaded to R2 and scheduled**. Read this before
generating anything new, removing anything, or regenerating. None of it lives in the repo.

### The bank

**108 carousel posts, 533 slides, 1,066 images** (each slide rendered twice, once per
format). 41 are app mockups using a phone frame matched to the real `AppShell` UI; 67 are
text. Roughly 21 weeks at five posts a week.

| Format | Size | Platform |
|---|---|---|
| `instagram_1080x1350/` | 4:5 | Instagram, Facebook |
| `tiktok_1080x1920/` | 9:16 | TikTok |

**Naming.** Every post is a slug prefixed with its number: `11_launch`, `19_not_a_pdf`,
`03_coach_hours`, `99_tab_recover`, `104_phases_view`. Slides inside are
`<slug>_01.png`, `<slug>_02.png` and so on, in display order.

**The mapping is by filename, not by looking at images.** `15_sample_football_03.png` →
folder `15_sample_football` → caption under the `## 15_sample_football` heading. With 402
near-identical slides this is the only reliable route. Do not try to identify a slide
visually.

### The files

| File | What it is |
|---|---|
| `manifest.csv` / `manifest.json` | **Source of truth.** post_position, post_number, slug, audience, slide_count, slides_in_order, caption. Sorted into posting order. |
| `planlete-carousel-captions.md` | Captions in fenced blocks under `## <slug> — <audience>` headings, plus a "Full posting order" section |
| `planlete-posts-master.csv` | Row per post: caption, hashtags, image filenames in order, R2 sub-path |
| `planlete-carousels.zip` | All images **plus the renderer**: `render.py`, `content*.py`, `captions*.py`, `hashtags.py` |
| `socialpilot-MM-month-YYYY.csv` | Six monthly schedule files, 324 rows total |

**To re-render or re-skin:** edit `BRAND` at the top of `render.py` and re-run. That is how
the whole bank was produced and how the em-dash removal was applied across every image.

### R2 layout

Final structure is `posts/ig/<slug>/` and `posts/tt/<slug>/`. The renderer originally
output `instagram_1080x1350/<slug>/` and `tiktok_1080x1920/<slug>/`, and Tim flattened them
on upload — **confirm which is live before constructing URLs**, since the CSVs were built
against the real paths after that move.

Keep slug-named subfolders whatever happens. Flat filenames make every URL unpredictable
and the manifest useless.

### The schedule

16 weeks, posting **Sat / Sun / Mon / Wed / Fri evenings**. Wednesday is a US-targeted slot
at **14:00 UK** using global and US hashtags rather than UK ones.

SocialPilot account IDs, which appear in column 4 of every CSV row:

| Account | ID | Images per post |
|---|---|---|
| Instagram | `2642874` | full carousel, ~4.9 avg |
| Facebook | `2642875` | **cover only** |
| TikTok | `2642876` | full carousel, ~4.9 avg |

Facebook gets the cover image alone because album posts tile images in a grid, which
destroys a sequential carousel and reads worse than one strong image plus the caption.

Monthly breakdown — 108 posts × 3 accounts = 324 rows:

| Month | Posts | Rows | Images | Dates |
|---|---|---|---|---|
| Aug 2026 | 13 | 39 | 167 | 15–31 |
| Sep 2026 | 21 | 63 | 235 | 2–30 |
| Oct 2026 | 22 | 66 | 226 | 2–31 |
| Nov 2026 | 22 | 66 | 234 | 1–30 |
| Dec 2026 | 21 | 63 | 215 | 2–30 |
| Jan 2027 | 9 | 27 | 97 | 1–11 |

### SocialPilot import — the part that cost hours

The importer silently ignored the datetime column and scheduled everything wrong. It was
**not** date parsing. The file format did not match a known-working export.

Requirements, all of them load-bearing:

- **BOM + CRLF** line endings
- **Zero embedded newlines** in captions, which cost the paragraph breaks in longer posts
- **Zero-padded dates**: `Aug 09, 2026 14:00`, never `Aug 9`
- Six columns; images semicolon-space separated in column 2

Match a working reference file byte for byte rather than reasoning about what the spec
ought to be. I once wrote `\r\n` twice and produced a blank row between every real one,
which looked exactly like a format rejection.

**Import a few rows first.** A three-row test file catches a format problem at a cost of
three rows rather than 324, and 324 rows means ~1,500 image fetches from R2 in one go.

### Also built

Instagram highlight cards for Join, Why, How It Works, Benefits, Progress and For Business.
**Pricing was deliberately left off them** so a price change does not mean regenerating
artwork.

A beta tester recruitment post framed as "50 honest opinions", offering a free second block
for feedback, with a DM reply template.

### Working rules

- **No em dashes.** They were stripped from every content file and the images re-rendered.
  Any new copy must match.
- Dark ground = B2C. Volt ground = B2B.
- Tim schedules and posts through SocialPilot. **Generating files is the job here. Posting
  is not**, and nothing is wired to SocialPilot's API.
- Rough economics for context: about 6p of Anthropic API cost per generated plan.

---

## Quick reference

```bash
python3 backend/tests/test_plan_logic.py     # 26 tests, ~1s, no network
```

Key files:

| Path | What |
|---|---|
| `backend/server.py` | Everything backend. Large. |
| `backend/tests/test_plan_logic.py` | The regression suite |
| `frontend/src/components/AppShell.jsx` | The plan app itself |
| `frontend/src/pages/GeneratedApp.jsx` | Plan fetch and footer |
| `frontend/src/pages/BuildApp.jsx` | Questionnaire |
| `frontend/src/pages/RebuildPlan.jsx` | Next-block builder |

Functions worth knowing in `server.py`: `expand_template`, `_progress_exercise`,
`_is_measured`, `_cut_sets`, `_summarise_logs_for_prompt`, `_repair_json`,
`_close_truncated_json`, `_sweep_stuck_orders`, `_daily_jobs`.

Constants that have caused trouble: `STUCK_ORDER_SECONDS` (900 — was 180, which is shorter
than a real generation, so every poll past three minutes declared a live generation dead
and started a second one), `PROGRESSION_GROWTH_CAP` (0.75, relative to the session's
starting duration), `BLOCK_WEEKS` (4).

---

## Local layout (Claude Code desktop, from 8 Oct 2026)

Repo cloned to `~/Planlete`, pushing over SSH. Social tooling lives in the repo under `social/`:

| Path | What |
|---|---|
| `social/renderer/` | `render.py`, `content*.py`, `captions*.py`, `hashtags.py` from bundle (5) |
| `social/renderer/render_all.py` | Runner: renders IG 1080x1350, then pads each slide onto 1080x1920 for TikTok |
| `social/renderer/fonts/` | Manrope and JetBrains Mono variable fonts (Google Fonts, OFL); weight pinned in `font()` |
| `social/planlete-posts-master.csv` | Master from 9 Aug (was `planlete-posts-master (2).csv`). Historical, still has em dashes |
| `social/captions/` | Carousel captions and launch content. Historical, still have em dashes |
| `social/schedules/` | SocialPilot CSVs for Nov 2026, Dec 2026, Jan 2027 (the "still to upload" set). Em-dash free |
| `social/out/` | Render output, gitignored. The live bank is in R2 |

```bash
python3 social/renderer/render_all.py --list          # all 108 slugs
python3 social/renderer/render_all.py 19_not_a_pdf    # render specific posts
python3 social/renderer/render_all.py                 # the whole bank
```

The runner and the TikTok padding step were rebuilt on 8 Oct; the originals only existed
in chat. A test render of `19_not_a_pdf` and `84_app_coach_branded` matched R2 visually.

Em dashes were stripped from `content*.py`, `captions*.py` and `hashtags.py` on 8 Oct (the
earlier clean copies were lost with the chat). Labels became colons, new clauses became
full stops, the rest commas. If the wording differs slightly from what is live in R2,
that is why; R2 is the published version.
