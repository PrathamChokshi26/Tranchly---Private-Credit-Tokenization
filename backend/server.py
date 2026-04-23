from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from pathlib import Path

# Load .env BEFORE any module that reads env vars
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import json
import math
import secrets
import httpx

from auth import hash_password, verify_password, create_access_token, get_current_user, require_role
from credit_engine import calculate_credit_score
from mock_blockchain import (
    generate_tx_hash, generate_wallet_address,
    create_mint_transaction, create_buy_transaction,
    create_yield_transaction, create_resale_transaction
)
from services.email_service import (
    send_loan_application_received,
    send_credit_score_ready,
    send_loan_approved,
    send_repayment_due_reminder,
    send_investment_confirmed,
    send_yield_distributed,
)

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'tranchly_platform')]

app = FastAPI(title="Tranchly Platform API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Persona KYC Config
PERSONA_API_KEY = os.environ.get('PERSONA_API_KEY', '')
PERSONA_TEMPLATE_ID = os.environ.get('PERSONA_TEMPLATE_ID', '')
PERSONA_ENV = os.environ.get('PERSONA_ENV', 'sandbox')

# ============= PYDANTIC MODELS =============

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str  # "borrower" | "investor" | "admin"

class LoginRequest(BaseModel):
    email: str
    password: str

class PlaidDataInput(BaseModel):
    institution_name: Optional[str] = None
    account_last_four: Optional[str] = None
    balance: Optional[float] = None
    buffer_days: Optional[int] = None
    transactions_count: Optional[int] = None
    revenue_trend: Optional[float] = None
    avg_monthly_revenue: Optional[float] = None
    negative_balance_days: Optional[int] = 0

class StripeDataInput(BaseModel):
    business_name: Optional[str] = None
    avg_monthly_revenue: Optional[float] = None
    current_mrr: Optional[float] = None
    revenue_trend: Optional[float] = None
    revenue_consistency: Optional[float] = None

class LoanApplicationRequest(BaseModel):
    business_name: str
    industry: str
    years_operating: float
    loan_amount_requested: Optional[float] = None  # Made optional, will use loan_amount if not provided
    loan_amount: Optional[float] = None  # Alternative field name
    loan_purpose: str
    
    # Plaid integration
    plaid_connected: Optional[bool] = False
    plaid_data: Optional[PlaidDataInput] = None
    
    # Stripe integration  
    stripe_connected: Optional[bool] = False
    stripe_data: Optional[StripeDataInput] = None
    
    # Manual financial data (optional if Plaid connected)
    monthly_revenue: Optional[float] = None
    bank_balance: Optional[float] = None
    monthly_expenses: Optional[float] = None
    existing_debt: Optional[float] = 0
    existing_loans: Optional[int] = 0
    bureau_score: Optional[int] = 680
    revenue_trend: Optional[float] = 0.05
    customer_retention: Optional[float] = 0.80
    payroll_consistency: Optional[float] = 0.85

class InvestRequest(BaseModel):
    loan_id: str
    token_count: int

class ListTokenRequest(BaseModel):
    token_id: str
    asking_price: float

class BuyListingRequest(BaseModel):
    listing_id: str

class LoanActionRequest(BaseModel):
    term_months: Optional[int] = 12

class SimulateRepaymentRequest(BaseModel):
    loan_id: str

class KycCompleteRequest(BaseModel):
    inquiry_id: str

# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/signup")
async def signup(req: SignupRequest):
    if req.role not in ["borrower", "investor", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = {
        "id": str(uuid.uuid4()),
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "full_name": req.full_name,
        "role": req.role,
        "wallet_address": generate_wallet_address(),
        "usdc_balance": 50000.0 if req.role == "investor" else 0.0,
        "kyc_status": "verified" if req.role == "admin" else "pending",
        "identity_token": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.users.insert_one(user)
    
    token = create_access_token({"sub": user["id"], "email": user["email"], "role": user["role"], "name": user["full_name"]})
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "wallet_address": user["wallet_address"],
            "usdc_balance": user["usdc_balance"],
            "kyc_status": user["kyc_status"],
            "identity_token": user["identity_token"],
        }
    }

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user["id"], "email": user["email"], "role": user["role"], "name": user["full_name"]})
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "wallet_address": user["wallet_address"],
            "usdc_balance": user.get("usdc_balance", 0),
            "kyc_status": user.get("kyc_status", "pending"),
            "identity_token": user.get("identity_token"),
        }
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    payload = await get_current_user(request)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": user}

# ============= KYC ENDPOINTS =============

@api_router.get("/kyc/status")
async def get_kyc_status(request: Request):
    payload = await get_current_user(request)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "kyc_status": user.get("kyc_status", "pending"),
        "identity_token": user.get("identity_token"),
    }

@api_router.post("/kyc/complete")
async def kyc_complete(req: KycCompleteRequest, request: Request):
    payload = await get_current_user(request)
    user_id = payload["sub"]
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Call Persona API to verify inquiry status
    try:
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.get(
                f"https://withpersona.com/api/v1/inquiries/{req.inquiry_id}",
                headers={
                    "Authorization": f"Bearer {PERSONA_API_KEY}",
                    "Persona-Version": "2023-01-05",
                    "Accept": "application/json",
                },
                timeout=15.0,
            )
            
            if resp.status_code == 200:
                data = resp.json()
                inquiry_status = data.get("data", {}).get("attributes", {}).get("status", "")
                logger.info(f"Persona inquiry {req.inquiry_id} status: {inquiry_status}")
            else:
                logger.warning(f"Persona API returned {resp.status_code}: {resp.text}")
                inquiry_status = "completed"  # Sandbox fallback
    except Exception as e:
        logger.warning(f"Persona API call failed: {e}")
        inquiry_status = "completed"  # Sandbox fallback
    
    if inquiry_status in ("completed", "approved"):
        identity_token = "0x" + secrets.token_hex(20)
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "kyc_status": "verified",
                "identity_token": identity_token,
                "kyc_inquiry_id": req.inquiry_id,
                "kyc_verified_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        role = user.get("role", "borrower")
        redirect = "/admin" if role == "admin" else f"/{role}" if role == "investor" else "/borrower"
        return {"success": True, "redirect": redirect, "identity_token": identity_token}
    
    elif inquiry_status in ("declined", "failed"):
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"kyc_status": "rejected", "kyc_inquiry_id": req.inquiry_id}}
        )
        return {"success": False, "message": "Verification failed. Contact hello@tranchly.finance for support."}
    
    else:
        # pending / needs_review / other
        return {"success": False, "message": f"Verification status: {inquiry_status}. Please wait or try again."}

@api_router.post("/kyc/skip")
async def kyc_skip(request: Request):
    """Sandbox-only: Skip KYC verification for development testing."""
    if PERSONA_ENV != "sandbox":
        raise HTTPException(status_code=403, detail="Skip only available in sandbox mode")
    
    payload = await get_current_user(request)
    user_id = payload["sub"]
    
    identity_token = "0x" + secrets.token_hex(20)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "kyc_status": "verified",
            "identity_token": identity_token,
            "kyc_verified_at": datetime.now(timezone.utc).isoformat(),
            "kyc_skip_sandbox": True,
        }}
    )
    
    user = await db.users.find_one({"id": user_id})
    role = user.get("role", "borrower")
    redirect = "/admin" if role == "admin" else f"/{role}" if role == "investor" else "/borrower"
    return {"success": True, "redirect": redirect, "identity_token": identity_token}

@api_router.post("/kyc/webhook")
async def kyc_webhook(request: Request):
    """Handle Persona webhook events."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    event_type = body.get("data", {}).get("attributes", {}).get("name", "")
    inquiry_id = body.get("data", {}).get("attributes", {}).get("payload", {}).get("data", {}).get("id", "")
    
    logger.info(f"Persona webhook: event={event_type}, inquiry={inquiry_id}")
    
    if not inquiry_id:
        return {"received": True}
    
    user = await db.users.find_one({"kyc_inquiry_id": inquiry_id})
    if not user:
        logger.warning(f"No user found for inquiry {inquiry_id}")
        return {"received": True}
    
    if event_type == "inquiry.completed":
        identity_token = "0x" + secrets.token_hex(20)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "kyc_status": "verified",
                "identity_token": identity_token,
                "kyc_verified_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
    elif event_type == "inquiry.expired":
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"kyc_status": "expired"}}
        )
    elif event_type in ("inquiry.failed", "inquiry.declined"):
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"kyc_status": "rejected"}}
        )
    
    return {"received": True}

# ============= ADMIN: USERS WITH KYC =============

@api_router.get("/admin/users")
async def get_admin_users(request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return {"users": users}

# ============= PLATFORM STATS =============

@api_router.get("/stats")
async def get_platform_stats():
    total_loans = await db.loans.count_documents({"status": {"$in": ["approved", "funded", "repaying", "completed"]}})
    total_investors = await db.users.count_documents({"role": "investor"})
    total_borrowed = 0
    total_invested = 0
    
    loans = await db.loans.find({"status": {"$in": ["funded", "repaying", "completed"]}}).to_list(1000)
    for loan in loans:
        total_borrowed += loan.get("loan_amount_approved", 0)
        total_invested += loan.get("tokens_sold", 0) * loan.get("token_price", 50)
    
    avg_yield = 11.5  # platform average APR
    if loans:
        rates = [l.get("interest_rate", 11.5) for l in loans]
        avg_yield = round(sum(rates) / len(rates), 1)
    
    return {
        "total_loans": total_loans,
        "total_investors": total_investors,
        "total_borrowed": total_borrowed,
        "total_invested": total_invested,
        "avg_yield": avg_yield,
        "total_borrowers": await db.users.count_documents({"role": "borrower"}),
    }

# ============= PLAID INTEGRATION =============

@api_router.post("/plaid/create-link-token")
async def create_plaid_link_token(request: Request):
    """Create Plaid Link token for frontend."""
    from services.plaid_service import create_link_token
    
    try:
        # Get authenticated user from JWT token
        user = await get_current_user(request)
        user_id = user["sub"]
        
        logger.info(f"Creating Plaid link token for user: {user_id}")
        link_token = create_link_token(user_id)
        
        logger.info(f"Plaid link token created successfully for user: {user_id}")
        return {"link_token": link_token}
    except HTTPException:
        # Re-raise HTTP exceptions (like 401 Unauthorized)
        raise
    except Exception as e:
        logger.error(f"Failed to create Plaid link token: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to initialize Plaid: {str(e)}")

class PlaidTokenExchangeRequest(BaseModel):
    public_token: str

@api_router.post("/plaid/exchange-token")
async def exchange_plaid_token(req: PlaidTokenExchangeRequest, request: Request):
    """Exchange Plaid public token for access token."""
    from services.plaid_service import exchange_public_token
    
    try:
        # Get authenticated user
        user = await get_current_user(request)
        user_id = user["sub"]
        
        logger.info(f"Exchanging Plaid token for user: {user_id}")
        result = exchange_public_token(req.public_token)
        
        # Store access token in user record
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "plaid_access_token": result["access_token"],
                "plaid_item_id": result["item_id"],
                "plaid_connected_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        logger.info(f"Plaid token exchanged successfully for user: {user_id}")
        return {"success": True, "item_id": result["item_id"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to exchange Plaid token: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to connect Plaid account: {str(e)}")

@api_router.get("/plaid/analyze")
async def analyze_plaid_data(request: Request):
    """Analyze Plaid banking data for credit scoring."""
    from services.plaid_service import analyze_bank_data
    
    try:
        # Get authenticated user
        user = await get_current_user(request)
        user_id = user["sub"]
        
        # Fetch user from DB to get plaid_access_token
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user_doc or not user_doc.get("plaid_access_token"):
            raise HTTPException(status_code=400, detail="Plaid account not connected. Please connect your bank account first.")
        
        logger.info(f"Analyzing Plaid data for user: {user_id}")
        analysis = analyze_bank_data(user_doc["plaid_access_token"])
        
        # Store analysis in user record
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "plaid_analysis": analysis,
                "plaid_analyzed_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        logger.info(f"Plaid analysis completed for user: {user_id}")
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to analyze Plaid data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze banking data: {str(e)}")

# ============= STRIPE INTEGRATION =============

class StripeConnectRequest(BaseModel):
    api_key: str

@api_router.post("/stripe/connect")
async def connect_stripe(req: StripeConnectRequest, request: Request):
    """Connect user's Stripe account by verifying API key."""
    from services.stripe_service import verify_stripe_connection
    
    user = await get_current_user(request)
    
    try:
        verification = verify_stripe_connection(req.api_key)
        
        if not verification.get("valid"):
            raise HTTPException(status_code=400, detail=verification.get("error", "Invalid API key"))
        
        # Store encrypted API key in user record (in production, use proper encryption)
        await db.users.update_one(
            {"id": user["sub"]},
            {"$set": {
                "stripe_api_key": req.api_key,  # TODO: Encrypt in production
                "stripe_business_name": verification.get("business_name", ""),
                "stripe_connected_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        logger.info(f"Stripe connected for user {user['sub']}: {verification.get('business_name')}")
        return {"success": True, "business_name": verification.get("business_name")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to connect Stripe: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/stripe/analyze")
async def analyze_stripe_data(request: Request):
    """Analyze Stripe revenue data for credit scoring."""
    from services.stripe_service import analyze_stripe_revenue
    
    user = await get_current_user(request)
    
    # Fetch user from DB to get stripe_api_key
    user_doc = await db.users.find_one({"id": user["sub"]}, {"_id": 0})
    if not user_doc or not user_doc.get("stripe_api_key"):
        raise HTTPException(status_code=400, detail="Stripe account not connected")
    
    try:
        analysis = analyze_stripe_revenue(user_doc["stripe_api_key"], days=90)
        
        # Store analysis in user record
        await db.users.update_one(
            {"id": user["sub"]},
            {"$set": {
                "stripe_analysis": analysis,
                "stripe_analyzed_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to analyze Stripe data: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============= BORROWER: LOAN APPLICATION =============

@api_router.post("/loans/apply")
async def apply_for_loan(req: LoanApplicationRequest, request: Request):
    """Apply for a loan with Plaid/Stripe integration."""
    user = await get_current_user(request)
    if user["role"] != "borrower":
        raise HTTPException(status_code=403, detail="Only borrowers can apply for loans")
    
    try:
        # Extract loan amount (handle both field names)
        loan_amount = req.loan_amount_requested or req.loan_amount
        if not loan_amount:
            raise HTTPException(status_code=400, detail="Loan amount is required")
        
        if loan_amount < 20000 or loan_amount > 500000:
            raise HTTPException(status_code=400, detail="Loan amount must be between $20,000 and $500,000")
        
        logger.info(f"Processing loan application for user {user['sub']}: ${loan_amount}")
        
        # Build application data for credit scoring
        application_data = {
            "business_name": req.business_name,
            "industry": req.industry,
            "years_operating": req.years_operating,
            "loan_amount_requested": loan_amount,
            "loan_purpose": req.loan_purpose,
            "existing_debt": req.existing_debt or 0,
            "existing_loans": req.existing_loans or 0,
            "bureau_score": req.bureau_score or 680,
            "payroll_consistency": req.payroll_consistency or 0.85,
        }
        
        # Handle Plaid data
        plaid_analysis = None
        if req.plaid_connected and req.plaid_data:
            logger.info(f"Plaid data provided: {req.plaid_data}")
            
            # Auto-calculate avg_monthly_revenue from balance if not provided
            avg_monthly_revenue = req.plaid_data.avg_monthly_revenue
            if not avg_monthly_revenue and req.plaid_data.balance:
                avg_monthly_revenue = req.plaid_data.balance * 3  # Estimate
                logger.info(f"Calculated avg_monthly_revenue from balance: ${avg_monthly_revenue}")
            
            plaid_analysis = {
                "institution_name": req.plaid_data.institution_name or "Bank",
                "account_last_four": req.plaid_data.account_last_four or "****",
                "bank_balance": req.plaid_data.balance or 0,
                "avg_monthly_revenue": avg_monthly_revenue or 0,
                "cash_buffer_days": req.plaid_data.buffer_days or 0,
                "transaction_count": req.plaid_data.transactions_count or 0,
                "revenue_trend": req.plaid_data.revenue_trend or 0.0,
                "negative_balance_days": req.plaid_data.negative_balance_days or 0,
                "source": "plaid",
            }
            
            # Add to application data
            application_data["monthly_revenue"] = avg_monthly_revenue
            application_data["bank_balance"] = req.plaid_data.balance
            application_data["revenue_trend"] = req.plaid_data.revenue_trend or 0.05
        
        # Handle Stripe data
        stripe_analysis = None
        if req.stripe_connected and req.stripe_data:
            logger.info(f"Stripe data provided: {req.stripe_data}")
            
            stripe_revenue = max(
                req.stripe_data.avg_monthly_revenue or 0,
                req.stripe_data.current_mrr or 0
            )
            
            stripe_analysis = {
                "business_name": req.stripe_data.business_name or "",
                "avg_monthly_revenue": req.stripe_data.avg_monthly_revenue or 0,
                "current_mrr": req.stripe_data.current_mrr or 0,
                "revenue_trend": req.stripe_data.revenue_trend or 0.0,
                "revenue_consistency": req.stripe_data.revenue_consistency or 0.0,
                "source": "stripe",
            }
            
            # Use Stripe revenue if higher
            if stripe_revenue > application_data.get("monthly_revenue", 0):
                application_data["monthly_revenue"] = stripe_revenue
            
            if req.stripe_data.revenue_consistency:
                application_data["customer_retention"] = req.stripe_data.revenue_consistency
        
        # Fallback to manual data if no live data
        if not req.plaid_connected and not req.stripe_connected:
            logger.info("No live data connected, using manual input")
            if not req.monthly_revenue:
                raise HTTPException(status_code=400, detail="Monthly revenue is required when Plaid is not connected")
            
            application_data["monthly_revenue"] = req.monthly_revenue
            application_data["bank_balance"] = req.bank_balance
            application_data["monthly_expenses"] = req.monthly_expenses
            application_data["revenue_trend"] = req.revenue_trend or 0.05
            application_data["customer_retention"] = req.customer_retention or 0.80
        
        # Ensure monthly_revenue exists
        if not application_data.get("monthly_revenue"):
            raise HTTPException(status_code=400, detail="Unable to determine monthly revenue from provided data")
        
        logger.info(f"Running credit scoring with data: {application_data}")
        
        # Run credit scoring
        score_result = calculate_credit_score(application_data, plaid_analysis, stripe_analysis)
        
        logger.info(f"Credit score calculated: {score_result['composite_score']} (Grade: {score_result['grade']})")
        
        # Save credit score
        credit_score_record = {
            "id": str(uuid.uuid4()),
            "borrower_id": user["sub"],
            "composite_score": score_result["composite_score"],
            "base_score": score_result.get("base_score", score_result["composite_score"]),
            "quality_boost": score_result.get("quality_boost", 0),
            "grade": score_result["grade"],
            "suggested_apr": score_result["suggested_apr"],
            "max_loan_amount": score_result["max_loan_amount"],
            "signals": score_result["signals"],
            "auto_reject_flags": score_result["auto_reject_flags"],
            "data_quality": score_result.get("data_quality", {}),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # Determine loan amount (min of requested and max allowed)
        approved_amount = min(loan_amount, score_result["max_loan_amount"]) if score_result["grade"] != "Reject" else 0
        token_price = 50.0
        total_tokens = int(approved_amount / token_price) if approved_amount > 0 else 0
        
        loan = {
            "id": str(uuid.uuid4()),
            "borrower_id": user["sub"],
            "borrower_name": user.get("name", "Unknown"),
            "business_name": req.business_name,
            "industry": req.industry,
            "years_operating": req.years_operating,
            "monthly_revenue": application_data.get("monthly_revenue", 0),
            "loan_amount_requested": loan_amount,
            "loan_amount_approved": approved_amount,
            "loan_purpose": req.loan_purpose,
            "status": "rejected" if score_result["grade"] == "Reject" else "pending",
            "grade": score_result["grade"],
            "interest_rate": score_result["suggested_apr"],
            "term_months": 12,
            "total_tokens": total_tokens,
            "tokens_sold": 0,
            "token_price": token_price,
            "credit_score_id": credit_score_record["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "approved_at": None,
            "funded_at": None,
        }
        
        credit_score_record["loan_id"] = loan["id"]
        
        await db.credit_scores.insert_one(credit_score_record)
        await db.loans.insert_one(loan)
        
        logger.info(f"Loan application saved: {loan['id']} (Status: {loan['status']})")
        
        # ── EMAIL 1: Loan Application Received ──
        borrower_user = await db.users.find_one({"id": user["sub"]})
        borrower_email = borrower_user.get("email", "") if borrower_user else ""
        borrower_first = user.get("name", "").split()[0] if user.get("name") else "there"
        send_loan_application_received(
            to_email=borrower_email,
            first_name=borrower_first,
            loan_amount=loan_amount,
            business_name=req.business_name,
            application_id=loan["id"],
            user_id=user["sub"],
        )

        # ── EMAIL 2: Credit Score Ready ──
        send_credit_score_ready(
            to_email=borrower_email,
            first_name=borrower_first,
            business_name=req.business_name,
            grade=score_result["grade"],
            composite_score=score_result["composite_score"],
            suggested_apr=score_result["suggested_apr"],
            max_loan_amount=score_result["max_loan_amount"],
            user_id=user["sub"],
        )

        return {
            "success": True,
            "loan_id": loan["id"],
            "status": loan["status"],
            "credit_score": {
                "id": credit_score_record["id"],
                "composite_score": score_result["composite_score"],
                "grade": score_result["grade"],
                "suggested_apr": score_result["suggested_apr"],
                "max_loan_amount": score_result["max_loan_amount"],
                "auto_reject_flags": score_result["auto_reject_flags"],
                "signals": score_result["signals"],
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Loan application failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Application processing failed: {str(e)}")

@api_router.get("/loans/my-loans")
async def get_my_loans(request: Request):
    user = await get_current_user(request)
    loans = await db.loans.find(
        {"borrower_id": user["sub"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"loans": loans}

@api_router.get("/loans/{loan_id}")
async def get_loan_detail(loan_id: str, request: Request):
    await get_current_user(request)
    loan = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    credit_score = await db.credit_scores.find_one({"loan_id": loan_id}, {"_id": 0})
    repayments = await db.repayments.find({"loan_id": loan_id}, {"_id": 0}).sort("due_date", 1).to_list(100)
    
    return {"loan": loan, "credit_score": credit_score, "repayments": repayments}

@api_router.get("/loans/{loan_id}/credit-score")
async def get_loan_credit_score(loan_id: str, request: Request):
    await get_current_user(request)
    score = await db.credit_scores.find_one({"loan_id": loan_id}, {"_id": 0})
    if not score:
        raise HTTPException(status_code=404, detail="Credit score not found")
    return {"credit_score": score}

# ============= BORROWER: CAPITAL PASSPORT =============

@api_router.get("/borrower/passport")
async def get_capital_passport(request: Request):
    user = await get_current_user(request)
    if user["role"] != "borrower":
        raise HTTPException(status_code=403, detail="Only borrowers have a Capital Passport")
    
    loans = await db.loans.find({"borrower_id": user["sub"]}, {"_id": 0}).to_list(100)
    
    total_loans = len(loans)
    completed = sum(1 for l in loans if l["status"] == "completed")
    active = sum(1 for l in loans if l["status"] in ["funded", "repaying"])
    
    grades = [l["grade"] for l in loans if l["grade"] != "Reject"]
    best_grade = min(grades, key=lambda g: ["A", "B", "C"].index(g)) if grades else "N/A"
    
    total_repaid = 0
    total_due = 0
    repayments = await db.repayments.find({"loan_id": {"$in": [l["id"] for l in loans]}}, {"_id": 0}).to_list(1000)
    for r in repayments:
        total_due += r.get("amount", 0)
        if r.get("status") == "paid":
            total_repaid += r.get("amount", 0)
    
    repayment_rate = round((total_repaid / total_due * 100), 1) if total_due > 0 else 100.0
    
    return {
        "passport": {
            "borrower_name": user.get("name", "Unknown"),
            "wallet_address": (await db.users.find_one({"id": user["sub"]})).get("wallet_address", ""),
            "total_loans": total_loans,
            "completed_loans": completed,
            "active_loans": active,
            "best_grade": best_grade,
            "repayment_rate": repayment_rate,
            "total_borrowed": sum(l.get("loan_amount_approved", 0) for l in loans),
            "total_repaid": total_repaid,
            "loan_history": [
                {
                    "id": l["id"],
                    "business_name": l["business_name"],
                    "amount": l["loan_amount_approved"],
                    "grade": l["grade"],
                    "status": l["status"],
                    "date": l["created_at"],
                }
                for l in loans
            ],
            "member_since": loans[0]["created_at"] if loans else datetime.now(timezone.utc).isoformat(),
        }
    }

# ============= INVESTOR: MARKETPLACE =============

@api_router.get("/marketplace/loans")
async def get_marketplace_loans(request: Request, grade: Optional[str] = None, industry: Optional[str] = None):
    await get_current_user(request)
    
    query = {"status": {"$in": ["approved", "funded", "repaying"]}}
    if grade:
        query["grade"] = grade.upper()
    if industry:
        query["industry"] = industry
    
    loans = await db.loans.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for loan in loans:
        tokens_available = loan["total_tokens"] - loan["tokens_sold"]
        if tokens_available > 0 or loan["status"] in ["funded", "repaying"]:
            result.append({
                **loan,
                "tokens_available": tokens_available,
                "percent_funded": round((loan["tokens_sold"] / loan["total_tokens"] * 100), 1) if loan["total_tokens"] > 0 else 0,
            })
    
    return {"loans": result}

@api_router.post("/marketplace/invest")
async def invest_in_loan(req: InvestRequest, request: Request):
    user = await get_current_user(request)
    if user["role"] != "investor":
        raise HTTPException(status_code=403, detail="Only investors can invest")
    
    loan = await db.loans.find_one({"id": req.loan_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan["status"] not in ["approved", "funded", "repaying"]:
        raise HTTPException(status_code=400, detail="Loan not available for investment")
    
    tokens_available = loan["total_tokens"] - loan["tokens_sold"]
    if req.token_count > tokens_available:
        raise HTTPException(status_code=400, detail=f"Only {tokens_available} tokens available")
    if req.token_count < 1:
        raise HTTPException(status_code=400, detail="Must buy at least 1 token")
    
    total_cost = req.token_count * loan["token_price"]
    
    investor = await db.users.find_one({"id": user["sub"]})
    if not investor or investor.get("usdc_balance", 0) < total_cost:
        raise HTTPException(status_code=400, detail="Insufficient USDC balance")
    
    # Deduct balance
    await db.users.update_one({"id": user["sub"]}, {"$inc": {"usdc_balance": -total_cost}})
    
    # Create token records
    token_ids = []
    for i in range(req.token_count):
        token = {
            "id": str(uuid.uuid4()),
            "loan_id": req.loan_id,
            "token_index": loan["tokens_sold"] + i + 1,
            "owner_id": user["sub"],
            "price": loan["token_price"],
            "status": "sold",
            "mint_tx_hash": generate_tx_hash(),
            "purchase_tx_hash": generate_tx_hash(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.loan_tokens.insert_one(token)
        token_ids.append(token["id"])
    
    # Update loan tokens_sold
    new_sold = loan["tokens_sold"] + req.token_count
    new_status = loan["status"]
    if new_sold >= loan["total_tokens"] and loan["status"] == "approved":
        new_status = "funded"
    
    await db.loans.update_one(
        {"id": req.loan_id},
        {"$set": {"tokens_sold": new_sold, "status": new_status, "funded_at": datetime.now(timezone.utc).isoformat() if new_status == "funded" else loan.get("funded_at")}}
    )
    
    # Create investment record
    investment = {
        "id": str(uuid.uuid4()),
        "investor_id": user["sub"],
        "loan_id": req.loan_id,
        "token_ids": token_ids,
        "token_count": req.token_count,
        "amount_invested": total_cost,
        "yield_earned": 0,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.investments.insert_one(investment)
    
    # Log blockchain transaction
    tx = create_buy_transaction(investor["wallet_address"], req.loan_id, req.token_count, total_cost)
    await db.transactions.insert_one(tx)
    
    # ── EMAIL 5: Investment Confirmed ──
    projected_yield = total_cost * loan["interest_rate"] / 100 * loan["term_months"] / 12
    send_investment_confirmed(
        to_email=investor.get("email", ""),
        first_name=investor.get("full_name", "").split()[0] if investor.get("full_name") else "there",
        token_count=req.token_count,
        amount_invested=total_cost,
        grade=loan["grade"],
        apr=loan["interest_rate"],
        projected_yield=round(projected_yield, 2),
        tx_hash=tx["tx_hash"],
        user_id=user["sub"],
    )

    return {
        "success": True,
        "investment_id": investment["id"],
        "tokens_purchased": req.token_count,
        "total_cost": total_cost,
        "tx_hash": tx["tx_hash"],
        "new_balance": investor["usdc_balance"] - total_cost,
    }

# ============= INVESTOR: PORTFOLIO =============

@api_router.get("/portfolio")
async def get_portfolio(request: Request):
    user = await get_current_user(request)
    if user["role"] != "investor":
        raise HTTPException(status_code=403, detail="Only investors have portfolios")
    
    investor = await db.users.find_one({"id": user["sub"]}, {"_id": 0, "password_hash": 0})
    
    investments = await db.investments.find({"investor_id": user["sub"]}, {"_id": 0}).to_list(1000)
    
    total_invested = sum(inv["amount_invested"] for inv in investments)
    total_yield = sum(inv.get("yield_earned", 0) for inv in investments)
    active_positions = sum(1 for inv in investments if inv["status"] == "active")
    
    # Enrich investments with loan data
    enriched = []
    for inv in investments:
        loan = await db.loans.find_one({"id": inv["loan_id"]}, {"_id": 0})
        if loan:
            enriched.append({
                **inv,
                "loan": {
                    "business_name": loan["business_name"],
                    "grade": loan["grade"],
                    "interest_rate": loan["interest_rate"],
                    "status": loan["status"],
                    "industry": loan["industry"],
                }
            })
    
    return {
        "portfolio": {
            "total_invested": total_invested,
            "total_yield_earned": total_yield,
            "active_positions": active_positions,
            "usdc_balance": investor.get("usdc_balance", 0),
            "investments": enriched,
        }
    }

@api_router.get("/portfolio/yield-history")
async def get_yield_history(request: Request):
    user = await get_current_user(request)
    if user["role"] != "investor":
        raise HTTPException(status_code=403, detail="Only investors can view yield history")
    
    yields = await db.yield_payments.find(
        {"investor_id": user["sub"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return {"yield_history": yields}

@api_router.get("/portfolio/tokens")
async def get_my_tokens(request: Request):
    user = await get_current_user(request)
    if user["role"] != "investor":
        raise HTTPException(status_code=403, detail="Only investors can view tokens")
    
    tokens = await db.loan_tokens.find({"owner_id": user["sub"]}, {"_id": 0}).to_list(1000)
    
    enriched = []
    for token in tokens:
        loan = await db.loans.find_one({"id": token["loan_id"]}, {"_id": 0})
        if loan:
            enriched.append({
                **token,
                "loan": {
                    "business_name": loan["business_name"],
                    "grade": loan["grade"],
                    "interest_rate": loan["interest_rate"],
                    "status": loan["status"],
                }
            })
    
    return {"tokens": enriched}

# ============= SECONDARY MARKETPLACE =============

@api_router.post("/marketplace/list-token")
async def list_token_for_sale(req: ListTokenRequest, request: Request):
    user = await get_current_user(request)
    if user["role"] != "investor":
        raise HTTPException(status_code=403, detail="Only investors can list tokens")
    
    token = await db.loan_tokens.find_one({"id": req.token_id, "owner_id": user["sub"]})
    if not token:
        raise HTTPException(status_code=404, detail="Token not found or not owned by you")
    if token["status"] == "listed_for_resale":
        raise HTTPException(status_code=400, detail="Token already listed")
    
    listing = {
        "id": str(uuid.uuid4()),
        "token_id": req.token_id,
        "loan_id": token["loan_id"],
        "seller_id": user["sub"],
        "asking_price": req.asking_price,
        "original_price": token["price"],
        "status": "active",
        "buyer_id": None,
        "tx_hash": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.token_listings.insert_one(listing)
    await db.loan_tokens.update_one({"id": req.token_id}, {"$set": {"status": "listed_for_resale"}})
    
    return {"success": True, "listing_id": listing["id"]}

@api_router.get("/marketplace/secondary")
async def get_secondary_listings(request: Request):
    await get_current_user(request)
    
    listings = await db.token_listings.find({"status": "active"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    enriched = []
    for listing in listings:
        loan = await db.loans.find_one({"id": listing["loan_id"]}, {"_id": 0})
        seller = await db.users.find_one({"id": listing["seller_id"]}, {"_id": 0, "password_hash": 0})
        if loan:
            enriched.append({
                **listing,
                "loan": {
                    "business_name": loan["business_name"],
                    "grade": loan["grade"],
                    "interest_rate": loan["interest_rate"],
                    "industry": loan["industry"],
                },
                "seller_name": seller.get("full_name", "Anonymous") if seller else "Anonymous",
            })
    
    return {"listings": enriched}

@api_router.post("/marketplace/buy-listing")
async def buy_listing(req: BuyListingRequest, request: Request):
    user = await get_current_user(request)
    if user["role"] != "investor":
        raise HTTPException(status_code=403, detail="Only investors can buy tokens")
    
    listing = await db.token_listings.find_one({"id": req.listing_id, "status": "active"})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found or already sold")
    
    if listing["seller_id"] == user["sub"]:
        raise HTTPException(status_code=400, detail="Cannot buy your own listing")
    
    buyer = await db.users.find_one({"id": user["sub"]})
    if buyer.get("usdc_balance", 0) < listing["asking_price"]:
        raise HTTPException(status_code=400, detail="Insufficient USDC balance")
    
    # Transfer funds
    await db.users.update_one({"id": user["sub"]}, {"$inc": {"usdc_balance": -listing["asking_price"]}})
    await db.users.update_one({"id": listing["seller_id"]}, {"$inc": {"usdc_balance": listing["asking_price"]}})
    
    # Transfer token ownership
    await db.loan_tokens.update_one({"id": listing["token_id"]}, {"$set": {"owner_id": user["sub"], "status": "sold"}})
    
    # Update listing
    tx_hash = generate_tx_hash()
    await db.token_listings.update_one(
        {"id": listing["id"]},
        {"$set": {"status": "sold", "buyer_id": user["sub"], "tx_hash": tx_hash}}
    )
    
    # Log transaction
    seller = await db.users.find_one({"id": listing["seller_id"]})
    tx = create_resale_transaction(
        seller.get("wallet_address", ""),
        buyer.get("wallet_address", ""),
        listing["token_id"],
        listing["asking_price"]
    )
    await db.transactions.insert_one(tx)
    
    return {
        "success": True,
        "tx_hash": tx_hash,
        "new_balance": buyer["usdc_balance"] - listing["asking_price"],
    }

# ============= ADMIN ENDPOINTS =============

@api_router.get("/admin/applications")
async def get_pending_applications(request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    loans = await db.loans.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    enriched = []
    for loan in loans:
        score = await db.credit_scores.find_one({"loan_id": loan["id"]}, {"_id": 0})
        borrower = await db.users.find_one({"id": loan["borrower_id"]}, {"_id": 0, "password_hash": 0})
        enriched.append({
            **loan,
            "credit_score": score,
            "borrower": {
                "full_name": borrower.get("full_name", "Unknown") if borrower else "Unknown",
                "email": borrower.get("email", "") if borrower else "",
            }
        })
    
    return {"applications": enriched}

@api_router.post("/admin/loans/{loan_id}/approve")
async def approve_loan(loan_id: str, req: LoanActionRequest, request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    loan = await db.loans.find_one({"id": loan_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan["status"] != "pending":
        raise HTTPException(status_code=400, detail="Loan is not pending")
    
    term = req.term_months or 12
    
    await db.loans.update_one(
        {"id": loan_id},
        {"$set": {
            "status": "approved",
            "term_months": term,
            "approved_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    
    # Mint tokens (mock blockchain)
    tx = create_mint_transaction(loan_id, loan["total_tokens"], loan["token_price"])
    await db.transactions.insert_one(tx)
    
    # Generate repayment schedule
    monthly_rate = loan["interest_rate"] / 100 / 12
    amount = loan["loan_amount_approved"]
    if monthly_rate > 0:
        monthly_payment = amount * (monthly_rate * (1 + monthly_rate)**term) / ((1 + monthly_rate)**term - 1)
    else:
        monthly_payment = amount / term
    
    now = datetime.now(timezone.utc)
    for i in range(term):
        due_date = now + timedelta(days=30 * (i + 1))
        remaining = amount * ((1 + monthly_rate)**(term) - (1 + monthly_rate)**(i)) / ((1 + monthly_rate)**term - 1) if monthly_rate > 0 else amount - (amount/term * i)
        interest_portion = remaining * monthly_rate if monthly_rate > 0 else 0
        principal_portion = monthly_payment - interest_portion
        
        repayment = {
            "id": str(uuid.uuid4()),
            "loan_id": loan_id,
            "payment_number": i + 1,
            "amount": round(monthly_payment, 2),
            "principal": round(principal_portion, 2),
            "interest": round(interest_portion, 2),
            "due_date": due_date.isoformat(),
            "status": "scheduled",
            "tx_hash": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.repayments.insert_one(repayment)
    
    # ── EMAIL 3: Loan Approved & Tokens Minted ──
    borrower = await db.users.find_one({"id": loan["borrower_id"]})
    if borrower:
        first_due = (now + timedelta(days=30)).strftime("%B %d, %Y")
        send_loan_approved(
            to_email=borrower.get("email", ""),
            first_name=borrower.get("full_name", "").split()[0] if borrower.get("full_name") else "there",
            loan_amount=loan["loan_amount_approved"],
            apr=loan["interest_rate"],
            loan_id=loan_id,
            token_address=generate_wallet_address(),
            tx_hash=tx["tx_hash"],
            first_payment_date=first_due,
            monthly_payment=round(monthly_payment, 2),
            user_id=loan["borrower_id"],
        )

    return {
        "success": True,
        "message": f"Loan approved with {term} month term",
        "mint_tx_hash": tx["tx_hash"],
        "tokens_minted": loan["total_tokens"],
    }

@api_router.post("/admin/loans/{loan_id}/reject")
async def reject_loan(loan_id: str, request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    loan = await db.loans.find_one({"id": loan_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    await db.loans.update_one({"id": loan_id}, {"$set": {"status": "rejected"}})
    return {"success": True, "message": "Loan rejected"}

@api_router.post("/admin/simulate-repayment")
async def simulate_repayment(req: SimulateRepaymentRequest, request: Request):
    """Simulate a repayment to test yield distribution flow."""
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    loan = await db.loans.find_one({"id": req.loan_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan["status"] not in ["funded", "repaying"]:
        raise HTTPException(status_code=400, detail="Loan must be funded or repaying to simulate repayment")
    
    # Find next scheduled repayment
    next_repayment = await db.repayments.find_one(
        {"loan_id": req.loan_id, "status": "scheduled"},
        sort=[("payment_number", 1)]
    )
    if not next_repayment:
        raise HTTPException(status_code=400, detail="No scheduled repayments remaining")
    
    # Mark repayment as paid
    repayment_tx = generate_tx_hash()
    await db.repayments.update_one(
        {"id": next_repayment["id"]},
        {"$set": {"status": "paid", "tx_hash": repayment_tx, "paid_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update loan status
    if loan["status"] == "funded":
        await db.loans.update_one({"id": req.loan_id}, {"$set": {"status": "repaying"}})
    
    # Check if all repayments done
    remaining = await db.repayments.count_documents({"loan_id": req.loan_id, "status": "scheduled"})
    if remaining == 0:
        await db.loans.update_one({"id": req.loan_id}, {"$set": {"status": "completed"}})
    
    # Distribute yield to token holders
    tokens = await db.loan_tokens.find({"loan_id": req.loan_id, "owner_id": {"$ne": None}}).to_list(10000)
    
    if not tokens:
        return {"success": True, "message": "Repayment recorded but no token holders to distribute to"}
    
    payment_amount = next_repayment["amount"]
    per_token_yield = payment_amount / loan["total_tokens"]
    
    # Group tokens by owner for batch distribution
    owner_tokens = {}
    for token in tokens:
        oid = token["owner_id"]
        if oid not in owner_tokens:
            owner_tokens[oid] = []
        owner_tokens[oid].append(token)
    
    distributions = []
    for owner_id, owned_tokens in owner_tokens.items():
        owner_yield = per_token_yield * len(owned_tokens)
        
        # Credit USDC to investor
        await db.users.update_one({"id": owner_id}, {"$inc": {"usdc_balance": owner_yield}})
        
        # Update investment yield
        await db.investments.update_many(
            {"investor_id": owner_id, "loan_id": req.loan_id},
            {"$inc": {"yield_earned": owner_yield}}
        )
        
        investor = await db.users.find_one({"id": owner_id})
        
        # Create yield payment record
        yield_payment = {
            "id": str(uuid.uuid4()),
            "repayment_id": next_repayment["id"],
            "investor_id": owner_id,
            "loan_id": req.loan_id,
            "token_count": len(owned_tokens),
            "amount": round(owner_yield, 2),
            "tx_hash": generate_tx_hash(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.yield_payments.insert_one(yield_payment)
        
        # Log blockchain transaction
        tx = create_yield_transaction(
            investor.get("wallet_address", "") if investor else "",
            owner_yield, req.loan_id, next_repayment["id"]
        )
        await db.transactions.insert_one(tx)
        
        # ── EMAIL 6: Yield Distributed ──
        if investor:
            total_inv_yield = 0
            inv_records = await db.investments.find({"investor_id": owner_id}).to_list(1000)
            for ir in inv_records:
                total_inv_yield += ir.get("yield_earned", 0)
            send_yield_distributed(
                to_email=investor.get("email", ""),
                first_name=investor.get("full_name", "").split()[0] if investor.get("full_name") else "there",
                yield_amount=round(owner_yield, 2),
                loan_id=req.loan_id,
                grade=loan.get("grade", ""),
                tx_hash=yield_payment["tx_hash"],
                total_yield_earned=round(total_inv_yield, 2),
                user_id=owner_id,
            )

        distributions.append({
            "investor_id": owner_id,
            "tokens_held": len(owned_tokens),
            "yield_amount": round(owner_yield, 2),
        })
    
    return {
        "success": True,
        "repayment_amount": payment_amount,
        "repayments_remaining": remaining,
        "distributions": distributions,
        "loan_status": "completed" if remaining == 0 else "repaying",
    }

@api_router.get("/admin/analytics")
async def get_admin_analytics(request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_loans = await db.loans.count_documents({})
    approved_loans = await db.loans.count_documents({"status": {"$in": ["approved", "funded", "repaying", "completed"]}})
    pending_loans = await db.loans.count_documents({"status": "pending"})
    rejected_loans = await db.loans.count_documents({"status": "rejected"})
    completed_loans = await db.loans.count_documents({"status": "completed"})
    defaulted_loans = await db.loans.count_documents({"status": "defaulted"})
    
    all_loans = await db.loans.find({"status": {"$in": ["approved", "funded", "repaying", "completed"]}}, {"_id": 0}).to_list(1000)
    total_originated = sum(l.get("loan_amount_approved", 0) for l in all_loans)
    avg_loan_size = total_originated / len(all_loans) if all_loans else 0
    
    total_investors = await db.users.count_documents({"role": "investor"})
    total_borrowers = await db.users.count_documents({"role": "borrower"})
    
    investments = await db.investments.find({}, {"_id": 0}).to_list(10000)
    total_investor_capital = sum(inv["amount_invested"] for inv in investments)
    
    default_rate = round((defaulted_loans / approved_loans * 100), 1) if approved_loans > 0 else 0
    
    # Grade distribution
    grade_dist = {"A": 0, "B": 0, "C": 0, "Reject": 0}
    all_graded = await db.loans.find({}, {"grade": 1}).to_list(1000)
    for l in all_graded:
        g = l.get("grade", "")
        if g in grade_dist:
            grade_dist[g] += 1
    
    return {
        "analytics": {
            "total_loans": total_loans,
            "approved_loans": approved_loans,
            "pending_loans": pending_loans,
            "rejected_loans": rejected_loans,
            "completed_loans": completed_loans,
            "defaulted_loans": defaulted_loans,
            "total_originated": total_originated,
            "avg_loan_size": round(avg_loan_size, 2),
            "total_investors": total_investors,
            "total_borrowers": total_borrowers,
            "total_investor_capital": total_investor_capital,
            "default_rate": default_rate,
            "grade_distribution": grade_dist,
        }
    }

@api_router.get("/admin/all-loans")
async def get_all_loans(request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    loans = await db.loans.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"loans": loans}

# ============= TRANSACTIONS LOG =============

@api_router.get("/transactions")
async def get_transactions(request: Request):
    await get_current_user(request)
    txs = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"transactions": txs}

# ============= HEALTH =============

@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

# ============= BACKGROUND JOB: REPAYMENT REMINDERS =============

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()

async def check_repayment_reminders():
    """Daily job: send reminders for payments due in 3 days."""
    try:
        now = datetime.now(timezone.utc)
        target = now + timedelta(days=3)
        window_start = target.replace(hour=0, minute=0, second=0, microsecond=0)
        window_end = window_start + timedelta(days=1)

        upcoming = await db.repayments.find({
            "status": "scheduled",
            "due_date": {"$gte": window_start.isoformat(), "$lt": window_end.isoformat()},
        }).to_list(1000)

        logger.info(f"[REMINDER-JOB] Found {len(upcoming)} repayments due in 3 days")

        for rep in upcoming:
            loan = await db.loans.find_one({"id": rep["loan_id"]})
            if not loan:
                continue
            borrower = await db.users.find_one({"id": loan["borrower_id"]})
            if not borrower:
                continue

            send_repayment_due_reminder(
                to_email=borrower.get("email", ""),
                first_name=borrower.get("full_name", "").split()[0] if borrower.get("full_name") else "there",
                payment_amount=rep["amount"],
                due_date=datetime.fromisoformat(rep["due_date"]).strftime("%B %d, %Y"),
                loan_id=rep["loan_id"],
                user_id=loan["borrower_id"],
            )

        logger.info(f"[REMINDER-JOB] Processed {len(upcoming)} reminders")
    except Exception as e:
        logger.error(f"[REMINDER-JOB] Error: {e}")

# Schedule at 09:00 UTC daily
scheduler.add_job(check_repayment_reminders, CronTrigger(hour=9, minute=0, timezone="UTC"),
                  id="repayment_reminders", replace_existing=True)

# Also expose a manual trigger for testing
@api_router.post("/admin/trigger-reminders")
async def trigger_reminders(request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    await check_repayment_reminders()
    return {"success": True, "message": "Repayment reminder job executed"}

# ============= APP SETUP =============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_scheduler():
    scheduler.start()
    logger.info("[SCHEDULER] APScheduler started — repayment reminders daily at 09:00 UTC")

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown()
    client.close()

