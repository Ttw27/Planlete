from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Header, Depends, Query, Response, Request, BackgroundTasks
from dotenv import load_dotenv
load_dotenv()

from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import re
import requests
import secrets
import bcrypt
import jwt
import json
from anthropic import Anthropic
import stripe
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
import boto3
from botocore.exceptions import ClientError


ROOT_DIR = Path(__file__).parent

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

APP_NAME = os.environ.get("APP_NAME", "planlete")
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://planlete.vercel.app")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
RESEND_FROM = os.environ.get("RESEND_FROM", "Planlete <hello@planlete.co.uk>")
# Where operational alerts go — a payment that produced no plan, a correction
# request, anything that needs a human. Without this set, failures are only
# visible by opening the admin panel and looking, which is no use when you're
# away from your desk.
ADMIN_ALERT_EMAIL = os.environ.get("ADMIN_ALERT_EMAIL")

# Coach/physio builder pricing. COACH_SUBSCRIPTION_PRICE_ID must be created as
# a recurring Price in the Stripe Dashboard first (Products -> Add product ->
# recurring) — Stripe subscriptions need a pre-created Price object, unlike
# the one-off consumer checkout which creates its price inline.
COACH_SUBSCRIPTION_PRICE_ID = os.environ.get("COACH_SUBSCRIPTION_PRICE_ID")
# ── Pricing ───────────────────────────────────────────────────────────────
# Every price lives here and nowhere else. The frontend reads these through
# /api/config/pricing, so changing a price is a single env var on Railway
# rather than a hunt through display strings.
#   *_PENCE          — what is actually charged today
#   *_STANDARD_PENCE — the "normally £X" strikethrough price
PLAN_PRICE_PENCE = int(os.environ.get("PLAN_PRICE_PENCE", "499"))
PLAN_STANDARD_PENCE = int(os.environ.get("PLAN_STANDARD_PENCE", "2000"))
COACH_CLIENT_PLAN_PENCE = int(os.environ.get("COACH_CLIENT_PLAN_PENCE", "899"))
COACH_CLIENT_STANDARD_PENCE = int(os.environ.get("COACH_CLIENT_STANDARD_PENCE", "2599"))


def send_email(to: str, subject: str, html: str) -> None:
    """Best-effort transactional email via Resend. Never raises — a failed
    email should never crash plan generation or the checkout flow; it just
    gets logged so it can be spotted."""
    if not RESEND_API_KEY:
        logger.warning(f"RESEND_API_KEY not set — skipped email to {to}: {subject}")
        return
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": RESEND_FROM, "to": [to], "subject": subject, "html": html},
            timeout=10,
        )
        if resp.status_code >= 300:
            logger.error(f"Resend email failed ({resp.status_code}) to {to}: {resp.text}")
        else:
            logger.info(f"Email sent to {to}: {subject}")
    except Exception as e:
        logger.error(f"Resend email error sending to {to}: {e}")


def notify_admin(subject: str, body_html: str) -> None:
    """
    Operational alert to whoever runs this. Best-effort like send_email — an
    alert failing must never take down the thing it was alerting about.
    """
    if not ADMIN_ALERT_EMAIL:
        logger.warning(f"ADMIN_ALERT_EMAIL not set — no alert sent for: {subject}")
        return
    send_email(
        to=ADMIN_ALERT_EMAIL,
        subject=f"[Planlete] {subject}",
        html=body_html,
    )


stripe.api_key = STRIPE_SECRET_KEY
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"

# ===== R2 Storage Configuration =====
R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "planlete-images")
R2_ENDPOINT_URL = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

def get_r2_client():
    """Create boto3 S3 client configured for R2"""
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to R2"""
    try:
        s3 = get_r2_client()
        s3.put_object(
            Bucket=R2_BUCKET_NAME,
            Key=path,
            Body=data,
            ContentType=content_type,
        )
        public_url = f"https://{R2_BUCKET_NAME}.{R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{path}"
        return {"path": path, "url": public_url}
    except ClientError as e:
        logger.error(f"R2 upload error: {e}")
        raise Exception(f"R2 upload failed: {e}")

def get_object(path: str):
    """Fetch file from R2"""
    try:
        s3 = get_r2_client()
        response = s3.get_object(Bucket=R2_BUCKET_NAME, Key=path)
        content = response['Body'].read()
        content_type = response.get('ContentType', 'application/octet-stream')
        return content, content_type
    except ClientError as e:
        logger.error(f"R2 fetch error: {e}")
        raise Exception(f"R2 fetch failed: {e}")

# Initialize Claude client (will be created on first use)
anthropic_client = None

def get_anthropic_client():
    global anthropic_client
    if not anthropic_client:
        anthropic_client = Anthropic()
    return anthropic_client

app = FastAPI(title="Planlete API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ===== Claude AI Plan Generation =====

EXPECTED_DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

# Bumped whenever the prompt or plan schema meaningfully changes, and stamped
# onto every generated plan. Without this, a complaint three months from now is
# impossible to trace back to which version of the prompt produced it.
PLAN_PROMPT_VERSION = "2026-08-v3"


# Which activity family a goal belongs to. Drives the hard guardrails below —
# the rules the model must obey regardless of what it would otherwise write.
ACTIVITY_FAMILIES = {
    "endurance": [
        "marathon", "half marathon", "10k", "5k", "ultra", "ironman",
        "triathlon", "sportive", "cycling", "running", "swim",
    ],
    # Specific disciplines are matched before the broader families they would
    # otherwise fall into. Order matters here — family_for_goal returns the
    # first match, so powerlifting must be checked before "strength" and
    # crossfit before "hybrid", or they inherit the wrong guardrails.
    "powerlifting": ["powerlifting", "power lifting", "strongman", "squat bench deadlift"],
    "calisthenics": [
        "calisthenic", "muscle-up", "muscle up", "handstand", "planche",
        "front lever", "back lever", "street workout", "gymnastic", "bar skills",
        "bodyweight skill",
    ],
    "crossfit": ["crossfit", "cross fit", "wod", "metcon", "functional fitness"],
    "hybrid": ["hyrox", "obstacle", "spartan", "hybrid"],
    "combat": ["boxing", "kickboxing", "mma", "muay thai", "bjj", "wrestling", "fight"],
    "team": ["football", "rugby", "basketball", "netball", "hockey", "cricket", "soccer"],
    "strength": ["hypertrophy", "bodybuilding", "muscle"],
    "speed": ["sprint", "athletics", "track"],
}


def family_for_goal(goal: str) -> str:
    """Best-effort mapping of a free-text goal onto an activity family."""
    lowered = (goal or "").lower()
    for family, keywords in ACTIVITY_FAMILIES.items():
        if any(k in lowered for k in keywords):
            return family
    return "general"


# Hard rules per family. These exist because there is no expert reviewing
# output — they constrain the model up front rather than relying on anyone
# spotting a bad plan after it has already gone to a paying customer.
FAMILY_GUARDRAILS = {
    "endurance": """ENDURANCE GUARDRAILS (mandatory):
- Never increase total weekly training volume by more than 10% from one week to the next.
- The long session must never exceed 40% of that week's total volume.
- At least 75-80% of weekly volume must be easy/conversational pace; hard sessions are the minority.
- Week 4 must be a genuine recovery week with clearly reduced volume.
- Never programme more than two hard/intense sessions in any week.""",
    "hybrid": """HYBRID/HYROX GUARDRAILS (mandatory):
- Balance strength and engine work; never let either disappear for a whole week.
- Include station-specific work (sled push/pull, farmer's carry, burpee broad jumps, wall balls, ski/row).
- Never programme heavy maximal strength and a long conditioning piece in the same session.
- Week 4 must reduce volume meaningfully.""",
    "combat": """COMBAT SPORT GUARDRAILS (mandatory):
- Never programme heavy maximal strength work within the final two weeks before a fight.
- Never prescribe sparring, partner drills or pad work if the person is training alone — substitute
  shadow work, bag work (only if they have a bag), footwork ladders and conditioning.
- Weight management advice must never involve dehydration, extreme restriction or rapid cutting.
- Prioritise sharpening and recovery close to competition, not fresh volume.""",
    "team": """TEAM SPORT GUARDRAILS (mandatory):
- In-season, prioritise maintenance and recovery around fixtures rather than adding fatiguing volume.
- Include change-of-direction and deceleration work, which is where most non-contact injuries happen.
- Include dedicated eccentric hamstring work (Nordic curls or equivalent) at least twice per week.
  Hamstring strain is the most common injury in these sports and this is the best-evidenced
  prevention — Romanian deadlifts alone do not cover it.
- Never prescribe small-sided games, opposed drills or anything requiring team-mates unless the
  person has stated they train with a team or squad.
- If a match day is given, that day must be the match itself — never a hard training session.
  The day before must be light and sharp, and the day after must be recovery.""",
    "powerlifting": """POWERLIFTING GUARDRAILS (mandatory):
- The squat, bench and deadlift are the plan. Accessories exist to serve them, never to
  replace them or to chase set counts per muscle group.
- All loads must be expressed as percentages of an estimated 1RM, never as absolute weights.
- Never programme a true 1RM attempt in week 1, and never more than once in the whole block.
- Never programme heavy squats and heavy deadlifts on consecutive days.
- Intensity and volume move inversely across the block — as percentages climb, total volume falls.
- Week 4 must reduce both, and if a meet is stated as imminent it must be a genuine taper:
  low volume, sharp, nothing that leaves residual fatigue.
- Never prescribe a grinding rep to failure on a competition lift with no spotter mentioned.""",
    "calisthenics": """CALISTHENICS GUARDRAILS (mandatory):
- Skill work always comes first in a session, on a fresh nervous system. Never at the end,
  never after fatiguing strength work.
- Progressions must be gated on prerequisites. Never programme a muscle-up progression for
  someone who cannot yet do strict pull-ups and straight-bar dips; never programme a planche
  progression without the prior lean and tuck holds. State the prerequisite in the reasoning.
- Include dedicated straight-arm scapular work and elbow tendon preparation every week.
  Elbow and shoulder tendinopathy is the primary injury in this discipline and it comes from
  straight-arm loading progressed too fast.
- Static holds must be prescribed in seconds with a clear progression target — never
  "hold as long as possible", which trains failure rather than the position.
- Never programme maximal skill attempts on consecutive days.
- If no pull-up bar or rings are available, never prescribe bar or ring skills. Substitute
  floor-based progressions and say so.""",
    "crossfit": """CROSSFIT GUARDRAILS (mandatory):
- Never programme high-rep olympic lifting under heavy fatigue. Technical failure under load
  is the primary injury mechanism in this sport.
- Technique and skill work goes before the conditioning piece, never after it.
- Never programme heavy barbell work and high-volume gymnastics (kipping pull-ups,
  toes-to-bar, handstand press-ups) at high volume in the same session.
- Build strict strength before adding kipping volume, and cap kipping volume for anyone
  who has not stated multiple years of experience.
- Never programme maximal lifts on consecutive days.
- Week 4 must reduce volume meaningfully.""",
    "strength": """STRENGTH GUARDRAILS (mandatory):
- Never programme true maximal (1RM) attempts more than once in the block.
- Keep weekly sets per muscle group within a sane hypertrophy range (roughly 10-20 working sets).
- Week 4 must reduce both volume and intensity.
- Percentages must be expressed against an estimated 1RM, never assumed absolute loads.""",
    "speed": """SPEED GUARDRAILS (mandatory):
- Maximal sprint work must always come early in a session, on fresh legs, never after fatiguing work.
- Full recovery between maximal sprint efforts — never programme sprints as conditioning circuits.
- Include dedicated hamstring resilience work; this is the primary injury risk.
- Never programme maximal speed work on consecutive days.""",
    "general": """GENERAL TRAINING GUARDRAILS (mandatory):
- Start conservatively. Under-prescribing is far better than over-prescribing for this person.
- Progress gradually week to week; never make large jumps in volume or intensity.
- Week 4 must be a lighter recovery week.""",
}


# ───────────────────────────────────────────────────────────────────────────────
# Activity standards
#
# The guardrails above are hand-written safety rules. These are different: they
# are the SPORT-SPECIFIC QUALITY standards a specialist coach would insist on,
# and they are written by Claude rather than by us.
#
# The reason is a limitation worth being explicit about. The model knows
# perfectly well that Nordic curls are the best-evidenced hamstring prevention
# for footballers — ask it directly and it says so. But when a single call has
# to produce 28 days plus nutrition plus recovery, attention goes on coherence
# and completeness, and it writes the median competent plan rather than the
# specialist one. Asking the narrow question on its own gets the specialist
# answer, which we then hand to the generation call as requirements.
#
# It is cached per activity so it runs once, is reviewable in ten lines rather
# than by reading a 28-day plan, and is editable in admin without a deploy.
# ───────────────────────────────────────────────────────────────────────────────

ACTIVITY_STANDARDS_VERSION = "2026-07-v1"


def standards_key(goal: str) -> str:
    """Stable cache key for an activity."""
    return re.sub(r"[^a-z0-9]+", "_", (goal or "general").lower()).strip("_")


async def generate_activity_standards(goal: str) -> dict:
    """Ask Claude what a specialist in this activity would insist on."""
    client = get_anthropic_client()

    prompt = f"""You are an elite strength and conditioning coach who specialises in: {goal}

Answer as the specialist you are — the specifics a generalist would miss.

Return ONLY raw JSON (no markdown, no code fences) in this exact shape:

{{
  "must_include": ["4-6 specific things a professional plan for this activity ALWAYS contains, that a generic gym plan would miss. Name actual exercises or protocols, not vague principles."],
  "common_injuries": ["The 3-4 most common injuries in this activity"],
  "prevention": ["For each of those injuries, the best-evidenced preventative work. Name the specific exercise or protocol."],
  "never_include": ["3-4 things that should NEVER appear in a plan for this activity, and are common mistakes"],
  "hallmarks": ["3-4 things that separate a professional plan for this activity from an amateur one"]
}}

Be concrete and specific. "Core work" is useless; "Pallof press for anti-rotation" is useful.
Every entry should be one short line.
Do NOT make absolute medical or mortality claims (e.g. "the single best predictor of death",
"prevents injury"). Describe what the training does, not health outcomes it guarantees — this
content feeds a consumer product, not a clinical one."""

    def _call():
        return client.messages.create(
            model="claude-sonnet-5",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )

    message = _call()

    # Sonnet 5 can emit a thinking block ahead of the answer, so find the text
    # block rather than assuming content[0] — same reason as the plan call.
    raw = None
    for block in message.content:
        if getattr(block, "type", None) == "text":
            raw = block.text
            break
    if raw is None:
        raise ValueError("Standards response contained no text block")

    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw).strip()

    data = json.loads(raw)

    # Shape check — a malformed response should be caught here, not silently
    # injected as an empty requirements block into every plan for this sport.
    for field in ("must_include", "common_injuries", "prevention", "never_include", "hallmarks"):
        if not isinstance(data.get(field), list) or not data[field]:
            raise ValueError(f"Activity standards missing or empty field: {field}")

    return data


async def get_activity_standards(goal: str) -> Optional[dict]:
    """
    Cached standards for an activity, generating them on first use.

    Never raises. If this fails the plan is still generated, just without the
    specialist layer — a slightly more generic plan is a far better outcome
    than a failed generation for someone who has already paid.
    """
    key = standards_key(goal)
    try:
        doc = await db.activity_standards.find_one({"key": key})
        if doc and doc.get("standards"):
            return doc["standards"]

        standards = await generate_activity_standards(goal)
        await db.activity_standards.update_one(
            {"key": key},
            {"$set": {
                "key": key,
                "goal": goal,
                "family": family_for_goal(goal),
                "standards": standards,
                "version": ACTIVITY_STANDARDS_VERSION,
                "edited": False,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        logger.info(f"Generated activity standards for '{goal}'")
        return standards
    except Exception as e:
        logger.warning(f"Activity standards unavailable for '{goal}': {e}")
        return None


def format_activity_standards(standards: Optional[dict]) -> str:
    """Render standards into the requirements block used by the plan prompt."""
    if not standards:
        return ""

    def bullets(items):
        return "\n".join(f"- {i}" for i in (items or []))

    return f"""
SPORT-SPECIFIC STANDARDS (written by a specialist in this activity — treat as mandatory):

A professional plan for this activity always includes:
{bullets(standards.get("must_include"))}

Most common injuries in this activity:
{bullets(standards.get("common_injuries"))}

Preventative work that MUST appear in the plan:
{bullets(standards.get("prevention"))}

Never include:
{bullets(standards.get("never_include"))}

What separates a professional plan from an amateur one:
{bullets(standards.get("hallmarks"))}
"""


# Equipment keyword policing. If someone says they train at home with dumbbells,
# a plan full of barbell and sled work is the most visible possible failure —
# it tells them immediately the plan was not built for them.
EQUIPMENT_FORBIDDEN = {
    "bodyweight": [
        "barbell", "dumbbell", "kettlebell", "cable", "machine", "sled",
        "leg press", "lat pulldown", "smith", "trap bar", "landmine",
    ],
    "dumbbells": [
        "barbell", "cable", "machine", "sled", "leg press", "lat pulldown",
        "smith", "trap bar", "landmine", "hack squat",
    ],
    "home": ["sled", "leg press", "hack squat", "lat pulldown", "smith machine", "cable crossover"],
}


def _forbidden_equipment_terms(equipment: str) -> List[str]:
    lowered = (equipment or "").lower()
    if "full gym" in lowered or "commercial" in lowered:
        return []
    if "bodyweight" in lowered or "no equipment" in lowered or "nothing" in lowered:
        return EQUIPMENT_FORBIDDEN["bodyweight"]
    if "dumbbell" in lowered and "barbell" not in lowered:
        return EQUIPMENT_FORBIDDEN["dumbbells"]
    if "home" in lowered:
        return EQUIPMENT_FORBIDDEN["home"]
    return []


# Facilities are deliberately separate from equipment. A gym is somewhere you
# go most days; a running track is often somewhere you get to once a week. They
# have different frequencies, so a plan that treats them the same either wastes
# the facility or builds the whole block around something they can reach on a
# Tuesday. Before this existed the model had no way of knowing a sprinter had a
# track, so it either invented one or fell back to treadmill work.
#
# Terms are kept tight on purpose. A false positive here costs a full retry,
# which is exactly what this release is trying to reduce, so each list only
# contains phrases that are unambiguous in an exercise name.
FACILITY_TERMS = {
    "Running track": ["running track", "on the track", "track session", "400m track", "tartan track"],
    "Grass or astro pitch": ["on the pitch", "astro", "grass pitch", "full pitch"],
    "Pool": ["swim", "pool", "lengths", "front crawl", "backstroke"],
    "Boxing gym or bag": ["heavy bag", "punch bag", "punching bag", "bag work", "bag round"],
    "Hills or stairs": ["hill sprint", "hill run", "stair sprint", "stair run", "hill repeat"],
    "Open road or trail": ["trail run", "road run", "long road"],
}


def _forbidden_facility_terms(facilities) -> List[str]:
    """
    Terms for facilities the person specifically told us they do NOT have.

    Only fires when the facilities question was actually answered — an unanswered
    question means we don't know, and guessing "they have nothing" would reject
    good plans for everyone who never saw the question.
    """
    if not facilities:
        return []
    if isinstance(facilities, str):
        facilities = [f.strip() for f in facilities.split(",") if f.strip()]
    selected = {str(f).strip() for f in facilities}
    if "Nothing else" in selected and len(selected) == 1:
        # They explicitly said gym only, so every facility term is off-limits.
        return [t for terms in FACILITY_TERMS.values() for t in terms]

    forbidden = []
    for facility, terms in FACILITY_TERMS.items():
        if facility not in selected:
            forbidden.extend(terms)
    return forbidden


# Labels that mark a day as an existing commitment rather than a session we are
# prescribing. A club night and a match already happen whether or not anyone
# writes a plan, so counting them against the number of sessions the person
# asked us for is how a footballer who wanted 3 gym days ends up being told the
# plan has 5 and triggering a pointless regeneration.
COMMITMENT_DAY_TERMS = [
    "match", "matchday", "match day", "fixture", "game day", "gameday",
    "club training", "club session", "squad", "team training", "team session",
    "competition", "race day", "fight night",
]


def _is_commitment_day(day: dict, club_days: list) -> bool:
    label = str(day.get("label", "")).lower()
    focus = str(day.get("focus", "")).lower()

    # "Light Match Prep" and "Pre-Match Activation" are sessions WE prescribe,
    # not the fixture. Matching bare "match" swallowed them, so a football week
    # with a Friday prep session counted two prescribed days instead of three
    # and then told the customer so.
    if re.search(r"prep|pre-?match|activation|sharpen|warm", label):
        return False

    if any(term in label or term in focus for term in COMMITMENT_DAY_TERMS):
        return True
    return str(day.get("day", "")).strip() in set(club_days or [])


# Exercises that cannot be done alone. Checked when the person has said they
# train solo, which is the default.
PARTNER_TERMS = [
    "partner", "opponent", "sparring", "spar ", "small-sided", "small sided",
    "4v4", "3v3", "5v5", "2v2", "1v1", "teammate", "team-mate", "pad work",
    "pads with", "opposed", "with a coach holding",
]


def _parse_bodyweight_kg(raw: str) -> Optional[float]:
    """
    Read a bodyweight in kg, or return None if it doesn't look like one.

    A real answer was "85cm". The model quietly assumed 85kg and produced a
    confident "protein set from your bodyweight (85kg)" — right by luck. Someone
    typing "12" meaning stone would have been given a target for a toddler, and
    nothing in the plan would have looked wrong.

    Handles kg, stone (including "12st 4"), and pounds. Anything outside a
    plausible adult range is treated as unusable rather than guessed at.
    """
    if not raw:
        return None
    text = str(raw).strip().lower().replace(",", ".")

    # An explicit length unit means they answered the wrong question.
    if re.search(r"\b(cm|mm|ft|feet|inch|inches|\")\b", text) or text.endswith("cm"):
        return None

    stone = re.search(r"(\d+(?:\.\d+)?)\s*(?:st|stone)\s*(\d+(?:\.\d+)?)?", text)
    if stone:
        kg = float(stone.group(1)) * 6.35029
        if stone.group(2):
            kg += float(stone.group(2)) * 0.453592
        return round(kg, 1)

    pounds = re.search(r"(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)", text)
    if pounds:
        return round(float(pounds.group(1)) * 0.453592, 1)

    # Search rather than match, so "about 80kg" and "roughly 82" still work.
    # Length units were already rejected above, so a stray number here is safe.
    number = re.search(r"(\d+(?:\.\d+)?)", text)
    if not number:
        return None
    value = float(number.group(1))

    # Bare numbers are assumed kg, which is right for a UK audience typing "82".
    # Outside 35-250kg it is far more likely a mistake than a real bodyweight.
    if 35 <= value <= 250:
        return round(value, 1)
    return None


def _parse_minutes(text: str) -> Optional[int]:
    """Pull a minute figure out of strings like '45 min', '60-75 minutes', '1 hour'."""
    if not text:
        return None
    lowered = str(text).lower()
    if "hour" in lowered:
        m = re.search(r"(\d+(?:\.\d+)?)\s*hour", lowered)
        if m:
            return int(float(m.group(1)) * 60)
    m = re.search(r"(\d+)", lowered)
    return int(m.group(1)) if m else None


def _estimate_session_minutes(workouts: list) -> int:
    """
    Rough duration estimate for a session, from sets x rest. Deliberately
    approximate — it exists to catch a 30-minute request answered with a
    75-minute session, not to be exact to the minute.
    """
    total_seconds = 0
    for ex in workouts:
        sets_text = str(ex.get("sets", ""))
        m = re.match(r"\s*(\d+)\s*[xX]", sets_text)
        set_count = int(m.group(1)) if m else 1

        rest_text = str(ex.get("rest", ""))
        rest_seconds = 60
        rm = re.search(r"(\d+(?:\.\d+)?)\s*(min|m\b)", rest_text.lower())
        rs = re.search(r"(\d+)\s*s", rest_text.lower())
        if rm:
            rest_seconds = int(float(rm.group(1)) * 60)
        elif rs:
            rest_seconds = int(rs.group(1))

        # ~45s of actual work per set, plus the prescribed rest between them
        total_seconds += set_count * 45 + max(0, set_count - 1) * rest_seconds

    return round(total_seconds / 60)


def validate_plan_semantics(plan_data: dict, answers: dict) -> None:
    """
    The coaching-sense checks, as opposed to validate_plan's structural ones.
    A plan can be perfectly formed and still be wrong for the person who paid
    for it — this catches the obvious versions of that, on every plan, without
    anyone having to read it.
    """
    equipment = answers.get("equipment", "")
    forbidden = _forbidden_equipment_terms(equipment)
    facilities = answers.get("facilities") or []
    forbidden_facilities = _forbidden_facility_terms(facilities)
    club_days = answers.get("club_days") or []
    if isinstance(club_days, str):
        club_days = [d.strip() for d in club_days.split(",") if d.strip()]
    requested_minutes = _parse_minutes(answers.get("session", ""))
    # Defaults to solo when unset — the safer failure, and the common case.
    training_with = (answers.get("training_with") or "on my own").lower()
    is_solo = any(t in training_with for t in ("own", "alone", "solo", "myself"))

    requested_days = _parse_minutes(str(answers.get("days", "")))

    weeks = plan_data.get("weeks", [])
    weekly_training_days = []

    for w in weeks:
        week_num = w.get("weekNumber", "?")
        training_days_this_week = 0

        for d in w.get("days", []):
            workouts = d.get("workouts", [])
            names = " ".join(str(ex.get("name", "")).lower() for ex in workouts)

            # A club night or a match is an existing commitment, not a session
            # we prescribed. It is exempt from nearly every check below: a match
            # obviously involves an opponent and a pitch, and it runs as long as
            # it runs regardless of the session length they asked for. Counting
            # it also made a footballer who asked for 3 gym sessions read as 5,
            # which burned a full regeneration on a plan that was already right.
            if _is_commitment_day(d, club_days):
                continue

            # Equipment they do not have
            for term in forbidden:
                if term in names:
                    raise ValueError(
                        f"Week {week_num}, {d.get('day')}: prescribes '{term}' but the user's "
                        f"equipment is '{equipment}'. Use only equipment they actually have."
                    )

            # Facilities they told us they cannot get to
            for term in forbidden_facilities:
                if term in names:
                    raise ValueError(
                        f"Week {week_num}, {d.get('day')}: prescribes '{term}' but the user did "
                        f"not list that facility. Use only the facilities they said they can reach."
                    )

            # Anything needing another person, when they train alone
            if is_solo:
                for term in PARTNER_TERMS:
                    if term in names:
                        raise ValueError(
                            f"Week {week_num}, {d.get('day')}: prescribes '{term.strip()}' but this "
                            f"person trains alone. Substitute a solo alternative."
                        )

            label = str(d.get("label", "")).lower()
            focus = str(d.get("focus", "")).lower()

            # A day is "rest/recovery" if it's labelled that way OR if it only
            # contains light optional work — a 20-minute mobility flow or an
            # easy spin. The model reasonably puts these on off days, and a
            # coach would still call that a rest day. Counting them as training
            # days was rejecting perfectly good plans (a 4-day week with two
            # easy top-ups reads as 6), and since the model thinks it already
            # complied, the retry couldn't fix it — it just burned every
            # attempt and failed after payment.
            is_labelled_rest = (
                "rest" in label or "recovery" in label or "rest" in focus
                or "mobility" in label or "off" in label
            )
            estimated = _estimate_session_minutes(workouts)
            is_light = len(workouts) <= 1 and estimated <= 25
            is_rest = is_labelled_rest or is_light

            if not is_rest:
                training_days_this_week += 1

                # Session length, only checked on real training days
                if requested_minutes:
                    if estimated > requested_minutes * 1.5:
                        raise ValueError(
                            f"Week {week_num}, {d.get('day')}: session is roughly {estimated} min but "
                            f"the user asked for {requested_minutes} min. Reduce the volume."
                        )

        weekly_training_days.append(training_days_this_week)

    # Training days should broadly match what they asked for. Allow +/-1, and
    # only reject when they exceed the request — MORE sessions than asked for is
    # the real problem (too much load); slightly fewer can be legitimate in a
    # deload week and isn't worth failing a paid generation over.
    if requested_days:
        for i, count in enumerate(weekly_training_days, start=1):
            if count > requested_days + 1:
                raise ValueError(
                    f"Week {i}: has {count} training days but the user asked for {requested_days}. "
                    f"Move the extra sessions to rest/recovery or remove them."
                )

    # Week 4 must actually be a deload — measured in total SETS, not exercise
    # count. This matters: good coaching keeps the same core movements across
    # the block and deloads by cutting sets and intensity, so an exercise-count
    # check would reject a textbook deload and force a pointless retry. It also
    # removed a perverse incentive, where padding week 3 with extra exercises
    # was the easiest way to leave room for a visible cut.
    # The deload check has been REMOVED, not disabled.
    #
    # It existed when Claude authored all four weeks longhand and could forget
    # to lighten the last one. Week 4 is now built by _cut_sets during expansion,
    # so it is correct by construction and this check can only produce false
    # positives — which it did, on 22 Aug: "Week 4 must be a deload but has 73
    # total sets vs week 3's 79", on a plan whose deload was perfectly applied.
    #
    # The reason the totals looked close is that the check counted every set in
    # the week, while only progressing exercises deload. Sprints hold their
    # volume by design (they are measured, not loaded) and warm-ups were never
    # loaded at all, so a correct 35% cut to the lifts shows up as a ~8% cut to
    # the week. Re-counting only the progressing exercises would fix the maths,
    # but it would still be a test that cannot fail for any real reason, and
    # every false positive costs a full regeneration.


def autofix_deload(plan_data: dict) -> None:
    """
    NO LONGER CALLED. Kept for reference only.

    This repaired a deload that Claude had authored too heavy, back when all four
    weeks were written longhand. Week 4 is now produced by _cut_sets during
    template expansion, so there is nothing left to repair. Do not wire this back
    in without checking expand_template first — running both would deload twice.

    What it did: trimmed SETS rather than removing exercises, because keeping the
    same movements across the block is how progression is tracked (the app
    compares logged weights per exercise name) and how a real deload works —
    same lifts, less volume.
    """
    weeks = plan_data.get("weeks", [])
    if len(weeks) != 4:
        return

    def parse_sets(ex):
        m = re.match(r"\s*(\d+)\s*[xX]", str(ex.get("sets", "")))
        return int(m.group(1)) if m else None

    def week_volume(w):
        total = 0
        for d in w.get("days", []):
            if "rest" in str(d.get("label", "")).lower():
                continue
            for ex in d.get("workouts", []):
                total += parse_sets(ex) or 1
        return total

    w3_vol = week_volume(weeks[2])
    w4 = weeks[3]
    w4_vol = week_volume(w4)
    if not w3_vol or w4_vol <= w3_vol * 0.7:
        return  # already a genuine deload

    target = int(w3_vol * 0.65)

    # Reduce set counts across week 4's training days, never below 1 set, and
    # never removing the exercise itself.
    reducible = []
    for d in w4.get("days", []):
        if "rest" in str(d.get("label", "")).lower():
            continue
        for ex in d.get("workouts", []):
            if parse_sets(ex) and parse_sets(ex) > 1:
                reducible.append(ex)

    current = w4_vol
    changed = True
    while current > target and changed:
        changed = False
        for ex in reducible:
            if current <= target:
                break
            sets = parse_sets(ex)
            if sets and sets > 1:
                # Rewrite "4x6" as "3x6", preserving whatever follows the reps
                ex["sets"] = re.sub(r"^\s*\d+\s*([xX])", f"{sets - 1}\\1", str(ex["sets"]), count=1)
                current -= 1
                changed = True

    for d in w4.get("days", []):
        if "rest" in str(d.get("label", "")).lower():
            continue
        label = str(d.get("label", ""))
        if "deload" not in label.lower():
            d["label"] = (label + " (deload)").strip()

    plan_data["_deload_autofixed"] = True


def autofix_training_days(plan_data: dict, answers: dict) -> None:
    """
    If the plan prescribes more training days than the person asked for, convert
    the surplus into active recovery in place rather than regenerating.

    This is the single most common soft failure, and it used to cost a full
    3-minute retry every time it fired. The model tends to over-deliver: someone
    asks for 3 sessions and gets 5, because more training reads as more value.
    Trimming is both faster and more honest to what they actually asked for.

    Two things this is careful about:

    - The days to trim are chosen ONCE, from week 1, and the same day names are
      then converted in all four weeks. Trimming week by week would leave a
      block where Thursday is a session in week 1 and recovery in week 2, which
      breaks the per-exercise progression the app tracks.
    - The lightest days go first, measured by total sets. If something has to be
      dropped it should be the accessory day, not the main lower-body session.
    """
    requested = _parse_minutes(str(answers.get("days", "")))
    weeks = plan_data.get("weeks", [])
    if not requested or len(weeks) != 4:
        return

    club_days = answers.get("club_days") or []
    if isinstance(club_days, str):
        club_days = [d.strip() for d in club_days.split(",") if d.strip()]

    def sets_in(day):
        total = 0
        for ex in day.get("workouts", []):
            m = re.match(r"\s*(\d+)\s*[xX]", str(ex.get("sets", "")))
            total += int(m.group(1)) if m else 1
        return total

    def is_prescribed_session(day):
        if _is_commitment_day(day, club_days):
            return False
        label = str(day.get("label", "")).lower()
        focus = str(day.get("focus", "")).lower()
        if any(t in label for t in ("rest", "recovery", "mobility", "off")) or "rest" in focus:
            return False
        workouts = day.get("workouts", [])
        if len(workouts) <= 1 and _estimate_session_minutes(workouts) <= 25:
            return False
        return True

    week1_sessions = [d for d in weeks[0].get("days", []) if is_prescribed_session(d)]
    surplus = len(week1_sessions) - requested
    if surplus <= 0:
        return

    # Lightest first, so the most important sessions survive. Ties break
    # towards the END of the week: when every session carries the same set
    # count the sort is otherwise stable and drops Monday, which is almost
    # always the main lower-body day. Later days are more often accessory or
    # top-up work, so they are the safer thing to lose.
    day_order = {d: i for i, d in enumerate(EXPECTED_DAY_ORDER)}
    to_convert = {
        d.get("day")
        for d in sorted(
            week1_sessions,
            key=lambda d: (sets_in(d), -day_order.get(d.get("day"), 0)),
        )[:surplus]
    }

    for w in weeks:
        for d in w.get("days", []):
            if d.get("day") not in to_convert:
                continue
            d["label"] = "Active recovery"
            d["focus"] = "Recovery"
            d["workouts"] = [{
                "name": "Easy walk or light mobility",
                "sets": "25min",
                "load": "Easy",
                "rest": "—",
                "demo": "mobility flow",
                "reason": (
                    "You asked for "
                    f"{requested} sessions a week, so this day stays easy — recovery is what "
                    "lets the sessions that matter actually land."
                ),
            }]

    plan_data["_days_autofixed"] = sorted(to_convert)


def autofix_workout_fields(plan_data: dict) -> None:
    """
    Salvage entries where the model put the wrong thing in the wrong field.

    Two shapes show up, both from asking for more descriptive exercise content:

    1. "name" empty with the movements dumped into "sets" — the row renders with
       no title at all, just an orange string running off the edge of the card.
    2. "sets" holding a sentence rather than a volume figure. Because the row
       lays out name as flexible and sets as fixed, a long sets value takes all
       the width and squeezes the name down to "A..".

    Both are repairable from the data we already have, so neither should cost a
    four-minute regeneration.
    """
    fixed = 0
    for w in plan_data.get("weeks", []):
        for d in w.get("days", []):
            for ex in d.get("workouts", []):
                name = str(ex.get("name", "")).strip()
                sets = str(ex.get("sets", "")).strip()

                # Case 1: the content ended up in the wrong field entirely.
                if not name and sets:
                    ex["name"] = sets[:60].strip()
                    ex["sets"] = "1 round"
                    fixed += 1
                    continue

                # Case 2: sets is prose. Keep the meaning, free up the width.
                if len(sets) > 20:
                    lowered = sets.lower()
                    volume = re.match(
                        r"\s*(\d+\s*[xX]\s*\d+\s*(?:s|m|km|min|sec|secs|reps|kg)?)(?:\b|$)",
                        sets,
                    )
                    if "coach" in lowered:
                        ex["sets"] = "Coach-led"
                    elif volume:
                        # "1x10 circles each direction, 1x15 raises" -> "1x10"
                        ex["sets"] = volume.group(1).strip()
                    elif "round" in lowered:
                        ex["sets"] = "Rounds"
                    else:
                        # Trim on a word boundary rather than mid-word.
                        ex["sets"] = sets[:20].rsplit(" ", 1)[0].rstrip(" ,;:") or "As listed"
                    # Don't lose the detail — it belongs with the explanation.
                    reason = str(ex.get("reason", "")).strip()
                    if sets not in reason:
                        ex["reason"] = (f"{sets}. {reason}" if reason else sets)
                    fixed += 1

    if fixed:
        plan_data["_workout_fields_autofixed"] = fixed


# --------------------------------------------------------------------------
# Template expansion
#
# Claude now authors ONE week plus a progression rule per exercise, and this
# builds the four weeks the app renders. That change exists because a 4-week
# plan was ~45,000 characters in a single response, which is where every JSON
# failure came from: stray quotes, missing quotes, missing commas, truncation.
# One week is roughly a quarter of that.
#
# It is also better programming. Deterministic expansion cannot swap an exercise
# in week 3, forget the deload, or quietly change the session count, which is
# what most of the repair code in this file used to exist to catch.
# --------------------------------------------------------------------------

BLOCK_WEEKS = 4

# Deload only for people with enough training history to accumulate the fatigue
# that makes one useful. A beginner deloading in week 4 wastes a quarter of the
# block, and week 4 is exactly where beginners lose momentum and stop.
DELOAD_EXPERIENCE = {"3–5 years", "5+ years"}

# Endurance progression has no natural stop signal. A failed squat tells you to
# stop; adding five minutes a week to a run for six months just injures you
# quietly. Load self-limits, duration does not, so it needs a ceiling.
# Endurance has no natural stop signal — a failed squat tells you to stop, five
# more minutes a week for six months just injures you quietly. But a FIXED
# ceiling is wrong: a 5k/10k plan's long run started at 45min and every
# increment was clamped away, so the one session that must get longer sat
# frozen for four weeks while the row still said "add 4 minutes next week".
#
# The cap is relative instead: a session may grow by at most this fraction of
# where it started over the whole block. A 20min run can reach 35; a 45min long
# run can reach roughly 79. Both are sane, neither runs away.
PROGRESSION_GROWTH_CAP = 0.75


def _growth_ceiling(sets_text: str) -> Optional[float]:
    """Cap growth relative to where the session STARTED, not at a fixed number."""
    m = re.search(r"(\d+(?:\.\d+)?)", str(sets_text))
    return float(m.group(1)) * (1 + PROGRESSION_GROWTH_CAP) if m else None


def _bump_numbers(text: str, add: float, unit: str = "", ceiling: Optional[float] = None) -> str:
    """
    Add to the first number in a volume string, respecting any ceiling.
    "20min" + 5 -> "25min".  "3x8" + 1 -> "4x8" is wrong, so callers pick which
    number to move; this always moves the first one it finds.
    """
    m = re.search(r"(\d+(?:\.\d+)?)", text)
    if not m:
        return text
    value = float(m.group(1)) + add
    if ceiling is not None:
        value = min(value, ceiling)
    rendered = f"{value:g}"
    return text[:m.start(1)] + rendered + text[m.end(1):]


def _is_timed_hold(sets_text: str) -> bool:
    """True for "3x20s each side" — a hold, where the second number is seconds."""
    return bool(re.match(r"\s*\d+\s*[xX]\s*\d+\s*(s|sec|secs|seconds)\b", str(sets_text)))


def _bump_reps(sets_text: str, add: int, steps: int = 1) -> str:
    """Move the rep figure in "4x6", leaving the set count alone."""
    m = re.match(r"\s*(\d+)\s*[xX]\s*(\d+)(.*)", sets_text)
    if not m:
        return _bump_numbers(sets_text, add)
    # A timed hold progresses in seconds, always five a week, whatever increment
    # the model asked for. Scaling its number instead produced a Copenhagen
    # plank running 20s, 45s, 70s across the block: the model meant "5 seconds",
    # the code read it as "5 reps" and multiplied by five again. A flat five a
    # week is what a coach would write and cannot be double-counted.
    if _is_timed_hold(sets_text):
        return f"{m.group(1)}x{int(m.group(2)) + 5 * max(0, steps)}{m.group(3)}"
    return f"{m.group(1)}x{int(m.group(2)) + add}{m.group(3)}"


def _cut_sets(sets_text: str, fraction: float = 0.35) -> str:
    """Reduce the set count for a deload, never below one, keeping reps intact."""
    m = re.match(r"\s*(\d+)\s*[xX]\s*(.*)", sets_text)
    if not m:
        return sets_text
    reduced = max(1, round(int(m.group(1)) * (1 - fraction)))
    return f"{reduced}x{m.group(2)}"


def _progression_note(prog: dict, week: int, is_final: bool, deload: bool, sets: str = "") -> str:
    """
    The line the customer reads on every exercise row. This is the most-read
    sentence in the whole plan, so it is deliberately conditional: telling
    somebody who missed their reps last week to add weight anyway is the one
    instruction here that can actually hurt them.
    """
    ptype = (prog or {}).get("type", "none")
    if ptype == "none":
        return ""

    if ptype == "measure":
        return (
            "This one is a test, not a lift. Same volume every week — log your time or "
            "distance and chase a better number, not more reps."
        )

    if deload:
        return "Deload week. Same movements, less volume — hold last week's weight."

    if is_final:
        # Never "add X next week" — there is no next week in this block.
        return "Last week of the block — this is the top of your progression. Log it and finish strong."

    inc = (prog or {}).get("increment")
    unit = (prog or {}).get("unit", "")

    if ptype == "load":
        amount = f"{inc:g}{unit or 'kg'}" if inc else "a small amount"
        steps = max(0, week - 1)
        if steps and inc:
            # Both figures now sit in one sentence, each labelled. Previously the
            # cumulative total was appended to the load line and the next step
            # appeared underneath, so week 3 read "about 5kg up on week 1" and
            # "Add 2.5kg next week" — two numbers a line apart with nothing
            # saying which meant since-the-start and which meant next-time.
            total = f"{inc * steps:g}{unit or 'kg'}"
            return (
                f"You should be around {total} up on week 1 by now. Hit every rep this week? "
                f"Add {amount} next week. Missed any? Repeat this weight."
            )
        return f"Hit every rep this week? Add {amount} next week. Missed any? Repeat this weight."
    if ptype == "reps":
        if _is_timed_hold(sets):
            return "Held it for every set? Add 5 seconds to each hold next week. Struggled? Repeat."
        return "Hit every rep this week? Add one rep per set next week. Missed any? Repeat."
    if ptype == "time":
        unit_word = "minute" if inc == 1 else "minutes"
        return f"Add {inc:g} {unit_word} next week if this felt controlled throughout."
    if ptype == "distance":
        return f"Add {inc:g}{unit or 'km'} next week if you finished feeling strong."
    if ptype == "rounds":
        # "3x20s each side" is sets, not rounds. Bumping the first number is
        # still the right progression, but telling someone to add a round to a
        # Copenhagen plank reads as though the plan doesn't know what it is.
        if re.match(r"\s*\d+\s*[xX]", sets or ""):
            return "Hit every rep this week? Add a set next week. Missed any? Repeat."
        return "Add a round next week if you completed every round at full effort."
    return ""


# Movements that are a TEST, not a lift. You do not progress a sprint by adding
# reps to it — you run it, log the time, and try to beat the number. The thing
# that actually gets progressively overloaded is the gym work underneath it: the
# trap bar, the squat, the Nordic curl. Those build the engine; these measure it.
#
# Adding a set a week to max-effort shuttles is not progression, it is how a
# footballer picks up a hamstring strain in week 3. The model kept reaching for
# it because the prompt made progression the default, so this is the backstop
# that holds regardless of what comes back.
MEASURED_TERMS = [
    "sprint", "shuttle", "dash", "flying", "acceleration", "max velocity",
    "bound", "hop", "jump", "leap", "throw", "toss", "plyo", "depth drop",
    "drop and stick", "drop-and-stick", "broad", "vertical",
    "time trial", "rep max", "1rm", "test",
    # Deceleration and balance drills are judged on quality, not volume. The
    # model usually types these correctly, but a guard beats relying on it.
    "deceleration", "y-balance", "stick landing",
]


def _is_measured(name: str) -> bool:
    """
    Substring matching put "World's Greatest Stretch" in the measured bucket,
    because grea-TEST-retch contains "test". Word boundaries fixed that but
    introduced the opposite hole: "Pogo Hops" and "Box Jumps" stopped matching,
    because \\bhop\\b does not match "hops". Optional plural closes it.
    """
    lowered = str(name or "").lower()
    return any(
        re.search(rf"\b{re.escape(term)}(s|es)?\b", lowered) for term in MEASURED_TERMS
    )


def _sanitise_progression(ex: dict) -> dict:
    """
    Reject progression types that make no sense for how the volume is written.

    Seen in testing: a Copenhagen Plank at "3x20s each side" came back typed as
    time with a 5 minute increment. Two things wrong with that. The customer
    reads "Add 5 minutes next week", which is not a thing anyone does to a side
    plank. And because "3x20s" starts with the SET count, the arithmetic would
    have turned it into 8x20s in week 2 and 13x20s in week 3.

    A sets-by-something entry only progresses by reps, load or rounds. Time and
    distance belong to continuous single-figure entries like "20min" or "5km".
    Anything mismatched is dropped to "none", which holds it steady rather than
    printing an instruction nobody should follow.
    """
    prog = dict(ex.get("progression") or {})
    ptype = prog.get("type", "none")
    # "1x10 reps" — the NxM format already says reps, so the word is noise, and
    # every other row reads "4x6". This used to run only on measured movements,
    # which is why "Cat-cow stretch, 1x10 reps" survived into a real plan.
    sets = re.sub(r"^(\s*\d+\s*[xX]\s*\d+)\s*reps?\s*$", r"\1", str(ex.get("sets", "")))
    ex = {**ex, "sets": sets}
    is_sets_format = bool(re.match(r"\s*\d+\s*[xX]", sets))

    # A sprint, a bound or a med ball throw is measured, never loaded up. This
    # overrides whatever the model chose, because the prompt alone has not held.
    if _is_measured(ex.get("name", "")):
        out = dict(ex)
        out["progression"] = {"type": "measure"}
        return out

    # A bodyweight movement cannot take a load increment. "Copenhagen Plank,
    # Bodyweight — Add 1kg next week" is the third different wrong progression
    # the model has attached to that one exercise (time, then rounds, now load),
    # which is a good sign it will keep finding new ones. Reps is the honest
    # progression for a bodyweight hold or press; if the format cannot take
    # reps either, it holds.
    load_text = str(ex.get("load", "")).lower()
    if ptype == "load" and any(t in load_text for t in ("bodyweight", "body weight", "bw only")):
        out = dict(ex)
        out["progression"] = {"type": "reps", "increment": 1} if is_sets_format else {"type": "none"}
        return out

    if ptype in ("time", "distance") and is_sets_format:
        prog = {"type": "none"}
    elif ptype in ("reps", "load") and not is_sets_format:
        # "20min" cannot gain a rep. Move it to the matching continuous type if
        # the units make that obvious, otherwise hold it steady.
        lowered = sets.lower()
        if ptype == "reps":
            if "min" in lowered:
                prog = {"type": "time", "increment": prog.get("increment") or 5}
            elif "km" in lowered or "mile" in lowered:
                prog = {"type": "distance", "increment": prog.get("increment") or 1, "unit": "km"}
            else:
                prog = {"type": "none"}

    out = dict(ex)
    # Normalise to an explicit type. The morning routine was shipping
    # "progression": {} because it has no weeks to progress through, which reads
    # as an oversight rather than a decision.
    out["progression"] = prog if prog.get("type") else {"type": "none"}
    return out


def _progress_exercise(ex: dict, week: int, deload: bool, is_final: bool) -> dict:
    """Produce this exercise as it appears in a given week."""
    ex = _sanitise_progression(ex)
    out = dict(ex)
    prog = ex.get("progression") or {}
    ptype = prog.get("type", "none")
    inc = prog.get("increment") or 0
    steps = week - 1  # week 1 is the template as authored

    # A warm-up, a mobility drill or a rest-day walk does not deload, because it
    # was never loaded. Telling someone to "hold last week's weight" on a band
    # pull-apart or a 5 minute rowing warm-up is nonsense and undermines the
    # instructions that do matter.
    if ptype == "none":
        return out

    # A measured movement holds the same volume in every week, including the
    # deload. Cutting a sprint session's sets makes the weekly time
    # incomparable, which defeats the point of measuring it at all.
    if ptype == "measure":
        note = _progression_note(prog, week, is_final, deload, str(out.get("sets", "")))
        if note and not is_final:
            out["progressionNote"] = note
        return out

    if deload:
        # Deload from where they actually GOT TO, not from the week 1 template.
        # Resetting reps to base and then cutting sets on top took a calf raise
        # from 3x19 down to 2x15 — a 47% cut, when the week note promises about
        # a third. A real deload holds the reps and drops the sets.
        peak_steps = max(0, BLOCK_WEEKS - 2)
        peak_sets = str(ex.get("sets", ""))
        if ptype == "reps" and peak_steps:
            peak_sets = _bump_reps(peak_sets, int(inc) * peak_steps, peak_steps)
        elif ptype in ("time", "distance") and peak_steps:
            peak_sets = _bump_numbers(
                peak_sets, inc * peak_steps, prog.get("unit", ""),
                ceiling=_growth_ceiling(peak_sets),
            )
        elif ptype == "rounds" and peak_steps:
            peak_sets = _bump_numbers(peak_sets, inc * peak_steps)
        if ptype in ("time", "distance"):
            # A continuous session has no sets to cut, so _cut_sets left it
            # untouched and week 4 simply repeated week 3: an "Easy Run" ran
            # 30, 33, 36, 36 in a block whose theme was Deload. Cut the
            # DURATION back to roughly the week 1 figure instead.
            out["sets"] = _bump_numbers(peak_sets, -(inc * peak_steps))
        else:
            out["sets"] = _cut_sets(peak_sets)

        # Only a LOADED exercise has a weight to hold. This suffix was being
        # appended to everything, producing "Bodyweight — hold last week's
        # weight" on a plank and "Hard, RPE 7 — hold last week's weight" on a
        # rowing interval.
        if ptype == "load":
            out["load"] = f"{ex.get('load', '')} — hold last week's weight".strip(" —")
    elif ptype == "reps" and steps:
        out["sets"] = _bump_reps(str(ex.get("sets", "")), int(inc) * steps, steps)
    elif ptype in ("time", "distance") and steps:
        out["sets"] = _bump_numbers(
            str(ex.get("sets", "")), inc * steps, prog.get("unit", ""),
            ceiling=_growth_ceiling(str(ex.get("sets", ""))),
        )
    elif ptype == "rounds" and steps:
        out["sets"] = _bump_numbers(str(ex.get("sets", "")), inc * steps)
    elif ptype == "load" and steps:
        # The cumulative figure used to be appended here, which produced
        # "Moderate, 7/10 effort — about 5kg up on week 1 · rest 2min" on the
        # load line, and then "Add 2.5kg next week" underneath. Two numbers, one
        # line apart, neither saying whether it meant since the start or next
        # time. Both now live in the progression note, labelled.
        pass

    # Only per-exercise instructions belong on the row, because they genuinely
    # differ between exercises ("add 5kg" vs "add one rep"). Anything that is
    # true of the whole week is set once at week level instead — repeating
    # "Deload week. Same movements, less volume" on all ten rows is noise that
    # buries the one line the person actually needs to read.
    # Deload weeks say it once at week level. The final week keeps its row note,
    # because on a beginner's block the numbers genuinely still climb there and
    # silence left them unexplained.
    if not deload:
        note = _progression_note(prog, week, is_final, deload, str(out.get("sets", "")))
        if note:
            out["progressionNote"] = note
    return out


def _hold_duplicate_movements(days: list) -> None:
    """
    When the same movement appears more than once in a week, only the heaviest
    instance progresses. The rest hold.

    Nordic Hamstring Curl came back on both Monday (3x5) and Wednesday (3x6),
    each adding a rep a week. Read either row on its own and it looks sensible.
    Add them up and the weekly total for a brutal eccentric exercise climbs at
    twice the rate either row implies, which is invisible to the person doing
    it and is exactly how a hamstring gets hurt.
    """
    seen = {}
    for day in days:
        for ex in day.get("workouts", []):
            key = re.sub(r"[^a-z]", "", str(ex.get("name", "")).lower())
            if not key:
                continue
            seen.setdefault(key, []).append(ex)

    for key, instances in seen.items():
        if len(instances) < 2:
            continue
        progressing = [e for e in instances
                       if (e.get("progression") or {}).get("type", "none") not in ("none", "measure")]
        if len(progressing) < 2:
            continue

        def volume(e):
            m = re.match(r"\s*(\d+)\s*[xX]\s*(\d+)", str(e.get("sets", "")))
            return int(m.group(1)) * int(m.group(2)) if m else 0

        progressing.sort(key=volume, reverse=True)
        for extra in progressing[1:]:
            extra["progression"] = {"type": "none"}
            extra["_heldDuplicate"] = True


def _count_prescribed_sessions(days: list, club_days: list) -> int:
    """
    How many real training sessions this week actually prescribes.

    Mirrors the counting in validate_plan_semantics: club nights, match days,
    rest and active-recovery days are all excluded, because none of them are
    sessions we are asking them to add.
    """
    count = 0
    for d in days:
        if _is_commitment_day(d, club_days):
            continue
        label = str(d.get("label", "")).lower()
        focus = str(d.get("focus", "")).lower()
        if any(t in label for t in ("rest", "recovery", "mobility", "off")) or "rest" in focus:
            continue
        workouts = d.get("workouts", [])
        if len(workouts) <= 1 and _estimate_session_minutes(workouts) <= 25:
            continue
        count += 1
    return count


def expand_template(plan_data: dict, answers: dict) -> None:
    """
    Turn the single authored week into the weeks[] array the app renders.

    The output shape is identical to what AppShell already receives, so nothing
    downstream changes: same weeks, same days, same workouts.
    """
    template = plan_data.get("template") or {}
    days = template.get("days")
    if not isinstance(days, list) or not days:
        raise ValueError("Template is missing its days — cannot build the block")
    if len(days) != 7:
        # A salvaged truncation can leave a partial week. Say so plainly rather
        # than expanding five days into four weeks and letting the structural
        # check report it as a mysterious "expected 7 days, got 5".
        raise ValueError(
            f"Template has {len(days)} of 7 days — the response was cut short, "
            f"so the block cannot be built from it"
        )

    experience = str(answers.get("experience", "")).strip()
    deload_week = BLOCK_WEEKS if experience in DELOAD_EXPERIENCE else None

    # Decide duplicates once, on the template, so the same instance holds in
    # every week rather than the choice drifting week to week.
    _hold_duplicate_movements(days)

    notes = plan_data.get("weekNotes") or []
    themes = ["Foundation", "Build", "Peak", "Deload" if deload_week else "Push"]

    # If it prescribed fewer sessions than asked, say so from the ACTUAL count.
    # Asked to write this sentence itself, the model produced "four well-placed
    # sessions" on a plan containing three — it cannot reliably count its own
    # output, and a wrong number is worse than no explanation at all.
    club = answers.get("club_days") or []
    if isinstance(club, str):
        club = [c.strip() for c in club.split(",") if c.strip()]
    requested = _parse_minutes(str(answers.get("days", "")))
    prescribed = _count_prescribed_sessions(days, club)
    shortfall_note = ""
    if requested and prescribed and prescribed < requested:
        words = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven"}
        got = words.get(prescribed, str(prescribed))
        want = words.get(requested, str(requested))
        # "one well-placed sessions" — singular needs the verb to agree too.
        noun = "session serves" if prescribed == 1 else "sessions serve"
        shortfall_note = (
            f" You asked for {want} — with everything else already in your week, "
            f"{got} well-placed {noun} you better than {want} crammed in."
        )

    weeks = []
    for week in range(1, BLOCK_WEEKS + 1):
        is_deload = week == deload_week
        is_final = week == BLOCK_WEEKS and not is_deload
        week_days = []
        for d in days:
            week_days.append({
                **d,
                "workouts": [
                    _progress_exercise(ex, week, is_deload, is_final)
                    for ex in d.get("workouts", [])
                ],
            })
        note = notes[week - 1] if week - 1 < len(notes) else ""
        if is_deload:
            note = (
                "Deload week. Same movements, roughly a third less volume, and hold the weights "
                "you used last week. This is where the previous three weeks turn into progress."
            )
        elif is_final:
            # ALWAYS replace, never defer to what the model wrote. Whether week 4
            # deloads depends on training experience, which is decided here and
            # the model never sees. Left to its own devices it wrote "Week 4:
            # deload — sets and intensity drop back" onto a beginner's block
            # where the reps actually went UP, so the plan contradicted itself.
            note = (
                "Last week of this block. Keep progressing as you have been, finish it properly, "
                "then build a new one from what you've logged."
            )

        # Only week 1, and only when it genuinely prescribed fewer.
        if week == 1 and shortfall_note:
            note = f"{note}{shortfall_note}" if note else shortfall_note.strip()

        weeks.append({
            "weekNumber": week,
            "theme": themes[week - 1],
            "note": note,
            "days": week_days,
        })

    plan_data["weeks"] = weeks
    plan_data["blockWeeks"] = BLOCK_WEEKS

    # The morning routine never went through expansion, so none of the tidying
    # above reached it. That is how "Cat-cow stretch, 1x10 reps" shipped. It has
    # no weeks to progress through, so it only needs the formatting pass.
    routine = plan_data.get("morningRoutine")
    if isinstance(routine, list):
        # Always "none". These are mobility drills done before the day starts,
        # not sessions — the model typed World's Greatest Stretch as a measured
        # test, which would put a log button and a "chase a better number" note
        # on a morning stretch.
        plan_data["morningRoutine"] = [
            {**_sanitise_progression(item), "progression": {"type": "none"}}
            if isinstance(item, dict) else item
            for item in routine
        ]

    plan_data.pop("template", None)
    plan_data.pop("weekNotes", None)


def validate_plan(plan_data: dict) -> None:
    """
    Deterministic quality check on the plan Claude just generated. Raises a
    descriptive ValueError if anything required is missing, so the caller can
    retry generation rather than silently saving a broken/incomplete plan —
    this is the automated check for "did it miss an exercise / a field".
    """
    weeks = plan_data.get("weeks")
    if not isinstance(weeks, list) or len(weeks) != 4:
        raise ValueError(f"Expected 4 weeks, got {len(weeks) if isinstance(weeks, list) else 'none'}")

    for w in weeks:
        week_num = w.get("weekNumber", "?")
        days = w.get("days")
        if not isinstance(days, list) or len(days) != 7:
            raise ValueError(f"Week {week_num}: expected 7 days, got {len(days) if isinstance(days, list) else 'none'}")

        day_names = [d.get("day") for d in days]
        if day_names != EXPECTED_DAY_ORDER:
            raise ValueError(f"Week {week_num}: days out of order or mislabelled: {day_names}")

        for d in days:
            workouts = d.get("workouts")
            if not isinstance(workouts, list) or len(workouts) == 0:
                raise ValueError(f"Week {week_num}, {d.get('day')}: no workouts present")

            for ex in workouts:
                for field in ("name", "sets", "load", "rest", "reason"):
                    if not str(ex.get(field, "")).strip():
                        raise ValueError(
                            f"Week {week_num}, {d.get('day')}, exercise '{ex.get('name', '?')}': "
                            f"missing required field '{field}'"
                        )

    nutrition = plan_data.get("nutrition")
    if not isinstance(nutrition, dict) or not nutrition.get("meals"):
        raise ValueError("Missing or incomplete nutrition section")

    recovery = plan_data.get("recovery")
    if not isinstance(recovery, dict) or not recovery.get("protocols"):
        raise ValueError("Missing or incomplete recovery section")

    if not plan_data.get("morningRoutine"):
        raise ValueError("Missing morningRoutine section")


def _summarise_plan_for_prompt(plan: dict, max_weeks: int = 2) -> str:
    """
    Compress a stored plan into something small enough to sit inside another
    prompt. Sending all 28 days back verbatim would roughly double the cost of
    every follow-on generation for no benefit — the model needs the shape and
    the movement selection, not every set and rep of week 3.
    """
    lines = []
    ans = plan.get("answers") or {}
    if ans.get("goal"):
        lines.append(f"Original goal: {ans['goal']}")
    if ans.get("days"):
        lines.append(f"Original availability: {ans['days']} days per week")
    if ans.get("equipment"):
        lines.append(f"Original equipment: {ans['equipment']}")

    for week in (plan.get("weeks") or [])[:max_weeks]:
        wk = week.get("weekNumber", "?")
        lines.append(f"\nWeek {wk} — {week.get('theme', '')}")
        for day in week.get("days") or []:
            workouts = day.get("workouts") or []
            if not workouts:
                lines.append(f"  {day.get('label', '?')}: rest")
                continue
            names = []
            for w in workouts[:8]:
                sets, reps = w.get("sets"), w.get("reps")
                sr = f" {sets}x{reps}" if sets and reps else ""
                names.append(f"{w.get('name', '?')}{sr}")
            lines.append(f"  {day.get('label', '?')} ({day.get('focus', '')}): " + ", ".join(names))

    total_weeks = len(plan.get("weeks") or [])
    if total_weeks > max_weeks:
        lines.append(f"\n(Weeks {max_weeks + 1}–{total_weeks} followed the same structure with "
                     f"progressive overload applied.)")
    return "\n".join(lines)


def _repair_json(text: str) -> str:
    """
    Repair the malformed JSON the model occasionally produces on long plans.

    A parse failure currently costs a full regeneration — 4-5 minutes — and the
    damage is almost always trivial: one stray quote in a 40,000 character
    document. Three of those in a row is 13 minutes of a customer watching a
    progress bar, which is exactly what happened on 18 Aug.

    Two malformations account for what we see in the logs, both reported by
    Python as "Expecting ',' delimiter":

    1. An unescaped double quote inside a string value. Overwhelmingly an inch
       mark — "Step-up to 20" box" — which the umbrella-name rule made more
       likely by asking for longer, more descriptive exercise names.
    2. A missing comma between two objects in an array.

    This walks the document character by character tracking string state, which
    is the only reliable way to tell a quote that closes a string from a quote
    that is part of one. A closing quote must be followed by whitespace and then
    one of , : } ] or end of input; anything else means it was meant literally
    and gets escaped.
    """
    out = []
    in_string = False
    escaped = False
    i = 0
    n = len(text)

    while i < n:
        ch = text[i]

        if escaped:
            out.append(ch)
            escaped = False
            i += 1
            continue

        if ch == "\\":
            out.append(ch)
            escaped = True
            i += 1
            continue

        if ch == '"':
            if not in_string:
                in_string = True
                out.append(ch)
            else:
                # Decide whether this quote really closes the string.
                j = i + 1
                while j < n and text[j] in " \t\r\n":
                    j += 1
                if j >= n or text[j] in ",:}]":
                    in_string = False
                    out.append(ch)
                elif re.match(r'[A-Za-z_][A-Za-z0-9_]{0,30}"\s*:', text[j:j + 40]):
                    # The real-world failure, seen on 19 Aug:
                    #     "demo": "light jogging warm "reason": "Raises core..."
                    # The model dropped BOTH the closing quote of the value and
                    # the comma, so the single quote it did write has to serve as
                    # the value's closing quote AND the next key's opening quote.
                    # Escaping it (the old behaviour) swallowed the rest of the
                    # document and made the plan unrecoverable.
                    in_string = False
                    out.append(ch)   # close the value
                    out.append(",")  # the missing separator
                    out.append('"')  # re-open for the key that follows
                    in_string = True
                elif text[j] == '"':
                    # Ambiguous: either a stray quote, or a missing comma
                    # between two members ("load": "75%" "rest": "90s").
                    # If what follows looks like a key, it is a missing comma —
                    # escaping it here would corrupt the rest of the document
                    # rather than fix it.
                    rest = text[j:j + 80]
                    if re.match(r'"[^"\\]{1,40}"\s*:', rest):
                        in_string = False
                        out.append(ch)
                        out.append(",")
                    else:
                        out.append('\\"')
                else:
                    # A stray quote inside the value. Escape it and carry on.
                    out.append('\\"')
            i += 1
            continue

        if in_string and ch in "\n\r\t":
            # Literal control characters are illegal inside a JSON string.
            out.append({"\n": "\\n", "\r": "\\r", "\t": "\\t"}[ch])
            i += 1
            continue

        if not in_string:
            # Missing comma between array elements or object members.
            if ch in "{[" and out:
                k = len(out) - 1
                while k >= 0 and out[k] in " \t\r\n":
                    k -= 1
                if k >= 0 and out[k] in "}]":
                    out.append(",")
            # Trailing comma before a closing bracket.
            if ch in "}]":
                k = len(out) - 1
                while k >= 0 and out[k] in " \t\r\n":
                    k -= 1
                if k >= 0 and out[k] == ",":
                    del out[k]

        out.append(ch)
        i += 1

    return "".join(out)


def _close_truncated_json(text: str) -> Optional[str]:
    """
    Rescue a response that was cut off mid-flight.

    Seen on 19 Aug: the document simply stopped after week 4's later days, with
    everything before that point perfectly well formed. The whole 4-minute
    generation was discarded because the closing brackets were missing.

    This walks the text tracking string state and bracket depth, rewinds to the
    last point where a complete element had just closed, and shuts the remaining
    brackets. The result is valid JSON containing everything the model managed to
    produce. Any week left short of 7 days is dropped by the caller and rebuilt
    by the continuation call, which is far cheaper than starting again.

    Returns None when the text was not truncated, so a genuinely malformed
    document is not quietly mangled into a shorter one.
    """
    stack = []
    in_string = False
    escaped = False
    last_safe = None

    for i, ch in enumerate(text):
        if escaped:
            escaped = False
            continue
        if ch == "\\":
            escaped = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in "{[":
            stack.append(ch)
        elif ch in "}]":
            if stack:
                stack.pop()
            # Only a closed bracket is a safe rewind point. Rewinding to a
            # closed STRING can land just after a key, leaving "day" with no
            # value, which closes into invalid JSON.
            if stack:
                last_safe = i + 1

    if not stack:
        return None  # Balanced: this was not a truncation.
    if last_safe is None:
        return None  # Nothing complete to keep.

    salvaged = text[:last_safe].rstrip().rstrip(",")

    # Re-derive what is still open at the cut point and close it.
    stack = []
    in_string = False
    escaped = False
    for ch in salvaged:
        if escaped:
            escaped = False
            continue
        if ch == "\\":
            escaped = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in "{[":
            stack.append(ch)
        elif ch in "}]" and stack:
            stack.pop()

    closers = "".join("}" if b == "{" else "]" for b in reversed(stack))
    return salvaged + closers


def _json_from_message(message) -> dict:
    """
    Pull the JSON object out of a Claude response.

    Claude Sonnet 5 can include a "thinking" block ahead of the actual answer on
    a prompt this complex, so content[0] is not reliably the text. On long
    generations it also intermittently wraps the answer in ```json fences or
    adds a line of preamble, which made a raw json.loads fail with "line 1
    column 1" — and every one of those failures used to cost a full retry.
    Stripping fences and slicing to the outermost braces removes that entire
    class of wasted regeneration.
    """
    response_text = None
    for block in message.content:
        if getattr(block, "type", None) == "text":
            response_text = block.text
            break
    if response_text is None:
        raise Exception("Claude response contained no text block")

    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned).strip()
    first = cleaned.find("{")
    last = cleaned.rfind("}")
    if first != -1 and last != -1 and last > first:
        cleaned = cleaned[first:last + 1]

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as first_error:
        # Do not burn a 4-minute regeneration over one stray character.
        repaired = _repair_json(cleaned)
        try:
            plan = json.loads(repaired)
            logger.warning(
                f"Recovered malformed JSON without a retry (original error: {first_error})"
            )
            return plan
        except json.JSONDecodeError as second_error:
            # Neither the raw text nor the repaired text parses. Before giving
            # up a full generation, check whether it was simply cut off.
            salvaged = _close_truncated_json(cleaned)
            if salvaged:
                try:
                    plan = json.loads(salvaged)
                    # Report against the shape we actually ask for now. Looking
                    # for "weeks" here reported "salvaged 0 week(s)" on a
                    # truncation that had in fact recovered five usable days,
                    # which made a working salvage look like a broken one.
                    recovered = (plan.get("template") or {}).get("days") or []
                    logger.warning(
                        f"Response was truncated — salvaged {len(recovered)}/7 day(s) "
                        f"of the template instead of discarding the generation"
                    )
                    return plan
                except json.JSONDecodeError:
                    pass
            # Log the text around the break. Without this the failure is
            # indistinguishable from the repair never having run at all, which
            # is exactly the hole this hit on 19 Aug: the retry line in Railway
            # looked identical whether the repair fired or not, so there was no
            # way to tell a bad deploy from a repair that could not cope.
            pos = getattr(first_error, "pos", 0) or 0
            window = cleaned[max(0, pos - 140):pos + 140].replace("\n", "\\n")
            logger.warning(
                f"JSON repair attempted and FAILED. Original: {first_error}. "
                f"After repair: {second_error}. Text around the break: ...{window}..."
            )
            raise first_error


async def _complete_missing_weeks(plan_data: dict, answers: dict) -> dict:
    """
    Top up a plan that came back with fewer than four weeks.

    A targeted continuation is both faster and better than a full retry. Faster
    because it generates two or three weeks rather than four plus all the
    nutrition and recovery scaffolding. Better because the weeks it already
    produced are kept, so the block progresses from what week 1 actually says
    instead of being replaced by a different plan that happens to have the right
    shape.

    Deliberately attempted once. If the continuation also comes back wrong, the
    caller's normal retry loop takes over — this is an optimisation on the happy
    path, not a second retry mechanism layered underneath the first.
    """
    existing = plan_data.get("weeks", [])
    have = len(existing)
    missing = list(range(have + 1, 5))

    # Only the parts of each existing week the model needs to continue from,
    # rather than the whole thing — the point is a small, fast call.
    summary_lines = []
    for w in existing:
        summary_lines.append(f"Week {w.get('weekNumber')} ({w.get('theme', '')}):")
        for d in w.get("days", []):
            names = ", ".join(
                f"{ex.get('name')} {ex.get('sets', '')}".strip()
                for ex in d.get("workouts", [])
            )
            summary_lines.append(f"  {d.get('day')} — {d.get('label', '')}: {names}")
    summary = "\n".join(summary_lines)

    themes = {2: "Build", 3: "Peak", 4: "Deload"}
    wanted = ", ".join(f"week {n} ({themes.get(n, '')})" for n in missing)

    # The continuation is a fresh call with no memory of the original brief, so
    # the constraints that are easiest to violate have to be restated. Without
    # these it will happily put barbell work into a dumbbell-only plan, or a
    # partner drill in front of someone who trains alone, and the plan then
    # fails validation on the new weeks and costs the retry this was avoiding.
    constraints = [f"- Equipment available: {answers.get('equipment', 'Full gym')}"]
    facilities = answers.get("facilities") or []
    if isinstance(facilities, str):
        facilities = [f.strip() for f in facilities.split(",") if f.strip()]
    if facilities:
        constraints.append(f"- Facilities beyond the gym: {', '.join(facilities)}. Use nothing else.")
    training_with = answers.get("training_with") or "On my own"
    constraints.append(f"- Training context: {training_with}")
    if any(t in training_with.lower() for t in ("own", "alone", "solo")):
        constraints.append("- They train ALONE. No partner drills, sparring or opposed work.")
    club_days = answers.get("club_days") or []
    if isinstance(club_days, str):
        club_days = [d.strip() for d in club_days.split(",") if d.strip()]
    if club_days:
        constraints.append(
            f"- Club/squad days: {', '.join(club_days)}. Keep these as club sessions with real "
            f"content, and do not count them as the sessions you are prescribing."
        )
    match_day = (answers.get("match_day") or "").strip()
    if match_day and "not currently" not in match_day.lower():
        constraints.append(
            f"- Match day: {match_day}. Never a hard session; keep the day before light and the "
            f"day after recovery."
        )
    injury = (answers.get("injury") or "").strip()
    if injury:
        constraints.append(f"- Injuries to work around, in every session: {injury}")
    constraints.append(
        f"- Sessions per week you are prescribing: {answers.get('days', '3')}, not counting any "
        f"club training or match day."
    )
    constraints.append(f"- Typical session length: {answers.get('session', '60 min')}")

    continuation = f"""You previously produced part of a 4-week training plan but stopped early.
Here is what you produced:

{summary}

Produce ONLY the missing weeks: {wanted}.

These constraints still apply and must be respected in every week you produce:
{chr(10).join(constraints)}

Rules:
- Keep the SAME exercises on the same days as the weeks above. Progression comes from
  load, reps or intensity, never from swapping movements — the app tracks logged weights
  per exercise name, so a movement that appears one week and vanishes the next has no
  history to compare against.
- Week 4 MUST be a deload: the same exercises with roughly 30-40% fewer total sets and
  noticeably lighter loads. Reduce sets, do not delete exercises.
- Every week has all 7 days, in Sun, Mon, Tue, Wed, Thu, Fri, Sat order. Every day has at
  least one entry in "workouts", including rest days.
- Every workout entry needs name, sets, load, rest and reason. Exercises also need demo.

Return ONLY raw JSON (no markdown, no commentary) in this exact shape:

{{"weeks": [{{"weekNumber": {missing[0]}, "theme": "...", "days": [{{"day": "Sun", "label": "...", "focus": "...", "workouts": [{{"name": "...", "sets": "...", "load": "...", "rest": "...", "demo": "...", "reason": "..."}}]}}]}}]}}
"""

    client = get_anthropic_client()
    with client.messages.stream(
        model="claude-sonnet-5",
        max_tokens=24000,
        messages=[{"role": "user", "content": continuation}],
    ) as stream:
        message = stream.get_final_message()

    extra = _json_from_message(message).get("weeks", [])
    if not isinstance(extra, list) or not extra:
        # Nothing usable. Hand back what we had and let the normal retry loop
        # deal with it rather than inventing weeks.
        return plan_data

    plan_data["weeks"] = existing + extra
    # Renumber defensively — the continuation occasionally restarts at 1.
    for i, w in enumerate(plan_data["weeks"], start=1):
        w["weekNumber"] = i
    plan_data["_weeks_completed_by_continuation"] = len(extra)
    logger.info(f"Continuation supplied {len(extra)} missing week(s)")
    return plan_data


async def _call_claude_for_plan(answers: dict, previous_error: Optional[str] = None) -> dict:
    """One attempt at generating a plan via Claude. May raise on API error,
    invalid JSON, or failed validation — the caller (generate_plan_with_claude)
    is responsible for retrying.

    If the previous attempt failed, previous_error is fed back in so the retry
    knows what to fix. Retrying with an identical prompt tends to reproduce the
    identical mistake, which is wasted time the customer spends waiting after
    they have already paid.
    """

    name = answers.get("name", "User")
    goal = answers.get("goal", "General fitness")
    stage = answers.get("stage", "").strip()
    age = answers.get("age", "Not specified")
    sex = answers.get("sex", "Not specified")
    experience = answers.get("experience", "Brand new")
    days = answers.get("days", "3")
    equipment = answers.get("equipment", "Full gym")
    session = answers.get("session", "60 min")
    nutrition_pref = answers.get("nutrition", "No — training only")
    diet_pref = (answers.get("diet") or "").strip()
    allergies = (answers.get("allergies") or "").strip()

    diet_block = ""
    if diet_pref and diet_pref.lower() not in ("no restrictions", ""):
        diet_block += (
            f"\nDIETARY REQUIREMENT: this person is {diet_pref}. EVERY meal, snack and food "
            f"suggestion in the nutrition section must comply — no exceptions. A single "
            f"non-compliant food makes the whole plan wrong for them."
        )
    if allergies and allergies.lower() not in ("none", "no", "n/a"):
        diet_block += (
            f"\nALLERGIES / FOODS TO AVOID: {allergies}. These must NEVER appear anywhere in "
            f"the nutrition section, including as minor ingredients."
        )
    notes = answers.get("notes", "").strip()
    bodyweight = (answers.get("bodyweight") or "").strip()
    height = (answers.get("height") or "").strip()
    daily_activity = (answers.get("daily_activity") or "").strip()

    # Under-18s do not get calorie targets or a deficit. The training side of the
    # plan is unchanged, but a specific, confident-looking calorie number aimed
    # at a child is not something this product should produce, and it becomes a
    # problem exactly once. Anyone wanting more than general fuelling guidance at
    # that age should be talking to a parent or a GP, not to us.
    is_minor = "under 18" in str(age).lower()

    if is_minor:
        nutrition_brief = (
            "\nAGE-APPROPRIATE NUTRITION — THIS PERSON IS UNDER 18.\n"
            "Do NOT give a calorie target, a calorie deficit, a weight-loss target, or macro "
            "gram targets. Set \"calories\", \"protein\", \"carbs\" and \"fats\" all to 0 and put the "
            "guidance in \"note\" and \"meals\" instead.\n"
            "Give general food-quality and fuelling advice only: eating enough to support growth "
            "and training, protein at each meal, carbohydrate around sessions, hydration. Frame "
            "meals as examples rather than a prescription.\n"
            "In \"note\", say plainly that specific calorie or weight targets at this age should be "
            "set with a parent, guardian or GP rather than from an app.\n"
            "This applies even if the stated goal is fat loss. Never build a deficit.\n"
        )
    else:
        profile_bits = []
        weight_kg = _parse_bodyweight_kg(bodyweight)
        if weight_kg:
            profile_bits.append(f"bodyweight {weight_kg:g}kg")
        if height:
            profile_bits.append(f"height {height}")
        if daily_activity:
            profile_bits.append(f"activity outside training: {daily_activity.lower()}")

        # An answer of "85cm" reached production and the model quietly assumed
        # 85kg — right by luck. "12" meaning stone would have produced a target
        # for a toddler with nothing in the plan looking wrong.
        if bodyweight and not weight_kg:
            logger.warning(f"Unusable bodyweight answer: {bodyweight!r} — treating as not given")

        if profile_bits and weight_kg:
            nutrition_brief = (
                f"\nNUTRITION MUST BE CALCULATED FROM THEIR ACTUAL BODY DATA: "
                f"{', '.join(profile_bits)}.\n"
                "Work out maintenance calories from their bodyweight, height, age and the activity "
                "level above, then adjust for the stated goal. Set protein from BODYWEIGHT, not "
                "from a round number that looks about right: roughly 1.6-2.2g per kg for someone "
                "training regularly, at the higher end when in a deficit.\n"
                "State the resulting protein target in grams and make sure it is consistent with "
                "the bodyweight given. A target that ignores their actual size is the most "
                "obvious possible sign the plan was not built for them.\n"
                "ONLY build a calorie deficit if their stated GOAL is fat loss. For any other "
                "goal — sport performance, strength, muscle, general health — set calories at "
                "maintenance. Do not decide on their behalf that they would benefit from losing "
                "weight, and never put an in-season athlete into a deficit: underfuelling someone "
                "playing competitive fixtures costs them sprint speed and recovery in exchange for "
                "a body-composition change they did not ask for.\n"
                "Never prescribe an aggressive deficit. Fat loss should be a moderate deficit they "
                "can sustain alongside this training load, not the fastest possible route.\n"
            )
        else:
            nutrition_brief = (
                "\nNo usable bodyweight was given, so calorie and macro figures are estimates only. "
                "Say so plainly in \"note\" rather than presenting them as precise targets, and do "
                "NOT state a bodyweight figure — you do not have one. Invite them to request a "
                "correction with their weight so the targets can be set properly.\n"
            )

    notes = notes or "None provided"
    training_with = answers.get("training_with", "On my own").strip()
    club_days = answers.get("club_days") or []
    if isinstance(club_days, str):
        club_days = [d.strip() for d in club_days.split(",") if d.strip()]
    match_day = answers.get("match_day", "").strip()
    facilities = answers.get("facilities") or []
    if isinstance(facilities, str):
        facilities = [f.strip() for f in facilities.split(",") if f.strip()]
    facility_access = (answers.get("facility_access") or "").strip()
    injury = answers.get("injury", "").strip()

    family = family_for_goal(goal)
    guardrails = FAMILY_GUARDRAILS.get(family, FAMILY_GUARDRAILS["general"])

    # The specialist layer. Cached per activity, so this is usually a Mongo
    # read; only the first plan for a brand-new activity pays for generation.
    activity_standards = format_activity_standards(await get_activity_standards(goal))

    # The standards are written by a specialist and therefore assume a
    # specialist's setup — GPS units, force plates, timing gates, a fixture
    # list, coaching staff. This person has none of that. Without this the
    # model either ignores those standards (so why include them) or, worse,
    # pretends to follow them and invents data — "deloaded for your congested
    # fixture week" based on fixtures that were never provided. This tells it
    # to translate the specialist intent into what a solo gym member can
    # actually do, and never to reference inputs it doesn't have.
    infrastructure_reality = (
        "IMPORTANT — REAL-WORLD CONTEXT: this person trains by themselves in a normal "
        "commercial or home gym. They do NOT have GPS trackers, force plates, timing gates, "
        "isokinetic dynamometers, a coaching team, or lab testing. The sport-specific standards "
        "above describe what an elite setup would do — translate that intent into things this "
        "person can actually do with the equipment they told you about and a stopwatch/phone. "
        "Never prescribe testing that needs equipment they don't have, never assume access to "
        "performance data, and never reference their fixture list, match schedule or training "
        "history beyond exactly what they have provided. Where a standard depends on data or kit "
        "they lack, substitute the best self-assessable equivalent (e.g. rep-quality, RPE, a timed "
        "sprint) rather than dropping the underlying goal."
    )

    is_solo = "own" in training_with.lower() or "alone" in training_with.lower()
    if is_solo:
        solo_guidance = (
            "CRITICAL: this person trains ON THEIR OWN. Never prescribe anything requiring "
            "another person — no partner drills, no sparring, no pad work, no small-sided games "
            "(4v4, 5v5 etc.), no opposed practice. For team sports use solo equivalents: cone "
            "work, wall passes, shadow drills, mannequins, individual finishing and conditioning."
        )
    else:
        solo_guidance = (
            f"This person trains {training_with.lower()}. Programme around any fixed team or "
            "partner sessions rather than duplicating that load, and it is fine to include "
            "drills involving other people."
        )

    injury_guidance = ""
    if injury and injury.lower() not in ("none", "no", "n/a"):
        injury_guidance = (
            f"\nINJURY / LIMITATION: {injury}\n"
            "You must programme AROUND this. Do not attempt to treat or rehabilitate it — that is "
            "a physiotherapist's job, not this plan's. Avoid loading the affected area, substitute "
            "safe alternatives, and train everything else normally so they keep making progress."
        )

    retry_guidance = ""
    if previous_error:
        retry_guidance = (
            f"\nIMPORTANT — your previous attempt was REJECTED by automated quality checks for "
            f"this reason:\n\"{previous_error}\"\n"
            f"Fix that specific problem in this attempt while still satisfying every other rule.\n"
        )

    has_match = bool(match_day) and "not currently" not in match_day.lower()
    match_day_line = (
        f"- Match/competition day: {match_day}. This day is the match itself, never a hard "
        f"training session. Keep the day before light and the day after recovery."
        if has_match
        else ""
    )

    # Everything above tells the model what NOT to do on these days. Left there,
    # it does exactly that and leaves them empty, so someone who bought a
    # football plan opens Saturday and finds a blank card reading 0/0 done. For
    # a sport-specific product these are the days that should be the most
    # sport-specific thing in the plan.
    commitment_content = ""
    if has_match or club_days:
        commitment_content = (
            "\nMATCH AND CLUB DAYS MUST HAVE REAL CONTENT.\n"
            "These days already exist in this person's week, so you are not prescribing the "
            "session itself. You ARE responsible for what surrounds it, and leaving these days "
            "blank or as a bare 'Rest' entry is a failure.\n"
        )
        if has_match:
            commitment_content += (
                "- Match day: label it clearly as the match (e.g. \"Match day\"). Give a real "
                "pre-match warm-up and activation sequence as workout entries, plus a fuelling "
                "note tied to kick-off, and a post-match cooldown. Never a hard session.\n"
                "- The day before a match: light and specific. Not the word 'light' on its own — "
                "actual movements, actual durations.\n"
                "- The day after a match: active recovery with real content, not an empty day.\n"
            )
        if club_days:
            commitment_content += (
                "- Club/squad days: label them clearly as club training. Say what that session "
                "should cover and what to prioritise in it, give a short prep or activation "
                "sequence beforehand, and state plainly what NOT to add on top of it.\n"
            )
        commitment_content += (
            "- These days do NOT count towards the number of sessions they asked you for. "
            "They are existing commitments. Count only the gym and conditioning sessions YOU "
            "are prescribing.\n"
        )

    if facilities and not (len(facilities) == 1 and "Nothing else" in facilities):
        access_note = {
            "Any time": "They can get to these whenever they want, so use them freely.",
            "Once or twice a week": (
                "They can only get to these once or twice a week, so build at most that many "
                "sessions around them and make sure the rest of the block stands on its own "
                "without them."
            ),
            "Occasionally": (
                "They can only get to these occasionally, so treat any session using them as a "
                "bonus. The plan must work fully without them."
            ),
        }.get(facility_access, "")
        facilities_line = (
            f"- Facilities they can reach beyond their gym: {', '.join(facilities)}. {access_note} "
            f"Use them where they genuinely improve the plan for this goal, and never prescribe a "
            f"facility that is not on this list."
        )
    elif facilities:
        facilities_line = (
            "- Facilities: gym only. They have NO track, pitch, pool, bag, hills or open road "
            "available. Every session must work indoors with the equipment listed above."
        )
    else:
        facilities_line = ""

    # ── Derived plans ─────────────────────────────────────────────────────
    # A derived plan is a new block built from one the customer already owns,
    # because something changed: an injury, a schedule change, different
    # equipment, or a trip. They are paying again, so this must be a genuinely
    # new block — not the old one with two exercises swapped.
    previous_plan = answers.get("_previous_plan") or {}
    change_request = answers.get("_change_request") or {}
    derived_guidance = ""
    if previous_plan:
        prev_summary = _summarise_plan_for_prompt(previous_plan)
        reasons = change_request.get("reasons") or []
        detail = (change_request.get("detail") or "").strip()
        keep = (change_request.get("keep") or "").strip()
        derived_guidance = (
            "\nTHIS IS A FOLLOW-ON BLOCK.\n"
            "The person already trained on the plan summarised below and has come back "
            "because something changed. Build the NEXT block for them.\n\n"
            f"THEIR PREVIOUS PLAN:\n{prev_summary}\n\n"
            f"WHAT HAS CHANGED: {'; '.join(reasons) if reasons else 'not specified'}\n"
            + (f"IN THEIR WORDS: {detail}\n" if detail else "")
            + (f"WHAT THEY WANT KEPT: {keep}\n" if keep else "")
            + "\nRules for a follow-on block:\n"
            "- Carry forward the movements and structure that were working, unless the change "
            "makes them unsuitable. Familiarity is a feature; they liked this plan.\n"
            "- Progress from where the previous block ended — this is block two, not a restart.\n"
            "- Apply the stated change thoroughly and everywhere, not cosmetically. If an injury "
            "is named, every session must respect it, not just the obvious one.\n"
            "- If the change is a reduction in available days, rebuild the split properly for the "
            "new number rather than deleting sessions from the old one.\n"
            "- Say plainly in the reasoning where the plan differs from their last one and why.\n"
        )

    club_days_line = (
        f"- Club/squad training days: {', '.join(club_days)}. These sessions already happen and "
        f"are NOT optional — do not schedule gym work that duplicates their load, and never place "
        f"a heavy lower-body session on the day before one. Gym sessions must fit around them, "
        f"and these days do not count towards their requested number of sessions."
        if club_days
        else ""
    )

    stage_line = f"- Training stage: {stage}" if stage else ""
    stage_guidance = ""
    if stage:
        lowered = stage.lower()
        if "off-season" in lowered:
            stage_guidance = "This is an OFF-SEASON block — prioritise building a strength/conditioning base with higher volume; sport-specific intensity can be lower right now."
        elif "pre-season" in lowered:
            stage_guidance = "This is a PRE-SEASON block — ramp up intensity and sport-specific conditioning, bridging general fitness toward match/competition readiness."
        elif "in-season" in lowered:
            stage_guidance = "This is IN-SEASON — prioritise load management and maintaining fitness around matches/competition, not fresh volume that risks fatigue or injury."
        elif "final 4 weeks" in lowered or "fight camp peak" in lowered:
            stage_guidance = "This is FIGHT CAMP PEAK (final weeks before a fight) — prioritise sharpening, technical work, and tapering volume; avoid introducing fresh heavy strength work or high-fatigue conditioning this close to competition."
        elif "8+ weeks out" in lowered:
            stage_guidance = "This is early fight camp (8+ weeks out) — build conditioning and strength genuinely hard now, since there's time to recover before the fight."
        elif "peaking" in lowered or "final weeks" in lowered:
            stage_guidance = "This is the final peaking/taper phase before a race or event — reduce volume, maintain sharpness, prioritise recovery over fresh gains."
        elif "several weeks out" in lowered or "building" in lowered:
            stage_guidance = "This is a build phase well ahead of a race/event — train hard, build the engine, there's time to recover before it matters."
        elif "no specific" in lowered or "general training" in lowered or "well-rounded" in lowered:
            stage_guidance = "No specific stage was given — build a genuinely well-rounded programme for this goal without assuming a particular point in a season or camp."

    prompt = f"""You are an expert strength coach and training program designer.
Create a personalised, 4-WEEK PERIODISED training plan for {name}, session length {session}.

User Profile:
- Main Goal: {goal}
{stage_line}
- Age range: {age}
- Sex: {sex}
- Training Experience: {experience}
- Availability: {days} training sessions per week that YOU are prescribing. This number
  covers gym and conditioning sessions only. Any club training or match listed below is
  an existing commitment that sits on top of this number, not part of it.
- Equipment: {equipment}
{facilities_line}
- Typical Session Length: {session}
- Include Nutrition: {nutrition_pref}
{nutrition_brief}
{diet_block}
- Training context: {training_with}
{club_days_line}
{match_day_line}
{commitment_content}
- Injuries, allergies or other notes from the user: {notes}

{stage_guidance}

{solo_guidance}
{injury_guidance}
{retry_guidance}
{derived_guidance}

{guardrails}
{activity_standards}

{infrastructure_reality}

If the notes mention any injury, condition, or limitation, you MUST adapt exercise
selection to avoid aggravating it and substitute safer alternatives. If allergies or
dietary restrictions are mentioned, avoid those foods entirely in the nutrition section.

For any exercise with a meaningful load (barbell, dumbbell or machine work at a working
weight), tell the person to warm up first — a couple of lighter build-up sets before the
working sets. State this briefly in that exercise's "reason" or as a short note; never
have them load a heavy working weight cold, especially if they are newer to training.

Design the exercise selection and weekly structure specifically for the stated
goal/sport rather than a generic template — e.g. combat sports (boxing,
kickboxing) should include footwork, conditioning and appropriate strength
work; HYROX/hybrid athlete goals should include station-specific conditioning
(sled, rowing, burpee broad jumps, farmer's carries etc.) alongside strength;
bodybuilding should prioritise hypertrophy rep ranges and muscle-group splits;
football/team sports should include change-of-direction and match-specific
conditioning; rehab should prioritise safe, staged loading. Use your expertise
in that specific discipline.

YOU ARE WRITING ONE WEEK, NOT FOUR.

The app shows this person a 4-week block, but you only author week 1. The
progression rules you attach to each exercise are what build weeks 2, 3 and 4
automatically. This means you can spend real depth on each movement instead of
writing the same exercise out four times — and that depth is the product.

Return all 7 days, Sun through Sat in that exact order. Days that are not a
training day must still appear with a rest or active-recovery entry rather than
being omitted, and every single day must have at least one entry in "workouts".
The number of days on which you prescribe a real training session should be
{days} — count only the sessions YOU are prescribing, NOT any club training or
match day, which are existing commitments.

Prescribe FEWER than {days} only when hitting it would put them on seven days a
week once club sessions and matches are counted. Six days on with one recovery
day is the ceiling in-season.

Do NOT mention the session count in "weekNotes". If you prescribe fewer than
asked, that is explained automatically afterwards using the actual number of
sessions in your plan. Asked to write it yourself you will miscount — a real
plan carried "four well-placed sessions" on a week containing three.

EVERY exercise needs a "progression" object. DEFAULT TO "none" AND ONLY PROGRESS
WHAT SHOULD GENUINELY BE PROGRESSED:

  {{"type": "none"}}                                      does not progress
  {{"type": "measure"}}                                   a test — logged, not loaded
  {{"type": "load",     "increment": 5,  "unit": "kg"}}   heavier each week
  {{"type": "reps",     "increment": 1}}                  one more rep per set
  {{"type": "time",     "increment": 5}}                  five more minutes
  {{"type": "distance", "increment": 1,  "unit": "km"}}   further each week
  {{"type": "rounds",   "increment": 1}}                  one more round

THE ENGINE PROGRESSES. THE TEST GETS MEASURED.

Gym work builds the engine: trap bar deadlift, squat, bench, Nordic curl, rows.
These take "load" or "reps" and climb week to week. That is where progressive
overload belongs.

Sprints, shuttles, bounds, hops, jumps and med ball throws are TESTS of what
that engine produces. Mark every one of them "measure". They keep identical
volume all four weeks — the person runs them, logs the time or distance, and
tries to beat their own number. Progress there is a faster 10m or a longer
bound, NOT more reps.

Adding a set a week to max-effort shuttle sprints is not progression. It is a
50% jump in high-intensity volume over a month on top of matches, and it is how
a footballer tears a hamstring in week 3.

Also "none": warm-ups, mobility, stretches, rest-day walks, foam rolling, club
sessions, match days, and anything that is an instruction rather than an
exercise (fuelling notes, "as directed by coach").

For the ones that DO progress, sizing the increment is a coaching decision, not
a default. A lower-body compound might take 5kg a week, an upper-body compound
2.5kg, an isolation exercise 1kg. 2.5kg on a squat is nothing; on a lateral
raise it is a 25% jump.

MATCH THE TYPE TO HOW YOU WROTE "sets":
- "sets" written as NxM ("4x6", "3x20s each side") can only use "load", "reps",
  "rounds", "measure" or "none". NEVER "time" or "distance" — the first number
  in "3x20s" is the SET count, so the arithmetic would give you 8x20s.
- "time" and "distance" are for continuous single-figure entries only: "20min",
  "5km", "45min easy".
- Write "4x6", never "4x6 reps". The format already says reps.
- NEVER give "load" progression to a bodyweight exercise. If "load" says
  Bodyweight, the progression is "reps" or "none" — you cannot add 1kg to a
  Copenhagen plank.
- Do NOT put the same exercise on two different days and progress both. The
  weekly total then climbs at twice the rate either row shows.

If you are unsure, use "none". A movement held steady for four weeks is fine;
an instruction the person should not follow is not.

Because you are only writing one week, spend the room on quality. Every exercise
also needs:
- "cues": two or three short lines on how to do it well
- "mistake": the single most common thing people get wrong on this movement
- "easier": a regression for someone who cannot do it yet
- "harder": a progression for someone finding it easy

The "easier" field matters more than any of the others. Not being able to do a
prescribed movement is the most common reason someone abandons a plan.

Also return "weekNotes": four short lines, one per week, saying what changes and
why. These are what stop the block reading as the same week repeated.

Do NOT describe week 4 as a deload, a taper or a recovery week. Whether this
person deloads depends on their training history and is decided after you
respond — write week 4's note as a normal progression week and it will be
replaced automatically if a deload applies.

EVERY EXERCISE ENTRY MUST BE ONE MOVEMENT, NAMED SHORTLY.

Never group several movements into one entry. "Pre-Training Activation Circuit",
"Core Finisher", "Mobility Flow" and "Warm-up Routine" are all failures: the
person cannot tell what to do and there is no demo video for a circuit you
invented. Do NOT fix this by listing the movements inside the name either. These
render in fixed-width rows on a phone, so a long name is cut off mid-word and the
person sees less than they did before.

Give each movement its own entry:

  BAD:  name "Pre-Training Activation Circuit",  sets "1x8min"
  BAD:  name "Activation: glute bridge x10, banded walk x10, leg swings x10"
  GOOD: name "Glute Bridge",         sets "2x10"
        name "Banded Lateral Walk",  sets "2x10 each way"
        name "Leg Swings",           sets "1x10 each leg"

Hard limits, because of that fixed-width layout:
- "name" is the movement and nothing else. Maximum 40 characters. NEVER empty.
- "sets" is a short volume figure: "4x6", "3x30s", "2 rounds". Maximum 20
  characters. Never a sentence, never a list of movements, and never a phrase
  like "As programmed by coach" — write "Coach-led" or a real figure instead.
- Anything longer belongs in "reason", which has room for a full sentence.

The same applies to anything vague: "core work", "accessories", "prehab". Name
the movement. If you cannot name it, do not program it.

NEVER use a double-quote character inside any string value. Write measurements
in words: "20 inch box", not "20" box". Do not put quotation marks around words
for emphasis. A single stray quote anywhere in the response invalidates the
entire plan and it has to be built again from scratch.

Every exercise MUST include a "demo" field: the best short search phrase for finding a
demonstration video of that movement. For standard gym lifts this is just the plain
exercise name ("back squat", "romanian deadlift"). For sport-specific or unusually named
drills, use the phrase someone would actually search to find it, including the sport where
that helps disambiguate (e.g. "football wall pass drill", "boxing slip rope drill"). Never
include set/rep detail in "demo".

Leave "hrvTrend" as an empty string ("") unless the person has explicitly said
they track heart-rate variability with a wearable. Most people don't, and a
recovery metric they can't measure is noise — do NOT write "not tracked",
"monitor via sleep" or any placeholder into it; just leave it empty and it will
be hidden. Put any recovery-monitoring advice in the "protocols" list instead.

Return ONLY raw JSON (no markdown, no code fences) in this EXACT shape:

{{
  "brand": "{name}'s App",
  "tagline": "{goal}",
  "nutrition": {{
    "calories": 2400,
    "protein": 160,
    "carbs": 260,
    "fats": 80,
    "note": "One or two sentences of nutrition guidance tailored to the goal and any allergies noted.",
    "adjustments": [
      {{"when": "Match day", "change": "Carbs up ~80g, most of it in the 3 hours before kick-off.", "why": "Tops up muscle glycogen so you don't fade in the last 20 minutes."}},
      {{"when": "Rest day", "change": "Carbs down ~60g, protein and fats unchanged.", "why": "You're not fuelling a session, but recovery still needs the protein."}}
    ],
    "meals": [
      {{"time": "08:00", "name": "Breakfast", "items": "..."}},
      {{"time": "11:00", "name": "Mid-morning", "items": "..."}},
      {{"time": "13:00", "name": "Lunch", "items": "..."}},
      {{"time": "16:00", "name": "Snack", "items": "..."}},
      {{"time": "19:00", "name": "Dinner", "items": "..."}}
    ],
    "supplements": ["...", "..."]
  }},
  "recovery": {{
    "sleepTarget": "7-9h",
    "hrvTrend": "",
    "protocols": ["...", "...", "...", "..."]
  }},
  "morningRoutine": [
    {{"name": "Hip flexor stretch", "sets": "2x30s each side", "load": "Bodyweight", "rest": "—", "reason": "Loosens hip flexors that tighten overnight, before any training session."}},
    {{"name": "Cat-cow stretch", "sets": "1x10 reps", "load": "Bodyweight", "rest": "—", "reason": "..."}},
    {{"name": "...", "sets": "...", "load": "...", "rest": "...", "demo": "...", "reason": "..."}}
  ],
  "weekNotes": [
    "Week 1: learn the movements and find your working weights. Don't chase numbers yet.",
    "Week 2: same session, a little more. This is where progress starts showing.",
    "Week 3: the heaviest week of the block. You should feel it by Thursday.",
    "Week 4: last week of the block, then it's time for a new one."
  ],
  "template": {{
    "days": [
      {{"day": "Sun", "label": "Rest", "focus": "Recovery", "workouts": [
        {{"name": "Walk", "sets": "30min", "load": "Easy", "rest": "—", "demo": "brisk walking",
          "reason": "Keeps blood flow up without adding fatigue before the training week.",
          "cues": "Keep it conversational. If you're out of breath it's too fast.",
          "mistake": "Turning a recovery walk into a workout.",
          "easier": "15 minutes is fine.", "harder": "Add a gentle incline.",
          "progression": {{"type": "none"}}}}
      ]}},
      {{"day": "Mon", "label": "Lower Body", "focus": "Strength", "workouts": [
        {{"name": "Back Squat", "sets": "4x6", "load": "Moderate, around 7/10 effort", "rest": "2min",
          "demo": "back squat form",
          "reason": "The foundational lower-body strength this goal depends on most.",
          "cues": "Brace before you unrack. Knees track over toes. Drive the floor away.",
          "mistake": "Letting the hips shoot up first, which turns it into a good morning.",
          "easier": "Goblet squat with a dumbbell.", "harder": "Pause two seconds at the bottom.",
          "progression": {{"type": "load", "increment": 5, "unit": "kg"}}}}
      ]}},
      {{"day": "Tue", "label": "...", "focus": "...", "workouts": [ ...same shape... ]}},
      {{"day": "Wed", "label": "...", "focus": "...", "workouts": [ ...same shape... ]}},
      {{"day": "Thu", "label": "...", "focus": "...", "workouts": [ ...same shape... ]}},
      {{"day": "Fri", "label": "...", "focus": "...", "workouts": [ ...same shape... ]}},
      {{"day": "Sat", "label": "...", "focus": "...", "workouts": [ ...same shape... ]}}
    ]
  }}
}}

Important:
- Be realistic and safe — no extreme recommendations
- Adapt every exercise choice to the stated equipment and experience level
- "sets" should look like "4x6" (sets x reps) or a duration like "30min" for cardio/rest entries
- "load" is a short string like "70% 1RM", "Moderate", "Bodyweight", or "Easy" — never leave it blank
- "rest" must never be blank — use a real value like "90s", "2min", or "—" for entries with no meaningful rest period
- Every workout entry MUST include a "reason" field: one short sentence (max ~20 words) explaining why THIS exercise was chosen for THIS person's goal, experience level, or any injury noted — not a generic description. Rest/recovery day entries can use "reason" to explain why rest is programmed there too.
- If any injury, condition or limitation was noted, prioritise safety and note substitutions directly in the exercise name or via a safer alternative exercise choice
- If nutrition was declined ("No — training only"), still include the nutrition object but keep "note" brief and calories/macros as sensible estimates
- "adjustments" is 2-4 entries covering the day types this person actually has: a rest day always, a match/competition day if they compete, and a hard training day where it matters. The main calorie and macro figures above are the BASELINE for a normal training day, and each adjustment says how that day differs. Keep protein steady across all of them and move carbohydrate — that is how it actually works. Give a real number in "change" (e.g. "carbs up ~80g"), never a vague instruction like "eat a bit more". If someone has no match day and no rest-day variation worth stating, return a rest-day entry only.
- "morningRoutine" must be 3-6 real, quick mobility/stretching/activation items (same fields as a workout: name, sets, load, rest, reason) — genuinely appropriate as a short morning routine, not a repeat of the day's main training
- Return valid JSON only — no markdown, no commentary, no trailing commas
- Double-check before responding: every one of the 28 day-entries (4 weeks x 7 days) must be present, in Sun-Mon-Tue-Wed-Thu-Fri-Sat order, and every workout entry must have all five fields (name, sets, load, rest, reason) filled in — an incomplete plan is a failed response
"""

    client = get_anthropic_client()

    # Streamed rather than a single blocking call: this is purely about how
    # the response is delivered between our server and Anthropic's API (a
    # continuous flow of chunks vs. one blocking reply) — it changes nothing
    # about the customer experience, since generation already happens in the
    # background. What it does buy us is removing the ~21,333 token ceiling
    # that applies to non-streamed requests.
    #
    # Budget raised from 32,000 to 64,000 on 21 Aug. Railway logged
    # stop_reason=max_tokens with output_tokens exactly 32000, which is the
    # ceiling being hit rather than approached — the model was still writing
    # when we cut it off, and the response died five days into week 1.
    #
    # The JSON itself is nowhere near that size. A one-week template runs
    # roughly 7,000 tokens even with cues, mistakes and variations on every
    # exercise. The rest is the model's own reasoning, which shares this budget
    # and varies enormously run to run: the 20:53 generation finished
    # comfortably, the 21:49 one did not. Headroom is far cheaper than a retry,
    # because unused budget costs nothing while a truncation costs four minutes.
    with client.messages.stream(
        model="claude-sonnet-5",
        max_tokens=64000,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    ) as stream:
        message = stream.get_final_message()

    # Why the model stopped is the single most useful fact when a plan comes
    # back incomplete, and we were not recording it. "max_tokens" means the
    # response was cut off, and the fix is a bigger budget or a smaller payload.
    # "end_turn" means the model decided it had finished early, which is a
    # prompt problem instead. The two are indistinguishable without this line.
    stop_reason = getattr(message, "stop_reason", None)
    usage = getattr(message, "usage", None)
    if stop_reason and stop_reason != "end_turn":
        logger.warning(
            f"Plan generation stop_reason={stop_reason} "
            f"(output tokens: {getattr(usage, 'output_tokens', '?')})"
        )

    # Claude Sonnet 5 can include a "thinking" block ahead of the actual
    # answer for complex prompts like this one — don't assume content[0] is
    # the text block, find the one that actually is.
    plan_data = _json_from_message(message)

    # Occasionally the model returns a structurally valid object containing
    # fewer than four weeks — one complete week, properly closed, and nothing
    # after it. Regenerating the whole plan to recover three missing weeks
    # throws away a perfectly good week 1 and costs another full 3 minutes, so
    # ask for just the missing weeks instead.
    weeks = plan_data.get("weeks")
    if isinstance(weeks, list):
        # A salvaged truncation can leave a final week with fewer than 7 days.
        # Drop it rather than shipping a stump — the continuation below rebuilds
        # it in full, which costs far less than regenerating the whole plan.
        complete = [w for w in weeks if isinstance(w.get("days"), list) and len(w["days"]) == 7]
        if len(complete) != len(weeks):
            logger.warning(
                f"Dropped {len(weeks) - len(complete)} incomplete week(s) before continuation"
            )
            plan_data["weeks"] = complete
            weeks = complete

    if isinstance(weeks, list) and 0 < len(weeks) < 4:
        logger.warning(
            f"Plan came back with {len(weeks)} week(s) — requesting the missing weeks "
            f"rather than regenerating the whole plan"
        )
        plan_data = await _complete_missing_weeks(plan_data, answers)

    plan_data["answers"] = answers
    plan_data["created_at"] = datetime.now(timezone.utc).isoformat()
    plan_data.setdefault("brand", f"{name}'s App")
    tagline_default = f"{goal} — {stage}" if stage and "no specific" not in stage.lower() and "general training" not in stage.lower() else goal
    plan_data.setdefault("tagline", tagline_default)

    # Repair misplaced name/sets content on the authored week BEFORE it gets
    # expanded, so one bad row does not get copied into all four weeks.
    autofix_workout_fields({"weeks": [{"days": (plan_data.get("template") or {}).get("days", [])}]})

    # Build the four weeks the app renders from the single authored week.
    expand_template(plan_data, answers)

    # HARD validation — structural. A plan missing a day or an exercise is
    # genuinely broken and will error in the customer's app, so this must pass.
    validate_plan(plan_data)

    plan_data["plan_version"] = PLAN_PROMPT_VERSION
    plan_data["activity_family"] = family

    # A block that has run its course should say so rather than looping in
    # silence. This drives the block-complete state in the app and the reminder
    # email a week before it lands.
    plan_data["block_ends_at"] = (
        datetime.now(timezone.utc) + timedelta(weeks=BLOCK_WEEKS)
    ).isoformat()

    # SOFT validation — coaching sense. Attach the outcome rather than raising,
    # so the caller can retry to improve the plan but still deliver THIS plan if
    # retries run out. A soft-imperfect plan beats a paid customer getting an
    # error every time.
    try:
        validate_plan_semantics(plan_data, answers)
        plan_data["_soft_issue"] = None
    except ValueError as e:
        plan_data["_soft_issue"] = str(e)

    return plan_data


async def generate_plan_with_claude(answers: dict, on_stage=None) -> dict:
    """
    Generate a personalised, 4-week periodised training plan using Claude AI,
    matching the exact JSON schema the AppShell component expects. Runs a
    deterministic QA check (validate_plan) on the result and automatically
    retries once if anything required is missing (a day, an exercise, a
    field) rather than saving a broken plan.
    """
    last_error = None
    feedback = None
    best_plan = None
    max_attempts = 3

    for attempt in range(1, max_attempts + 1):
        try:
            if on_stage:
                await on_stage("writing" if attempt == 1 else "refining")

            plan_data = await _call_claude_for_plan(answers, previous_error=feedback)

            if on_stage:
                await on_stage("checking")

            soft_issue = plan_data.pop("_soft_issue", None)
            if not soft_issue:
                # Passed everything.
                if attempt > 1:
                    logger.info(f"Plan generation succeeded on retry attempt {attempt}")
                return plan_data

            # Structurally sound but a soft check flagged something. Keep it as
            # a fallback, feed the issue back, and try once more to improve it.
            best_plan = plan_data
            feedback = soft_issue
            last_error = f"Soft QA issue: {soft_issue}"
            logger.warning(f"Plan generation attempt {attempt}: {last_error} (kept as fallback)")
        except json.JSONDecodeError as e:
            last_error = f"Invalid JSON from Claude: {e}"
            feedback = "Your previous response was not valid JSON. Return raw JSON only."
            logger.warning(f"Plan generation attempt {attempt} failed: {last_error}")
        except ValueError as e:
            # Hard structural failure — cannot ship this, must retry.
            last_error = f"Failed structural validation: {e}"
            feedback = str(e)
            logger.warning(f"Plan generation attempt {attempt} failed: {last_error}")
        except Exception as e:
            last_error = f"Claude API error: {e}"
            feedback = None
            logger.warning(f"Plan generation attempt {attempt} failed: {last_error}")

    # Retries exhausted. If we have a structurally sound plan that only tripped
    # a soft check, DELIVER IT — a slightly imperfect plan is far better than a
    # paid customer getting nothing. Flag it so it can be spotted and hand-fixed
    # in the plan editor.
    if best_plan is not None:
        best_plan["needs_review"] = True
        best_plan["review_reason"] = last_error
        logger.warning(f"Delivering best-effort plan after {max_attempts} attempts: {last_error}")
        return best_plan

    # No usable plan at all (hard failures throughout) — this genuinely can't
    # be delivered.
    logger.error(f"Plan generation failed after {max_attempts} attempts: {last_error}")
    raise Exception(f"Plan generation failed after {max_attempts} attempts: {last_error}")



# ===== Auth helpers =====
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_coach_token(coach_id: str, email: str) -> str:
    payload = {
        "sub": coach_id,
        "email": email,
        "type": "coach",
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def slugify(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return s[:48] or uuid.uuid4().hex[:8]


# ===== Models =====
class WaitlistCreate(BaseModel):
    email: EmailStr
    source: Optional[str] = "b2b"
    company: Optional[str] = None


class WaitlistEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    source: str = "b2b"
    company: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PlanGenerateRequest(BaseModel):
    answers: Dict[str, Any]


class Plan(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    answers: Dict[str, Any] = {}
    status: str = "draft"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    # When they actually began TRAINING, set on the first logged session or when
    # they tap "I'm on this week". Every week calculation derives from this
    # rather than created_at, so a plan nobody opens never advances past week 1.
    started_at: Optional[str] = None
    brand: Optional[str] = None
    tagline: Optional[str] = None
    weeks: Optional[List[Dict[str, Any]]] = None
    nutrition: Optional[Dict[str, Any]] = None
    recovery: Optional[Dict[str, Any]] = None
    morningRoutine: Optional[List[Dict[str, Any]]] = None


class CheckoutSessionRequest(BaseModel):
    # Exactly one of these two should be provided — answers for the AI
    # questionnaire path, manual_plan for the self-serve builder path.
    answers: Optional[Dict[str, Any]] = None
    manual_plan: Optional[Dict[str, Any]] = None
    # Follow-on blocks: the id of a plan the customer already owns, plus what
    # has changed. Answers are inherited from the source plan, so they never
    # refill the questionnaire.
    derived_from: Optional[str] = None
    change_request: Optional[Dict[str, Any]] = None


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    order_id: str


class WeightLogCreate(BaseModel):
    plan_id: str
    week_number: int
    day: str
    exercise_name: str
    value: str  # e.g. "82.5kg" or "10 reps" — kept as a simple string, deliberately basic
    rpe: Optional[str] = None  # "easy" | "right" | "hard" — how the set felt


class WeightLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plan_id: str
    week_number: int
    day: str
    exercise_name: str
    value: str
    rpe: Optional[str] = None
    logged_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SupportRequestCreate(BaseModel):
    email: EmailStr
    message: str
    order_id: Optional[str] = None
    session_id: Optional[str] = None


class SupportRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    message: str
    order_id: Optional[str] = None
    session_id: Optional[str] = None
    plan_id: Optional[str] = None
    # "contact" for general enquiries, "tweak" for in-window corrections to a
    # plan. Kept separate so the inbox distinguishes "this is wrong" from
    # "I have a question" — they need different response times.
    kind: str = "contact"
    resolved: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PlanRecoverRequest(BaseModel):
    email: EmailStr


class TweakRequestCreate(BaseModel):
    message: str
    email: Optional[EmailStr] = None


class PlanDraftCreate(BaseModel):
    email: EmailStr
    mode: str = "self"
    draft: Dict[str, Any]


class AdminLoginRequest(BaseModel):
    password: str


class AdminLoginResponse(BaseModel):
    token: str


class SampleLeadCreate(BaseModel):
    email: EmailStr
    plan_type: str


class SampleLead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    plan_type: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ImageRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    key: str
    url: str
    storage_path: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ContentSetRequest(BaseModel):
    key: str
    value: str


# Coach models
class CoachSignup(BaseModel):
    email: EmailStr
    password: str
    brand_name: str


class CoachLogin(BaseModel):
    email: EmailStr
    password: str


class CoachBrandUpdate(BaseModel):
    brand_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None


# ── Structured, manually-authored plan content ──
# Physios/coaches type this in directly — no AI involvement in the content
# itself. This deliberately mirrors the exact schema AppShell already renders
# (days/workouts, nutrition with per-meal macros, recovery, morning routine)
# so a physio-built plan and an AI-generated plan look and behave identically
# to the person using the app; only the authorship differs.
class PhysioWorkoutEntry(BaseModel):
    name: str
    sets: str
    load: str
    rest: str
    reason: Optional[str] = None
    timerEnabled: bool = True
    # Optional progressive-overload config, set by whoever authors the plan.
    # progressionType: what's actually progressing — "load" | "reps" |
    #   "hold" | "distance" | None (off)
    # progressionMode: "fixed" (add a flat amount each week) or "percent"
    # progressionRate: the number to apply, per progressionMode
    progressionType: Optional[str] = None
    progressionMode: Optional[str] = "fixed"
    progressionRate: Optional[float] = None


class PhysioDayEntry(BaseModel):
    # "day" holds either a weekday ("Sun".."Sat") in day-based plans, or a
    # phase name (e.g. "Phase 1") in phase-based plans — same field, the
    # meaning just depends on the plan's structureType.
    day: str
    label: str
    focus: str
    workouts: List[PhysioWorkoutEntry] = []
    dateRange: Optional[str] = None  # phases only, e.g. "Weeks 1-2" — informational only, no auto-detection


class PhysioMealEntry(BaseModel):
    time: str
    name: str
    items: str
    calories: Optional[int] = None
    protein: Optional[int] = None
    carbs: Optional[int] = None
    fats: Optional[int] = None


class PhysioSupplementEntry(BaseModel):
    name: str
    reason: Optional[str] = None


class PhysioNutrition(BaseModel):
    calories: Optional[int] = None
    protein: Optional[int] = None
    carbs: Optional[int] = None
    fats: Optional[int] = None
    note: Optional[str] = None
    meals: List[PhysioMealEntry] = []
    supplements: List[PhysioSupplementEntry] = []
    supplement_disclaimer: Optional[str] = None


class PhysioRecovery(BaseModel):
    sleepTarget: Optional[str] = None
    hrvTrend: Optional[str] = None
    protocols: List[str] = []


class ClientPlanCreate(BaseModel):
    client_name: str
    client_email: Optional[EmailStr] = None
    notes: Optional[str] = None
    # "days" (Mon-Sun) or "phases" (Phase 1, Phase 2... — for things like
    # rehab that don't map to a weekly cycle) — tells the frontend how to
    # label and select between the entries in `days` below.
    structureType: str = "days"
    # Structured, manually-authored content (preferred path):
    days: List[PhysioDayEntry] = []
    nutrition: Optional[PhysioNutrition] = None
    recovery: Optional[PhysioRecovery] = None
    morningRoutine: List[PhysioWorkoutEntry] = []
    allow_logging: bool = True
    # Mandatory professional disclaimer — see /coach/clients endpoint for
    # what this actually gates.
    disclaimer_accepted: bool


# Same structured shape as ClientPlanCreate, minus the disclaimer requirement
# — this is only reachable behind the admin token, so there's no third party
# whose professional responsibility needs establishing.
class ManualPlanCreate(BaseModel):
    client_name: str
    client_email: Optional[EmailStr] = None
    notes: Optional[str] = None
    structureType: str = "days"
    days: List[PhysioDayEntry] = []
    nutrition: Optional[PhysioNutrition] = None
    recovery: Optional[PhysioRecovery] = None
    morningRoutine: List[PhysioWorkoutEntry] = []
    allow_logging: bool = True
    # Legacy path, kept so existing static-template clients don't break:
    template: Optional[str] = None


class CoachPublic(BaseModel):
    id: str
    email: EmailStr
    brand_name: str
    slug: str
    logo_url: Optional[str] = None
    primary_color: str = "#D4FF00"
    secondary_color: str = "#050505"
    subscription_status: str = "none"  # none | active | cancelled
    created_at: str


class ClientPlanPublic(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    coach_id: str
    client_name: str
    client_email: Optional[EmailStr] = None
    template: Optional[str] = None
    notes: Optional[str] = None
    slug: str
    structureType: str = "days"
    days: List[Dict[str, Any]] = []
    nutrition: Optional[Dict[str, Any]] = None
    recovery: Optional[Dict[str, Any]] = None
    morningRoutine: List[PhysioWorkoutEntry] = []
    allow_logging: bool = True
    payment_status: str = "included"  # included | pending_payment | paid
    disclaimer_accepted: bool = False
    created_at: str


# ===== Auth deps =====
def require_admin(x_admin_token: Optional[str] = Header(None), auth: Optional[str] = Query(None)) -> bool:
    token = x_admin_token or auth
    if not token or not ADMIN_TOKEN or not secrets.compare_digest(token, ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


async def get_current_coach(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("coach_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "coach":
            raise HTTPException(status_code=401, detail="Invalid token type")
        coach = await db.coaches.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not coach:
            raise HTTPException(status_code=401, detail="Coach not found")
        return coach
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ===== Routes =====
@api_router.get("/")
async def root():
    return {"service": "Planlete", "status": "ok"}


@api_router.post("/waitlist", response_model=WaitlistEntry)
async def join_waitlist(payload: WaitlistCreate):
    existing = await db.waitlist.find_one({"email": payload.email, "source": payload.source})
    if existing:
        existing.pop("_id", None)
        return WaitlistEntry(**existing)
    entry = WaitlistEntry(**payload.model_dump())
    await db.waitlist.insert_one(entry.model_dump())
    return entry


@api_router.get("/waitlist/count")
async def waitlist_count():
    return {"count": await db.waitlist.count_documents({})}


async def _run_admin_generation(plan_id: str, answers: dict) -> None:
    """Generate in the background and write the result onto the placeholder."""
    try:
        plan_data = await generate_plan_with_claude(answers)
        plan_data["id"] = plan_id
        plan_data["status"] = "ready"
        await db.plans.replace_one({"id": plan_id}, plan_data, upsert=True)
        logger.info(f"Plan generated (admin test): {plan_id}")
    except Exception as e:
        logger.error(f"Plan generation error ({plan_id}): {e}")
        await db.plans.update_one(
            {"id": plan_id},
            {"$set": {"status": "failed", "error": str(e)[:400]}},
        )


@api_router.post("/plans/generate")
async def generate_plan(
    payload: PlanGenerateRequest,
    background_tasks: BackgroundTasks,
    _: bool = Depends(require_admin),
):
    """
    ADMIN-ONLY: generate a plan directly without payment, for testing.
    Real customers go through /checkout/create-session -> Stripe -> /checkout/confirm,
    which is what actually charges them before a plan is generated.

    Returns IMMEDIATELY with a plan id and generates in the background. Holding
    the request open for the 5-6 minutes generation now takes meant the proxy
    cut the connection every time, so every successful run reported itself as a
    failure and had to be recovered by polling. The paid path has always worked
    this way; this brings the admin path into line.
    """
    plan_id = str(uuid.uuid4())
    await db.plans.insert_one({
        "id": plan_id,
        "status": "generating",
        "test_only": True,
        "answers": payload.answers,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    background_tasks.add_task(_run_admin_generation, plan_id, payload.answers)
    return {
        "id": plan_id,
        "status": "generating",
        "message": "Generating — poll /api/plans/{id}/status",
        "link": f"/app/u/{plan_id}",
    }


@api_router.get("/plans/{plan_id}/status")
async def plan_status(plan_id: str):
    """Where a background generation has got to."""
    doc = await db.plans.find_one({"id": plan_id}, {"_id": 0, "status": 1, "error": 1, "weeks": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="No plan with that ID")
    status = doc.get("status") or ("ready" if doc.get("weeks") else "generating")
    return {"id": plan_id, "status": status, "error": doc.get("error")}


@api_router.get("/plans/{plan_id}", response_model=Plan)
async def get_plan(plan_id: str):
    doc = await db.plans.find_one({"id": plan_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    return Plan(**doc)


@api_router.post("/admin/plans/manual")
async def create_manual_plan(payload: ManualPlanCreate, _: bool = Depends(require_admin)):
    """
    ADMIN-ONLY: save a hand-authored plan (same builder UI as the coach
    flow, no AI, no disclaimer needed since this never leaves your control)
    directly into the same `plans` collection AI-generated plans use — so it
    plays back through the exact same /app/u/{id} page with zero new
    rendering code needed. Wrapping the single authored week as the only
    entry in `weeks` means the existing week-cycling logic in the frontend
    always resolves to that same week, forever — i.e. no auto-progression,
    exactly as intended for manually-authored content.
    """
    plan_id = str(uuid.uuid4())
    plan_data = {
        "id": plan_id,
        "brand": f"{payload.client_name}'s App" if payload.client_name else "Your App",
        "tagline": "Your plan",
        "answers": {"name": payload.client_name, "email": payload.client_email, "notes": payload.notes},
        "structureType": payload.structureType,
        "weeks": [{
            "weekNumber": 1,
            "theme": "Your plan",
            "days": [d.model_dump() for d in payload.days],
        }],
        "nutrition": payload.nutrition.model_dump() if payload.nutrition else None,
        "recovery": payload.recovery.model_dump() if payload.recovery else None,
        "morningRoutine": [m.model_dump() for m in payload.morningRoutine],
        "manually_authored": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.plans.insert_one(plan_data)
    logger.info(f"Manual plan created (admin builder): {plan_id}")
    return {"id": plan_id, "link": f"/app/u/{plan_id}"}


# ===== Stripe checkout (real payment flow) =====
@api_router.post("/checkout/create-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(payload: CheckoutSessionRequest):
    """
    Customer-facing entry point. Stores the questionnaire answers against a
    pending order, creates a Stripe Checkout session for £4.99, and returns
    the hosted checkout URL for the frontend to redirect to. The plan itself
    is NOT generated here — that only happens after payment is confirmed,
    in /checkout/confirm, so nobody gets a plan without paying.
    """
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payments are not configured yet.")

    source_plan = None
    if payload.derived_from:
        if payload.answers or payload.manual_plan:
            raise HTTPException(
                status_code=400,
                detail="A follow-on block inherits its answers — don't send answers or manual_plan.",
            )
        source_plan = await db.plans.find_one({"id": payload.derived_from}, {"_id": 0})
        if not source_plan:
            raise HTTPException(status_code=404, detail="We couldn't find that plan.")
        if not (source_plan.get("answers") or {}).get("goal"):
            # Manually-authored plans have no questionnaire behind them, so
            # there is nothing to derive a new block from.
            raise HTTPException(
                status_code=400,
                detail="Follow-on blocks are only available for generated plans.",
            )
    elif bool(payload.answers) == bool(payload.manual_plan):
        raise HTTPException(status_code=400, detail="Provide exactly one of answers or manual_plan.")

    if source_plan:
        kind = "derived"
    elif payload.answers:
        kind = "ai"
    else:
        kind = "manual"

    product_name = {
        "ai": "Planlete — Personalised Training App",
        "manual": "Planlete — Your Own Plan, Built Your Way",
        "derived": "Planlete — Your Next Block",
    }[kind]

    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "kind": kind,
        "answers": payload.answers,
        "manual_plan": payload.manual_plan,
        "derived_from": payload.derived_from,
        "change_request": payload.change_request,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pending_orders.insert_one(order)

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "gbp",
                    "product_data": {"name": product_name},
                    "unit_amount": PLAN_PRICE_PENCE,
                },
                "quantity": 1,
            }],
            success_url=f"{FRONTEND_URL}/build/success?session_id={{CHECKOUT_SESSION_ID}}&order_id={order_id}",
            cancel_url=f"{FRONTEND_URL}/build?cancelled=1",
            metadata={"order_id": order_id},
        )
    except Exception as e:
        logger.error(f"Stripe session creation failed: {e}")
        raise HTTPException(status_code=500, detail="Could not start checkout. Please try again.")

    await db.pending_orders.update_one(
        {"id": order_id}, {"$set": {"stripe_session_id": session.id}}
    )

    return CheckoutSessionResponse(checkout_url=session.url, order_id=order_id)


async def process_paid_order(order_id: str, order: dict) -> None:
    """
    Runs after the response has already gone back to the browser.
    - kind == "ai": generates the plan via Claude (can take up to ~30s).
    - kind == "manual": the plan was already hand-authored in the builder —
      just wrap and save it, no AI call, no wait. Either way the customer
      gets an email once it's ready rather than watching a loading screen.
    """
    kind = order.get("kind", "ai")
    answers = order.get("answers") or {}
    manual_plan = order.get("manual_plan") or {}

    source_plan = None
    if kind == "derived":
        source_plan = await db.plans.find_one({"id": order.get("derived_from")}, {"_id": 0})
        if not source_plan:
            raise ValueError(f"Source plan {order.get('derived_from')} no longer exists.")
        # Inherit everything they told us originally, then layer the change on
        # top — they should never have to answer the questionnaire twice.
        answers = dict(source_plan.get("answers") or {})
        change = order.get("change_request") or {}
        for key in (
            "days", "equipment", "session", "match_day", "club_days", "bar_access",
            "facilities", "facility_access",
        ):
            if change.get(key):
                answers[key] = change[key]
        if change.get("detail"):
            answers["notes"] = ((answers.get("notes") or "") + "\n" + change["detail"]).strip()
        answers["_previous_plan"] = source_plan
        answers["_change_request"] = change

    email = (
        manual_plan.get("client_email") if kind == "manual" else answers.get("email")
    ) or None
    name = (
        manual_plan.get("client_name") if kind == "manual" else answers.get("name")
    ) or "there"

    try:
        if kind == "manual":
            plan_id = str(uuid.uuid4())
            plan_data = {
                "id": plan_id,
                "brand": f"{name}'s App" if name != "there" else "Your App",
                "tagline": "Your plan",
                "answers": {"name": name, "email": email, "notes": manual_plan.get("notes")},
                "structureType": manual_plan.get("structureType", "days"),
                "weeks": [{
                    "weekNumber": 1,
                    "theme": "Your plan",
                    "days": manual_plan.get("days", []),
                }],
                "nutrition": manual_plan.get("nutrition"),
                "recovery": manual_plan.get("recovery"),
                "morningRoutine": manual_plan.get("morningRoutine", []),
                "manually_authored": True,
                "order_id": order_id,
            }
        else:
            async def set_stage(stage: str) -> None:
                """
                Writes the live generation stage onto the order so the success
                page can show real progress. The customer has already paid at
                this point — a screen that visibly moves through stages is the
                difference between waiting and assuming it has crashed.
                """
                await db.pending_orders.update_one(
                    {"id": order_id},
                    {"$set": {"stage": stage, "stage_at": datetime.now(timezone.utc).isoformat()}},
                )

            await set_stage("reading")
            plan_data = await generate_plan_with_claude(answers, on_stage=set_stage)
            await set_stage("saving")

            plan_id = str(uuid.uuid4())
            plan_data["id"] = plan_id
            plan_data["order_id"] = order_id
            # Stored so a future block can be built from what they originally
            # told us, rather than making them fill the questionnaire in again.
            # The underscore-prefixed keys are prompt scaffolding only — storing
            # them would nest the whole previous plan inside this one, and again
            # inside the next, growing without limit.
            plan_data["answers"] = {
                k: v for k, v in answers.items() if not k.startswith("_")
            }
            if kind == "derived":
                plan_data["derived_from"] = order.get("derived_from")
                plan_data["change_request"] = order.get("change_request")

        # Correctable for a short window, then locked. Set here rather than at
        # payment time so a slow generation doesn't eat into it.
        plan_data["editable_until"] = (
            datetime.now(timezone.utc) + timedelta(hours=EDIT_WINDOW_HOURS)
        ).isoformat()

        await db.plans.insert_one(plan_data)

        await db.pending_orders.update_one(
            {"id": order_id},
            {"$set": {
                "status": "plan_created",
                "plan_id": plan_id,
                "paid_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        logger.info(f"Order {order_id} paid and plan {plan_id} ready (kind={kind})")

        if email:
            link = f"{FRONTEND_URL}/app/u/{plan_id}/save-instructions"
            send_email(
                to=email,
                subject="Your Planlete app is ready 🎉",
                html=f"""
                    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
                        <h2 style="color: #111;">Hey {name},</h2>
                        <p>Your training app is ready{' — a 4-week programme built around your goal' if kind == 'ai' else ', built exactly the way you put it together'}.</p>
                        <p style="margin: 24px 0;">
                            <a href="{link}" style="background: #D4FF00; color: #000; font-weight: bold;
                               text-decoration: none; padding: 14px 24px; display: inline-block;">
                               Open your app &amp; save it to your phone
                            </a>
                        </p>
                        <p style="color: #666; font-size: 13px;">
                            That link will show you exactly how to bookmark it on iPhone, Samsung,
                            or Android so it feels like a real app on your home screen. It's yours to
                            keep — no subscription, nothing to cancel.
                        </p>

                        <div style="border: 1px solid #e5e5e5; padding: 16px; margin: 28px 0;">
                            <p style="margin: 0 0 8px; font-weight: bold; font-size: 14px;">
                                Want something changed? You have {EDIT_WINDOW_HOURS} hours.
                            </p>
                            <p style="margin: 0 0 8px; color: #444; font-size: 13px; line-height: 1.5;">
                                If something in the plan doesn't fit — a day that clashes, an exercise you
                                can't do, equipment we've got wrong — open your app and use
                                <strong>Request a change</strong>. A real person reads every one.
                            </p>
                            <p style="margin: 0; color: #444; font-size: 13px; line-height: 1.5;">
                                Two things close that window: {EDIT_WINDOW_HOURS} hours passing, or you
                                logging your first session. Once you've started training the plan locks,
                                even if you're still inside the {EDIT_WINDOW_HOURS} hours — so if
                                anything looks off, tell us <em>before</em> your first session rather than after.
                            </p>
                        </div>

                        <p style="color: #888; font-size: 12px;">
                            Have a proper read through it first. That's the best five minutes you can spend
                            on this.
                        </p>
                    </div>
                """
            )
    except Exception as e:
        logger.error(f"Plan generation after payment failed for order {order_id}: {e}")
        await db.pending_orders.update_one(
            {"id": order_id},
            {"$set": {"status": "paid_generation_failed", "error": str(e)}}
        )
        notify_admin(
            "Paid order failed to generate",
            f"<p><strong>They have been charged and have no plan.</strong></p>"
            f"<p>Order: {order_id}<br>Kind: {kind}<br>Customer: {email or 'unknown'}</p>"
            f"<p>Error:<br><code>{str(e)[:800]}</code></p>"
            f'<p><a href="{FRONTEND_URL}/admin/orders">Open admin orders</a></p>',
        )
        if email:
            send_email(
                to=email,
                subject="A quick update on your Planlete app",
                html=f"""
                    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
                        <p>Hey {name},</p>
                        <p>We hit a snag building your training app. Our team's already been notified
                           and is on it — you'll hear from us again shortly with your link.</p>
                        <p>Sorry for the delay, and thanks for your patience.</p>
                    </div>
                """
            )


@api_router.get("/checkout/confirm")
async def confirm_checkout(session_id: str, order_id: str, background_tasks: BackgroundTasks):
    """
    Called by the success page after Stripe redirects back. Verifies the
    session was actually paid (never trusts the redirect alone), then hands
    plan generation off to a background task and returns immediately — the
    customer doesn't wait on a spinner, they get an email once it's ready.
    Safe to call more than once (e.g. on refresh).
    """
    order = await db.pending_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.get("status") == "plan_created":
        return {"status": "plan_created", "plan_id": order.get("plan_id")}

    # "processing" only counts as genuinely in-flight for a short window —
    # if a deploy happened to kill the server mid-background-task, the order
    # would otherwise be stuck saying "processing" forever with nothing
    # actually running. Treat anything older than 3 minutes as dead and retry.
    if order.get("status") == "processing":
        started_at_str = order.get("processing_started_at")
        if started_at_str:
            started_at = datetime.fromisoformat(started_at_str)
            elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
            if elapsed < 180:
                return {
                    "status": "processing",
                    "stage": order.get("stage", "reading"),
                    "elapsed": int(elapsed),
                }
        # else: no timestamp recorded (shouldn't happen) or stale — fall through and retry

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        logger.error(f"Stripe session retrieve failed: {e}")
        raise HTTPException(status_code=400, detail="Could not verify payment.")

    if session.payment_status != "paid":
        raise HTTPException(status_code=402, detail="Payment has not completed yet.")

    await db.pending_orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "processing",
            "processing_started_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    background_tasks.add_task(process_paid_order, order_id, order)

    return {"status": "processing", "stage": "reading", "elapsed": 0}


@api_router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Safety-net audit trail: marks an order as 'paid' in the database even if
    the customer never makes it back to the success page. Does NOT generate
    the plan itself (that only happens via /checkout/confirm, to avoid two
    code paths racing to generate the same plan twice) — this exists so a
    payment is never silently invisible to you even if the redirect fails.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        if STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        else:
            event = json.loads(payload)
    except Exception as e:
        logger.error(f"Stripe webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook payload")

    event_type = event["type"] if isinstance(event, dict) else event.type
    data_object = event["data"]["object"] if isinstance(event, dict) else event.data.object

    if event_type == "checkout.session.completed":
        metadata = data_object.get("metadata", {}) if isinstance(data_object, dict) else (data_object.metadata or {})
        kind = metadata.get("kind")

        if kind == "client_plan":
            # Client-pays-per-plan: mark it paid here too as a safety net,
            # in case they never make it back to the plan page after paying.
            client_plan_id = metadata.get("client_plan_id")
            if client_plan_id:
                plan = await db.client_plans.find_one({"id": client_plan_id})
                if plan and plan.get("payment_status") == "pending_payment":
                    await db.client_plans.update_one(
                        {"id": client_plan_id},
                        {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    logger.info(f"Stripe webhook: client plan {client_plan_id} confirmed paid")

        elif metadata.get("coach_id") and (data_object.get("mode") == "subscription" if isinstance(data_object, dict) else data_object.mode == "subscription"):
            # Coach subscription checkout completed — capture the Stripe
            # customer/subscription IDs for future billing management.
            coach_id = metadata.get("coach_id")
            customer_id = data_object.get("customer") if isinstance(data_object, dict) else data_object.customer
            subscription_id = data_object.get("subscription") if isinstance(data_object, dict) else data_object.subscription
            await db.coaches.update_one(
                {"id": coach_id},
                {"$set": {
                    "subscription_status": "active",
                    "stripe_customer_id": customer_id,
                    "stripe_subscription_id": subscription_id,
                }}
            )
            logger.info(f"Stripe webhook: coach {coach_id} subscription activated")

        else:
            # Regular consumer order (the original, pre-coach-system flow)
            order_id = metadata.get("order_id")
            if order_id:
                order = await db.pending_orders.find_one({"id": order_id})
                if order and order.get("status") == "pending":
                    await db.pending_orders.update_one(
                        {"id": order_id},
                        {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    logger.info(f"Stripe webhook: order {order_id} confirmed paid")

                    # Generation normally happens on the success page. If the
                    # customer closed the tab, lost signal, or the redirect
                    # failed, that never fires — and they have paid for
                    # nothing. Kick it off here instead. The status guard
                    # above means only one path can ever claim an order, so
                    # this cannot double-generate.
                    order["status"] = "paid"
                    background_tasks.add_task(process_paid_order, order_id, order)
                    notify_admin(
                        "Order generated via webhook fallback",
                        f"<p>Order {order_id} was paid but the customer never reached the "
                        f"success page, so generation was started from the webhook instead.</p>"
                        f"<p>Worth a glance — if this happens often, the redirect is broken.</p>",
                    )

    elif event_type in ("customer.subscription.deleted", "customer.subscription.updated"):
        subscription_id = data_object.get("id") if isinstance(data_object, dict) else data_object.id
        status = data_object.get("status") if isinstance(data_object, dict) else data_object.status
        coach = await db.coaches.find_one({"stripe_subscription_id": subscription_id})
        if coach:
            new_status = "active" if status in ("active", "trialing") else "cancelled"
            await db.coaches.update_one(
                {"id": coach["id"]},
                {"$set": {"subscription_status": new_status}}
            )
            logger.info(f"Stripe webhook: coach {coach['id']} subscription -> {new_status}")

    return {"received": True}


@api_router.get("/admin/orders")
async def admin_list_orders(_: bool = Depends(require_admin)):
    """Admin visibility into payment/order status — mainly to spot the rare
    'paid but plan generation failed' case so it can be resolved manually."""
    docs = await db.pending_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


# ===== Weight logging (simple current-value log, backend-stored) =====
@api_router.post("/logs", response_model=WeightLog)
async def create_weight_log(payload: WeightLogCreate):
    log = WeightLog(**payload.model_dump())
    await db.weight_logs.insert_one(log.model_dump())

    # The block clock starts when they start TRAINING, not when the plan was
    # generated. Previously a customer who bought on Monday and didn't open the
    # app for a week was shown week 2, having done nothing — and someone who
    # left it a month came back to a block that had already finished. Only the
    # first log sets this; later ones leave it alone.
    await db.plans.update_one(
        {"id": log.plan_id, "started_at": {"$in": [None, ""]}},
        {"$set": {"started_at": datetime.now(timezone.utc).isoformat()}},
    )
    return log


@api_router.post("/plans/{plan_id}/set-current-week")
async def set_current_week(plan_id: str, payload: dict):
    """
    Move somebody to the week they say they're on.

    Real training isn't a calendar. People miss a week, repeat one, or come back
    after a fortnight and want to pick up where they left off rather than where
    the clock says they should be. Rather than pause logic and "am I paused"
    state, this just moves the single timestamp everything is derived from:
    to be on week N from today, started_at becomes today minus (N-1) weeks.
    """
    week = payload.get("week")
    if not isinstance(week, int) or week < 1 or week > 52:
        raise HTTPException(status_code=400, detail="week must be between 1 and 52")

    plan = await db.plans.find_one({"id": plan_id}, {"_id": 0, "id": 1})
    if not plan:
        raise HTTPException(status_code=404, detail="No plan with that ID")

    started = datetime.now(timezone.utc) - timedelta(weeks=week - 1)
    await db.plans.update_one(
        {"id": plan_id}, {"$set": {"started_at": started.isoformat()}}
    )
    logger.info(f"Plan {plan_id} moved to week {week}")
    return {"ok": True, "week": week, "started_at": started.isoformat()}


@api_router.get("/logs/{plan_id}", response_model=List[WeightLog])
async def get_weight_logs(plan_id: str):
    docs = await db.weight_logs.find({"plan_id": plan_id}, {"_id": 0}).sort("logged_at", -1).to_list(2000)
    return [WeightLog(**d) for d in docs]


# ===== Support requests (shown on error pages so nobody's left stressed
# about payment taken with no way to reach anyone) =====
@api_router.post("/support/contact", response_model=SupportRequest)
async def create_support_request(payload: SupportRequestCreate):
    req = SupportRequest(**payload.model_dump())
    await db.support_requests.insert_one(req.model_dump())
    logger.info(f"Support request received from {req.email} (order: {req.order_id})")
    return req


# ── Plan recovery ─────────────────────────────────────────────────────────
# The emailed link is the only route into something the customer paid for.
# Lose the email and the plan is gone. This re-sends every plan attached to
# an address — and only ever to that address, so knowing someone's email
# grants nothing you couldn't already get by asking them.
@api_router.post("/plans/recover")
async def recover_plans(payload: PlanRecoverRequest):
    email = payload.email.strip().lower()
    docs = await db.plans.find(
        {"answers.email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
        {"_id": 0, "id": 1, "brand": 1, "created_at": 1, "answers.goal": 1},
    ).sort("created_at", -1).to_list(50)

    if docs:
        rows = "".join(
            f'<li style="margin-bottom:10px;">'
            f'<a href="{FRONTEND_URL}/app/u/{d["id"]}">'
            f'{(d.get("answers") or {}).get("goal") or d.get("brand") or "Your plan"}</a>'
            f'<br><span style="color:#666;font-size:12px;">'
            f'built {(d.get("created_at") or "")[:10]}</span></li>'
            for d in docs
        )
        send_email(
            to=email,
            subject="Your Planlete plans",
            html=(
                "<div style=\"font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;\">"
                f"<p>Here {'is the plan' if len(docs) == 1 else 'are the plans'} we have "
                "for this email address:</p>"
                f"<ul style=\"padding-left:18px;\">{rows}</ul>"
                "<p style=\"color:#666;font-size:13px;\">Bookmark the link or save it to your "
                "home screen so you don't lose it again.</p></div>"
            ),
        )

    # Always the same response, whether or not anything matched — otherwise
    # this becomes a way to test which email addresses are customers.
    return {
        "ok": True,
        "message": "If we've got a plan for that email, it's on its way to your inbox.",
    }


@api_router.get("/admin/funnel")
async def admin_funnel(days: int = 30, _: bool = Depends(require_admin)):
    """
    Funnel over the existing analytics_events collection. Counts distinct
    sessions per step rather than raw events — one person refreshing the
    builder five times is one person, not five.
    """
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    pipeline = [
        {"$match": {"timestamp": {"$gte": since}}},
        {"$group": {"_id": {"event": "$event", "session": "$session_id"}}},
        {"$group": {"_id": "$_id.event", "sessions": {"$sum": 1}}},
    ]
    rows = await db.analytics_events.aggregate(pipeline).to_list(200)
    counts = {r["_id"]: r["sessions"] for r in rows}

    order = [
        "page_view", "builder_started", "builder_completed",
        "checkout_opened", "payment_succeeded", "plan_opened",
    ]
    funnel, previous = [], None
    for step in order:
        n = counts.get(step, 0)
        funnel.append({
            "step": step,
            "count": n,
            "conversion_from_previous": round(100 * n / previous, 1) if previous else None,
        })
        if n:
            previous = n
    return {"days": days, "funnel": funnel, "raw": counts}


@api_router.get("/config/pricing")
async def get_pricing():
    """
    Single source of truth for prices, read by the frontend at load. Public
    by design — these are printed on the site anyway.
    """
    return {
        "plan_pence": PLAN_PRICE_PENCE,
        "plan_standard_pence": PLAN_STANDARD_PENCE,
        "coach_client_pence": COACH_CLIENT_PLAN_PENCE,
        "coach_client_standard_pence": COACH_CLIENT_STANDARD_PENCE,
        "currency": "GBP",
    }


@api_router.get("/admin/diagnostics")
async def admin_diagnostics(_: bool = Depends(require_admin)):
    """
    Config sanity check. Everything here fails silently in production by
    design, which is exactly why it needs somewhere to be looked at.
    """
    return {
        "stripe_configured": bool(STRIPE_SECRET_KEY),
        "stripe_webhook_secret_set": bool(STRIPE_WEBHOOK_SECRET),
        "resend_configured": bool(RESEND_API_KEY),
        "resend_from": RESEND_FROM,
        "admin_alert_email_set": bool(ADMIN_ALERT_EMAIL),
        "anthropic_configured": bool(os.environ.get("ANTHROPIC_API_KEY") or EMERGENT_KEY),
        "frontend_url": FRONTEND_URL,
        "edit_window_hours": EDIT_WINDOW_HOURS,
        "pricing": {
            "plan": f"£{PLAN_PRICE_PENCE / 100:.2f}",
            "plan_standard": f"£{PLAN_STANDARD_PENCE / 100:.2f}",
            "coach_client_plan": f"£{COACH_CLIENT_PLAN_PENCE / 100:.2f}",
            "coach_client_standard": f"£{COACH_CLIENT_STANDARD_PENCE / 100:.2f}",
        },
        "email_dns_reminder": (
            "Resend will only deliver reliably once SPF, DKIM and DMARC are "
            "verified for the sending domain. Check the Domains page in Resend "
            "— an unverified domain sends straight to spam, which looks "
            "identical to no email at all."
        ),
    }


@api_router.get("/admin/support", response_model=List[SupportRequest])
async def admin_list_support_requests(_: bool = Depends(require_admin)):
    docs = await db.support_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [SupportRequest(**d) for d in docs]


# ── Grace window ──────────────────────────────────────────────────────────
# A plan is correctable for a short period after it is generated, then locks.
# The window exists so somebody's typo or a genuinely poor generation does not
# force a refund; the lock exists so one payment does not become an unlimited
# plan-rewriting subscription. It closes early once they start training,
# because at that point they are not fixing a mistake, they are redesigning
# the programme — and that is what a follow-on block is for.
EDIT_WINDOW_HOURS = 48


async def _edit_status(plan: dict) -> dict:
    until_raw = plan.get("editable_until")
    if not until_raw:
        # Plans created before this feature existed never had a window.
        return {"editable": False, "until": None, "reason": "not_available"}

    try:
        until = datetime.fromisoformat(until_raw)
    except ValueError:
        return {"editable": False, "until": None, "reason": "not_available"}

    logged = await db.weight_logs.find_one({"plan_id": plan.get("id")})
    if logged:
        return {"editable": False, "until": until_raw, "reason": "training_started"}

    if datetime.now(timezone.utc) > until:
        return {"editable": False, "until": until_raw, "reason": "window_expired"}

    return {"editable": True, "until": until_raw, "reason": None}


@api_router.get("/plans/{plan_id}/edit-status")
async def get_plan_edit_status(plan_id: str):
    plan = await db.plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return await _edit_status(plan)


@api_router.post("/plans/{plan_id}/tweak-request", response_model=SupportRequest)
async def create_tweak_request(plan_id: str, payload: TweakRequestCreate):
    """
    In-window correction request. Deliberately routed to a human rather than
    regenerating automatically: a regeneration would produce a different plan
    rather than fixing the specific thing that is wrong, and every one of these
    is evidence about where generation is failing.
    """
    plan = await db.plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    status = await _edit_status(plan)
    if not status["editable"]:
        raise HTTPException(
            status_code=403,
            detail=(
                "This plan is locked. You can build a follow-on block from it instead."
                if status["reason"] != "not_available"
                else "Corrections aren't available for this plan — please contact support."
            ),
        )

    email = payload.email or (plan.get("answers") or {}).get("email")
    if not email:
        raise HTTPException(status_code=400, detail="We need an email to reply to.")

    req = SupportRequest(
        email=email,
        message=payload.message,
        plan_id=plan_id,
        order_id=plan.get("order_id"),
        kind="tweak",
    )
    await db.support_requests.insert_one(req.model_dump())
    logger.info(f"Tweak request for plan {plan_id} from {email}")

    # Time-limited by design, so this one can't wait for you to check the panel.
    notify_admin(
        "Correction requested — 48h window open",
        f"<p>Plan: {plan_id}<br>From: {email}</p>"
        f"<p><strong>What they said:</strong><br>{req.message}</p>"
        f'<p><a href="{FRONTEND_URL}/app/u/{plan_id}">Open their plan</a> · '
        f'<a href="{FRONTEND_URL}/admin/support">Admin support</a></p>',
    )

    send_email(
        to=email,
        subject="We've got your correction request",
        html=(
            "<p>Thanks — we've received your request and we'll look at your plan "
            "personally.</p><p>Your plan stays exactly where it is in the meantime: "
            f'<a href="{FRONTEND_URL}/app/u/{plan_id}">open it here</a>.</p>'
        ),
    )
    return req


# ── Finish-later drafts ───────────────────────────────────────────────────
# localStorage covers the closed-tab case, but not switching device or
# clearing the browser. This stores a draft server-side against a one-time
# token and emails the link back.
@api_router.post("/drafts")
async def save_plan_draft(payload: PlanDraftCreate):
    token = uuid.uuid4().hex
    await db.plan_drafts.insert_one({
        "token": token,
        "email": payload.email,
        "mode": payload.mode,
        "draft": payload.draft,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    link = f"{FRONTEND_URL}/build/resume/{token}"
    send_email(
        to=payload.email,
        subject="Your unfinished Planlete plan",
        html=(
            "<p>Here's the link back to the plan you started building:</p>"
            f'<p><a href="{link}">Pick up where you left off</a></p>'
            "<p>The link works for 30 days. Nothing has been charged — you only "
            "pay when you finish and check out.</p>"
        ),
    )
    return {"ok": True}


@api_router.get("/drafts/{token}")
async def get_plan_draft(token: str):
    doc = await db.plan_drafts.find_one({"token": token}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="That link has expired or doesn't exist.")
    age_days = (
        datetime.now(timezone.utc) - datetime.fromisoformat(doc["created_at"])
    ).days
    if age_days > 30:
        raise HTTPException(status_code=404, detail="That link has expired.")
    return {"mode": doc.get("mode", "self"), "draft": doc.get("draft", {})}


@api_router.patch("/admin/support/{request_id}/resolve")
async def admin_resolve_support_request(request_id: str, _: bool = Depends(require_admin)):
    result = await db.support_requests.update_one({"id": request_id}, {"$set": {"resolved": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Support request not found")
    return {"ok": True}


# ===== Admin =====
@api_router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLoginRequest):
    if not ADMIN_PASSWORD or not secrets.compare_digest(payload.password, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Invalid password")
    return AdminLoginResponse(token=ADMIN_TOKEN)


@api_router.get("/admin/verify")
async def admin_verify(_: bool = Depends(require_admin)):
    return {"ok": True}


# ===== Sample plan leads (email capture for sample downloads) =====
@api_router.post("/leads/sample", response_model=SampleLead)
async def capture_sample_lead(payload: SampleLeadCreate):
    lead = SampleLead(email=payload.email, plan_type=payload.plan_type)
    await db.sample_leads.insert_one(lead.model_dump())
    return lead


@api_router.get("/admin/leads", response_model=List[SampleLead])
async def admin_list_leads(_: bool = Depends(require_admin)):
    docs = await db.sample_leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [SampleLead(**d) for d in docs]


# ===== Content (text) =====
@api_router.get("/content")
async def list_content():
    docs = await db.content.find({}, {"_id": 0}).to_list(500)
    return {d["key"]: d["value"] for d in docs}


@api_router.post("/admin/content")
async def admin_set_content(payload: ContentSetRequest, _: bool = Depends(require_admin)):
    await db.content.update_one(
        {"key": payload.key},
        {"$set": {
            "key": payload.key,
            "value": payload.value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True, "key": payload.key}


@api_router.delete("/admin/content/{key}")
async def admin_reset_content(key: str, _: bool = Depends(require_admin)):
    await db.content.delete_one({"key": key})
    return {"ok": True}


# ===== Images =====
@api_router.get("/images")
async def list_images():
    docs = await db.images.find({}, {"_id": 0}).to_list(500)
    return {d["key"]: d["url"] for d in docs}


@api_router.post("/admin/images/upload", response_model=ImageRecord)
async def admin_upload_image(
    key: str = Query(...),
    file: UploadFile = File(...),
    _: bool = Depends(require_admin),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads allowed")
    ext = (file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "bin").lower()
    path = f"{APP_NAME}/images/{key}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Max 8MB")
    try:
        result = put_object(path, data, file.content_type)
    except Exception as e:
        logger.exception("Storage upload failed")
        raise HTTPException(status_code=500, detail=f"Storage failed: {e}")
    public_url = f"/api/files/{result['path']}"
    rec = ImageRecord(key=key, url=public_url, storage_path=result["path"])
    await db.images.update_one({"key": key}, {"$set": rec.model_dump()}, upsert=True)
    return rec


@api_router.post("/admin/images/url", response_model=ImageRecord)
async def admin_set_image_url(key: str = Query(...), url: str = Query(...), _: bool = Depends(require_admin)):
    rec = ImageRecord(key=key, url=url, storage_path=None)
    await db.images.update_one({"key": key}, {"$set": rec.model_dump()}, upsert=True)
    return rec


@api_router.delete("/admin/images/{key}")
async def admin_reset_image(key: str, _: bool = Depends(require_admin)):
    await db.images.delete_one({"key": key})
    return {"ok": True}


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        data, content_type = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    return Response(content=data, media_type=content_type,
                    headers={"Cache-Control": "public, max-age=31536000, immutable"})


# ===== Coach Auth & Brand =====
async def _coach_to_public(c: dict) -> CoachPublic:
    c.pop("_id", None)
    c.pop("password_hash", None)
    return CoachPublic(**c)


@api_router.post("/coach/signup")
async def coach_signup(payload: CoachSignup, response: Response):
    email = payload.email.lower()
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if await db.coaches.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    base_slug = slugify(payload.brand_name)
    slug = base_slug
    i = 1
    while await db.coaches.find_one({"slug": slug}):
        i += 1
        slug = f"{base_slug}-{i}"
    coach_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(payload.password),
        "brand_name": payload.brand_name.strip(),
        "slug": slug,
        "logo_url": None,
        "primary_color": "#D4FF00",
        "secondary_color": "#050505",
        "subscription_status": "none",
        "stripe_customer_id": None,
        "stripe_subscription_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.coaches.insert_one(coach_doc)
    token = create_coach_token(coach_doc["id"], email)
    response.set_cookie("coach_token", token, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 30, path="/")
    public = await _coach_to_public({**coach_doc})
    return {"coach": public, "token": token}


@api_router.post("/coach/login")
async def coach_login(payload: CoachLogin, response: Response):
    email = payload.email.lower()
    coach = await db.coaches.find_one({"email": email})
    if not coach or not verify_password(payload.password, coach.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_coach_token(coach["id"], email)
    response.set_cookie("coach_token", token, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 30, path="/")
    public = await _coach_to_public({**coach})
    return {"coach": public, "token": token}


@api_router.post("/coach/logout")
async def coach_logout(response: Response):
    response.delete_cookie("coach_token", path="/")
    return {"ok": True}


@api_router.get("/coach/me", response_model=CoachPublic)
async def coach_me(coach: dict = Depends(get_current_coach)):
    return CoachPublic(**coach)


@api_router.patch("/coach/me", response_model=CoachPublic)
async def coach_update(payload: CoachBrandUpdate, coach: dict = Depends(get_current_coach)):
    updates: Dict[str, Any] = {}
    if payload.brand_name and payload.brand_name.strip():
        updates["brand_name"] = payload.brand_name.strip()
    if payload.logo_url is not None:
        updates["logo_url"] = payload.logo_url
    if payload.primary_color:
        updates["primary_color"] = payload.primary_color
    if payload.secondary_color:
        updates["secondary_color"] = payload.secondary_color
    if updates:
        await db.coaches.update_one({"id": coach["id"]}, {"$set": updates})
    new_doc = await db.coaches.find_one({"id": coach["id"]}, {"_id": 0, "password_hash": 0})
    return CoachPublic(**new_doc)


@api_router.post("/coach/logo")
async def coach_upload_logo(file: UploadFile = File(...), coach: dict = Depends(get_current_coach)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads allowed")
    ext = (file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "bin").lower()
    path = f"{APP_NAME}/coaches/{coach['id']}/logo-{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 4 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Max 4MB")
    result = put_object(path, data, file.content_type)
    logo_url = f"/api/files/{result['path']}"
    await db.coaches.update_one({"id": coach["id"]}, {"$set": {"logo_url": logo_url}})
    return {"logo_url": logo_url}


VALID_TEMPLATES = {"athlete", "longevity", "football", "sprinter"}


@api_router.post("/coach/clients", response_model=ClientPlanPublic)
async def coach_create_client(payload: ClientPlanCreate, coach: dict = Depends(get_current_coach)):
    # The disclaimer is the whole legal foundation of this feature: it puts
    # authorship and professional responsibility for the content on the
    # coach/physio, not on Planlete or any AI. Refuse to save anything
    # without it, regardless of how the request was made.
    if not payload.disclaimer_accepted:
        raise HTTPException(
            status_code=400,
            detail="You must confirm you're qualified to give this advice and that this content is entirely your own before it can be saved."
        )

    if payload.template and payload.template not in VALID_TEMPLATES:
        raise HTTPException(status_code=400, detail="Invalid template")

    base_slug = slugify(payload.client_name)
    slug = base_slug
    i = 1
    while await db.client_plans.find_one({"coach_id": coach["id"], "slug": slug}):
        i += 1
        slug = f"{base_slug}-{i}"

    # If the coach has an active subscription, their clients' plans are
    # already covered — no separate charge. Otherwise this client will need
    # to pay individually before the plan content is unlocked for them.
    payment_status = "included" if coach.get("subscription_status") == "active" else "pending_payment"

    doc = {
        "id": str(uuid.uuid4()),
        "coach_id": coach["id"],
        "client_name": payload.client_name.strip(),
        "client_email": payload.client_email,
        "template": payload.template,
        "notes": payload.notes,
        "slug": slug,
        "structureType": payload.structureType,
        "days": [d.model_dump() for d in payload.days],
        "nutrition": payload.nutrition.model_dump() if payload.nutrition else None,
        "recovery": payload.recovery.model_dump() if payload.recovery else None,
        "morningRoutine": [m.model_dump() for m in payload.morningRoutine],
        "allow_logging": payload.allow_logging,
        "payment_status": payment_status,
        "disclaimer_accepted": True,
        "disclaimer_accepted_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.client_plans.insert_one(doc)
    return ClientPlanPublic(**{k: v for k, v in doc.items() if k != "_id"})


@api_router.patch("/coach/clients/{client_id}", response_model=ClientPlanPublic)
async def coach_update_client(client_id: str, payload: ClientPlanCreate, coach: dict = Depends(get_current_coach)):
    """Lets a coach revise a plan later — progression for manually-authored
    plans is the professional's job, done by editing and saving again."""
    if not payload.disclaimer_accepted:
        raise HTTPException(
            status_code=400,
            detail="You must confirm you're qualified to give this advice and that this content is entirely your own before it can be saved."
        )
    existing = await db.client_plans.find_one({"id": client_id, "coach_id": coach["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Client plan not found")

    updates = {
        "client_name": payload.client_name.strip(),
        "client_email": payload.client_email,
        "notes": payload.notes,
        "structureType": payload.structureType,
        "days": [d.model_dump() for d in payload.days],
        "nutrition": payload.nutrition.model_dump() if payload.nutrition else None,
        "recovery": payload.recovery.model_dump() if payload.recovery else None,
        "morningRoutine": [m.model_dump() for m in payload.morningRoutine],
        "allow_logging": payload.allow_logging,
    }
    await db.client_plans.update_one({"id": client_id}, {"$set": updates})
    new_doc = await db.client_plans.find_one({"id": client_id}, {"_id": 0})
    return ClientPlanPublic(**new_doc)


@api_router.get("/coach/clients/{client_id}", response_model=ClientPlanPublic)
async def coach_get_client(client_id: str, coach: dict = Depends(get_current_coach)):
    doc = await db.client_plans.find_one({"id": client_id, "coach_id": coach["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Client plan not found")
    return ClientPlanPublic(**doc)


@api_router.get("/coach/clients", response_model=List[ClientPlanPublic])
async def coach_list_clients(coach: dict = Depends(get_current_coach)):
    docs = await db.client_plans.find({"coach_id": coach["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ClientPlanPublic(**d) for d in docs]


@api_router.delete("/coach/clients/{client_id}")
async def coach_delete_client(client_id: str, coach: dict = Depends(get_current_coach)):
    res = await db.client_plans.delete_one({"id": client_id, "coach_id": coach["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ===== Client-pays checkout (per-plan, for coaches without a subscription) =====
@api_router.post("/coach/clients/{client_id}/checkout/create-session")
async def create_client_plan_checkout(client_id: str):
    """Public endpoint — the CLIENT hits this from their plan page to pay
    and unlock it, not the coach. No auth required, but the client_id has to
    exist and actually be pending payment."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payments are not configured yet.")

    client_plan = await db.client_plans.find_one({"id": client_id}, {"_id": 0})
    if not client_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if client_plan.get("payment_status") == "paid" or client_plan.get("payment_status") == "included":
        raise HTTPException(status_code=400, detail="This plan is already unlocked.")

    coach = await db.coaches.find_one({"id": client_plan["coach_id"]}, {"_id": 0})
    coach_slug = coach["slug"] if coach else ""
    client_slug = client_plan["slug"]

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "gbp",
                    "product_data": {"name": f"Training plan — {coach.get('brand_name', 'Coach') if coach else 'Coach'}"},
                    "unit_amount": COACH_CLIENT_PLAN_PENCE,
                },
                "quantity": 1,
            }],
            success_url=f"{FRONTEND_URL}/c/{coach_slug}/{client_slug}?paid_session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/c/{coach_slug}/{client_slug}?cancelled=1",
            metadata={"client_plan_id": client_id, "kind": "client_plan"},
        )
    except Exception as e:
        logger.error(f"Client plan checkout creation failed: {e}")
        raise HTTPException(status_code=500, detail="Could not start checkout. Please try again.")

    return {"checkout_url": session.url}


@api_router.get("/coach/clients/{client_id}/checkout/confirm")
async def confirm_client_plan_checkout(client_id: str, session_id: str):
    """Called from the client's plan page after Stripe redirects back."""
    client_plan = await db.client_plans.find_one({"id": client_id}, {"_id": 0})
    if not client_plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if client_plan.get("payment_status") in ("paid", "included"):
        return {"payment_status": client_plan["payment_status"]}

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        logger.error(f"Stripe session retrieve failed (client plan): {e}")
        raise HTTPException(status_code=400, detail="Could not verify payment.")

    if session.payment_status != "paid":
        raise HTTPException(status_code=402, detail="Payment has not completed yet.")

    await db.client_plans.update_one(
        {"id": client_id},
        {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"payment_status": "paid"}


# ===== Coach subscription (B2B — unlimited clients while active) =====
@api_router.post("/coach/subscribe/create-session")
async def create_coach_subscription_session(coach: dict = Depends(get_current_coach)):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payments are not configured yet.")
    if not COACH_SUBSCRIPTION_PRICE_ID:
        raise HTTPException(status_code=500, detail="Subscription pricing is not configured yet.")

    if coach.get("subscription_status") == "active":
        raise HTTPException(status_code=400, detail="You already have an active subscription.")

    try:
        session_kwargs = {
            "mode": "subscription",
            "payment_method_types": ["card"],
            "line_items": [{"price": COACH_SUBSCRIPTION_PRICE_ID, "quantity": 1}],
            "success_url": f"{FRONTEND_URL}/coach/dashboard?subscribed=1",
            "cancel_url": f"{FRONTEND_URL}/coach/dashboard?subscribe_cancelled=1",
            "metadata": {"coach_id": coach["id"]},
            "subscription_data": {"metadata": {"coach_id": coach["id"]}},
        }
        if coach.get("stripe_customer_id"):
            session_kwargs["customer"] = coach["stripe_customer_id"]
        else:
            session_kwargs["customer_email"] = coach["email"]

        session = stripe.checkout.Session.create(**session_kwargs)
    except Exception as e:
        logger.error(f"Coach subscription session creation failed: {e}")
        raise HTTPException(status_code=500, detail="Could not start checkout. Please try again.")

    return {"checkout_url": session.url}


# ===== Public branded plan =====
@api_router.get("/c/{coach_slug}/{client_slug}")
async def public_branded_plan(coach_slug: str, client_slug: str):
    coach = await db.coaches.find_one({"slug": coach_slug}, {"_id": 0, "password_hash": 0})
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")
    client_plan = await db.client_plans.find_one(
        {"coach_id": coach["id"], "slug": client_slug}, {"_id": 0}
    )
    if not client_plan:
        raise HTTPException(status_code=404, detail="Client plan not found")

    unlocked = client_plan.get("payment_status") in ("paid", "included")

    response = {
        "coach": {
            "brand_name": coach["brand_name"],
            "slug": coach["slug"],
            "logo_url": coach.get("logo_url"),
            "primary_color": coach.get("primary_color", "#D4FF00"),
            "secondary_color": coach.get("secondary_color", "#050505"),
        },
        "client": {
            "id": client_plan["id"],
            "client_name": client_plan["client_name"],
            "template": client_plan.get("template"),
            "notes": client_plan.get("notes"),
            "slug": client_plan["slug"],
            "payment_status": client_plan.get("payment_status", "included"),
        },
    }

    if unlocked:
        response["client"]["structureType"] = client_plan.get("structureType", "days")
        response["client"]["days"] = client_plan.get("days", [])
        response["client"]["nutrition"] = client_plan.get("nutrition")
        response["client"]["recovery"] = client_plan.get("recovery")
        response["client"]["morningRoutine"] = client_plan.get("morningRoutine", [])
        response["client"]["allow_logging"] = client_plan.get("allow_logging", True)

    return response


# ───────────────────────────────────────────────────────────────────────────────
# Analytics
# ───────────────────────────────────────────────────────────────────────────────

class AnalyticsEvent(BaseModel):
    event: str
    session_id: str
    path: str
    timestamp: str
    metadata: dict = {}

class SamplePlanSlide(BaseModel):
    image_key: str
    image_url: Optional[str] = None
    caption: str

class SamplePlan(BaseModel):
    plan_type: str
    title: str
    description: str
    # Free text so it suits any sample — "Male · 25-34 · 4 days · full gym" for
    # a generated one, or a physio's own framing for the rehab example.
    profile: Optional[str] = None
    disclaimer: str = "This is a scaled back version only to be used as a sample"
    bullets: List[str] = []
    slides: List[SamplePlanSlide] = []
    sample_link: Optional[str] = None
    updated_at: Optional[str] = None

@api_router.post("/analytics/track")
async def track_analytics(payload: AnalyticsEvent):
    """Track user events for analytics (page views, build flow, checkout, etc)"""
    try:
        event_doc = {
            "event": payload.event,
            "session_id": payload.session_id,
            "path": payload.path,
            "timestamp": payload.timestamp,
            "metadata": payload.metadata,
            "created_at": datetime.utcnow(),
        }
        await db.analytics_events.insert_one(event_doc)
        return {"status": "tracked"}
    except Exception as e:
        logger.error(f"Analytics track error: {e}")
        # Don't fail the request — analytics errors should never break the app
        return {"status": "error"}


# ───────────────────────────────────────────────────────────────────────────────
# Sample Plans
# ───────────────────────────────────────────────────────────────────────────────

@api_router.get("/admin/sample-plans/{plan_type}")
async def admin_get_sample_plan(plan_type: str, _: bool = Depends(require_admin)):
    """Get sample plan configuration"""
    doc = await db.sample_plans.find_one({"plan_type": plan_type})
    if not doc:
        raise HTTPException(status_code=404, detail="Sample plan not found")
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/sample-plans/{plan_type}")
async def admin_update_sample_plan(
    plan_type: str,
    payload: SamplePlan,
    _: bool = Depends(require_admin)
):
    """Update sample plan configuration"""
    payload.updated_at = datetime.now(timezone.utc).isoformat()
    await db.sample_plans.update_one(
        {"plan_type": plan_type},
        {"$set": payload.model_dump()},
        upsert=True
    )
    return {"ok": True, "plan_type": plan_type}

@api_router.get("/sample-plans/{plan_type}")
async def get_sample_plan(plan_type: str):
    """Public endpoint to fetch sample plan"""
    doc = await db.sample_plans.find_one({"plan_type": plan_type})
    if not doc:
        raise HTTPException(status_code=404, detail="Sample plan not found")
    doc.pop("_id", None)
    return doc


# ───────────────────────────────────────────────────────────────────────────────
# Activity standards admin
# ───────────────────────────────────────────────────────────────────────────────

class ActivityStandardsUpdate(BaseModel):
    must_include: List[str] = []
    common_injuries: List[str] = []
    prevention: List[str] = []
    never_include: List[str] = []
    hallmarks: List[str] = []


@api_router.get("/admin/activity-standards")
async def admin_list_activity_standards(_: bool = Depends(require_admin)):
    """Every activity we hold standards for, newest first."""
    docs = await db.activity_standards.find({}, {"_id": 0}).to_list(200)
    docs.sort(key=lambda d: d.get("goal", ""))
    return {"standards": docs}


@api_router.post("/admin/activity-standards/generate")
async def admin_generate_activity_standards(
    payload: dict,
    _: bool = Depends(require_admin),
):
    """
    Generate (or regenerate) standards for one activity.

    Regenerating overwrites any manual edits, so the admin UI warns before
    calling this on an activity marked as edited.
    """
    goal = (payload or {}).get("goal", "").strip()
    if not goal:
        raise HTTPException(status_code=400, detail="goal is required")

    try:
        standards = await generate_activity_standards(goal)
    except Exception as e:
        logger.error(f"Standards generation failed for '{goal}': {e}")
        raise HTTPException(status_code=502, detail=f"Generation failed: {e}")

    key = standards_key(goal)
    await db.activity_standards.update_one(
        {"key": key},
        {"$set": {
            "key": key,
            "goal": goal,
            "family": family_for_goal(goal),
            "standards": standards,
            "version": ACTIVITY_STANDARDS_VERSION,
            "edited": False,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True, "key": key, "goal": goal, "standards": standards}


@api_router.put("/admin/activity-standards/{key}")
async def admin_update_activity_standards(
    key: str,
    payload: ActivityStandardsUpdate,
    _: bool = Depends(require_admin),
):
    """Save hand-edited standards. Marked as edited so regeneration warns."""
    result = await db.activity_standards.update_one(
        {"key": key},
        {"$set": {
            "standards": payload.model_dump(),
            "edited": True,
            "edited_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No standards for that activity")
    return {"ok": True, "key": key}


@api_router.delete("/admin/activity-standards/{key}")
async def admin_delete_activity_standards(key: str, _: bool = Depends(require_admin)):
    """Drop standards so the next plan for that activity regenerates them."""
    await db.activity_standards.delete_one({"key": key})
    return {"ok": True}


# ───────────────────────────────────────────────────────────────────────────────
# Admin plan editing
#
# Plans are otherwise immutable. This exists for one specific job: when a
# customer's generated plan isn't good enough, editing their Thursday and
# handing back the same link is a far better outcome than a refund and a bad
# review. It is deliberately a hand-editor, not a regenerator — the whole point
# is that a human decides what's wrong and fixes exactly that.
# ───────────────────────────────────────────────────────────────────────────────

@api_router.get("/admin/plans/recent")
async def admin_list_recent_plans(
    limit: int = 30,
    test_only: bool = False,
    _: bool = Depends(require_admin),
):
    """
    Recent plans, newest first.

    Test plans previously had nowhere to live — they were saved but only
    reachable if you'd kept the link, so anything generated and navigated away
    from was effectively lost. Paid plans carry an order_id; test plans don't,
    which is how the two are told apart.
    """
    query = {"order_id": {"$exists": False}} if test_only else {}
    docs = (
        await db.plans.find(
            query,
            {
                "_id": 0, "id": 1, "created_at": 1, "answers": 1, "tagline": 1,
                "order_id": 1, "sample_mode": 1, "needs_review": 1,
            },
        )
        .sort("created_at", -1)
        .to_list(min(limit, 100))
    )

    plans = []
    for d in docs:
        answers = d.get("answers") or {}
        plans.append({
            "id": d.get("id"),
            "created_at": d.get("created_at"),
            "goal": answers.get("goal") or d.get("tagline") or "—",
            "name": answers.get("name") or "—",
            "is_test": not d.get("order_id"),
            "sample_mode": bool(d.get("sample_mode")),
            "needs_review": bool(d.get("needs_review")),
        })
    return {"plans": plans}


@api_router.get("/admin/plans/{plan_id}/edit")
async def admin_load_plan_for_edit(plan_id: str, _: bool = Depends(require_admin)):
    """Load a generated plan's full content so it can be edited."""
    plan = await db.plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="No plan with that ID")
    return plan


@api_router.put("/admin/plans/{plan_id}/edit")
async def admin_save_plan_edit(
    plan_id: str,
    payload: dict,
    _: bool = Depends(require_admin),
):
    """
    Save hand-edited weeks back onto a generated plan.

    Only the plan CONTENT is editable — weeks, nutrition, recovery, morning
    routine. Identity and lineage fields (id, order_id, answers, created_at)
    are never overwritten from the client, so an edit can't detach a plan from
    its owner or its history.
    """
    existing = await db.plans.find_one({"id": plan_id})
    if not existing:
        raise HTTPException(status_code=404, detail="No plan with that ID")

    editable = {}
    for field in ("weeks", "nutrition", "recovery", "morningRoutine", "structureType", "tagline"):
        if field in payload:
            editable[field] = payload[field]

    # Display-only flag. Sample plans keep all four weeks in the database —
    # this just hides weeks 2+ behind a prompt to build their own, so a public
    # sample proves the quality of week 1 without giving the whole block away.
    if "sample_mode" in payload:
        editable["sample_mode"] = bool(payload["sample_mode"])

    if "weeks" in editable:
        # Re-run the same validation a generated plan must pass, so a manual
        # edit can't quietly produce a structurally broken plan (an empty day,
        # a missing workouts array) that then errors in the customer's app.
        try:
            validate_plan({"weeks": editable["weeks"]})
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Edit rejected: {e}")

    editable["edited_by_admin"] = True
    editable["edited_at"] = datetime.now(timezone.utc).isoformat()

    await db.plans.update_one({"id": plan_id}, {"$set": editable})
    return {"ok": True, "plan_id": plan_id}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await db.coaches.create_index("email", unique=True)
        await db.coaches.create_index("slug", unique=True)
        await db.client_plans.create_index([("coach_id", 1), ("slug", 1)], unique=True)
        await db.content.create_index("key", unique=True)
        await db.images.create_index("key", unique=True)
    except Exception as e:
        logger.warning(f"Index ensure: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
