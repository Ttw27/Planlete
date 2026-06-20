from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Header, Depends, Query, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import requests
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

APP_NAME = os.environ.get("APP_NAME", "builtforyou")
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"

app = FastAPI(title="Built.For.You API")
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


class ImageRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    key: str
    url: str
    storage_path: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ===== Auth dep =====
def require_admin(x_admin_token: Optional[str] = Header(None), auth: Optional[str] = Query(None)) -> bool:
    token = x_admin_token or auth
    if not token or not ADMIN_TOKEN or not secrets.compare_digest(token, ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


# ===== Routes =====
@api_router.get("/")
async def root():
    return {"service": "Built.For.You", "status": "ok"}


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


@api_router.post("/plans/generate", response_model=Plan)
async def generate_plan(payload: PlanGenerateRequest):
    plan = Plan(answers=payload.answers, status="draft")
    await db.plans.insert_one(plan.model_dump())
    return plan


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


# ===== Images =====
@api_router.get("/images")
async def list_images():
    """Public list of all custom image overrides. Returns {key: url}."""
    docs = await db.images.find({}, {"_id": 0}).to_list(200)
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
    # Public URL served via /api/files/{path}
    public_url = f"/api/files/{result['path']}"
    rec = ImageRecord(key=key, url=public_url, storage_path=result["path"])
    await db.images.update_one(
        {"key": key},
        {"$set": rec.model_dump()},
        upsert=True,
    )
    return rec


@api_router.post("/admin/images/url", response_model=ImageRecord)
async def admin_set_image_url(
    key: str = Query(...),
    url: str = Query(...),
    _: bool = Depends(require_admin),
):
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
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
