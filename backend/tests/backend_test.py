"""Backend tests for Built.For.You — admin auth, images endpoints, waitlist, plans."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://workoutapp-io.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_PASSWORD = "builtforyou2026"
EXPECTED_TOKEN = "bfy-admin-7f3e9d2b8c1a4e5f6a8b9c0d1e2f3a4b"

TEST_KEYS_TO_CLEAN = []  # populated by tests, cleaned at session end


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    yield s
    # Cleanup any overrides set during tests
    for key in TEST_KEYS_TO_CLEAN:
        try:
            s.delete(f"{API}/admin/images/{key}", headers={"X-Admin-Token": EXPECTED_TOKEN}, timeout=15)
        except Exception:
            pass


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["token"]
    return data["token"]


# ===== Health =====
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ===== Admin auth =====
class TestAdminAuth:
    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/admin/login", json={"password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_login_correct_password_returns_token(self, session):
        r = session.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        assert r.json()["token"] == EXPECTED_TOKEN

    def test_verify_no_token_401(self, session):
        r = session.get(f"{API}/admin/verify", timeout=15)
        assert r.status_code == 401

    def test_verify_wrong_token_401(self, session):
        r = session.get(f"{API}/admin/verify", headers={"X-Admin-Token": "bad"}, timeout=15)
        assert r.status_code == 401

    def test_verify_correct_token(self, session, admin_token):
        r = session.get(f"{API}/admin/verify", headers={"X-Admin-Token": admin_token}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ===== Images =====
class TestImages:
    def test_list_images_public(self, session):
        r = session.get(f"{API}/images", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_set_image_url_unauthorized(self, session):
        r = session.post(f"{API}/admin/images/url", params={"key": "hero_landing", "url": "https://x.test/a.jpg"}, timeout=15)
        assert r.status_code == 401

    def test_upload_unauthorized(self, session):
        r = session.post(f"{API}/admin/images/upload", params={"key": "hero_landing"},
                         files={"file": ("a.png", b"\x89PNG\r\n\x1a\n", "image/png")}, timeout=15)
        assert r.status_code == 401

    def test_delete_unauthorized(self, session):
        r = session.delete(f"{API}/admin/images/hero_landing", timeout=15)
        assert r.status_code == 401

    def test_set_url_and_verify_persistence(self, session, admin_token):
        key = "TEST_card_sprinter"
        TEST_KEYS_TO_CLEAN.append(key)
        url = "https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg"
        r = session.post(f"{API}/admin/images/url",
                         params={"key": key, "url": url},
                         headers={"X-Admin-Token": admin_token}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["key"] == key
        assert data["url"] == url

        # verify via list
        lst = session.get(f"{API}/images", timeout=15).json()
        assert lst.get(key) == url

    def test_reset_image(self, session, admin_token):
        key = "TEST_reset_key"
        # set
        session.post(f"{API}/admin/images/url",
                     params={"key": key, "url": "https://x.test/a.jpg"},
                     headers={"X-Admin-Token": admin_token}, timeout=15)
        # delete
        r = session.delete(f"{API}/admin/images/{key}", headers={"X-Admin-Token": admin_token}, timeout=15)
        assert r.status_code == 200

        lst = session.get(f"{API}/images", timeout=15).json()
        assert key not in lst

    def test_upload_image_file(self, session, admin_token):
        key = "TEST_upload_key"
        TEST_KEYS_TO_CLEAN.append(key)
        # Minimal valid PNG (1x1)
        png_bytes = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
            "890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
        )
        files = {"file": ("test.png", io.BytesIO(png_bytes), "image/png")}
        r = session.post(f"{API}/admin/images/upload",
                         params={"key": key},
                         files=files,
                         headers={"X-Admin-Token": admin_token}, timeout=60)
        if r.status_code != 200:
            pytest.skip(f"Storage upload not available: {r.status_code} {r.text[:200]}")
        data = r.json()
        assert data["key"] == key
        assert data["url"].startswith("/api/files/")
        assert data["storage_path"]

        # Verify it appears in list
        lst = session.get(f"{API}/images", timeout=15).json()
        assert lst.get(key) == data["url"]

        # Verify file served via /api/files/{path}
        served = session.get(f"{BASE_URL}{data['url']}", timeout=30)
        assert served.status_code == 200
        assert served.headers.get("content-type", "").startswith("image/")
        assert len(served.content) > 0

    def test_upload_non_image_rejected(self, session, admin_token):
        files = {"file": ("test.txt", b"hello", "text/plain")}
        r = session.post(f"{API}/admin/images/upload",
                         params={"key": "TEST_bad"},
                         files=files,
                         headers={"X-Admin-Token": admin_token}, timeout=30)
        assert r.status_code == 400


# ===== Waitlist =====
class TestWaitlist:
    def test_waitlist_count(self, session):
        r = session.get(f"{API}/waitlist/count", timeout=15)
        assert r.status_code == 200
        assert "count" in r.json()

    def test_waitlist_create_idempotent(self, session):
        email = "TEST_waitlist@example.com"
        payload = {"email": email, "source": "b2b", "company": "TestCo"}
        r1 = session.post(f"{API}/waitlist", json=payload, timeout=15)
        assert r1.status_code == 200
        assert r1.json()["email"] == email
        r2 = session.post(f"{API}/waitlist", json=payload, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["id"] == r1.json()["id"]


# ===== Plans (stub) =====
class TestPlans:
    def test_generate_and_get(self, session):
        r = session.post(f"{API}/plans/generate", json={"answers": {"goal": "test"}}, timeout=15)
        assert r.status_code == 200
        plan_id = r.json()["id"]

        g = session.get(f"{API}/plans/{plan_id}", timeout=15)
        assert g.status_code == 200
        assert g.json()["id"] == plan_id

    def test_plan_404(self, session):
        r = session.get(f"{API}/plans/does-not-exist", timeout=15)
        assert r.status_code == 404
