"""
Backend tests for Tranchly V2 Credit Scoring Engine rollout.

Covers:
  - POST /api/loans/apply V2 response schema
  - personal_guarantee / business_assets fields
  - Auto-reject triggers (revenue, years_operating, FICO, loan_too_large)
  - Happy-path grade distribution (A/B/C)
  - Reserve Fund (3%) accumulation in MongoDB
  - GET /api/admin/analytics reserve_fund + credit_model blocks
  - GET /api/admin/applications V2 enrichment
"""
import os
import pytest

V2_RESULT_KEYS = {
    "score", "grade", "apr_range", "apr_mid", "max_loan_amount",
    "layer_scores", "signal_breakdown", "explanation",
    "data_quality_score", "data_sources", "reserve_fund_contribution",
    "auto_reject", "auto_reject_flags", "approved_amount",
}


def _base_payload(**overrides):
    payload = {
        "business_name": "TEST_V2_Biz",
        "industry": "saas",
        "years_operating": 3.0,
        "loan_amount_requested": 50000,
        "loan_purpose": "working_capital",
        "personal_guarantee": True,
        "business_assets": 40000,
        "bureau_score": 720,
        "plaid_connected": False,
        "stripe_connected": False,
        "monthly_revenue": 20000,
        "revenue_trend": 0.08,
        "cash_buffer_days": 60,
        "bank_balance": 25000,
        "monthly_expenses": 12000,
        "customer_retention": 0.85,
        "payroll_consistency": 0.9,
    }
    payload.update(overrides)
    return payload


# ──────────────────────────────────────────────────────────
# Health / connectivity
# ──────────────────────────────────────────────────────────
class TestHealth:
    def test_backend_reachable(self, api, base_url):
        r = api.get(f"{base_url}/api/", timeout=15)
        # any 2xx or 404/405 implies server is up. Fail only on connection/5xx.
        assert r.status_code < 500, f"Backend returned {r.status_code}: {r.text[:200]}"


# ──────────────────────────────────────────────────────────
# V2 schema + new fields
# ──────────────────────────────────────────────────────────
class TestLoanApplyV2Schema:
    def test_apply_returns_v2_schema_happy_path(self, borrower_client, base_url):
        payload = _base_payload()
        r = borrower_client.post(f"{base_url}/api/loans/apply", json=payload, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data.get("success") is True
        assert "credit_score" in data
        cs = data["credit_score"]
        missing = V2_RESULT_KEYS - set(cs.keys())
        assert not missing, f"Missing V2 keys: {missing}. Got: {list(cs.keys())}"
        # schema validation
        assert isinstance(cs["layer_scores"], dict)
        assert "layer1_ability" in cs["layer_scores"]
        assert "layer2_willingness" in cs["layer_scores"]
        assert "layer3_protection" in cs["layer_scores"]
        assert isinstance(cs["signal_breakdown"], dict)
        # New V2 signals must be present
        assert "personal_guarantee" in cs["signal_breakdown"]
        assert "business_assets" in cs["signal_breakdown"]
        assert cs["signal_breakdown"]["personal_guarantee"] is True
        assert cs["signal_breakdown"]["business_assets"] == pytest.approx(40000, rel=1e-3)
        assert isinstance(cs["explanation"], dict)
        assert "positive_factors" in cs["explanation"]
        assert isinstance(cs["data_sources"], dict)
        assert cs["reserve_fund_contribution"] == pytest.approx(50000 * 0.03, rel=1e-3)

    def test_personal_guarantee_false_reflected(self, borrower_client, base_url):
        payload = _base_payload(personal_guarantee=False, business_assets=0)
        r = borrower_client.post(f"{base_url}/api/loans/apply", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        sb = r.json()["credit_score"]["signal_breakdown"]
        assert sb["personal_guarantee"] is False
        assert sb["business_assets"] == 0


# ──────────────────────────────────────────────────────────
# Auto-reject triggers
# ──────────────────────────────────────────────────────────
class TestAutoReject:
    def _assert_reject(self, data, flag_name):
        cs = data["credit_score"]
        assert cs["auto_reject"] is True
        assert cs["grade"] == "Reject"
        assert cs["max_loan_amount"] == 0
        flags = [f["flag"] for f in cs["auto_reject_flags"]]
        assert flag_name in flags, f"Expected {flag_name} in {flags}"
        assert data["status"] == "rejected"

    def test_revenue_too_low(self, borrower_client, base_url):
        payload = _base_payload(monthly_revenue=2000)
        r = borrower_client.post(f"{base_url}/api/loans/apply", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        self._assert_reject(r.json(), "revenue_too_low")

    def test_insufficient_history(self, borrower_client, base_url):
        payload = _base_payload(years_operating=0.2)
        r = borrower_client.post(f"{base_url}/api/loans/apply", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        self._assert_reject(r.json(), "insufficient_history")

    def test_credit_score_too_low(self, borrower_client, base_url):
        payload = _base_payload(bureau_score=500)
        r = borrower_client.post(f"{base_url}/api/loans/apply", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        self._assert_reject(r.json(), "credit_score_too_low")

    def test_loan_too_large(self, borrower_client, base_url):
        # monthly=5000 → annual=60000 → 2x=120000; request 200k triggers loan_too_large
        payload = _base_payload(monthly_revenue=5000, loan_amount_requested=200000)
        r = borrower_client.post(f"{base_url}/api/loans/apply", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        self._assert_reject(r.json(), "loan_too_large")


# ──────────────────────────────────────────────────────────
# Grade tiers
# ──────────────────────────────────────────────────────────
class TestGradeTiers:
    def test_grade_a_high_quality(self, borrower_client, base_url):
        payload = _base_payload(
            monthly_revenue=40000, bureau_score=780, personal_guarantee=True,
            business_assets=60000, years_operating=5, revenue_trend=0.12,
            cash_buffer_days=90, loan_amount_requested=50000, industry="saas",
        )
        r = borrower_client.post(f"{base_url}/api/loans/apply", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        cs = r.json()["credit_score"]
        assert cs["grade"] == "A", f"Expected A got {cs['grade']} (score={cs['score']})"
        assert cs["apr_range"] == "8-10%"

    def test_grade_b_medium(self, borrower_client, base_url):
        payload = _base_payload(
            monthly_revenue=12000, bureau_score=680, personal_guarantee=True,
            business_assets=10000, years_operating=2, revenue_trend=0.03,
            cash_buffer_days=30, loan_amount_requested=60000, industry="retail",
        )
        r = borrower_client.post(f"{base_url}/api/loans/apply", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        cs = r.json()["credit_score"]
        assert cs["grade"] == "B", f"Expected B got {cs['grade']} (score={cs['score']})"
        assert cs["apr_range"] == "11-14%"

    def test_grade_c_lower(self, borrower_client, base_url):
        payload = _base_payload(
            monthly_revenue=5000, bureau_score=610, personal_guarantee=False,
            business_assets=0, years_operating=1, revenue_trend=-0.02,
            cash_buffer_days=15, loan_amount_requested=30000, industry="hospitality",
        )
        r = borrower_client.post(f"{base_url}/api/loans/apply", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        cs = r.json()["credit_score"]
        assert cs["grade"] == "C", f"Expected C got {cs['grade']} (score={cs['score']})"
        assert cs["apr_range"] == "15-18%"


# ──────────────────────────────────────────────────────────
# Reserve fund accumulation + admin analytics
# ──────────────────────────────────────────────────────────
class TestReserveFundAndAnalytics:
    def test_reserve_fund_increment_and_analytics(self, borrower_client, admin_client, base_url):
        # Get baseline analytics
        r0 = admin_client.get(f"{base_url}/api/admin/analytics", timeout=30)
        assert r0.status_code == 200, r0.text
        a0 = r0.json()["analytics"]
        assert "reserve_fund" in a0, f"Missing reserve_fund block: {list(a0.keys())}"
        assert "credit_model" in a0, f"Missing credit_model block: {list(a0.keys())}"
        base_total = float(a0["reserve_fund"].get("total_contributed", 0))
        base_loans = int(a0["reserve_fund"].get("loans_contributing", 0))

        # Submit approved loan → expect +3% of 50000 = 1500 added
        payload = _base_payload(
            monthly_revenue=40000, bureau_score=780, personal_guarantee=True,
            business_assets=60000, years_operating=5, revenue_trend=0.1,
            cash_buffer_days=90, loan_amount_requested=50000, industry="saas",
        )
        r = borrower_client.post(f"{base_url}/api/loans/apply", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        cs = r.json()["credit_score"]
        assert cs["grade"] != "Reject"
        contribution = float(cs["reserve_fund_contribution"])
        assert contribution == pytest.approx(1500.0, rel=1e-3)

        # Re-check analytics
        r1 = admin_client.get(f"{base_url}/api/admin/analytics", timeout=30)
        assert r1.status_code == 200, r1.text
        a1 = r1.json()["analytics"]
        new_total = float(a1["reserve_fund"]["total_contributed"])
        new_loans = int(a1["reserve_fund"]["loans_contributing"])
        assert new_total == pytest.approx(base_total + contribution, rel=1e-3), (
            f"Reserve fund not incremented: base={base_total}, new={new_total}, expected=+{contribution}"
        )
        assert new_loans == base_loans + 1

        # credit_model block shape
        cm = a1["credit_model"]
        for key in ("avg_composite_score", "avg_data_quality", "avg_apr", "default_rate_by_grade"):
            assert key in cm, f"Missing credit_model.{key}"
        assert isinstance(cm["default_rate_by_grade"], dict)
        for g in ("A", "B", "C"):
            assert g in cm["default_rate_by_grade"]

    def test_rejected_loan_does_not_contribute(self, borrower_client, admin_client, base_url):
        r0 = admin_client.get(f"{base_url}/api/admin/analytics", timeout=30)
        assert r0.status_code == 200
        base_total = float(r0.json()["analytics"]["reserve_fund"]["total_contributed"])

        payload = _base_payload(monthly_revenue=1000)  # auto-reject
        r = borrower_client.post(f"{base_url}/api/loans/apply", json=payload, timeout=30)
        assert r.status_code == 200
        assert r.json()["credit_score"]["auto_reject"] is True

        r1 = admin_client.get(f"{base_url}/api/admin/analytics", timeout=30)
        new_total = float(r1.json()["analytics"]["reserve_fund"]["total_contributed"])
        assert new_total == pytest.approx(base_total, rel=1e-3), (
            f"Rejected loan should NOT increment reserve fund (base={base_total}, new={new_total})"
        )


# ──────────────────────────────────────────────────────────
# Admin applications queue V2 enrichment
# ──────────────────────────────────────────────────────────
class TestAdminApplications:
    def test_applications_contain_v2_credit_score(self, borrower_client, admin_client, base_url):
        # Ensure at least one pending application
        payload = _base_payload(
            monthly_revenue=15000, bureau_score=700, personal_guarantee=True,
            business_assets=20000, years_operating=3, loan_amount_requested=40000,
        )
        r = borrower_client.post(f"{base_url}/api/loans/apply", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        loan_id = r.json().get("loan_id")
        assert loan_id

        r2 = admin_client.get(f"{base_url}/api/admin/applications", timeout=30)
        assert r2.status_code == 200, r2.text
        apps = r2.json().get("applications", [])
        assert len(apps) > 0, "Expected at least one pending application"

        match = next((a for a in apps if a.get("id") == loan_id), None)
        assert match is not None, f"Newly-created loan {loan_id} not found in queue"
        cs = match.get("credit_score")
        assert cs is not None, "credit_score doc missing on enriched application"
        required = {
            "layer_scores", "signal_breakdown", "explanation",
            "data_sources", "data_quality_score", "reserve_fund_contribution",
        }
        missing = required - set(cs.keys())
        assert not missing, f"Admin queue credit_score missing V2 fields: {missing}"
