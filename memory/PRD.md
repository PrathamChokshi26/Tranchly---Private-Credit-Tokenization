# Tranchly — Product Requirements Document

## Original Problem Statement
Build "Tranchly" (formerly Slice), a private credit tokenization platform connecting SME borrowers with retail investors. Finalize Plaid and Stripe integrations and upgrade the platform to the **Tranchly V2 Credit Scoring Engine** — a three-layer model that is predictive, explainable, and defensible.

## Personas
- **Borrower** — SME business owner applying for $20K–$500K loans.
- **Investor** — Retail user buying tokenized loan shares.
- **Admin** — Platform operator reviewing applications, approving/rejecting loans.

## Core Requirements
1. Plaid integration for bank data (balance, cash buffer, NSF, revenue trend) — ✅ DONE
2. Stripe Connect integration for revenue data (MRR, refund rate, concentration) — ✅ DONE
3. V2 Credit Scoring Engine with three layers (Ability 40% / Willingness 20-35% / Protection 25%) — ✅ DONE
4. Borrower Step 1: Business info + Personal Guarantee + Business Assets + Bureau Score — ✅ DONE
5. Borrower Step 3: Grade card + Layer bars + Explainability + Data Quality + Signal table + Reserve Fund — ✅ DONE
6. Admin Applications Queue: 15-signal breakdown with source badges + Layer bars + Explanation + Auto-reject flags + Reserve Fund — ✅ DONE
7. Admin Analytics: Investor Protection Fund card + Credit Model Performance card — ✅ DONE

## Current Architecture
```
/app/
├── backend/
│   ├── services/
│   │   ├── credit_scoring.py  (V2 engine — 490 lines)
│   │   ├── plaid_service.py
│   │   └── stripe_service.py
│   ├── tests/
│   │   ├── conftest.py
│   │   └── test_v2_credit_scoring.py  (13 tests, all green)
│   └── server.py  (~1670 lines; TODO: split into routers/)
├── frontend/src/
│   ├── components/ (PlaidLink, StripeConnect, GradeBadge, ...)
│   └── pages/
│       ├── admin/ (AdminDashboard, Analytics, ApplicationsQueue, AllLoans, AdminUsers)
│       └── borrower/ (BorrowerDashboard, CapitalPassport, LoanApplication, LoanTracker)
```

## V2 Credit Scoring Schema
- **Grades**: A (78-100, 8-10% APR), B (62-77, 11-14%), C (45-61, 15-18%), Reject (<45)
- **Auto-reject triggers**: monthly revenue <$3K, years <0.5, NSF >5, loan >2x annual revenue, FICO <580
- **Reserve Fund**: 3% of every approved loan → global `reserve_fund` collection in MongoDB

## Changelog
### 2026-02 — V2 Scoring Rollout ✅
- Created `/app/backend/services/credit_scoring.py` (V2 three-layer engine with explainability & auto-reject)
- Rewrote `POST /api/loans/apply` to use V2 engine, persist full payload to `loans` + `credit_scores` collections, and upsert `reserve_fund` global doc
- Extended `LoanApplicationRequest` with `personal_guarantee`, `business_assets`, `bureau_score`
- Added `reserve_fund` and `credit_model` blocks to `GET /api/admin/analytics`
- Rebuilt borrower Step 1 (new V2 fields)
- Rebuilt admin ApplicationsQueue (V2 expanded view with source badges)
- Added `/app/backend/tests/test_v2_credit_scoring.py` (13 tests, all green)

### 2026-02 — V2 Parts 3/4/5 Refactor ✅
- **Part 3**: Step 1 already has `personal_guarantee` checkbox + `business_assets` input (data-testids: `checkbox-personal-guarantee`, `input-business-assets`, `input-bureau-score`)
- **Part 4**: Created standalone `/app/frontend/src/pages/borrower/LoanResults.jsx`. Extracted full V2 result UI (grade card, layer bars, explanation, data quality, signal breakdown, reserve fund). Wired route `/borrower/results` in `App.js`. `LoanApplication.jsx` now `navigate('/borrower/results', { state: { result } })` on submit; direct page access without state redirects back to /borrower/apply.
- **Part 5**: Created standalone `/app/frontend/src/pages/admin/LoanReview.jsx` with scoring summary + 3 layer bars, 15-signal table with 4-colour source badges (Plaid=green / Stripe=purple / Manual=gray / Platform=teal), explainability panels, reserve fund contribution, and admin actions (Approve / Reject / Request More Info + override note textarea). Wired route `/admin/applications/:loanId`. ApplicationsQueue links to it via `Open Full Review`.
- Added backend endpoint `POST /api/admin/loans/{loan_id}/request-info` (status=info_requested, persists admin_note). Reject endpoint now accepts optional `note`.
- Added `analytics.data_source_adoption` (plaid_pct/stripe_pct/manual_pct) to `GET /api/admin/analytics`.
- Analytics page now has 3 new metric cards: IPF total balance, Grade distribution **donut**, Data source adoption **horizontal bars**.
- `/app/backend/tests/test_v2_admin_review.py` added (7 new tests, 20/20 overall PASS).

### Previously
- Plaid button stuck on "Initializing" → fixed
- Plaid "User ID not available" → fixed (JWT extraction)
- Submit button validation → fixed (manual fields optional when Plaid connected)
- Stripe UI refactored (removed raw secret key input)
- Credit engine `TypeError: float - NoneType` → fixed via `safe_float`

## Roadmap

### P0 — Current Focus
- ✅ V2 Credit Scoring E2E rollout — DONE & tested

### P1 — Near-term Polish
- Split `server.py` (~1670 lines) into `routers/loans.py`, `routers/admin.py`, `routers/auth.py`
- Add data-testids to Login.jsx for future E2E auth flows
- Auto-open Step 2 "manual data" `<details>` when Plaid not connected
- Align "12 vs 15 signals" messaging (V2 returns 12 live signals; admin says "15-Signal Breakdown" — reconcile)

### P2 — Phase 2
- Layer 5: DeFi Yield integration (BlackRock BUIDL, Aave, Compound) for idle capital
- Layer 4: Real smart contracts on Polygon/Base (replace mock blockchain)
- Layer 7: Fireblocks institutional custody

### P3 — Phase 3
- Layer 8: Securitize API for institutional bridge

## Testing
- Backend regression: `pytest /app/backend/tests/ -v` — 13/13 green
- Frontend E2E: verified via testing_agent_v3_fork (all V2 data-testids render, full flow works)

## Known Issues / Mocks
- Blockchain minting = MOCKED (not relevant to V2 scoring)
- Emergent-managed emails = live via Resend

## Credentials
See `/app/memory/test_credentials.md`
