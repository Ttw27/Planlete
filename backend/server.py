from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Header, Depends, Query, Response, Request
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
stripe.api_key = STRIPE_SECRET_KEY
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"

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

# ===== Object Storage =====
_storage_key: Optional[str] = None


def init_storage() -> str:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY missing")
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ===== Claude AI Plan Generation =====

EXPECTED_DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


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


async def _call_claude_for_plan(answers: dict) -> dict:
    """One attempt at generating a plan via Claude. May raise on API error,
    invalid JSON, or failed validation — the caller (generate_plan_with_claude)
    is responsible for retrying."""

    name = answers.get("name", "User")
    goal = answers.get("goal", "General fitness")
    age = answers.get("age", "Not specified")
    sex = answers.get("sex", "Not specified")
    experience = answers.get("experience", "Brand new")
    days = answers.get("days", "3")
    equipment = answers.get("equipment", "Full gym")
    session = answers.get("session", "60 min")
    nutrition_pref = answers.get("nutrition", "No — training only")
    notes = answers.get("notes", "").strip() or "None provided"

    prompt = f"""You are an expert strength coach and training program designer.
Create a personalised, 4-WEEK PERIODISED training plan for {name}, session length {session}.

User Profile:
- Main Goal: {goal}
- Age range: {age}
- Sex: {sex}
- Training Experience: {experience}
- Availability: {days} days per week
- Equipment: {equipment}
- Typical Session Length: {session}
- Include Nutrition: {nutrition_pref}
- Injuries, allergies or other notes from the user: {notes}

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
          {{"name": "Back Squat", "sets": "4x6", "load": "70% est. 1RM", "rest": "2min", "reason": "Builds the foundational lower-body strength this goal depends on most, loaded conservatively in week 1 to groove technique."}},
          {{"name": "Romanian Deadlift", "sets": "3x8", "load": "Moderate", "rest": "90s", "reason": "Targets the posterior chain and hamstrings, which support the squat and protect the lower back."}}
        ]}},
        {{"day": "Tue", "label": "...", "focus": "...", "workouts": [ {{"name": "...", "sets": "...", "load": "...", "rest": "...", "reason": "..."}} ]}},
        {{"day": "Wed", "label": "...", "focus": "...", "workouts": [ {{"name": "...", "sets": "...", "load": "...", "rest": "...", "reason": "..."}} ]}},
        {{"day": "Thu", "label": "...", "focus": "...", "workouts": [ {{"name": "...", "sets": "...", "load": "...", "rest": "...", "reason": "..."}} ]}},
        {{"day": "Fri", "label": "...", "focus": "...", "workouts": [ {{"name": "...", "sets": "...", "load": "...", "rest": "...", "reason": "..."}} ]}},
        {{"day": "Sat", "label": "...", "focus": "...", "workouts": [ {{"name": "...", "sets": "...", "load": "...", "rest": "...", "reason": "..."}} ]}}
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
  "morningRoutine": ["...", "...", "...", "..."]
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
- Return valid JSON only — no markdown, no commentary, no trailing commas
- Double-check before responding: every one of the 28 day-entries (4 weeks x 7 days) must be present, in Sun-Mon-Tue-Wed-Thu-Fri-Sat order, and every workout entry must have all five fields (name, sets, load, rest, reason) filled in — an incomplete plan is a failed response
"""

    client = get_anthropic_client()
    message = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=10000,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    response_text = message.content[0].text
    plan_data = json.loads(response_text)

    plan_data["answers"] = answers
    plan_data["created_at"] = datetime.now(timezone.utc).isoformat()
    plan_data.setdefault("brand", f"{name}'s App")
    plan_data.setdefault("tagline", goal)

    validate_plan(plan_data)

    return plan_data


async def generate_plan_with_claude(answers: dict) -> dict:
    """
    Generate a personalised, 4-week periodised training plan using Claude AI,
    matching the exact JSON schema the AppShell component expects. Runs a
    deterministic QA check (validate_plan) on the result and automatically
    retries once if anything required is missing (a day, an exercise, a
    field) rather than saving a broken plan.
    """
    last_error = None
    max_attempts = 2

    for attempt in range(1, max_attempts + 1):
        try:
            plan_data = await _call_claude_for_plan(answers)
            if attempt > 1:
                logger.info(f"Plan generation succeeded on retry attempt {attempt}")
            return plan_data
        except json.JSONDecodeError as e:
            last_error = f"Invalid JSON from Claude: {e}"
            logger.warning(f"Plan generation attempt {attempt} failed: {last_error}")
        except ValueError as e:
            last_error = f"Failed QA validation: {e}"
            logger.warning(f"Plan generation attempt {attempt} failed: {last_error}")
        except Exception as e:
            last_error = f"Claude API error: {e}"
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
    morningRoutine: Optional[List[str]] = None


class CheckoutSessionRequest(BaseModel):
    answers: Dict[str, Any]


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


class ClientPlanCreate(BaseModel):
    client_name: str
    client_email: Optional[EmailStr] = None
    template: str  # athlete | longevity | football | sprinter
    notes: Optional[str] = None


class CoachPublic(BaseModel):
    id: str
    email: EmailStr
    brand_name: str
    slug: str
    logo_url: Optional[str] = None
    primary_color: str = "#D4FF00"
    secondary_color: str = "#050505"
    created_at: str


class ClientPlanPublic(BaseModel):
    id: str
    coach_id: str
    client_name: str
    client_email: Optional[EmailStr] = None
    template: str
    notes: Optional[str] = None
    slug: str
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

    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "answers": payload.answers,
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
                    "product_data": {"name": "Planlete — Personalised Training App"},
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


@api_router.get("/checkout/confirm")
async def confirm_checkout(session_id: str, order_id: str):
    """
    Called by the success page after Stripe redirects back. Verifies the
    session was actually paid (never trusts the redirect alone), then
    generates the plan and links it to the order. Safe to call more than
    once (e.g. on refresh) — if the plan already exists, just returns it.
    """
    order = await db.pending_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.get("status") == "plan_created" and order.get("plan_id"):
        return {"id": order["plan_id"], "link": f"/app/u/{order['plan_id']}"}

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        logger.error(f"Stripe session retrieve failed: {e}")
        raise HTTPException(status_code=400, detail="Could not verify payment.")

    if session.payment_status != "paid":
        raise HTTPException(status_code=402, detail="Payment has not completed yet.")

    try:
        plan_data = await generate_plan_with_claude(order["answers"])
    except Exception as e:
        logger.error(f"Plan generation after payment failed for order {order_id}: {e}")
        # Payment succeeded but generation failed — mark clearly so it can be
        # spotted and manually resolved rather than silently losing the sale.
        await db.pending_orders.update_one(
            {"id": order_id},
            {"$set": {"status": "paid_generation_failed", "error": str(e)}}
        )
        raise HTTPException(
            status_code=500,
            detail="Payment succeeded but plan generation failed. Support has been notified — check your email shortly."
        )

    plan_id = str(uuid.uuid4())
    plan_data["id"] = plan_id
    plan_data["order_id"] = order_id
    await db.plans.insert_one(plan_data)

    await db.pending_orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "plan_created",
            "plan_id": plan_id,
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    logger.info(f"Order {order_id} paid and plan {plan_id} generated")

    return {"id": plan_id, "link": f"/app/u/{plan_id}"}


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
        order_id = metadata.get("order_id")
        if order_id:
            order = await db.pending_orders.find_one({"id": order_id})
            if order and order.get("status") == "pending":
                await db.pending_orders.update_one(
                    {"id": order_id},
                    {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
                )
                logger.info(f"Stripe webhook: order {order_id} confirmed paid")

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
    if payload.template not in VALID_TEMPLATES:
        raise HTTPException(status_code=400, detail="Invalid template")
    base_slug = slugify(payload.client_name)
    slug = base_slug
    i = 1
    while await db.client_plans.find_one({"coach_id": coach["id"], "slug": slug}):
        i += 1
        slug = f"{base_slug}-{i}"
    doc = {
        "id": str(uuid.uuid4()),
        "coach_id": coach["id"],
        "client_name": payload.client_name.strip(),
        "client_email": payload.client_email,
        "template": payload.template,
        "notes": payload.notes,
        "slug": slug,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.client_plans.insert_one(doc)
    return ClientPlanPublic(**{k: v for k, v in doc.items() if k != "_id"})


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
    return {
        "coach": {
            "brand_name": coach["brand_name"],
            "slug": coach["slug"],
            "logo_url": coach.get("logo_url"),
            "primary_color": coach.get("primary_color", "#D4FF00"),
            "secondary_color": coach.get("secondary_color", "#050505"),
        },
        "client": {
            "client_name": client_plan["client_name"],
            "template": client_plan["template"],
            "notes": client_plan.get("notes"),
            "slug": client_plan["slug"],
        },
    }


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
        init_storage()
        logger.info("Storage initialised")
    except Exception as e:
        logger.warning(f"Storage init deferred: {e}")
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
