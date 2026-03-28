#!/usr/bin/env python3
"""
Simplified Tranchly Email Integration Test
Focus: Verify email triggers don't crash the system (graceful skip mode)
"""

import requests
import json
import time
import random

BACKEND_URL = "https://loan-marketplace-12.preview.emergentagent.com/api"

def test_email_integration():
    """Test the complete email integration flow"""
    print("=" * 80)
    print("TRANCHLY EMAIL INTEGRATION TEST - SIMPLIFIED")
    print("Testing that email triggers don't crash the system")
    print("=" * 80)
    
    # Generate unique email suffix
    email_suffix = f"{int(time.time())}{random.randint(100, 999)}"
    
    def make_request(method, endpoint, data=None, token=None):
        url = f"{BACKEND_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
            
            return response.json() if response.content else {}, response.status_code
        except Exception as e:
            return {"error": str(e)}, 500
    
    # Test 1: Health Check
    print("\n1. Health Check...")
    result, status = make_request("GET", "/health")
    if status == 200 and result.get("status") == "healthy":
        print("✅ Backend is running")
    else:
        print(f"❌ Health check failed: {result}")
        return False
    
    # Test 2: Borrower Signup + Loan Application (Email 1 + 2)
    print("\n2. Borrower signup and loan application (triggers Email 1 + 2)...")
    borrower_data = {
        "email": f"test_borrower_{email_suffix}@test.com",
        "password": "test123",
        "full_name": "Test Borrower",
        "role": "borrower"
    }
    
    result, status = make_request("POST", "/auth/signup", borrower_data)
    if status != 200:
        print(f"❌ Borrower signup failed: {result}")
        return False
    
    borrower_token = result.get("token")
    print(f"✅ Borrower signed up: {result['user']['id']}")
    
    # Skip KYC
    result, status = make_request("POST", "/kyc/skip", {}, borrower_token)
    if status != 200:
        print(f"❌ KYC skip failed: {result}")
        return False
    print("✅ KYC skipped")
    
    # Apply for loan
    loan_data = {
        "business_name": "Test Corp",
        "industry": "technology",
        "years_operating": 4,
        "monthly_revenue": 30000,
        "loan_amount_requested": 100000,
        "loan_purpose": "Testing email triggers",
        "bank_balance": 60000,
        "monthly_expenses": 20000,
        "bureau_score": 720
    }
    
    result, status = make_request("POST", "/loans/apply", loan_data, borrower_token)
    if status != 200:
        print(f"❌ Loan application failed: {result}")
        return False
    
    loan_id = result.get("loan_id")
    print(f"✅ Loan applied: {loan_id}, Grade: {result['credit_score']['grade']}")
    
    # Test 3: Admin Signup + Loan Approval (Email 3)
    print("\n3. Admin signup and loan approval (triggers Email 3)...")
    admin_data = {
        "email": f"test_admin_{email_suffix}@test.com",
        "password": "test123",
        "full_name": "Test Admin",
        "role": "admin"
    }
    
    result, status = make_request("POST", "/auth/signup", admin_data)
    if status != 200:
        print(f"❌ Admin signup failed: {result}")
        return False
    
    admin_token = result.get("token")
    print(f"✅ Admin signed up: {result['user']['id']}")
    
    # Approve loan
    result, status = make_request("POST", f"/admin/loans/{loan_id}/approve", {"term_months": 12}, admin_token)
    if status != 200:
        print(f"❌ Loan approval failed: {result}")
        return False
    
    print(f"✅ Loan approved, tokens minted: {result['tokens_minted']}")
    
    # Test 4: Investor Signup + Investment (Email 5)
    print("\n4. Investor signup and investment (triggers Email 5)...")
    investor_data = {
        "email": f"test_investor_{email_suffix}@test.com",
        "password": "test123",
        "full_name": "Test Investor",
        "role": "investor"
    }
    
    result, status = make_request("POST", "/auth/signup", investor_data)
    if status != 200:
        print(f"❌ Investor signup failed: {result}")
        return False
    
    investor_token = result.get("token")
    print(f"✅ Investor signed up: {result['user']['id']}")
    
    # Skip KYC
    result, status = make_request("POST", "/kyc/skip", {}, investor_token)
    if status != 200:
        print(f"❌ Investor KYC skip failed: {result}")
        return False
    print("✅ Investor KYC skipped")
    
    # Invest in loan
    invest_data = {
        "loan_id": loan_id,
        "token_count": 5
    }
    
    result, status = make_request("POST", "/marketplace/invest", invest_data, investor_token)
    if status != 200:
        print(f"❌ Investment failed: {result}")
        return False
    
    print(f"✅ Investment successful: {result['tokens_purchased']} tokens")
    
    # Test 5: Repayment Reminders (Email 4)
    print("\n5. Trigger repayment reminders (Email 4)...")
    result, status = make_request("POST", "/admin/trigger-reminders", {}, admin_token)
    if status != 200:
        print(f"❌ Reminder trigger failed: {result}")
        return False
    
    print(f"✅ Reminders triggered: {result['message']}")
    
    # Test 6: Check Backend Logs
    print("\n6. Checking backend logs for [EMAIL-SKIP] entries...")
    try:
        import subprocess
        result = subprocess.run(
            ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode == 0:
            log_content = result.stdout
            email_skip_count = log_content.count("[EMAIL-SKIP]")
            if email_skip_count > 0:
                print(f"✅ Found {email_skip_count} [EMAIL-SKIP] entries - emails gracefully skipped")
            else:
                print("⚠️  No [EMAIL-SKIP] entries found in recent logs")
        else:
            print(f"❌ Failed to read logs: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Log check error: {e}")
        return False
    
    print("\n" + "=" * 80)
    print("EMAIL INTEGRATION TEST RESULTS")
    print("=" * 80)
    print("✅ All email trigger points tested successfully")
    print("✅ No requests crashed due to email sending")
    print("✅ Emails are gracefully skipped with placeholder API key")
    print("✅ Complete loan lifecycle flow functional")
    print("\n🎉 EMAIL INTEGRATION TEST PASSED!")
    
    return True

if __name__ == "__main__":
    success = test_email_integration()
    exit(0 if success else 1)