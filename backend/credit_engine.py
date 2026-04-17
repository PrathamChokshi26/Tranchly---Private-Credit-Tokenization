"""Credit Scoring Engine for Tranchly Platform

Calculates composite credit score from weighted signals:
- Cash flow signals (30%): avg monthly revenue, revenue trend, cash buffer days
- Debt signals (25%): debt-to-revenue, existing loans, payroll consistency
- Business maturity (25%): years operating, customer retention, industry risk
- Repayment history (20%): platform history, on-time rate, bureau score

Grades: A (78-100, 8-10% APR), B (58-77, 11-14% APR), C (42-57, 15-18% APR), Reject (<42)
Auto-reject: months_operating < 6, monthly_revenue < 3000, negative cash flow

Data Quality Score: Rewards live data from Plaid/Stripe over manual inputs
- Both Plaid + Stripe: 100% quality, +5% score boost
- Plaid only: 70% quality, +3% boost
- Stripe only: 70% quality, +3% boost  
- Manual only: 40% quality, no boost
"""

import random
from typing import Dict, Any, Optional

# Industry risk factors (lower = riskier)
INDUSTRY_RISK_MAP = {
    "technology": 0.85,
    "healthcare": 0.80,
    "retail": 0.65,
    "food_beverage": 0.60,
    "manufacturing": 0.70,
    "construction": 0.55,
    "real_estate": 0.75,
    "professional_services": 0.80,
    "education": 0.75,
    "transportation": 0.60,
    "agriculture": 0.55,
    "entertainment": 0.50,
    "ecommerce": 0.70,
    "saas": 0.85,
    "fintech": 0.80,
    "other": 0.65,
}

def calculate_data_quality_score(plaid_data: Optional[Dict] = None, stripe_data: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Calculate Data Quality Score based on live data sources.
    
    Returns:
        Dictionary with quality_score (0-100), boost_percentage, and data_sources
    """
    has_plaid = plaid_data is not None and plaid_data.get("source") == "plaid"
    has_stripe = stripe_data is not None and stripe_data.get("source") == "stripe"
    
    data_sources = []
    if has_plaid:
        data_sources.append({
            "name": "Plaid",
            "connected": True,
            "institution": plaid_data.get("institution_name", "Bank"),
            "last_four": plaid_data.get("account_last_four", "****"),
        })
    
    if has_stripe:
        data_sources.append({
            "name": "Stripe", 
            "connected": True,
            "business_name": stripe_data.get("business_name", "Business"),
            "transactions": stripe_data.get("total_transactions", 0),
        })
    
    # Calculate quality score
    if has_plaid and has_stripe:
        quality_score = 100
        boost_percentage = 5.0  # 5% boost to final score
        quality_grade = "Excellent"
    elif has_plaid or has_stripe:
        quality_score = 70
        boost_percentage = 3.0  # 3% boost
        quality_grade = "Good"
    else:
        quality_score = 40
        boost_percentage = 0.0  # No boost for manual data only
        quality_grade = "Manual"
    
    return {
        "quality_score": quality_score,
        "quality_grade": quality_grade,
        "boost_percentage": boost_percentage,
        "data_sources": data_sources,
        "has_live_data": has_plaid or has_stripe,
    }


def merge_live_data(application_data: dict, plaid_data: Optional[Dict] = None, stripe_data: Optional[Dict] = None) -> dict:
    """
    Merge live Plaid/Stripe data with application data.
    Live data overrides manual inputs where available.
    """
    merged = application_data.copy()
    
    # Plaid data (banking)
    if plaid_data and plaid_data.get("source") == "plaid":
        merged["bank_balance"] = plaid_data.get("bank_balance", merged.get("bank_balance", 0))
        merged["cash_buffer_days"] = plaid_data.get("cash_buffer_days", 0)
        merged["negative_balance_days"] = plaid_data.get("negative_balance_days", 0)
        
        # If Plaid revenue is higher than manual, use it
        plaid_revenue = plaid_data.get("avg_monthly_revenue", 0)
        if plaid_revenue > merged.get("monthly_revenue", 0):
            merged["monthly_revenue"] = plaid_revenue
        
        # Use Plaid revenue trend if available
        if plaid_data.get("revenue_trend"):
            merged["revenue_trend"] = plaid_data["revenue_trend"]
    
    # Stripe data (revenue/MRR)
    if stripe_data and stripe_data.get("source") == "stripe":
        stripe_revenue = stripe_data.get("avg_monthly_revenue", 0)
        stripe_mrr = stripe_data.get("current_mrr", 0)
        
        # Use the higher of Stripe revenue or MRR
        stripe_monthly = max(stripe_revenue, stripe_mrr)
        
        # If Stripe revenue is higher than current, use it
        if stripe_monthly > merged.get("monthly_revenue", 0):
            merged["monthly_revenue"] = stripe_monthly
        
        # Use Stripe revenue trend if available
        if stripe_data.get("revenue_trend"):
            merged["revenue_trend"] = stripe_data["revenue_trend"]
        
        # Use Stripe consistency for customer retention proxy
        if stripe_data.get("revenue_consistency"):
            merged["customer_retention"] = stripe_data["revenue_consistency"]
    
    # Mark data sources
    merged["_data_sources"] = {
        "plaid_used": plaid_data is not None,
        "stripe_used": stripe_data is not None,
    }
    
    return merged


def calculate_credit_score(
    application_data: dict, 
    plaid_data: Optional[Dict] = None, 
    stripe_data: Optional[Dict] = None
) -> dict:
    """
    Calculate credit score from loan application data.
    Integrates live data from Plaid (banking) and Stripe (revenue) when available.
    """
    
    # Calculate Data Quality Score
    data_quality = calculate_data_quality_score(plaid_data, stripe_data)
    
    # Merge live data with application data
    merged_data = merge_live_data(application_data, plaid_data, stripe_data)
    
    auto_reject_flags = []
    
    # Extract inputs (now from merged data)
    monthly_revenue = merged_data.get("monthly_revenue", 0)
    years_operating = merged_data.get("years_operating", 0)
    months_operating = years_operating * 12
    industry = merged_data.get("industry", "other").lower().replace(" ", "_")
    
    # Bank data (prefer Plaid, fallback to manual)
    bank_balance = merged_data.get("bank_balance", monthly_revenue * 2)
    monthly_expenses = merged_data.get("monthly_expenses", monthly_revenue * 0.7)
    existing_debt = merged_data.get("existing_debt", 0)
    bureau_score = merged_data.get("bureau_score", 680)
    
    # Derived metrics
    cash_flow = monthly_revenue - monthly_expenses
    
    # Use Plaid cash_buffer_days if available, otherwise calculate
    if plaid_data and "cash_buffer_days" in plaid_data:
        cash_buffer_days = plaid_data["cash_buffer_days"]
    else:
        cash_buffer_days = (bank_balance / (monthly_expenses / 30)) if monthly_expenses > 0 else 0
    
    debt_to_revenue = (existing_debt / (monthly_revenue * 12)) if monthly_revenue > 0 else 999
    revenue_trend = merged_data.get("revenue_trend", 0.05)  # Live data overrides default
    customer_retention = merged_data.get("customer_retention", 0.80)
    on_time_rate = merged_data.get("on_time_rate", 1.0)
    platform_history_score = merged_data.get("platform_history_score", 50)
    payroll_consistency = merged_data.get("payroll_consistency", 0.85)
    
    # Auto-reject checks
    if months_operating < 6:
        auto_reject_flags.append("Business operating less than 6 months")
    if monthly_revenue < 3000:
        auto_reject_flags.append("Monthly revenue below $3,000 minimum")
    if cash_flow < 0:
        auto_reject_flags.append("Negative cash flow detected")
    
    # === CASH FLOW SIGNALS (30%) ===
    # Revenue score (0-100)
    if monthly_revenue >= 50000:
        revenue_score = 95
    elif monthly_revenue >= 25000:
        revenue_score = 85
    elif monthly_revenue >= 15000:
        revenue_score = 75
    elif monthly_revenue >= 8000:
        revenue_score = 65
    elif monthly_revenue >= 5000:
        revenue_score = 55
    elif monthly_revenue >= 3000:
        revenue_score = 40
    else:
        revenue_score = 20
    
    # Revenue trend score
    if revenue_trend >= 0.15:
        trend_score = 95
    elif revenue_trend >= 0.08:
        trend_score = 80
    elif revenue_trend >= 0.02:
        trend_score = 65
    elif revenue_trend >= 0:
        trend_score = 50
    else:
        trend_score = 25
    
    # Cash buffer score
    if cash_buffer_days >= 90:
        buffer_score = 95
    elif cash_buffer_days >= 60:
        buffer_score = 80
    elif cash_buffer_days >= 30:
        buffer_score = 65
    elif cash_buffer_days >= 15:
        buffer_score = 45
    else:
        buffer_score = 20
    
    cash_flow_score = (revenue_score * 0.4 + trend_score * 0.3 + buffer_score * 0.3)
    
    # === DEBT SIGNALS (25%) ===
    if debt_to_revenue <= 0.1:
        dtr_score = 95
    elif debt_to_revenue <= 0.3:
        dtr_score = 80
    elif debt_to_revenue <= 0.5:
        dtr_score = 65
    elif debt_to_revenue <= 0.8:
        dtr_score = 45
    else:
        dtr_score = 20
    
    existing_loans_count = application_data.get("existing_loans", 0)
    if existing_loans_count == 0:
        existing_loans_score = 90
    elif existing_loans_count <= 2:
        existing_loans_score = 70
    elif existing_loans_count <= 4:
        existing_loans_score = 50
    else:
        existing_loans_score = 25
    
    payroll_score = min(payroll_consistency * 100, 100)
    
    debt_score = (dtr_score * 0.4 + existing_loans_score * 0.3 + payroll_score * 0.3)
    
    # === BUSINESS MATURITY (25%) ===
    if years_operating >= 10:
        years_score = 95
    elif years_operating >= 5:
        years_score = 80
    elif years_operating >= 3:
        years_score = 65
    elif years_operating >= 1:
        years_score = 50
    elif months_operating >= 6:
        years_score = 35
    else:
        years_score = 15
    
    retention_score = min(customer_retention * 100, 100)
    
    industry_risk = INDUSTRY_RISK_MAP.get(industry, 0.65)
    industry_score = industry_risk * 100
    
    maturity_score = (years_score * 0.4 + retention_score * 0.3 + industry_score * 0.3)
    
    # === REPAYMENT HISTORY (20%) ===
    platform_score = min(platform_history_score, 100)
    ontime_score = min(on_time_rate * 100, 100)
    
    if bureau_score >= 750:
        bureau_normalized = 95
    elif bureau_score >= 700:
        bureau_normalized = 80
    elif bureau_score >= 650:
        bureau_normalized = 65
    elif bureau_score >= 600:
        bureau_normalized = 50
    else:
        bureau_normalized = 30
    
    repayment_score = (platform_score * 0.3 + ontime_score * 0.35 + bureau_normalized * 0.35)
    
    # === COMPOSITE SCORE ===
    base_composite_score = (
        cash_flow_score * 0.30 +
        debt_score * 0.25 +
        maturity_score * 0.25 +
        repayment_score * 0.20
    )
    
    # Apply Data Quality Boost
    quality_boost = base_composite_score * (data_quality["boost_percentage"] / 100)
    composite_score = base_composite_score + quality_boost
    
    # Force reject if auto-reject flags
    if auto_reject_flags:
        composite_score = min(composite_score, 35)
    
    # Cap at 100
    composite_score = min(round(composite_score, 1), 100.0)
    
    # === GRADE ASSIGNMENT ===
    if composite_score >= 78:
        grade = "A"
        apr_min, apr_max = 8, 10
    elif composite_score >= 58:
        grade = "B"
        apr_min, apr_max = 11, 14
    elif composite_score >= 42:
        grade = "C"
        apr_min, apr_max = 15, 18
    else:
        grade = "Reject"
        apr_min, apr_max = 0, 0
    
    # Calculate suggested APR (higher score = lower APR within range)
    if grade != "Reject":
        grade_ranges = {"A": (78, 100), "B": (58, 77), "C": (42, 57)}
        low, high = grade_ranges[grade]
        position = (composite_score - low) / (high - low) if high > low else 0.5
        suggested_apr = round(apr_max - (position * (apr_max - apr_min)), 1)
    else:
        suggested_apr = 0
    
    # Max loan amount based on score and revenue
    if grade == "A":
        max_loan = min(monthly_revenue * 12, 500000)
    elif grade == "B":
        max_loan = min(monthly_revenue * 8, 350000)
    elif grade == "C":
        max_loan = min(monthly_revenue * 5, 200000)
    else:
        max_loan = 0
    
    return {
        "composite_score": composite_score,
        "base_score": round(base_composite_score, 1),
        "quality_boost": round(quality_boost, 1),
        "grade": grade,
        "suggested_apr": suggested_apr,
        "max_loan_amount": max_loan,
        "auto_reject_flags": auto_reject_flags,
        "data_quality": data_quality,
        "signals": {
            "cash_flow": {
                "score": round(cash_flow_score, 1),
                "weight": 30,
                "details": {
                    "avg_monthly_revenue": {"value": monthly_revenue, "score": revenue_score},
                    "revenue_trend": {"value": f"{revenue_trend*100:.1f}%", "score": trend_score},
                    "cash_buffer_days": {"value": round(cash_buffer_days, 0), "score": buffer_score},
                }
            },
            "debt": {
                "score": round(debt_score, 1),
                "weight": 25,
                "details": {
                    "debt_to_revenue": {"value": round(debt_to_revenue, 2), "score": dtr_score},
                    "existing_loans": {"value": existing_loans_count, "score": existing_loans_score},
                    "payroll_consistency": {"value": f"{payroll_consistency*100:.0f}%", "score": round(payroll_score)},
                }
            },
            "business_maturity": {
                "score": round(maturity_score, 1),
                "weight": 25,
                "details": {
                    "years_operating": {"value": years_operating, "score": years_score},
                    "customer_retention": {"value": f"{customer_retention*100:.0f}%", "score": round(retention_score)},
                    "industry_risk": {"value": industry, "score": round(industry_score)},
                }
            },
            "repayment_history": {
                "score": round(repayment_score, 1),
                "weight": 20,
                "details": {
                    "platform_history": {"value": platform_history_score, "score": platform_score},
                    "on_time_rate": {"value": f"{on_time_rate*100:.0f}%", "score": round(ontime_score)},
                    "bureau_score": {"value": bureau_score, "score": bureau_normalized},
                }
            },
        }
    }
