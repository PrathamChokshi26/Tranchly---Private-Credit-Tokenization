#!/usr/bin/env python3
"""
Tranchly Backend Email Integration Test
Tests the complete email flow with Resend integration (graceful skip mode)
"""

import requests
import json
import time
import os
from datetime import datetime
import random

# Get backend URL from frontend .env
BACKEND_URL = "https://loan-marketplace-12.preview.emergentagent.com/api"

class TranchlyEmailTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.borrower_token = None
        self.admin_token = None
        self.investor_token = None
        self.loan_id = None
        self.test_results = []
        # Generate unique email suffix to avoid conflicts
        self.email_suffix = f"{int(time.time())}{random.randint(100, 999)}"
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} {test_name}: {details}")
        print(f"{status} {test_name}: {details}")
        
    def make_request(self, method, endpoint, data=None, token=None, expect_success=True):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            if expect_success and response.status_code >= 400:
                return None, f"HTTP {response.status_code}: {response.text}"
            
            return response.json() if response.content else {}, None
            
        except requests.exceptions.RequestException as e:
            return None, f"Request failed: {str(e)}"
        except json.JSONDecodeError as e:
            return None, f"JSON decode error: {str(e)}"
            
    def test_health_check(self):
        """Test 1: Health Check"""
        result, error = self.make_request("GET", "/health")
        if error:
            self.log_result("Health Check", False, error)
            return False
            
        if result.get("status") == "healthy":
            self.log_result("Health Check", True, "Backend is running")
            return True
        else:
            self.log_result("Health Check", False, f"Unhealthy: {result}")
            return False
            
    def test_borrower_signup(self):
        """Test 2: Signup borrower"""
        data = {
            "email": f"email_borrower_{self.email_suffix}@test.com",
            "password": "test123",
            "full_name": "Email Test Borrower",
            "role": "borrower"
        }
        
        result, error = self.make_request("POST", "/auth/signup", data)
        if error:
            self.log_result("Borrower Signup", False, error)
            return False
            
        if result.get("token") and result.get("user"):
            self.borrower_token = result["token"]
            self.log_result("Borrower Signup", True, f"Token received, user ID: {result['user']['id']}")
            return True
        else:
            self.log_result("Borrower Signup", False, f"Missing token or user: {result}")
            return False
            
    def test_borrower_kyc_skip(self):
        """Test 3: Skip KYC for borrower"""
        result, error = self.make_request("POST", "/kyc/skip", {}, self.borrower_token)
        if error:
            self.log_result("Borrower KYC Skip", False, error)
            return False
            
        if result.get("success") and result.get("identity_token"):
            self.log_result("Borrower KYC Skip", True, f"Identity token: {result['identity_token'][:20]}...")
            return True
        else:
            self.log_result("Borrower KYC Skip", False, f"KYC skip failed: {result}")
            return False
            
    def test_loan_application(self):
        """Test 4: Apply for loan (triggers Email 1 + Email 2)"""
        data = {
            "business_name": "Email Test Corp",
            "industry": "technology",
            "years_operating": 4,
            "monthly_revenue": 30000,
            "loan_amount_requested": 100000,
            "loan_purpose": "Testing email triggers",
            "bank_balance": 60000,
            "monthly_expenses": 20000,
            "bureau_score": 720
        }
        
        result, error = self.make_request("POST", "/loans/apply", data, self.borrower_token)
        if error:
            self.log_result("Loan Application (Email 1+2)", False, error)
            return False
            
        if result.get("success") and result.get("loan_id") and result.get("credit_score"):
            self.loan_id = result["loan_id"]
            credit_score = result["credit_score"]
            self.log_result("Loan Application (Email 1+2)", True, 
                          f"Loan ID: {self.loan_id}, Grade: {credit_score.get('grade')}, Score: {credit_score.get('composite_score')}")
            return True
        else:
            self.log_result("Loan Application (Email 1+2)", False, f"Application failed: {result}")
            return False
            
    def test_admin_signup(self):
        """Test 5: Signup admin"""
        data = {
            "email": f"email_admin_{self.email_suffix}@test.com",
            "password": "test123",
            "full_name": "Email Admin",
            "role": "admin"
        }
        
        result, error = self.make_request("POST", "/auth/signup", data)
        if error:
            self.log_result("Admin Signup", False, error)
            return False
            
        if result.get("token") and result.get("user"):
            self.admin_token = result["token"]
            self.log_result("Admin Signup", True, f"Admin token received, user ID: {result['user']['id']}")
            return True
        else:
            self.log_result("Admin Signup", False, f"Missing token or user: {result}")
            return False
            
    def test_loan_approval(self):
        """Test 6: Approve loan (triggers Email 3)"""
        if not self.loan_id:
            self.log_result("Loan Approval (Email 3)", False, "No loan ID available")
            return False
            
        data = {"term_months": 12}
        
        result, error = self.make_request("POST", f"/admin/loans/{self.loan_id}/approve", data, self.admin_token)
        if error:
            self.log_result("Loan Approval (Email 3)", False, error)
            return False
            
        if result.get("success") and result.get("mint_tx_hash") and result.get("tokens_minted"):
            self.log_result("Loan Approval (Email 3)", True, 
                          f"Tokens minted: {result['tokens_minted']}, TX: {result['mint_tx_hash'][:20]}...")
            return True
        else:
            self.log_result("Loan Approval (Email 3)", False, f"Approval failed: {result}")
            return False
            
    def test_investor_signup(self):
        """Test 7: Signup investor"""
        data = {
            "email": f"email_investor_{self.email_suffix}@test.com",
            "password": "test123",
            "full_name": "Email Investor",
            "role": "investor"
        }
        
        result, error = self.make_request("POST", "/auth/signup", data)
        if error:
            self.log_result("Investor Signup", False, error)
            return False
            
        if result.get("token") and result.get("user"):
            self.investor_token = result["token"]
            self.log_result("Investor Signup", True, f"Investor token received, user ID: {result['user']['id']}")
            return True
        else:
            self.log_result("Investor Signup", False, f"Missing token or user: {result}")
            return False
            
    def test_investor_kyc_skip(self):
        """Test 8: Skip KYC for investor"""
        result, error = self.make_request("POST", "/kyc/skip", {}, self.investor_token)
        if error:
            self.log_result("Investor KYC Skip", False, error)
            return False
            
        if result.get("success") and result.get("identity_token"):
            self.log_result("Investor KYC Skip", True, f"Identity token: {result['identity_token'][:20]}...")
            return True
        else:
            self.log_result("Investor KYC Skip", False, f"KYC skip failed: {result}")
            return False
            
    def test_investment(self):
        """Test 9: Invest in loan (triggers Email 5)"""
        if not self.loan_id:
            self.log_result("Investment (Email 5)", False, "No loan ID available")
            return False
            
        # Check investor balance first
        result, error = self.make_request("GET", "/auth/me", token=self.investor_token)
        if result and result.get("user"):
            balance = result["user"].get("usdc_balance", 0)
            max_tokens = int(balance / 50)  # Each token costs $50
            tokens_to_buy = min(max_tokens, 100)  # Buy up to 100 tokens or what we can afford
        else:
            tokens_to_buy = 5  # Fallback
            
        data = {
            "loan_id": self.loan_id,
            "token_count": tokens_to_buy
        }
        
        result, error = self.make_request("POST", "/marketplace/invest", data, self.investor_token)
        if error:
            self.log_result("Investment (Email 5)", False, error)
            return False
            
        if result.get("success") and result.get("tx_hash") and result.get("tokens_purchased"):
            self.log_result("Investment (Email 5)", True, 
                          f"Tokens purchased: {result['tokens_purchased']}, TX: {result['tx_hash'][:20]}...")
            return True
        else:
            self.log_result("Investment (Email 5)", False, f"Investment failed: {result}")
            return False
            
    def test_fund_loan_completely(self):
        """Test 9.5: Fund the loan completely to enable repayment simulation"""
        if not self.loan_id:
            self.log_result("Fund Loan Completely", False, "No loan ID available")
            return False
            
        # Check loan status
        result, error = self.make_request("GET", f"/loans/{self.loan_id}", token=self.admin_token)
        if not result or not result.get("loan"):
            self.log_result("Fund Loan Completely", False, "Could not get loan details")
            return False
            
        loan = result["loan"]
        remaining_tokens = loan["total_tokens"] - loan["tokens_sold"]
        
        if remaining_tokens <= 0:
            self.log_result("Fund Loan Completely", True, "Loan already fully funded")
            return True
            
        # Create another investor to fund the remaining tokens
        investor2_data = {
            "email": f"email_investor2_{self.email_suffix}@test.com",
            "password": "test123",
            "full_name": "Email Investor 2",
            "role": "investor"
        }
        
        result, error = self.make_request("POST", "/auth/signup", investor2_data)
        if error:
            self.log_result("Fund Loan Completely", False, f"Failed to create investor2: {error}")
            return False
            
        investor2_token = result.get("token")
        if not investor2_token:
            self.log_result("Fund Loan Completely", False, "No token for investor2")
            return False
            
        # Skip KYC for investor2
        result, error = self.make_request("POST", "/kyc/skip", {}, investor2_token)
        if error:
            self.log_result("Fund Loan Completely", False, f"Failed KYC skip for investor2: {error}")
            return False
            
        # Check investor2 balance and buy remaining tokens
        result, error = self.make_request("GET", "/auth/me", token=investor2_token)
        if result and result.get("user"):
            balance = result["user"].get("usdc_balance", 0)
            max_tokens = int(balance / 50)  # Each token costs $50
            tokens_to_buy = min(max_tokens, remaining_tokens)
            
            if tokens_to_buy > 0:
                invest_data = {
                    "loan_id": self.loan_id,
                    "token_count": tokens_to_buy
                }
                
                result, error = self.make_request("POST", "/marketplace/invest", invest_data, investor2_token)
                if error:
                    self.log_result("Fund Loan Completely", False, f"Investment failed: {error}")
                    return False
                    
                if result.get("success"):
                    self.log_result("Fund Loan Completely", True, 
                                  f"Investor2 bought {tokens_to_buy} tokens, loan should be funded")
                    return True
                    
        self.log_result("Fund Loan Completely", False, "Could not complete funding")
        return False
        
    def test_repayment_simulation(self):
        """Test 10: Simulate repayment (triggers Email 6)"""
        if not self.loan_id:
            self.log_result("Repayment Simulation (Email 6)", False, "No loan ID available")
            return False
            
        data = {"loan_id": self.loan_id}
        
        result, error = self.make_request("POST", "/admin/simulate-repayment", data, self.admin_token)
        if error:
            self.log_result("Repayment Simulation (Email 6)", False, error)
            return False
            
        if result.get("success") and result.get("distributions"):
            distributions = result["distributions"]
            total_yield = sum(d.get("yield_amount", 0) for d in distributions)
            self.log_result("Repayment Simulation (Email 6)", True, 
                          f"Yield distributed: ${total_yield:.2f} to {len(distributions)} investors")
            return True
        else:
            self.log_result("Repayment Simulation (Email 6)", False, f"Simulation failed: {result}")
            return False
        """Test 10: Simulate repayment (triggers Email 6)"""
        if not self.loan_id:
            self.log_result("Repayment Simulation (Email 6)", False, "No loan ID available")
            return False
            
        data = {"loan_id": self.loan_id}
        
        result, error = self.make_request("POST", "/admin/simulate-repayment", data, self.admin_token)
        if error:
            self.log_result("Repayment Simulation (Email 6)", False, error)
            return False
            
        if result.get("success") and result.get("distributions"):
            distributions = result["distributions"]
            total_yield = sum(d.get("yield_amount", 0) for d in distributions)
            self.log_result("Repayment Simulation (Email 6)", True, 
                          f"Yield distributed: ${total_yield:.2f} to {len(distributions)} investors")
            return True
        else:
            self.log_result("Repayment Simulation (Email 6)", False, f"Simulation failed: {result}")
            return False
            
    def test_repayment_reminders(self):
        """Test 11: Trigger repayment reminders (Email 4 check)"""
        result, error = self.make_request("POST", "/admin/trigger-reminders", {}, self.admin_token)
        if error:
            self.log_result("Repayment Reminders (Email 4)", False, error)
            return False
            
        if result.get("success") and result.get("message"):
            self.log_result("Repayment Reminders (Email 4)", True, result["message"])
            return True
        else:
            self.log_result("Repayment Reminders (Email 4)", False, f"Reminder trigger failed: {result}")
            return False
            
    def check_backend_logs(self):
        """Test 12: Check backend logs for [EMAIL-SKIP] entries"""
        try:
            # Check supervisor backend error logs (where email logs are written)
            import subprocess
            result = subprocess.run(
                ["tail", "-n", "200", "/var/log/supervisor/backend.err.log"],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                log_content = result.stdout
                email_skip_count = log_content.count("[EMAIL-SKIP]")
                if email_skip_count > 0:
                    # Extract email types that were skipped
                    email_types = []
                    for line in log_content.split('\n'):
                        if '[EMAIL-SKIP]' in line:
                            if 'LOAN_APPLICATION_RECEIVED' in line:
                                email_types.append('Email 1: Loan Application Received')
                            elif 'CREDIT_SCORE_READY' in line:
                                email_types.append('Email 2: Credit Score Ready')
                            elif 'LOAN_APPROVED_TOKENS_MINTED' in line:
                                email_types.append('Email 3: Loan Approved')
                            elif 'INVESTMENT_CONFIRMED' in line:
                                email_types.append('Email 5: Investment Confirmed')
                    
                    self.log_result("Backend Logs Check", True, 
                                  f"Found {email_skip_count} [EMAIL-SKIP] entries: {', '.join(email_types)}")
                    return True
                else:
                    self.log_result("Backend Logs Check", False, 
                                  "No [EMAIL-SKIP] entries found in error logs")
                    return False
            else:
                self.log_result("Backend Logs Check", False, 
                              f"Failed to read logs: {result.stderr}")
                return False
                
        except Exception as e:
            self.log_result("Backend Logs Check", False, f"Log check error: {str(e)}")
            return False
            
    def run_complete_test(self):
        """Run the complete email integration test flow"""
        print("=" * 80)
        print("TRANCHLY EMAIL INTEGRATION TEST")
        print("Testing complete flow with Resend email triggers (graceful skip mode)")
        print("=" * 80)
        print()
        
        tests = [
            ("Health Check", self.test_health_check),
            ("Borrower Signup", self.test_borrower_signup),
            ("Borrower KYC Skip", self.test_borrower_kyc_skip),
            ("Loan Application (Email 1+2)", self.test_loan_application),
            ("Admin Signup", self.test_admin_signup),
            ("Loan Approval (Email 3)", self.test_loan_approval),
            ("Investor Signup", self.test_investor_signup),
            ("Investor KYC Skip", self.test_investor_kyc_skip),
            ("Investment (Email 5)", self.test_investment),
            ("Fund Loan Completely", self.test_fund_loan_completely),
            ("Repayment Simulation (Email 6)", self.test_repayment_simulation),
            ("Repayment Reminders (Email 4)", self.test_repayment_reminders),
            ("Backend Logs Check", self.check_backend_logs),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\nRunning: {test_name}")
            try:
                if test_func():
                    passed += 1
                time.sleep(1)  # Brief pause between tests
            except Exception as e:
                self.log_result(test_name, False, f"Exception: {str(e)}")
                
        print("\n" + "=" * 80)
        print("EMAIL INTEGRATION TEST SUMMARY")
        print("=" * 80)
        
        for result in self.test_results:
            print(result)
            
        print(f"\nOVERALL RESULT: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL EMAIL INTEGRATION TESTS PASSED!")
            print("✅ All email trigger points work without crashing")
            print("✅ Emails are gracefully skipped with placeholder API key")
            print("✅ Complete loan lifecycle flow functional")
        else:
            print(f"❌ {total - passed} tests failed")
            
        return passed == total

if __name__ == "__main__":
    tester = TranchlyEmailTester()
    success = tester.run_complete_test()
    exit(0 if success else 1)