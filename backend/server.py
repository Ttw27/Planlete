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
async def generate_plan_with_claude(answers: dict) -> dict:
    """
    Generate a personalised training plan using Claude AI based on user's questionnaire answers.
    Returns a plan structure ready to store in MongoDB.
    """
    
    name = answers.get("name", "User")
    goal = answers.get("goal", "General fitness")
    age = answers.get("age", "Not specified")
    sex = answers.get("sex", "Not specified")
    experience = answers.get("experience", "Brand new")
    days = answers.get("days", "3")
    equipment = answers.get("equipment", "Full gym")
    session = answers.get("session", "60 min")
    nutrition = answers.get("nutrition", "No — training only")
    notes = answers.get("notes", "").strip() or "None provided"

    # Construct the prompt for Claude
    prompt = f"""You are an expert strength coach and training program designer. 
Create a personalised {session} training plan for {name}.

User Profile:
- Main Goal: {goal}
- Age range: {age}
- Sex: {sex}
- Training Experience: {experience}
- Availability: {days} days per week
- Equipment: {equipment}
- Typical Session Length: {session}
- Include Nutrition: {nutrition}
- Injuries, allergies or other notes from the user: {notes}

If the notes mention any injury, condition, or limitation, you MUST adapt exercise
selection to avoid aggravating it and substitute safer alternatives. If allergies or
dietary restrictions are mentioned, avoid those foods entirely in the nutrition section.

Create a WEEK 1 training plan in this exact JSON format (NO markdown, NO code blocks, just raw JSON):

{{
  "name": "{name}'s Personalised Plan",
  "goal": "{goal}",
  "weeks": [
    {{
      "weekNumber": 1,
      "theme": "Introduction & Assessment",
      "days": [
        {{
          "day": "MON",
          "session": "Upper Body",
          "focus": "Strength assessment",
          "exercises": [
            {{"name": "Bench Press", "sets": "4x5", "rest": "3min", "notes": "Find your 5RM"}},
            {{"name": "Bent Over Row", "sets": "4x5", "rest": "3min", "notes": "Match bench press"}},
            {{"name": "Incline Dumbbell Press", "sets": "3x8", "rest": "2min", "notes": ""}}
          ]
        }},
        {{
          "day": "WED",
          "session": "Lower Body",
          "focus": "Strength assessment",
          "exercises": [
            {{"name": "Back Squat", "sets": "4x5", "rest": "3min", "notes": "Find your 5RM"}},
            {{"name": "Deadlift", "sets": "4x3", "rest": "3min", "notes": "Sub squat if injured"}},
            {{"name": "Leg Press", "sets": "3x8", "rest": "2min", "notes": ""}}
          ]
        }},
        {{
          "day": "FRI",
          "session": "Full Body",
          "focus": "Conditioning",
          "exercises": [
            {{"name": "Power Clean", "sets": "5x3", "rest": "2min", "notes": "Or kettlebell swings"}},
            {{"name": "Front Squat", "sets": "3x5", "rest": "2min", "notes": ""}},
            {{"name": "Farmer's Carry", "sets": "3x40m", "rest": "1min", "notes": ""}}
          ]
        }}
      ],
      "nutrition": {{
        "daily_protein": "1g per lb of bodyweight",
        "daily_calories": "TDEE (estimated)",
        "meal_timing": "Post-workout: carbs + protein within 2 hours"
      }}
    }}
  ]
}}

Important:
- Be realistic and safe — no extreme recommendations
- Adapt to the experience level
- Include rest days
- Return valid JSON only
- Exercises should match the equipment available
- If any injury, condition or limitation was noted, prioritise safety over intensity and explain substitutions in the "notes" field of affected exercises
"""

    try:
        # Call Claude API
        client = get_anthropic_client()
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        # Extract the response text
        response_text = message.content[0].text
        
        # Parse the JSON response
        plan_data = json.loads(response_text)
        
        # Add metadata
        plan_data["answers"] = answers
        plan_data["created_at"] = datetime.now(timezone.utc).isoformat()
        plan_data["brand"] = f"{name}'s App"
        plan_data["tagline"] = goal
        
        return plan_data
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude response as JSON: {e}")
        raise Exception("Plan generation failed - invalid response format")
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        raise Exception(f"Plan generation failed: {str(e)}")


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
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    answers: Dict[str, Any]
    status: str = "draft"
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
async def generate_plan(payload: PlanGenerateRequest):
    """
    Generate a personalised training plan using Claude AI.
    Stores in MongoDB and returns plan ID.
    """
    try:
        # Generate plan with Claude
        plan_data = await generate_plan_with_claude(payload.answers)
        
        # Generate unique ID
        plan_id = str(uuid.uuid4())
        plan_data["id"] = plan_id
        
        # Store in MongoDB
        await db.plans.insert_one(plan_data)
        
        logger.info(f"Plan generated: {plan_id}")
        
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
