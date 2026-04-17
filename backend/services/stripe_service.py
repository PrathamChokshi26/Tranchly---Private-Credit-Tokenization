"""Stripe integration service for Tranchly - Revenue & MRR Analysis."""

import os
import logging
import stripe
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
from collections import defaultdict

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

def analyze_stripe_revenue(api_key: str = None, days: int = 90) -> Dict[str, Any]:
    """
    Analyze Stripe revenue data for credit scoring.
    
    Args:
        api_key: User's Stripe API key (if provided). If None, uses platform key
        days: Number of days of history to analyze (default 90)
        
    Returns:
        Dictionary with revenue metrics for credit scoring
    """
    # Use user's key if provided, otherwise use platform key
    if api_key:
        stripe.api_key = api_key
    
    try:
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Convert to Unix timestamps
        start_ts = int(start_date.timestamp())
        end_ts = int(end_date.timestamp())
        
        # === Fetch Charges (all successful payments) ===
        charges = []
        has_more = True
        starting_after = None
        
        logger.info(f"Fetching Stripe charges from {start_date.date()} to {end_date.date()}")
        
        while has_more:
            params = {
                'limit': 100,
                'created': {'gte': start_ts, 'lte': end_ts},
            }
            if starting_after:
                params['starting_after'] = starting_after
                
            response = stripe.Charge.list(**params)
            charges.extend([c for c in response.data if c.paid and not c.refunded])
            
            has_more = response.has_more
            if has_more and response.data:
                starting_after = response.data[-1].id
        
        logger.info(f"Retrieved {len(charges)} successful charges")
        
        # === Fetch Active Subscriptions for MRR ===
        subscriptions = []
        has_more_subs = True
        starting_after_sub = None
        
        while has_more_subs:
            params = {'limit': 100, 'status': 'active'}
            if starting_after_sub:
                params['starting_after'] = starting_after_sub
                
            response = stripe.Subscription.list(**params)
            subscriptions.extend(response.data)
            
            has_more_subs = response.has_more
            if has_more_subs and response.data:
                starting_after_sub = response.data[-1].id
        
        logger.info(f"Retrieved {len(subscriptions)} active subscriptions")
        
        # === Calculate Metrics ===
        
        # 1. Monthly Revenue (from charges)
        monthly_revenue = defaultdict(float)
        for charge in charges:
            charge_date = datetime.fromtimestamp(charge.created, tz=timezone.utc)
            month_key = charge_date.strftime("%Y-%m")
            amount_usd = charge.amount / 100  # Convert cents to dollars
            monthly_revenue[month_key] += amount_usd
        
        # 2. Calculate MRR from active subscriptions
        current_mrr = 0
        for sub in subscriptions:
            for item in sub.items.data:
                price = item.price
                quantity = item.quantity
                
                if price.recurring:
                    amount = (price.unit_amount or 0) / 100  # cents to dollars
                    interval = price.recurring.interval
                    interval_count = price.recurring.interval_count
                    
                    # Normalize to monthly
                    if interval == 'month':
                        monthly_amount = amount / interval_count
                    elif interval == 'year':
                        monthly_amount = amount / (12 * interval_count)
                    elif interval == 'week':
                        monthly_amount = (amount * 4.33) / interval_count
                    elif interval == 'day':
                        monthly_amount = (amount * 30) / interval_count
                    else:
                        monthly_amount = amount
                    
                    current_mrr += monthly_amount * quantity
        
        # 3. Average monthly revenue from charges
        months_sorted = sorted(monthly_revenue.keys())
        revenue_values = [monthly_revenue[m] for m in months_sorted]
        avg_monthly_revenue = sum(revenue_values) / len(revenue_values) if revenue_values else 0
        
        # 4. Revenue trend (last 30 days vs prior 60 days average)
        thirty_days_ago = end_date - timedelta(days=30)
        sixty_days_ago = end_date - timedelta(days=60)
        
        last_30_revenue = sum(
            c.amount / 100 for c in charges 
            if datetime.fromtimestamp(c.created, tz=timezone.utc) >= thirty_days_ago
        )
        
        prior_60_revenue = sum(
            c.amount / 100 for c in charges 
            if sixty_days_ago <= datetime.fromtimestamp(c.created, tz=timezone.utc) < thirty_days_ago
        )
        
        prior_60_avg = prior_60_revenue / 2 if prior_60_revenue > 0 else 1
        revenue_trend = (last_30_revenue - prior_60_avg) / prior_60_avg if prior_60_avg else 0
        
        # 5. Transaction consistency (standard deviation)
        if len(revenue_values) >= 2:
            mean_revenue = sum(revenue_values) / len(revenue_values)
            variance = sum((x - mean_revenue) ** 2 for x in revenue_values) / len(revenue_values)
            std_dev = variance ** 0.5
            revenue_consistency = max(0, min(1, 1 - (std_dev / mean_revenue))) if mean_revenue else 0
        else:
            revenue_consistency = 0.5  # Default for insufficient data
        
        # 6. Customer count (unique customers from charges)
        unique_customers = len(set(c.customer for c in charges if c.customer))
        
        # 7. Average transaction value
        avg_transaction_value = sum(c.amount / 100 for c in charges) / len(charges) if charges else 0
        
        # 8. Identify data source
        account = stripe.Account.retrieve()
        business_name = account.get('business_profile', {}).get('name', '') or account.get('email', '')
        
        return {
            "avg_monthly_revenue": round(avg_monthly_revenue, 2),
            "current_mrr": round(current_mrr, 2),
            "revenue_trend": round(revenue_trend, 4),
            "revenue_consistency": round(revenue_consistency, 4),
            "unique_customers": unique_customers,
            "total_transactions": len(charges),
            "avg_transaction_value": round(avg_transaction_value, 2),
            "last_30_days_revenue": round(last_30_revenue, 2),
            "active_subscriptions": len(subscriptions),
            "business_name": business_name,
            "source": "stripe",
            "analysis_period_days": days,
        }
        
    except stripe.error.AuthenticationError as e:
        logger.error(f"Stripe authentication failed: {str(e)}")
        raise ValueError("Invalid Stripe API key")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error: {str(e)}")
        raise ValueError(f"Stripe API error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error analyzing Stripe data: {str(e)}")
        raise
    finally:
        # Reset to platform key
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")


def verify_stripe_connection(api_key: str) -> Dict[str, Any]:
    """
    Verify a user's Stripe API key is valid.
    
    Args:
        api_key: Stripe API key to verify
        
    Returns:
        Dictionary with account information
    """
    original_key = stripe.api_key
    
    try:
        stripe.api_key = api_key
        
        account = stripe.Account.retrieve()
        business_profile = account.get('business_profile', {})
        
        return {
            "valid": True,
            "business_name": business_profile.get('name', '') or account.get('email', ''),
            "country": account.get('country', ''),
            "account_type": account.get('type', ''),
            "charges_enabled": account.get('charges_enabled', False),
        }
        
    except stripe.error.AuthenticationError:
        return {
            "valid": False,
            "error": "Invalid API key"
        }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }
    finally:
        stripe.api_key = original_key
