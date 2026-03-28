import requests
import sys
import json
from datetime import datetime

class TranchlyPlatformAPITester:
    def __init__(self, base_url="https://loan-marketplace-12.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.tokens = {}  # Store tokens for different users
        self.loan_id = None
        self.small_loan_id = None
        self.investment_id = None
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, auth_token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {}
        
        if headers:
            test_headers.update(headers)
            
        if auth_token:
            test_headers['Authorization'] = f'Bearer {auth_token}'
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                test_headers['Content-Type'] = 'application/json'
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                test_headers['Content-Type'] = 'application/json'
                response = requests.put(url, json=data, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if response_data:
                        print(f"   Response: {json.dumps(response_data, indent=2)[:300]}...")
                    return True, response_data
                except:
                    return True, {"message": "Success but no JSON response"}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:500]}...")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:500]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_platform_stats(self):
        """Test platform stats endpoint"""
        return self.run_test("Platform Stats", "GET", "stats", 200)

    def test_login_all_users(self):
        """Login all existing users"""
        users = [
            ("borrower", "borrower@test.com"),
            ("admin", "admin@test.com"), 
            ("investor", "investor@test.com")
        ]
        
        all_success = True
        for role, email in users:
            data = {"email": email, "password": "test123"}
            success, response = self.run_test(f"Login {role.title()}", "POST", "auth/login", 200, data=data)
            if success and 'token' in response:
                self.tokens[role] = response['token']
                print(f"   {role.title()} token saved: {response['token'][:20]}...")
            else:
                all_success = False
        
        return all_success

    def test_login_borrower(self):
        """Test borrower login"""
        data = {
            "email": "borrower@test.com",
            "password": "test123"
        }
        success, response = self.run_test("Login Borrower", "POST", "auth/login", 200, data=data)
        if success and 'token' in response:
            # Verify token matches signup token
            if response['token'] != self.tokens.get('borrower'):
                print(f"   Token verification: New token received")
                self.tokens['borrower'] = response['token']
        return success

    def test_get_me(self):
        """Test get current user endpoint"""
        if 'borrower' not in self.tokens:
            print("❌ No borrower token available")
            return False
        return self.run_test("Get Me", "GET", "auth/me", 200, auth_token=self.tokens['borrower'])

    def test_apply_for_loan(self):
        """Test loan application"""
        if 'borrower' not in self.tokens:
            print("❌ No borrower token available")
            return False
            
        data = {
            "business_name": "TechCorp",
            "industry": "technology",
            "years_operating": 5,
            "monthly_revenue": 25000,
            "loan_amount_requested": 100000,
            "loan_purpose": "Equipment purchase",
            "bank_balance": 50000,
            "monthly_expenses": 18000,
            "existing_debt": 5000,
            "bureau_score": 720
        }
        success, response = self.run_test("Apply for Loan", "POST", "loans/apply", 200, 
                                        data=data, auth_token=self.tokens['borrower'])
        if success and 'loan_id' in response:
            self.loan_id = response['loan_id']
            print(f"   Loan ID saved: {self.loan_id}")
            print(f"   Credit Score: {response.get('credit_score', {}).get('composite_score', 'N/A')}")
            print(f"   Grade: {response.get('credit_score', {}).get('grade', 'N/A')}")
        return success

    def test_get_my_loans(self):
        """Test get my loans endpoint"""
        if 'borrower' not in self.tokens:
            print("❌ No borrower token available")
            return False
        return self.run_test("Get My Loans", "GET", "loans/my-loans", 200, auth_token=self.tokens['borrower'])

    def test_get_loan_detail(self):
        """Test get loan detail endpoint"""
        if 'borrower' not in self.tokens or not self.loan_id:
            print("❌ No borrower token or loan ID available")
            return False
        return self.run_test("Get Loan Detail", "GET", f"loans/{self.loan_id}", 200, 
                           auth_token=self.tokens['borrower'])

    def test_capital_passport(self):
        """Test capital passport endpoint"""
        if 'borrower' not in self.tokens:
            print("❌ No borrower token available")
            return False
        return self.run_test("Capital Passport", "GET", "borrower/passport", 200, 
                           auth_token=self.tokens['borrower'])

    def test_admin_get_pending_applications(self):
        """Test admin get pending applications"""
        if 'admin' not in self.tokens:
            print("❌ No admin token available")
            return False
        return self.run_test("Admin - Get Pending Applications", "GET", "admin/applications", 200, 
                           auth_token=self.tokens['admin'])

    def test_admin_approve_loan(self):
        """Test admin approve loan"""
        if 'admin' not in self.tokens or not self.loan_id:
            print("❌ No admin token or loan ID available")
            return False
        data = {"term_months": 12}
        return self.run_test("Admin - Approve Loan", "POST", f"admin/loans/{self.loan_id}/approve", 200,
                           data=data, auth_token=self.tokens['admin'])

    def test_marketplace_browse_loans(self):
        """Test marketplace browse loans"""
        if 'investor' not in self.tokens:
            print("❌ No investor token available")
            return False
        return self.run_test("Marketplace - Browse Loans", "GET", "marketplace/loans", 200,
                           auth_token=self.tokens['investor'])

    def test_invest_in_loan(self):
        """Test invest in loan"""
        if 'investor' not in self.tokens or not self.loan_id:
            print("❌ No investor token or loan ID available")
            return False
        data = {
            "loan_id": self.loan_id,
            "token_count": 10
        }
        success, response = self.run_test("Invest in Loan", "POST", "marketplace/invest", 200,
                                        data=data, auth_token=self.tokens['investor'])
        if success and 'investment_id' in response:
            self.investment_id = response['investment_id']
            print(f"   Investment ID saved: {self.investment_id}")
        return success

    def test_apply_small_loan(self):
        """Test applying for a smaller loan that can be fully funded"""
        if 'borrower' not in self.tokens:
            print("❌ No borrower token available")
            return False
            
        data = {
            "business_name": "SmallCorp",
            "industry": "retail",
            "years_operating": 3,
            "monthly_revenue": 15000,
            "loan_amount_requested": 30000,  # Smaller loan = 600 tokens at $50 each
            "loan_purpose": "Inventory purchase",
            "bank_balance": 25000,
            "monthly_expenses": 12000,
            "existing_debt": 2000,
            "bureau_score": 700
        }
        success, response = self.run_test("Apply for Small Loan", "POST", "loans/apply", 200, 
                                        data=data, auth_token=self.tokens['borrower'])
        if success and 'loan_id' in response:
            self.small_loan_id = response['loan_id']
            print(f"   Small Loan ID saved: {self.small_loan_id}")
        return success

    def test_admin_approve_small_loan(self):
        """Test admin approve small loan"""
        if 'admin' not in self.tokens or not hasattr(self, 'small_loan_id'):
            print("❌ No admin token or small loan ID available")
            return False
        data = {"term_months": 12}
        return self.run_test("Admin - Approve Small Loan", "POST", f"admin/loans/{self.small_loan_id}/approve", 200,
                           data=data, auth_token=self.tokens['admin'])

    def test_fully_fund_small_loan(self):
        """Test fully funding the small loan"""
        if 'investor' not in self.tokens or not hasattr(self, 'small_loan_id'):
            print("❌ No investor token or small loan ID available")
            return False
        # Fund all 600 tokens for the small loan (600 * $50 = $30,000)
        data = {
            "loan_id": self.small_loan_id,
            "token_count": 600
        }
        success, response = self.run_test("Fully Fund Small Loan", "POST", "marketplace/invest", 200,
                                        data=data, auth_token=self.tokens['investor'])
        return success

    def test_admin_simulate_repayment_small(self):
        """Test admin simulate repayment on small loan"""
        if 'admin' not in self.tokens or not hasattr(self, 'small_loan_id'):
            print("❌ No admin token or small loan ID available")
            return False
        data = {"loan_id": self.small_loan_id}
        return self.run_test("Admin - Simulate Repayment (Small)", "POST", "admin/simulate-repayment", 200,
                           data=data, auth_token=self.tokens['admin'])

    def test_fully_fund_loan(self):
        """Test funding more tokens in the current loan"""
        if 'investor' not in self.tokens or not self.loan_id:
            print("❌ No investor token or loan ID available")
            return False
        # Fund with available balance (investor has $17,500 after small loan, so buy 350 tokens)
        data = {
            "loan_id": self.loan_id,
            "token_count": 350
        }
        success, response = self.run_test("Fund More Tokens", "POST", "marketplace/invest", 200,
                                        data=data, auth_token=self.tokens['investor'])
        return success

    def test_admin_simulate_repayment_existing(self):
        """Test admin simulate repayment on an existing funded loan"""
        if 'admin' not in self.tokens:
            print("❌ No admin token available")
            return False
        
        # Try to find a funded loan from previous tests
        # Let's use the first loan that was created and funded
        existing_loan_id = "de45eba8-f902-4703-8d35-e494127dccf1"  # From first test run
        data = {"loan_id": existing_loan_id}
        return self.run_test("Admin - Simulate Repayment (Existing)", "POST", "admin/simulate-repayment", 200,
                           data=data, auth_token=self.tokens['admin'])

    def test_get_portfolio(self):
        """Test get portfolio"""
        if 'investor' not in self.tokens:
            print("❌ No investor token available")
            return False
        return self.run_test("Get Portfolio", "GET", "portfolio", 200,
                           auth_token=self.tokens['investor'])

    def test_get_tokens(self):
        """Test get tokens"""
        if 'investor' not in self.tokens:
            print("❌ No investor token available")
            return False
        return self.run_test("Get Tokens", "GET", "portfolio/tokens", 200,
                           auth_token=self.tokens['investor'])

    def test_admin_simulate_repayment(self):
        """Test admin simulate repayment"""
        if 'admin' not in self.tokens or not self.loan_id:
            print("❌ No admin token or loan ID available")
            return False
        data = {"loan_id": self.loan_id}
        return self.run_test("Admin - Simulate Repayment", "POST", "admin/simulate-repayment", 200,
                           data=data, auth_token=self.tokens['admin'])

    def test_get_yield_history(self):
        """Test get yield history"""
        if 'investor' not in self.tokens:
            print("❌ No investor token available")
            return False
        return self.run_test("Get Yield History", "GET", "portfolio/yield-history", 200,
                           auth_token=self.tokens['investor'])

    def test_admin_analytics(self):
        """Test admin analytics"""
        if 'admin' not in self.tokens:
            print("❌ No admin token available")
            return False
        return self.run_test("Admin Analytics", "GET", "admin/analytics", 200,
                           auth_token=self.tokens['admin'])

def main():
    print("🚀 Starting Tranchly Platform API Tests")
    print("=" * 60)
    
    tester = TranchlyPlatformAPITester()
    
    # Test sequence as specified in the review request
    test_methods = [
        tester.test_health_check,
        tester.test_platform_stats,
        tester.test_login_all_users,  # Login existing users
        tester.test_login_borrower,
        tester.test_get_me,
        tester.test_apply_for_loan,
        tester.test_get_my_loans,
        tester.test_get_loan_detail,
        tester.test_capital_passport,
        tester.test_admin_get_pending_applications,
        tester.test_admin_approve_loan,
        tester.test_marketplace_browse_loans,
        tester.test_invest_in_loan,
        tester.test_get_portfolio,
        tester.test_get_tokens,
        # Test small loan that can be fully funded
        tester.test_apply_small_loan,
        tester.test_admin_approve_small_loan,
        tester.test_fully_fund_small_loan,
        tester.test_admin_simulate_repayment_small,
        tester.test_get_yield_history,
        tester.test_fully_fund_loan,  # Fund more tokens in main loan
        tester.test_admin_analytics
    ]
    
    # Run all tests in sequence
    for test_method in test_methods:
        try:
            test_method()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            tester.failed_tests.append({
                "test": test_method.__name__,
                "error": str(e)
            })
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests ({len(tester.failed_tests)}):")
        for failure in tester.failed_tests:
            print(f"   • {failure.get('test', 'Unknown')}: {failure.get('error', failure.get('response', 'Unknown error'))}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())