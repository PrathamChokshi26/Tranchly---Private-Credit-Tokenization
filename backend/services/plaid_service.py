"""Plaid integration service for Tranchly."""

import os
import logging
from datetime import date, timedelta
from collections import defaultdict

import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest

logger = logging.getLogger(__name__)

PLAID_CLIENT_ID = os.environ.get("PLAID_CLIENT_ID", "")
PLAID_SECRET = os.environ.get("PLAID_SECRET", "")
PLAID_ENV = os.environ.get("PLAID_ENV", "sandbox")

ENV_MAP = {
    "sandbox": plaid.Environment.Sandbox,
    "production": plaid.Environment.Production,
}

def _get_client():
    configuration = plaid.Configuration(
        host=ENV_MAP.get(PLAID_ENV, plaid.Environment.Sandbox),
        api_key={
            "clientId": PLAID_CLIENT_ID,
            "secret": PLAID_SECRET,
        },
    )
    api_client = plaid.ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)


def create_link_token(user_id: str) -> str:
    """Create a Plaid Link token for the frontend."""
    client = _get_client()
    request = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
        client_name="Tranchly",
        products=[Products("transactions"), Products("auth")],
        country_codes=[CountryCode("US")],
        language="en",
    )
    response = client.link_token_create(request)
    return response.link_token


def exchange_public_token(public_token: str) -> dict:
    """Exchange a public token for an access token."""
    client = _get_client()
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(request)
    return {
        "access_token": response.access_token,
        "item_id": response.item_id,
    }


def get_institution_name(institution_id: str) -> str:
    """
    Fetch institution name from Plaid.
    
    Args:
        institution_id: Plaid institution ID (e.g., "ins_109508")
        
    Returns:
        Institution name (e.g., "First Platypus Bank")
    """
    client = _get_client()
    try:
        request = InstitutionsGetByIdRequest(
            institution_id=institution_id,
            country_codes=[CountryCode("US")],
        )
        response = client.institutions_get_by_id(request)
        institution_name = response.institution.name
        logger.info(f"Fetched institution name: {institution_name} for ID: {institution_id}")
        return institution_name
    except Exception as e:
        logger.error(f"Failed to fetch institution name for {institution_id}: {str(e)}")
        return institution_id  # Return ID as fallback


def analyze_bank_data(access_token: str) -> dict:
    """Pull 90 days of transactions and compute credit signals."""
    client = _get_client()
    end = date.today()
    start = end - timedelta(days=90)

    # --- Transactions ---
    all_txns = []
    offset = 0
    while True:
        request = TransactionsGetRequest(
            access_token=access_token,
            start_date=start,
            end_date=end,
            options={"count": 500, "offset": offset},
        )
        resp = client.transactions_get(request)
        all_txns.extend(resp.transactions)
        if len(all_txns) >= resp.total_transactions:
            break
        offset = len(all_txns)

    # --- Accounts (for current balance) ---
    acct_req = AccountsGetRequest(access_token=access_token)
    acct_resp = client.accounts_get(acct_req)
    accounts = acct_resp.accounts
    institution_id = ""
    institution_name = ""
    account_last_four = ""
    current_balance = 0
    if accounts:
        primary = accounts[0]
        current_balance = primary.balances.current or 0
        account_last_four = primary.mask or ""
    
    # Fetch institution name
    item = acct_resp.item
    if item and item.institution_id:
        institution_id = item.institution_id
        institution_name = get_institution_name(institution_id)

    # --- Compute signals ---
    monthly_inflows = defaultdict(float)
    daily_expenses = defaultdict(float)

    for t in all_txns:
        month_key = t.date.strftime("%Y-%m")
        day_key = t.date.isoformat()
        amt = t.amount  # Plaid: positive = money spent, negative = income
        if amt < 0:
            monthly_inflows[month_key] += abs(amt)
        else:
            daily_expenses[day_key] += amt

    months_sorted = sorted(monthly_inflows.keys())
    inflow_values = [monthly_inflows[m] for m in months_sorted] if months_sorted else [0]
    avg_monthly_revenue = sum(inflow_values) / len(inflow_values) if inflow_values else 0

    # revenue_trend
    thirty_days_ago = end - timedelta(days=30)
    last_30 = sum(abs(t.amount) for t in all_txns if t.amount < 0 and t.date >= thirty_days_ago)
    prior_60 = sum(abs(t.amount) for t in all_txns if t.amount < 0 and t.date < thirty_days_ago)
    prior_60_avg = prior_60 / 2 if prior_60 > 0 else 1
    revenue_trend = (last_30 - prior_60_avg) / prior_60_avg if prior_60_avg else 0

    # cash_buffer_days
    total_days = (end - start).days or 1
    total_outflow = sum(daily_expenses.values())
    avg_daily_expense = total_outflow / total_days if total_days else 1
    cash_buffer_days = current_balance / avg_daily_expense if avg_daily_expense > 0 else 999

    # negative_balance_days
    negative_balance_days = 0
    running = current_balance
    for t in sorted(all_txns, key=lambda x: x.date, reverse=True):
        running += t.amount
        if running < 0:
            negative_balance_days += 1

    return {
        "avg_monthly_revenue": round(avg_monthly_revenue, 2),
        "revenue_trend": round(revenue_trend, 4),
        "cash_buffer_days": round(cash_buffer_days, 1),
        "negative_balance_days": negative_balance_days,
        "bank_balance": round(current_balance, 2),
        "institution_name": institution_name,
        "account_last_four": account_last_four,
        "transaction_count": len(all_txns),
        "source": "plaid",
    }
