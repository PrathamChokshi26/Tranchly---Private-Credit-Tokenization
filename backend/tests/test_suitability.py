"""
Backend tests for Investor Suitability questionnaire.
Covers: POST /api/users/me/suitability acceptance, validation,
and persistence + visibility on /api/auth/me.
"""
import pytest
import requests


INVESTOR_EMAIL = "investor@test.com"
INVESTOR_PASSWORD = "test123"


@pytest.fixture
def investor_client(api, base_url):
    r = api.post(f"{base_url}/api/auth/login",
                 json={"email": INVESTOR_EMAIL, "password": INVESTOR_PASSWORD},
                 timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Investor login failed: {r.status_code} {r.text}")
    token = r.json().get("token") or r.json().get("access_token")
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    })
    return s


class TestSuitability:
    def test_submit_complete_suitability(self, investor_client, base_url):
        payload = {
            "accept_principal_risk": True,
            "understand_targets": True,
            "can_hold_term": True,
            "income_band": "75k_200k",
        }
        r = investor_client.post(f"{base_url}/api/users/me/suitability", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["suitability_completed"] is True

    def test_auth_me_reflects_completion(self, investor_client, base_url):
        # Re-submit to ensure completed
        investor_client.post(f"{base_url}/api/users/me/suitability", json={
            "accept_principal_risk": True,
            "understand_targets": True,
            "can_hold_term": True,
            "income_band": "over_200k",
        }, timeout=30)
        r = investor_client.get(f"{base_url}/api/auth/me", timeout=30)
        assert r.status_code == 200
        user = r.json()["user"]
        assert user.get("suitability_completed") is True
        assert user.get("suitability_income_band") in {"under_75k", "75k_200k", "over_200k", "prefer_not_to_say"}

    def test_rejects_missing_acknowledgement(self, investor_client, base_url):
        payload = {
            "accept_principal_risk": False,  # not accepted
            "understand_targets": True,
            "can_hold_term": True,
            "income_band": "under_75k",
        }
        r = investor_client.post(f"{base_url}/api/users/me/suitability", json=payload, timeout=30)
        assert r.status_code == 400
        assert "acknowledgement" in r.json().get("detail", "").lower()

    def test_rejects_invalid_income_band(self, investor_client, base_url):
        payload = {
            "accept_principal_risk": True,
            "understand_targets": True,
            "can_hold_term": True,
            "income_band": "trillion_dollars",
        }
        r = investor_client.post(f"{base_url}/api/users/me/suitability", json=payload, timeout=30)
        assert r.status_code == 400
        assert "income" in r.json().get("detail", "").lower()
