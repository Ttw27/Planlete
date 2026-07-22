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

# Coach/physio builder pricing. COACH_SUBSCRIPTION_PRICE_ID must be created as
# a recurring Price in the Stripe Dashboard first (Products -> Add product ->
# recurring) — Stripe subscriptions need a pre-created Price object, unlike
# the one-off consumer checkout which creates its price inline.
COACH_SUBSCRIPTION_PRICE_ID = os.environ.get("COACH_SUBSCRIPTION_PRICE_ID")
COACH_CLIENT_PLAN_PENCE = int(os.environ.get("COACH_CLIENT_PLAN_PENCE", "499"))


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
PLAN_PROMPT_VERSION = "2026-07-v2"


# Which activity family a goal belongs to. Drives the hard guardrails below —
# the rules the model must obey regardless of what it would otherwise write.
ACTIVITY_FAMILIES = {
    "endurance": [
        "marathon", "half marathon", "10k", "5k", "ultra", "ironman",
        "triathlon", "sportive", "cycling", "running", "swim",
    ],
    "hybrid": ["hyrox", "crossfit", "obstacle", "spartan", "hybrid"],
    "combat": ["boxing", "kickboxing", "mma", "muay thai", "bjj", "wrestling", "fight"],
    "team": ["football", "rugby", "basketball", "netball", "hockey", "cricket", "soccer"],
    "strength": ["powerlifting", "strongman", "hypertrophy", "bodybuilding", "muscle"],
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


# Exercises that cannot be done alone. Checked when the person has said they
# train solo, which is the default.
PARTNER_TERMS = [
    "partner", "opponent", "sparring", "spar ", "small-sided", "small sided",
    "4v4", "3v3", "5v5", "2v2", "1v1", "teammate", "team-mate", "pad work",
    "pads with", "opposed", "with a coach holding",
]


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

            # Equipment they do not have
            for term in forbidden:
                if term in names:
                    raise ValueError(
                        f"Week {week_num}, {d.get('day')}: prescribes '{term}' but the user's "
                        f"equipment is '{equipment}'. Use only equipment they actually have."
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
            is_rest = "rest" in label or "recovery" in label or "rest" in focus
            if not is_rest:
                training_days_this_week += 1

                # Session length, only checked on real training days
                if requested_minutes:
                    estimated = _estimate_session_minutes(workouts)
                    if estimated > requested_minutes * 1.5:
                        raise ValueError(
                            f"Week {week_num}, {d.get('day')}: session is roughly {estimated} min but "
                            f"the user asked for {requested_minutes} min. Reduce the volume."
                        )

        weekly_training_days.append(training_days_this_week)

    # Training days should broadly match what they asked for
    if requested_days:
        for i, count in enumerate(weekly_training_days, start=1):
            if abs(count - requested_days) > 1:
                raise ValueError(
                    f"Week {i}: has {count} training days but the user asked for {requested_days}."
                )

    # Week 4 must actually be a deload
    if len(weeks) == 4:
        def week_volume(w):
            return sum(
                len(d.get("workouts", []))
                for d in w.get("days", [])
                if "rest" not in str(d.get("label", "")).lower()
            )

        w3, w4 = week_volume(weeks[2]), week_volume(weeks[3])
        if w3 and w4 >= w3:
            raise ValueError(
                f"Week 4 must be a deload but has {w4} exercises vs week 3's {w3}. "
                f"Reduce week 4 volume meaningfully."
            )


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
    notes = answers.get("notes", "").strip() or "None provided"
    training_with = answers.get("training_with", "On my own").strip()
    match_day = answers.get("match_day", "").strip()
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

    match_day_line = (
        f"- Match/competition day: {match_day} — this day must be the match itself, never a hard "
        f"training session. Keep the day before light and the day after recovery."
        if match_day and "not currently" not in match_day.lower()
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
- Availability: {days} days per week
- Equipment: {equipment}
- Typical Session Length: {session}
- Include Nutrition: {nutrition_pref}
- Training context: {training_with}
{match_day_line}
- Injuries, allergies or other notes from the user: {notes}

{stage_guidance}

{solo_guidance}
{injury_guidance}
{retry_guidance}

{guardrails}
{activity_standards}

{infrastructure_reality}

If the notes mention any injury, condition, or limitation, you MUST adapt exercise
selection to avoid aggravating it and substitute safer alternatives. If allergies or
dietary restrictions are mentioned, avoid those foods entirely in the nutrition section.

Design the exercise selection and weekly structure specifically for the stated
goal/sport rather than a generic template — e.g. combat sports (boxing,
kickboxing) should include footwork, conditioning and appropriate strength
work; HYROX/hybrid athlete goals should include station-specific conditioning
(sled, rowing, burpee broad jumps, farmer's carries etc.) alongside strength;
bodybuilding should prioritise hypertrophy rep ranges and muscle-group splits;
football/team sports should include change-of-direction and match-specific
conditioning; rehab should prioritise safe, staged loading. Use your expertise
in that specific discipline.

This plan runs on a 4-week repeating cycle (a "mesocycle"). Weeks 1–3 should
progressively increase load, volume or intensity based on the training goal.
Week 4 must be a DELOAD week — meaningfully reduced volume/intensity so the
person recovers before the cycle repeats from week 1 again.

Return EVERY day of the week (Sun through Sat, in that exact order) for EVERY
week — 7 day-entries x 4 weeks = 28 total. Days that are not a training day for
this person must still appear, with a rest/active-recovery entry (e.g. a short
mobility or walk session) rather than being omitted. Match the number of actual
training days to "{days} days per week" — remaining days are rest/recovery days.
Every single day, including rest days, MUST have at least one entry in "workouts" —
never return an empty workouts array.

Every exercise MUST include a "demo" field: the best short search phrase for finding a
demonstration video of that movement. For standard gym lifts this is just the plain
exercise name ("back squat", "romanian deadlift"). For sport-specific or unusually named
drills, use the phrase someone would actually search to find it, including the sport where
that helps disambiguate (e.g. "football wall pass drill", "boxing slip rope drill"). Never
include set/rep detail in "demo".

Return ONLY raw JSON (no markdown, no code fences) in this EXACT shape:

{{
  "brand": "{name}'s App",
  "tagline": "{goal}",
  "weeks": [
    {{
      "weekNumber": 1,
      "theme": "Foundation",
      "days": [
        {{"day": "Sun", "label": "Rest", "focus": "Recovery", "workouts": [
          {{"name": "Walk", "sets": "30min", "load": "Easy", "rest": "—", "reason": "Active recovery keeps blood flow up without adding fatigue before the training week starts."}}
        ]}},
        {{"day": "Mon", "label": "Lower Body", "focus": "Strength", "workouts": [
          {{"name": "Back Squat", "sets": "4x6", "load": "70% est. 1RM", "rest": "2min", "demo": "back squat", "reason": "Builds the foundational lower-body strength this goal depends on most, loaded conservatively in week 1 to groove technique."}},
          {{"name": "Romanian Deadlift", "sets": "3x8", "load": "Moderate", "rest": "90s", "demo": "romanian deadlift", "reason": "Targets the posterior chain and hamstrings, which support the squat and protect the lower back."}}
        ]}},
        {{"day": "Tue", "label": "...", "focus": "...", "workouts": [ {{"name": "...", "sets": "...", "load": "...", "rest": "...", "demo": "...", "reason": "..."}} ]}},
        {{"day": "Wed", "label": "...", "focus": "...", "workouts": [ {{"name": "...", "sets": "...", "load": "...", "rest": "...", "demo": "...", "reason": "..."}} ]}},
        {{"day": "Thu", "label": "...", "focus": "...", "workouts": [ {{"name": "...", "sets": "...", "load": "...", "rest": "...", "demo": "...", "reason": "..."}} ]}},
        {{"day": "Fri", "label": "...", "focus": "...", "workouts": [ {{"name": "...", "sets": "...", "load": "...", "rest": "...", "demo": "...", "reason": "..."}} ]}},
        {{"day": "Sat", "label": "...", "focus": "...", "workouts": [ {{"name": "...", "sets": "...", "load": "...", "rest": "...", "demo": "...", "reason": "..."}} ]}}
      ]
    }},
    {{ "weekNumber": 2, "theme": "Build", "days": [ ...same 7-day shape, slightly progressed... ] }},
    {{ "weekNumber": 3, "theme": "Peak", "days": [ ...same 7-day shape, further progressed... ] }},
    {{ "weekNumber": 4, "theme": "Deload", "days": [ ...same 7-day shape, reduced volume/intensity... ] }}
  ],
  "nutrition": {{
    "calories": 2400,
    "protein": 160,
    "carbs": 260,
    "fats": 80,
    "note": "One or two sentences of nutrition guidance tailored to the goal and any allergies noted.",
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
    "hrvTrend": "↑ Optimal",
    "protocols": ["...", "...", "...", "..."]
  }},
  "morningRoutine": [
    {{"name": "Hip flexor stretch", "sets": "2x30s each side", "load": "Bodyweight", "rest": "—", "reason": "Loosens hip flexors that tighten overnight, before any training session."}},
    {{"name": "Cat-cow stretch", "sets": "1x10 reps", "load": "Bodyweight", "rest": "—", "reason": "..."}},
    {{"name": "...", "sets": "...", "load": "...", "rest": "...", "demo": "...", "reason": "..."}}
  ]
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
    # that applies to non-streamed requests, so a big, detailed plan (thinking
    # + a full 4-week JSON) has real room to complete rather than risk being
    # cut off mid-response.
    with client.messages.stream(
        model="claude-sonnet-5",
        max_tokens=32000,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    ) as stream:
        message = stream.get_final_message()

    # Claude Sonnet 5 can include a "thinking" block ahead of the actual
    # answer for complex prompts like this one — don't assume content[0] is
    # the text block, find the one that actually is.
    response_text = None
    for block in message.content:
        if getattr(block, "type", None) == "text":
            response_text = block.text
            break
    if response_text is None:
        raise Exception("Claude response contained no text block")
    plan_data = json.loads(response_text)

    plan_data["answers"] = answers
    plan_data["created_at"] = datetime.now(timezone.utc).isoformat()
    plan_data.setdefault("brand", f"{name}'s App")
    tagline_default = f"{goal} — {stage}" if stage and "no specific" not in stage.lower() and "general training" not in stage.lower() else goal
    plan_data.setdefault("tagline", tagline_default)

    validate_plan(plan_data)
    validate_plan_semantics(plan_data, answers)

    plan_data["plan_version"] = PLAN_PROMPT_VERSION
    plan_data["activity_family"] = family

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
    max_attempts = 3

    for attempt in range(1, max_attempts + 1):
        try:
            if on_stage:
                await on_stage("writing" if attempt == 1 else "refining")

            plan_data = await _call_claude_for_plan(answers, previous_error=feedback)

            if on_stage:
                await on_stage("checking")

            if attempt > 1:
                logger.info(f"Plan generation succeeded on retry attempt {attempt}")
            return plan_data
        except json.JSONDecodeError as e:
            last_error = f"Invalid JSON from Claude: {e}"
            feedback = "Your previous response was not valid JSON. Return raw JSON only."
            logger.warning(f"Plan generation attempt {attempt} failed: {last_error}")
        except ValueError as e:
            last_error = f"Failed QA validation: {e}"
            # The specific failure is fed back so the retry fixes that exact
            # problem rather than rolling the dice on the same prompt again.
            feedback = str(e)
            logger.warning(f"Plan generation attempt {attempt} failed: {last_error}")
        except Exception as e:
            last_error = f"Claude API error: {e}"
            feedback = None
            logger.warning(f"Plan generation attempt {attempt} failed: {last_error}")

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


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    order_id: str


class WeightLogCreate(BaseModel):
    plan_id: str
    week_number: int
    day: str
    exercise_name: str
    value: str  # e.g. "82.5kg" or "10 reps" — kept as a simple string, deliberately basic


class WeightLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plan_id: str
    week_number: int
    day: str
    exercise_name: str
    value: str
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
    resolved: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


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


@api_router.post("/plans/generate")
async def generate_plan(payload: PlanGenerateRequest, _: bool = Depends(require_admin)):
    """
    ADMIN-ONLY: generate a plan directly without payment, for testing.
    Real customers go through /checkout/create-session -> Stripe -> /checkout/confirm,
    which is what actually charges them before a plan is generated.
    """
    try:
        # Generate plan with Claude
        plan_data = await generate_plan_with_claude(payload.answers)
        
        # Generate unique ID
        plan_id = str(uuid.uuid4())
        plan_data["id"] = plan_id
        
        # Store in MongoDB
        await db.plans.insert_one(plan_data)
        
        logger.info(f"Plan generated (admin test): {plan_id}")
        
        return {
            "id": plan_id,
            "message": "Plan generated successfully",
            "link": f"/app/u/{plan_id}"
        }
        
    except Exception as e:
        logger.error(f"Plan generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate plan. Please try again."
        )


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
        "morningRoutine": payload.morningRoutine,
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

    if bool(payload.answers) == bool(payload.manual_plan):
        raise HTTPException(status_code=400, detail="Provide exactly one of answers or manual_plan.")

    kind = "ai" if payload.answers else "manual"
    product_name = (
        "Planlete — Personalised Training App" if kind == "ai"
        else "Planlete — Your Own Plan, Built Your Way"
    )

    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "kind": kind,
        "answers": payload.answers,
        "manual_plan": payload.manual_plan,
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
                    "unit_amount": 499,
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

    email = (answers.get("email") if kind == "ai" else manual_plan.get("client_email")) or None
    name = (answers.get("name") if kind == "ai" else manual_plan.get("client_name")) or "there"

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
            plan_data["answers"] = answers

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
                    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
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
                            or Android so it feels like a real app on your home screen.
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
async def stripe_webhook(request: Request):
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
    return log


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


@api_router.get("/admin/support", response_model=List[SupportRequest])
async def admin_list_support_requests(_: bool = Depends(require_admin)):
    docs = await db.support_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [SupportRequest(**d) for d in docs]


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
        "morningRoutine": payload.morningRoutine,
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
        "morningRoutine": payload.morningRoutine,
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
