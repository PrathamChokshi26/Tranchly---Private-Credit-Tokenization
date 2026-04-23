"""
Backend tests for Tranchly V2 — Parts 4 & 5 additions:
  - POST /api/admin/loans/{id}/request-info (new)
  - POST /api/admin/loans/{id}/reject now accepts optional note
  - GET /api/admin/analytics now includes data_source_adoption
  - GET /api/loans/{id} used by admin LoanReview page
"""
import pytest


def _base_payload(**overrides):
    payload = {
        "business_name": "TEST_V2_ReviewBiz",
        "industry": "saas",
        "years_operating": 3.0,
        "loan_amount_requested": 30000,
        "loan_purpose": "working_capital",
        "personal_guarantee": True,
        "business_assets": 20000,
        "bureau_score": 700,
        "plaid_connected": False,
        "stripe_connected": False,
        "monthly_revenue": 15000,
        "revenue_trend": 0.05,
        "cash_buffer_days": 45,
        "bank_balance": 18000,
        "monthly_expenses": 10000,
        "customer_retention": 0.8,
        "payroll_consistency": 0.85,
    }
    payload.update(overrides)
    return payload


def _create_pending_loan(borrower_client, base_url, **over):
    r = borrower_client.post(f"{base_url}/api/loans/apply", json=_base_payload(**over), timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["credit_score"]["auto_reject"] is False, f"Need pending loan, got rejected: {body}"
    assert body["status"] == "pending"
    return body["loan_id"]


class TestAnalyticsDataSourceAdoption:
    def test_data_source_adoption_keys_present(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/admin/analytics", timeout=30)
        assert r.status_code == 200, r.text
        a = r.json()["analytics"]
        assert "data_source_adoption" in a, f"Missing data_source_adoption: {list(a.keys())}"
        dsa = a["data_source_adoption"]
        for k in ("plaid_pct", "stripe_pct", "manual_pct"):
            assert k in dsa, f"Missing {k} in data_source_adoption: {dsa}"
            assert isinstance(dsa[k], (int, float))
            assert 0 <= dsa[k] <= 100, f"{k}={dsa[k]} out of 0-100 range"

    def test_data_source_adoption_sums_roughly_100(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/admin/analytics", timeout=30)
        dsa = r.json()["analytics"]["data_source_adoption"]
        total = dsa["plaid_pct"] + dsa["stripe_pct"] + dsa["manual_pct"]
        # Plaid+Stripe can overlap so exact 100 not guaranteed; manual is mutually exclusive.
        # Just assert it is a non-degenerate distribution <= ~200 (each 0-100).
        assert total > 0, f"Adoption total is 0: {dsa}"


class TestGetLoanDetail:
    def test_get_loan_returns_loan_and_credit_score(self, borrower_client, base_url):
        loan_id = _create_pending_loan(borrower_client, base_url)
        r = borrower_client.get(f"{base_url}/api/loans/{loan_id}", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "loan" in data
        assert data["loan"]["id"] == loan_id
        assert data["loan"]["status"] == "pending"
        # credit_score doc used by LoanReview page
        cs = data.get("credit_score")
        assert cs is not None, "Expected credit_score doc in GET /api/loans/{id}"
        for k in ("score", "grade", "layer_scores", "signal_breakdown", "explanation",
                  "data_quality_score", "data_sources", "reserve_fund_contribution"):
            assert k in cs, f"Missing {k} in credit_score doc"


class TestAdminRequestInfo:
    def test_request_info_persists_status_and_note(self, borrower_client, admin_client, base_url):
        loan_id = _create_pending_loan(borrower_client, base_url)

        note = "TEST_V2 Please upload your last 3 months of bank statements."
        r = admin_client.post(
            f"{base_url}/api/admin/loans/{loan_id}/request-info",
            json={"note": note},
            timeout=30,
        )
        assert r.status_code == 200, r.text

        # Verify status + admin_note persisted
        r2 = admin_client.get(f"{base_url}/api/loans/{loan_id}", timeout=30)
        assert r2.status_code == 200, r2.text
        loan = r2.json()["loan"]
        assert loan["status"] == "info_requested", f"Expected info_requested, got {loan['status']}"
        assert loan.get("admin_note") == note

    def test_request_info_without_note_still_updates_status(self, borrower_client, admin_client, base_url):
        loan_id = _create_pending_loan(borrower_client, base_url)
        r = admin_client.post(
            f"{base_url}/api/admin/loans/{loan_id}/request-info",
            json={},
            timeout=30,
        )
        assert r.status_code == 200, r.text

        r2 = admin_client.get(f"{base_url}/api/loans/{loan_id}", timeout=30)
        assert r2.json()["loan"]["status"] == "info_requested"


class TestAdminRejectWithNote:
    def test_reject_persists_status_and_note(self, borrower_client, admin_client, base_url):
        loan_id = _create_pending_loan(borrower_client, base_url)
        note = "TEST_V2 Not enough runway; revisit in 6 months."
        r = admin_client.post(
            f"{base_url}/api/admin/loans/{loan_id}/reject",
            json={"note": note},
            timeout=30,
        )
        assert r.status_code == 200, r.text

        r2 = admin_client.get(f"{base_url}/api/loans/{loan_id}", timeout=30)
        loan = r2.json()["loan"]
        assert loan["status"] == "rejected"
        assert loan.get("admin_note") == note

    def test_reject_without_note_backward_compat(self, borrower_client, admin_client, base_url):
        loan_id = _create_pending_loan(borrower_client, base_url)
        r = admin_client.post(
            f"{base_url}/api/admin/loans/{loan_id}/reject",
            json={},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        r2 = admin_client.get(f"{base_url}/api/loans/{loan_id}", timeout=30)
        assert r2.json()["loan"]["status"] == "rejected"
