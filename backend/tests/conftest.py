"""Shared pytest fixtures for Tranchly V2 backend tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback read from frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.strip().split("=", 1)[1].rstrip("/")
                    break
    except Exception:
        pass

BORROWER_EMAIL = "borrower@test.com"
BORROWER_PASSWORD = "test123"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "test123"


@pytest.fixture(scope="session")
def base_url():
    assert BASE_URL, "REACT_APP_BACKEND_URL is not configured"
    return BASE_URL


@pytest.fixture(scope="session")
def api():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def _login(api, base_url, email, password):
    r = api.post(f"{base_url}/api/auth/login", json={"email": email, "password": password}, timeout=30)
    return r


@pytest.fixture(scope="session")
def borrower_token(api, base_url):
    r = _login(api, base_url, BORROWER_EMAIL, BORROWER_PASSWORD)
    if r.status_code != 200:
        pytest.skip(f"Borrower login failed: {r.status_code} {r.text}")
    data = r.json()
    token = data.get("token") or data.get("access_token")
    if not token:
        pytest.skip(f"No token in login response: {data}")
    return token


@pytest.fixture(scope="session")
def admin_token(api, base_url):
    r = _login(api, base_url, ADMIN_EMAIL, ADMIN_PASSWORD)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    data = r.json()
    token = data.get("token") or data.get("access_token")
    if not token:
        pytest.skip(f"No token in login response: {data}")
    return token


@pytest.fixture
def borrower_client(api, borrower_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {borrower_token}",
    })
    return s


@pytest.fixture
def admin_client(api, admin_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    return s
