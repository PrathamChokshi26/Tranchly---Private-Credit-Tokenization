"""
Tranchly Credit Scoring Engine V2
Three-Layer Predictive Model for SME Lending

Layer 1 (40%): Ability to Repay - Cash flow & revenue analysis
Layer 2 (35%): Willingness to Repay - Credit history & platform behavior  
Layer 3 (25%): Downside Protection - Collateral & risk mitigation

Grades: A (78-100, 8-10% APR), B (62-77, 11-14% APR), C (45-61, 15-18% APR), Reject (<45)

Auto-reject triggers:
- Monthly revenue < $3,000
- Business age < 6 months
- NSF events > 5 in 90 days
- Loan > 2x annual revenue
- Personal FICO < 580
"""

from typing import Dict, Any, Optional, List


def safe_float(value, default=0.0):
    """Safely convert value to float with default fallback."""
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize(value, min_val, max_val):
    """
    Normalize a value to 0-100 scale.
    
    Args:
        value: Value to normalize
        min_val: Minimum value (maps to 0)
        max_val: Maximum value (maps to 100)
        
    Returns:
        float: Normalized value between 0 and 100
    """
    if max_val == min_val:
        return 50.0
    clamped = max(min_val, min(max_val, value))
    return ((clamped - min_val) / (max_val - min_val)) * 100.0


def calculate_credit_score(
    application_data: Dict[str, Any],
    plaid_data: Optional[Dict[str, Any]] = None,
    stripe_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Three-layer SME credit scoring engine with explainability.
    
    Returns comprehensive scoring result with grade, APR, max loan amount,
    layer breakdowns, signal analysis, and improvement recommendations.
    """
    
    # ═══════════════════════════════════════════════════════
    # EXTRACT ALL SIGNALS
    # ═══════════════════════════════════════════════════════
    
    # From application form (Step 1)
    years_operating = safe_float(application_data.get('years_operating'), 2)
    loan_amount = safe_float(application_data.get('loan_amount_requested') or application_data.get('loan_amount'), 50000)
    industry = application_data.get('industry', 'retail')
    personal_fico = safe_float(application_data.get('bureau_score'), 650)
    personal_guarantee = bool(application_data.get('personal_guarantee', False))
    business_assets = safe_float(application_data.get('business_assets'), 0)
    
    # From Plaid (live bank data)
    if plaid_data:
        avg_monthly_revenue = safe_float(
            plaid_data.get('avg_monthly_revenue') or (safe_float(plaid_data.get('balance') or plaid_data.get('bank_balance'), 110) * 3),
            1000
        )
        revenue_trend = safe_float(plaid_data.get('revenue_trend'), 0.0)
        cash_buffer_days = safe_float(
            plaid_data.get('buffer_days') or plaid_data.get('cash_buffer_days'),
            30
        )
        nsf_count = safe_float(plaid_data.get('negative_balance_days') or plaid_data.get('nsf_count'), 0)
        payroll_detected = bool(plaid_data.get('payroll_stability', False))
        existing_loan_payments = safe_float(plaid_data.get('existing_loan_payments'), 0)
    else:
        avg_monthly_revenue = safe_float(application_data.get('avg_monthly_revenue') or application_data.get('monthly_revenue'), 5000)
        revenue_trend = safe_float(application_data.get('revenue_trend'), 0.0)
        cash_buffer_days = safe_float(application_data.get('cash_buffer_days'), 30)
        nsf_count = safe_float(application_data.get('nsf_count'), 0)
        payroll_detected = False
        existing_loan_payments = 0
    
    # From Stripe (live revenue data)
    if stripe_data:
        refund_rate = safe_float(stripe_data.get('refund_rate'), 0.05)
        revenue_concentration = safe_float(stripe_data.get('revenue_concentration'), 0.5)
        stripe_mrr = safe_float(stripe_data.get('mrr') or stripe_data.get('current_mrr'), avg_monthly_revenue)
        # Use Stripe MRR if higher quality than Plaid estimate
        if stripe_mrr > 0:
            avg_monthly_revenue = max(avg_monthly_revenue, stripe_mrr)
    else:
        refund_rate = safe_float(application_data.get('refund_rate'), 0.05)
        revenue_concentration = safe_float(application_data.get('revenue_concentration'), 0.5)
    
    # Platform history (returning borrowers)
    platform_loans = safe_float(application_data.get('platform_loan_count'), 0)
    platform_ontime_rate = safe_float(application_data.get('platform_ontime_rate'), 1.0)
    
    annual_revenue = avg_monthly_revenue * 12
    
    # ═══════════════════════════════════════════════════════
    # AUTO-REJECT TRIGGERS (check BEFORE scoring)
    # ═══════════════════════════════════════════════════════
    
    auto_reject_flags = []
    
    if avg_monthly_revenue < 3000:
        auto_reject_flags.append({
            'flag': 'revenue_too_low',
            'message': 'Monthly revenue below $3,000 minimum',
            'improvement': 'Build monthly revenue to $3,000+ and reapply',
            'timeline': '3-6 months'
        })
    
    if years_operating < 0.5:
        auto_reject_flags.append({
            'flag': 'insufficient_history',
            'message': 'Business operating less than 6 months',
            'improvement': 'Reapply after 6 months of operation',
            'timeline': f'{int(round((0.5 - years_operating) * 12))} months'
        })
    
    if nsf_count > 5:
        auto_reject_flags.append({
            'flag': 'excessive_nsf',
            'message': f'{int(nsf_count)} overdraft events in last 90 days',
            'improvement': 'Maintain positive balance for 90 consecutive days',
            'timeline': '3 months'
        })
    
    if loan_amount > annual_revenue * 2:
        auto_reject_flags.append({
            'flag': 'loan_too_large',
            'message': 'Loan amount exceeds 2x annual revenue',
            'improvement': f'Apply for max ${int(annual_revenue * 2):,} based on your revenue',
            'timeline': 'Immediate — reduce loan amount'
        })
    
    if personal_fico < 580:
        auto_reject_flags.append({
            'flag': 'credit_score_too_low',
            'message': 'Personal credit score below 580',
            'improvement': 'Improve personal credit score to 580+ before reapplying',
            'timeline': '6-12 months'
        })
    
    # Return early if any auto-reject triggered
    if auto_reject_flags:
        return {
            'score': 0,
            'grade': 'Reject',
            'apr_range': None,
            'apr_mid': 0,
            'max_loan_amount': 0,
            'auto_reject': True,
            'auto_reject_flags': auto_reject_flags,
            'layer_scores': {},
            'signal_breakdown': {},
            'explanation': {
                'positive_factors': [],
                'negative_factors': [f['message'] for f in auto_reject_flags],
                'improvements': [f['improvement'] for f in auto_reject_flags],
                'summary': f'Application rejected due to {len(auto_reject_flags)} critical issues'
            },
            'data_quality_score': 100 if plaid_data else 40,
            'data_sources': {
                'plaid_connected': bool(plaid_data),
                'stripe_connected': bool(stripe_data),
                'live_signals': 6 if plaid_data else 0,
                'total_signals': 12
            },
            'reserve_fund_contribution': 0
        }
    
    # ═══════════════════════════════════════════════════════
    # LAYER 1: ABILITY TO REPAY (40% weight)
    # ═══════════════════════════════════════════════════════
    
    # Signal 1: Monthly revenue score (0-100)
    revenue_score = normalize(avg_monthly_revenue, 3000, 50000)
    
    # Signal 2: Revenue velocity (0-100)
    # +30% growth = 100, flat = 50, -30% decline = 0
    velocity_score = normalize(revenue_trend + 0.3, 0, 0.6) * 100
    velocity_score = min(100, max(0, velocity_score))
    
    # Signal 3: Cash buffer score (0-100)
    # 90+ days = 100, 30 days = 33, 15 days = 16, 0 = 0
    buffer_score = normalize(cash_buffer_days, 0, 90)
    
    # Signal 4: NSF penalty (0-100, higher = better)
    if nsf_count == 0:
        nsf_score = 100
    elif nsf_count <= 2:
        nsf_score = 70
    elif nsf_count <= 4:
        nsf_score = 40
    else:
        nsf_score = 0
    
    # Signal 5: Refund rate (0-100, lower refund = better)
    # 0-2% refunds = 90-100, 5% = 70, 10% = 40, 20%+ = 20
    refund_score = normalize(1 - refund_rate, 0.80, 1.0) * 100
    refund_score = max(20, min(100, refund_score))
    
    # Signal 6: Payroll stability bonus
    payroll_score = 80 if payroll_detected else 50
    
    layer1_score = (
        revenue_score * 0.30 +
        velocity_score * 0.20 +
        buffer_score * 0.20 +
        nsf_score * 0.15 +
        refund_score * 0.10 +
        payroll_score * 0.05
    )
    
    # ═══════════════════════════════════════════════════════
    # LAYER 2: WILLINGNESS TO REPAY (35% weight for returning, 20% for new)
    # ═══════════════════════════════════════════════════════
    
    is_returning = platform_loans > 0
    layer2_weight = 0.35 if is_returning else 0.20
    
    # Signal 1: Platform history (Capital Passport)
    if platform_loans == 0:
        passport_score = 50  # Neutral for new borrowers
    else:
        passport_score = platform_ontime_rate * 100
    
    # Signal 2: Personal FICO (580-800 range)
    # 750+ = 100, 700 = 75, 650 = 50, 600 = 25, 580 = 0
    fico_score = normalize(personal_fico, 580, 800)
    
    # Signal 3: Existing loan payment behavior
    loan_payment_score = 70 if existing_loan_payments > 0 else 50
    
    # Signal 4: Business age as proxy for stability
    # 5+ years = 100, 3 years = 60, 1 year = 20, 0.5 years = 0
    age_score = normalize(years_operating, 0.5, 5)
    
    layer2_score = (
        passport_score * 0.40 +
        fico_score * 0.35 +
        loan_payment_score * 0.15 +
        age_score * 0.10
    )
    
    # ═══════════════════════════════════════════════════════
    # LAYER 3: DOWNSIDE PROTECTION (25% weight)
    # ═══════════════════════════════════════════════════════
    
    # Signal 1: Personal guarantee
    guarantee_score = 90 if personal_guarantee else 40
    
    # Signal 2: Loan-to-revenue ratio
    # Under 0.5x annual = 100, 1x = 60, 1.5x = 30, 2x = 10
    ltr_ratio = loan_amount / max(annual_revenue, 1)
    ltr_score = normalize(2 - ltr_ratio, 0, 1.5) * 100
    ltr_score = max(10, min(100, ltr_score))
    
    # Signal 3: Business asset coverage
    if loan_amount > 0:
        asset_ratio = business_assets / loan_amount
    else:
        asset_ratio = 0
    asset_score = normalize(asset_ratio, 0, 1) * 100
    asset_score = max(30, min(100, asset_score))
    
    # Signal 4: Industry risk tier
    industry_tiers = {
        # Tier 1 — Low risk (score: 85)
        'saas': 85, 'software': 85, 'technology': 85, 'healthcare': 85,
        'professional_services': 85, 'education': 80, 'financial_services': 80,
        'fintech': 85,
        # Tier 2 — Medium risk (score: 65)
        'retail': 65, 'food_beverage': 65, 'food': 65, 'beverage': 65,
        'construction': 60, 'manufacturing': 65, 'ecommerce': 70,
        'marketing': 65, 'consulting': 70,
        # Tier 3 — High risk (score: 40-50)
        'entertainment': 45, 'travel': 40, 'hospitality': 45,
        'crypto': 35, 'real_estate': 50, 'agriculture': 55
    }
    industry_key = industry.lower().replace(' ', '_')
    industry_score = industry_tiers.get(industry_key, 60)
    
    layer3_score = (
        guarantee_score * 0.35 +
        ltr_score * 0.30 +
        asset_score * 0.20 +
        industry_score * 0.15
    )
    
    # ═══════════════════════════════════════════════════════
    # COMPOSITE SCORE
    # ═══════════════════════════════════════════════════════
    
    layer1_weight = 0.40
    layer3_weight = 0.25
    # layer2_weight already calculated (0.35 or 0.20)
    
    # Ensure weights sum to 1.0
    total_weight = layer1_weight + layer2_weight + layer3_weight
    
    composite_score = round(
        (layer1_score * layer1_weight +
         layer2_score * layer2_weight +
         layer3_score * layer3_weight) / total_weight
    )
    
    composite_score = max(0, min(100, composite_score))
    
    # ═══════════════════════════════════════════════════════
    # GRADE + APR + MAX LOAN AMOUNT
    # ═══════════════════════════════════════════════════════
    
    if composite_score >= 78:
        grade = 'A'
        apr_range = '8-10%'
        apr_mid = 9.0
        max_loan_multiplier = 1.5  # 1.5x annual revenue
    elif composite_score >= 62:
        grade = 'B'
        apr_range = '11-14%'
        apr_mid = 12.5
        max_loan_multiplier = 1.0
    elif composite_score >= 45:
        grade = 'C'
        apr_range = '15-18%'
        apr_mid = 16.5
        max_loan_multiplier = 0.5
    else:
        grade = 'Reject'
        apr_range = None
        apr_mid = 0
        max_loan_multiplier = 0
    
    max_loan_amount = min(
        annual_revenue * max_loan_multiplier,
        500000  # Platform maximum
    )
    max_loan_amount = round(max_loan_amount / 1000) * 1000
    
    # ═══════════════════════════════════════════════════════
    # EXPLAINABILITY (SHAP-style factor analysis)
    # ═══════════════════════════════════════════════════════
    
    positive_factors = []
    negative_factors = []
    improvements = []
    
    # Analyze each signal for explanation
    if avg_monthly_revenue >= 10000:
        positive_factors.append(f'Strong monthly revenue of ${avg_monthly_revenue:,.0f}')
    elif avg_monthly_revenue < 5000:
        negative_factors.append(f'Low monthly revenue (${avg_monthly_revenue:,.0f})')
        improvements.append('Increase monthly revenue above $5,000 for a better rate')
    
    if revenue_trend > 0.10:
        positive_factors.append(f'Revenue growing at {revenue_trend*100:.0f}%/month')
    elif revenue_trend < -0.05:
        negative_factors.append('Declining revenue trend')
        improvements.append('Stabilize revenue for 3+ months before reapplying')
    
    if cash_buffer_days >= 45:
        positive_factors.append(f'{cash_buffer_days:.0f} days cash runway')
    elif cash_buffer_days < 20:
        negative_factors.append(f'Only {cash_buffer_days:.0f} days cash buffer')
        improvements.append('Build cash reserves to 30+ days of operating expenses')
    
    if nsf_count == 0:
        positive_factors.append('Zero overdraft events — excellent cash management')
    elif nsf_count > 0:
        negative_factors.append(f'{int(nsf_count)} overdraft events detected')
        improvements.append('Eliminate overdrafts for 90 days')
    
    if personal_guarantee:
        positive_factors.append('Personal guarantee provided — reduces investor risk')
    else:
        negative_factors.append('No personal guarantee provided')
        improvements.append('Providing a personal guarantee improves your rate by 1-2%')
    
    if personal_fico >= 720:
        positive_factors.append(f'Strong personal credit score ({int(personal_fico)})')
    elif personal_fico < 650:
        negative_factors.append(f'Personal credit score below 650 ({int(personal_fico)})')
        improvements.append('Improve personal credit score to 680+')
    
    if is_returning and platform_ontime_rate == 1.0:
        positive_factors.append('Perfect Tranchly repayment history')
    
    if business_assets >= loan_amount * 0.5:
        positive_factors.append(f'Strong asset coverage (${business_assets:,.0f})')
    
    # ═══════════════════════════════════════════════════════
    # DATA QUALITY SCORE
    # ═══════════════════════════════════════════════════════
    
    live_signals = 0
    total_signals = 12
    
    if plaid_data:
        live_signals += 6  # revenue, trend, buffer, nsf, payroll, loan payments
    if stripe_data:
        live_signals += 3  # refund rate, MRR, concentration
    if personal_fico > 0:
        live_signals += 1
    if business_assets > 0:
        live_signals += 1
    if platform_loans > 0:
        live_signals += 1
    
    data_quality_score = round((live_signals / total_signals) * 100)
    
    # ═══════════════════════════════════════════════════════
    # RESERVE FUND CONTRIBUTION (risk-based by grade)
    # ═══════════════════════════════════════════════════════
    
    if grade == 'A':
        reserve_rate = 0.025  # 2.5%
    elif grade == 'B':
        reserve_rate = 0.05   # 5%
    elif grade == 'C':
        reserve_rate = 0.08   # 8%
    else:
        reserve_rate = 0.0    # Rejected loans = 0
    
    reserve_contribution = round(loan_amount * reserve_rate, 2)
    
    # ═══════════════════════════════════════════════════════
    # RETURN COMPLETE SCORING RESULT
    # ═══════════════════════════════════════════════════════
    
    return {
        'score': composite_score,
        'grade': grade,
        'apr_range': apr_range,
        'apr_mid': apr_mid,
        'max_loan_amount': max_loan_amount,
        'auto_reject': False,
        'auto_reject_flags': [],
        'layer_scores': {
            'layer1_ability': round(layer1_score, 1),
            'layer1_weight': '40%',
            'layer2_willingness': round(layer2_score, 1),
            'layer2_weight': '35%' if is_returning else '20% (new borrower)',
            'layer3_protection': round(layer3_score, 1),
            'layer3_weight': '25%'
        },
        'signal_breakdown': {
            'avg_monthly_revenue': round(avg_monthly_revenue, 2),
            'revenue_trend': round(revenue_trend, 4),
            'cash_buffer_days': round(cash_buffer_days, 1),
            'nsf_count': int(nsf_count),
            'refund_rate': round(refund_rate, 3),
            'payroll_detected': payroll_detected,
            'personal_fico': int(personal_fico),
            'personal_guarantee': personal_guarantee,
            'years_operating': round(years_operating, 1),
            'industry': industry,
            'ltr_ratio': round(ltr_ratio, 2),
            'platform_loans': int(platform_loans),
            'business_assets': round(business_assets, 2),
            'revenue_concentration': round(revenue_concentration, 2),
            'existing_loan_payments': round(existing_loan_payments, 2)
        },
        'explanation': {
            'positive_factors': positive_factors[:3],
            'negative_factors': negative_factors[:3],
            'improvements': improvements[:3],
            'summary': (
                f'Grade {grade} — composite score {composite_score}/100 based on '
                f'{"live Plaid + " if plaid_data else ""}'
                f'{"Stripe + " if stripe_data else ""}'
                f'application data'
            )
        },
        'data_quality_score': data_quality_score,
        'data_sources': {
            'plaid_connected': bool(plaid_data),
            'stripe_connected': bool(stripe_data),
            'live_signals': live_signals,
            'total_signals': total_signals
        },
        'reserve_rate': reserve_rate,
        'reserve_fund_contribution': reserve_contribution
    }
