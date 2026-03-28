#!/usr/bin/env python3
"""
KYC Integration Testing for Tranchly Platform
Tests all KYC-related endpoints and flows
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://loan-marketplace-12.preview.emergentagent.com/api"

class KYCTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}  # Store tokens for different users
        self.users = {}   # Store user data
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    token: Optional[str] = None, expect_status: int = 200) -> Dict[Any, Any]:
        """Make HTTP request with error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            self.log(f"{method} {endpoint} -> {response.status_code}")
            
            if response.status_code != expect_status:
                self.log(f"Expected {expect_status}, got {response.status_code}: {response.text}", "ERROR")
                return {"error": f"Status {response.status_code}", "text": response.text}
                
            return response.json() if response.content else {}
            
        except Exception as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            return {"error": str(e)}
    
    def test_health_check(self) -> bool:
        """Test 1: Health Check"""
        self.log("=== TEST 1: Health Check ===")
        
        result = self.make_request("GET", "/health")
        
        if "error" in result:
            self.log("❌ Health check failed", "ERROR")
            return False
            
        if result.get("status") == "healthy" and result.get("database") == "connected":
            self.log("✅ Health check passed - Backend is running and database connected")
            return True
        else:
            self.log(f"❌ Health check failed - Unexpected response: {result}", "ERROR")
            return False
    
    def test_signup_borrower(self) -> bool:
        """Test 2: Signup new borrower"""
        self.log("=== TEST 2: Signup Borrower ===")
        
        # Use timestamp to make email unique
        import time
        timestamp = str(int(time.time()))
        email = f"kyc_borrower_{timestamp}@test.com"
        
        user_data = {
            "email": email,
            "password": "test123",
            "full_name": "KYC Test User",
            "role": "borrower"
        }
        
        result = self.make_request("POST", "/auth/signup", user_data, expect_status=200)
        
        if "error" in result:
            # If user exists, try to login instead
            if "already registered" in result.get("text", "").lower():
                self.log("User already exists, trying login instead...")
                login_data = {"email": email, "password": "test123"}
                result = self.make_request("POST", "/auth/login", login_data)
                if "error" in result:
                    self.log("❌ Borrower login failed", "ERROR")
                    return False
            else:
                self.log("❌ Borrower signup failed", "ERROR")
                return False
            
        # Verify response structure (API returns "token" not "access_token")
        required_fields = ["token", "user"]
        for field in required_fields:
            if field not in result:
                self.log(f"❌ Missing field in response: {field}", "ERROR")
                return False
        
        user = result["user"]
        if user.get("kyc_status") != "pending":
            self.log(f"❌ Expected kyc_status='pending', got '{user.get('kyc_status')}'", "ERROR")
            return False
            
        if user.get("identity_token") is not None:
            self.log(f"❌ Expected identity_token=null, got '{user.get('identity_token')}'", "ERROR")
            return False
            
        # Store token and user data
        self.tokens["borrower"] = result["token"]
        self.users["borrower"] = user
        
        self.log("✅ Borrower signup successful - kyc_status='pending', identity_token=null")
        return True
    
    def test_signup_admin(self) -> bool:
        """Test 3: Signup new admin"""
        self.log("=== TEST 3: Signup Admin ===")
        
        # Use timestamp to make email unique
        import time
        timestamp = str(int(time.time()))
        email = f"kyc_admin_{timestamp}@test.com"
        
        user_data = {
            "email": email,
            "password": "test123",
            "full_name": "KYC Admin",
            "role": "admin"
        }
        
        result = self.make_request("POST", "/auth/signup", user_data, expect_status=200)
        
        if "error" in result:
            # If user exists, try to login instead
            if "already registered" in result.get("text", "").lower():
                self.log("User already exists, trying login instead...")
                login_data = {"email": email, "password": "test123"}
                result = self.make_request("POST", "/auth/login", login_data)
                if "error" in result:
                    self.log("❌ Admin login failed", "ERROR")
                    return False
            else:
                self.log("❌ Admin signup failed", "ERROR")
                return False
            
        user = result["user"]
        if user.get("kyc_status") != "verified":
            self.log(f"❌ Expected kyc_status='verified' for admin, got '{user.get('kyc_status')}'", "ERROR")
            return False
            
        # Store token and user data
        self.tokens["admin"] = result["token"]
        self.users["admin"] = user
        
        self.log("✅ Admin signup successful - kyc_status='verified' (auto-verified)")
        return True
    
    def test_signup_investor(self) -> bool:
        """Test 4: Signup new investor"""
        self.log("=== TEST 4: Signup Investor ===")
        
        # Use timestamp to make email unique
        import time
        timestamp = str(int(time.time()))
        email = f"kyc_investor_{timestamp}@test.com"
        
        user_data = {
            "email": email,
            "password": "test123",
            "full_name": "KYC Investor",
            "role": "investor"
        }
        
        result = self.make_request("POST", "/auth/signup", user_data, expect_status=200)
        
        if "error" in result:
            # If user exists, try to login instead
            if "already registered" in result.get("text", "").lower():
                self.log("User already exists, trying login instead...")
                login_data = {"email": email, "password": "test123"}
                result = self.make_request("POST", "/auth/login", login_data)
                if "error" in result:
                    self.log("❌ Investor login failed", "ERROR")
                    return False
            else:
                self.log("❌ Investor signup failed", "ERROR")
                return False
            
        user = result["user"]
        if user.get("kyc_status") != "pending":
            self.log(f"❌ Expected kyc_status='pending', got '{user.get('kyc_status')}'", "ERROR")
            return False
            
        # Store token and user data
        self.tokens["investor"] = result["token"]
        self.users["investor"] = user
        
        self.log("✅ Investor signup successful - kyc_status='pending'")
        return True
    
    def test_kyc_status_borrower(self) -> bool:
        """Test 5: Get KYC Status (borrower)"""
        self.log("=== TEST 5: Get KYC Status (Borrower) ===")
        
        if "borrower" not in self.tokens:
            self.log("❌ No borrower token available", "ERROR")
            return False
            
        result = self.make_request("GET", "/kyc/status", token=self.tokens["borrower"])
        
        if "error" in result:
            self.log("❌ KYC status check failed", "ERROR")
            return False
            
        expected_status = {"kyc_status": "pending", "identity_token": None}
        
        if result.get("kyc_status") != "pending":
            self.log(f"❌ Expected kyc_status='pending', got '{result.get('kyc_status')}'", "ERROR")
            return False
            
        if result.get("identity_token") is not None:
            self.log(f"❌ Expected identity_token=null, got '{result.get('identity_token')}'", "ERROR")
            return False
            
        self.log("✅ KYC status check passed - status='pending', identity_token=null")
        return True
    
    def test_kyc_skip_sandbox(self) -> bool:
        """Test 6: KYC Skip (sandbox)"""
        self.log("=== TEST 6: KYC Skip (Sandbox) ===")
        
        if "borrower" not in self.tokens:
            self.log("❌ No borrower token available", "ERROR")
            return False
            
        result = self.make_request("POST", "/kyc/skip", token=self.tokens["borrower"])
        
        if "error" in result:
            self.log("❌ KYC skip failed", "ERROR")
            return False
            
        # Verify response structure
        if not result.get("success"):
            self.log(f"❌ Expected success=true, got '{result.get('success')}'", "ERROR")
            return False
            
        if "redirect" not in result:
            self.log("❌ Missing redirect path in response", "ERROR")
            return False
            
        identity_token = result.get("identity_token")
        if not identity_token or not identity_token.startswith("0x"):
            self.log(f"❌ Expected identity_token starting with '0x', got '{identity_token}'", "ERROR")
            return False
            
        self.log(f"✅ KYC skip successful - identity_token: {identity_token[:10]}...")
        return True
    
    def test_kyc_status_after_skip(self) -> bool:
        """Test 7: Get KYC Status after skip"""
        self.log("=== TEST 7: Get KYC Status After Skip ===")
        
        if "borrower" not in self.tokens:
            self.log("❌ No borrower token available", "ERROR")
            return False
            
        result = self.make_request("GET", "/kyc/status", token=self.tokens["borrower"])
        
        if "error" in result:
            self.log("❌ KYC status check failed", "ERROR")
            return False
            
        if result.get("kyc_status") != "verified":
            self.log(f"❌ Expected kyc_status='verified', got '{result.get('kyc_status')}'", "ERROR")
            return False
            
        identity_token = result.get("identity_token")
        if not identity_token or not identity_token.startswith("0x"):
            self.log(f"❌ Expected identity_token starting with '0x', got '{identity_token}'", "ERROR")
            return False
            
        self.log("✅ KYC status after skip - status='verified', identity_token present")
        return True
    
    def test_auth_me_after_skip(self) -> bool:
        """Test 8: Get Auth Me after skip"""
        self.log("=== TEST 8: Get Auth Me After Skip ===")
        
        if "borrower" not in self.tokens:
            self.log("❌ No borrower token available", "ERROR")
            return False
            
        result = self.make_request("GET", "/auth/me", token=self.tokens["borrower"])
        
        if "error" in result:
            self.log("❌ Auth me check failed", "ERROR")
            return False
            
        # The response has a nested user object
        user = result.get("user", {})
        if user.get("kyc_status") != "verified":
            self.log(f"❌ Expected kyc_status='verified', got '{user.get('kyc_status')}'", "ERROR")
            return False
            
        identity_token = user.get("identity_token")
        if not identity_token or not identity_token.startswith("0x"):
            self.log(f"❌ Expected identity_token starting with '0x', got '{identity_token}'", "ERROR")
            return False
            
        self.log("✅ Auth me after skip - user object contains kyc_status='verified' and identity_token")
        return True
    
    def test_kyc_complete_investor(self) -> bool:
        """Test 9: KYC Complete (investor with sandbox fallback)"""
        self.log("=== TEST 9: KYC Complete (Investor) ===")
        
        if "investor" not in self.tokens:
            self.log("❌ No investor token available", "ERROR")
            return False
            
        complete_data = {"inquiry_id": "inq_test_sandbox_123"}
        result = self.make_request("POST", "/kyc/complete", complete_data, token=self.tokens["investor"])
        
        if "error" in result:
            self.log("❌ KYC complete failed", "ERROR")
            return False
            
        if not result.get("success"):
            self.log(f"❌ Expected success=true, got '{result.get('success')}'", "ERROR")
            return False
            
        identity_token = result.get("identity_token")
        if not identity_token or not identity_token.startswith("0x"):
            self.log(f"❌ Expected identity_token starting with '0x', got '{identity_token}'", "ERROR")
            return False
            
        self.log("✅ KYC complete successful - sandbox fallback worked, identity_token returned")
        return True
    
    def test_kyc_webhook(self) -> bool:
        """Test 10: KYC Webhook"""
        self.log("=== TEST 10: KYC Webhook ===")
        
        webhook_data = {
            "data": {
                "attributes": {
                    "name": "inquiry.completed",
                    "payload": {
                        "data": {
                            "id": "inq_test_webhook_456"
                        }
                    }
                }
            }
        }
        
        result = self.make_request("POST", "/kyc/webhook", webhook_data)
        
        if "error" in result:
            self.log("❌ KYC webhook failed", "ERROR")
            return False
            
        if not result.get("received"):
            self.log(f"❌ Expected received=true, got '{result.get('received')}'", "ERROR")
            return False
            
        self.log("✅ KYC webhook successful - received=true")
        return True
    
    def test_admin_users_list(self) -> bool:
        """Test 11: Admin Users List"""
        self.log("=== TEST 11: Admin Users List ===")
        
        if "admin" not in self.tokens:
            self.log("❌ No admin token available", "ERROR")
            return False
            
        result = self.make_request("GET", "/admin/users", token=self.tokens["admin"])
        
        if "error" in result:
            self.log("❌ Admin users list failed", "ERROR")
            return False
            
        users = result.get("users", [])
        if not isinstance(users, list):
            self.log(f"❌ Expected users list, got '{type(users)}'", "ERROR")
            return False
            
        # Check that users have kyc_status and identity_token fields
        found_verified_users = 0
        found_admin = False
        users_with_kyc = 0
        
        for user in users:
            # Check if this is our test admin
            if user.get("email", "").startswith("kyc_admin_") and user.get("role") == "admin":
                found_admin = True
                if user.get("kyc_status") != "verified":
                    self.log(f"❌ Admin should have kyc_status='verified', got '{user.get('kyc_status')}'", "ERROR")
                    return False
                    
            # Count users with KYC fields (newer users will have this)
            if "kyc_status" in user:
                users_with_kyc += 1
                if user.get("kyc_status") == "verified":
                    found_verified_users += 1
        
        if not found_admin:
            self.log("❌ Test admin not found in users list", "ERROR")
            return False
            
        if users_with_kyc == 0:
            self.log("❌ No users with KYC fields found", "ERROR")
            return False
            
        self.log(f"✅ Admin users list successful - {len(users)} users returned, {users_with_kyc} with KYC fields, {found_verified_users} verified")
        return True
    
    def test_login_existing_user(self) -> bool:
        """Test 12: Login existing user"""
        self.log("=== TEST 12: Login Existing User ===")
        
        # Use the borrower email from our test
        if "borrower" not in self.users:
            self.log("❌ No borrower user data available", "ERROR")
            return False
            
        borrower_email = self.users["borrower"]["email"]
        login_data = {
            "email": borrower_email,
            "password": "test123"
        }
        
        result = self.make_request("POST", "/auth/login", login_data)
        
        if "error" in result:
            self.log("❌ Login failed", "ERROR")
            return False
            
        # Verify response includes kyc_status and identity_token
        user = result.get("user", {})
        if user.get("kyc_status") != "verified":
            self.log(f"❌ Expected kyc_status='verified', got '{user.get('kyc_status')}'", "ERROR")
            return False
            
        identity_token = user.get("identity_token")
        if not identity_token or not identity_token.startswith("0x"):
            self.log(f"❌ Expected identity_token starting with '0x', got '{identity_token}'", "ERROR")
            return False
            
        self.log("✅ Login successful - response includes kyc_status and identity_token")
        return True
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all KYC integration tests"""
        self.log("🚀 Starting KYC Integration Tests")
        self.log(f"Backend URL: {BACKEND_URL}")
        
        tests = [
            ("Health Check", self.test_health_check),
            ("Signup Borrower", self.test_signup_borrower),
            ("Signup Admin", self.test_signup_admin),
            ("Signup Investor", self.test_signup_investor),
            ("KYC Status (Borrower)", self.test_kyc_status_borrower),
            ("KYC Skip (Sandbox)", self.test_kyc_skip_sandbox),
            ("KYC Status After Skip", self.test_kyc_status_after_skip),
            ("Auth Me After Skip", self.test_auth_me_after_skip),
            ("KYC Complete (Investor)", self.test_kyc_complete_investor),
            ("KYC Webhook", self.test_kyc_webhook),
            ("Admin Users List", self.test_admin_users_list),
            ("Login Existing User", self.test_login_existing_user),
        ]
        
        results = {}
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                results[test_name] = result
                if result:
                    passed += 1
                self.log("")  # Empty line for readability
            except Exception as e:
                self.log(f"❌ {test_name} crashed: {str(e)}", "ERROR")
                results[test_name] = False
                self.log("")
        
        # Summary
        self.log("=" * 50)
        self.log(f"🏁 TEST SUMMARY: {passed}/{total} tests passed")
        self.log("=" * 50)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status} - {test_name}")
        
        return results

def main():
    """Main test runner"""
    tester = KYCTester()
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    failed_tests = [name for name, result in results.items() if not result]
    if failed_tests:
        print(f"\n❌ {len(failed_tests)} test(s) failed:")
        for test in failed_tests:
            print(f"  - {test}")
        sys.exit(1)
    else:
        print(f"\n✅ All {len(results)} tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()