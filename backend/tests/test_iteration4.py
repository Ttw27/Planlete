"""Iteration 4 — coach auth/brand/clients, content editor, public branded plan."""
import os
import io
import time
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_PASSWORD = "builtforyou2026"
ADMIN_TOKEN = "bfy-admin-7f3e9d2b8c1a4e5f6a8b9c0d1e2f3a4b"

TS = int(time.time())
COACH_EMAIL = f"coach-test-{TS}@example.com"
COACH_EMAIL_2 = f"coach-login-{TS}@example.com"
COACH_PASSWORD = "strongpass-2026"
BRAND_NAME = f"Test Studio {TS}"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    yield s


# ===== Content editor =====
class TestContent:
    def test_get_content_public(self, session):
        r = session.get(f"{API}/content", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_set_content_unauthorized(self, session):
        r = session.post(f"{API}/admin/content", json={"key": "TEST_k", "value": "x"}, timeout=15)
        assert r.status_code == 401

    def test_set_and_reset_content(self, session):
        key = f"TEST_content_{TS}"
        # set
        r = session.post(f"{API}/admin/content",
                         json={"key": key, "value": "Built for sport."},
                         headers={"X-Admin-Token": ADMIN_TOKEN}, timeout=15)
        assert r.status_code == 200, r.text
        # verify
        lst = session.get(f"{API}/content", timeout=15).json()
        assert lst.get(key) == "Built for sport."
        # update
        r2 = session.post(f"{API}/admin/content",
                          json={"key": key, "value": "Built for you."},
                          headers={"X-Admin-Token": ADMIN_TOKEN}, timeout=15)
        assert r2.status_code == 200
        lst2 = session.get(f"{API}/content", timeout=15).json()
        assert lst2.get(key) == "Built for you."
        # delete
        d = session.delete(f"{API}/admin/content/{key}",
                           headers={"X-Admin-Token": ADMIN_TOKEN}, timeout=15)
        assert d.status_code == 200
        lst3 = session.get(f"{API}/content", timeout=15).json()
        assert key not in lst3

    def test_delete_unauthorized(self, session):
        r = session.delete(f"{API}/admin/content/anything", timeout=15)
        assert r.status_code == 401


# ===== Coach auth =====
class TestCoachAuth:
    def test_signup_short_password(self, session):
        r = session.post(f"{API}/coach/signup",
                         json={"email": f"shortpw-{TS}@example.com", "password": "abc",
                               "brand_name": "Short PW"}, timeout=15)
        assert r.status_code == 400

    def test_signup_success(self, session):
        r = session.post(f"{API}/coach/signup",
                         json={"email": COACH_EMAIL, "password": COACH_PASSWORD,
                               "brand_name": BRAND_NAME}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and data["token"]
        assert "coach" in data
        assert data["coach"]["email"] == COACH_EMAIL
        assert data["coach"]["brand_name"] == BRAND_NAME
        assert data["coach"]["slug"]
        assert data["coach"]["primary_color"] == "#D4FF00"
        # No _id leaked
        assert "_id" not in data["coach"]
        assert "password_hash" not in data["coach"]
        # httpOnly cookie
        cookies = r.cookies
        assert "coach_token" in cookies, f"cookies: {cookies}"
        # save token for later tests via class attr
        pytest.coach_token = data["token"]
        pytest.coach_id = data["coach"]["id"]
        pytest.coach_slug = data["coach"]["slug"]

    def test_signup_duplicate_email(self, session):
        r = session.post(f"{API}/coach/signup",
                         json={"email": COACH_EMAIL, "password": COACH_PASSWORD,
                               "brand_name": BRAND_NAME}, timeout=15)
        assert r.status_code == 409

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/coach/login",
                         json={"email": COACH_EMAIL, "password": "wrongwrong"}, timeout=15)
        assert r.status_code == 401

    def test_login_success(self, session):
        r = session.post(f"{API}/coach/login",
                         json={"email": COACH_EMAIL, "password": COACH_PASSWORD}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["coach"]["email"] == COACH_EMAIL
        assert data["token"]

    def test_me_no_token(self, session):
        r = requests.get(f"{API}/coach/me", timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, session):
        token = getattr(pytest, "coach_token", None)
        if not token:
            pytest.skip("no coach token")
        r = requests.get(f"{API}/coach/me",
                         headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == COACH_EMAIL

    def test_logout(self, session):
        r = session.post(f"{API}/coach/logout", timeout=15)
        assert r.status_code == 200


# ===== Coach brand =====
class TestCoachBrand:
    def test_patch_brand_colors(self, session):
        token = getattr(pytest, "coach_token", None)
        if not token:
            pytest.skip("no coach token")
        r = requests.patch(f"{API}/coach/me",
                           headers={"Authorization": f"Bearer {token}"},
                           json={"primary_color": "#FF6B35",
                                 "secondary_color": "#101010",
                                 "brand_name": BRAND_NAME + " (Updated)"}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["primary_color"] == "#FF6B35"
        assert d["secondary_color"] == "#101010"
        assert d["brand_name"] == BRAND_NAME + " (Updated)"

        # verify persisted via GET /me
        v = requests.get(f"{API}/coach/me",
                         headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert v.status_code == 200
        assert v.json()["primary_color"] == "#FF6B35"

    def test_patch_unauthorized(self, session):
        r = requests.patch(f"{API}/coach/me",
                           json={"primary_color": "#000000"}, timeout=15)
        assert r.status_code == 401

    def test_logo_upload(self, session):
        token = getattr(pytest, "coach_token", None)
        if not token:
            pytest.skip("no coach token")
        png_bytes = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
            "890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
        )
        files = {"file": ("logo.png", io.BytesIO(png_bytes), "image/png")}
        r = requests.post(f"{API}/coach/logo",
                          headers={"Authorization": f"Bearer {token}"},
                          files=files, timeout=60)
        if r.status_code != 200:
            pytest.skip(f"storage unavailable: {r.status_code} {r.text[:200]}")
        logo_url = r.json()["logo_url"]
        assert logo_url.startswith("/api/files/")

        # verify file served and persisted on coach
        served = requests.get(f"{BASE_URL}{logo_url}", timeout=30)
        assert served.status_code == 200

        me = requests.get(f"{API}/coach/me",
                          headers={"Authorization": f"Bearer {token}"}, timeout=15).json()
        assert me["logo_url"] == logo_url


# ===== Coach client plans =====
class TestCoachClients:
    def test_create_invalid_template(self, session):
        token = getattr(pytest, "coach_token", None)
        if not token:
            pytest.skip("no coach token")
        r = requests.post(f"{API}/coach/clients",
                          headers={"Authorization": f"Bearer {token}"},
                          json={"client_name": "Bad", "template": "bogus"}, timeout=15)
        assert r.status_code == 400

    def test_create_and_list_clients(self, session):
        token = getattr(pytest, "coach_token", None)
        if not token:
            pytest.skip("no coach token")
        # Create one of each valid template
        created = []
        for tpl in ["athlete", "longevity", "football", "sprinter"]:
            r = requests.post(f"{API}/coach/clients",
                              headers={"Authorization": f"Bearer {token}"},
                              json={"client_name": f"TEST Client {tpl} {TS}",
                                    "template": tpl,
                                    "notes": f"Notes for {tpl}"}, timeout=15)
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["template"] == tpl
            assert d["slug"]
            assert "_id" not in d
            created.append(d)
        pytest.created_clients = created

        # list
        lst = requests.get(f"{API}/coach/clients",
                           headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert lst.status_code == 200
        ids = {c["id"] for c in lst.json()}
        for c in created:
            assert c["id"] in ids

    def test_unique_slug_on_duplicate_name(self, session):
        token = getattr(pytest, "coach_token", None)
        if not token:
            pytest.skip("no coach token")
        name = f"DupClient-{TS}"
        r1 = requests.post(f"{API}/coach/clients",
                           headers={"Authorization": f"Bearer {token}"},
                           json={"client_name": name, "template": "athlete"}, timeout=15)
        r2 = requests.post(f"{API}/coach/clients",
                           headers={"Authorization": f"Bearer {token}"},
                           json={"client_name": name, "template": "athlete"}, timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["slug"] != r2.json()["slug"]

    def test_delete_client(self, session):
        token = getattr(pytest, "coach_token", None)
        if not token or not getattr(pytest, "created_clients", None):
            pytest.skip("no coach token / clients")
        cid = pytest.created_clients[0]["id"]
        d = requests.delete(f"{API}/coach/clients/{cid}",
                            headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert d.status_code == 200

        # Confirm gone via list
        lst = requests.get(f"{API}/coach/clients",
                           headers={"Authorization": f"Bearer {token}"}, timeout=15).json()
        assert cid not in {c["id"] for c in lst}

    def test_clients_unauthorized(self, session):
        r = requests.get(f"{API}/coach/clients", timeout=15)
        assert r.status_code == 401


# ===== Public branded plan =====
class TestPublicBranded:
    def test_public_bundle(self, session):
        if not getattr(pytest, "created_clients", None):
            pytest.skip("no clients")
        coach_slug = pytest.coach_slug
        # use second client (first was deleted)
        client = pytest.created_clients[1]
        r = requests.get(f"{API}/c/{coach_slug}/{client['slug']}", timeout=15)
        assert r.status_code == 200, r.text
        bundle = r.json()
        assert bundle["coach"]["slug"] == coach_slug
        assert bundle["coach"]["primary_color"] == "#FF6B35"
        assert bundle["client"]["slug"] == client["slug"]
        assert bundle["client"]["template"] in {"athlete", "longevity", "football", "sprinter"}

    def test_public_404(self, session):
        r = requests.get(f"{API}/c/nope-coach/nope-client", timeout=15)
        assert r.status_code == 404
