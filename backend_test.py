import requests
import sys
import json
import io
from datetime import datetime

class FinancialResearchAPITester:
    def __init__(self, base_url="https://finresearch-ai.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.document_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=30)
                else:
                    headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {"message": "Success but no JSON response"}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_file_upload(self):
        """Test file upload functionality"""
        # Create a simple text file for testing
        test_content = """
        FINANCIAL STATEMENT ANALYSIS TEST
        
        Revenue: $1,000,000
        Cost of Goods Sold: $600,000
        Gross Profit: $400,000
        Operating Expenses: $250,000
        Net Income: $150,000
        
        This is test financial data for analysis.
        """
        
        files = {
            'file': ('test_financial_data.txt', io.StringIO(test_content), 'text/plain')
        }
        
        success, response = self.run_test(
            "File Upload",
            "POST",
            "upload",
            200,
            files=files
        )
        
        if success and 'document_id' in response:
            self.document_id = response['document_id']
            print(f"   Document ID: {self.document_id}")
        
        return success

    def test_financial_statement_analysis(self):
        """Test financial statement analysis"""
        test_data = {
            "content": "Revenue: $1M, COGS: $600K, Gross Profit: $400K, Operating Expenses: $250K, Net Income: $150K",
            "analysis_type": "statement",
            "document_id": self.document_id
        }
        
        return self.run_test(
            "Financial Statement Analysis",
            "POST",
            "analyze/statement",
            200,
            data=test_data
        )

    def test_earnings_analysis(self):
        """Test earnings analysis"""
        test_data = {
            "content": "Q3 earnings call: Revenue grew 15% YoY to $500M. Management expressed optimism about Q4 outlook. Key risks include supply chain disruptions.",
            "analysis_type": "earnings",
            "document_id": self.document_id
        }
        
        return self.run_test(
            "Earnings Analysis",
            "POST",
            "analyze/earnings",
            200,
            data=test_data
        )

    def test_industry_analysis(self):
        """Test industry analysis"""
        test_data = {
            "content": "Electric Vehicle Industry",
            "analysis_type": "industry"
        }
        
        return self.run_test(
            "Industry Analysis",
            "POST",
            "analyze/industry",
            200,
            data=test_data
        )

    def test_red_flags_analysis(self):
        """Test red flags analysis"""
        test_data = {
            "content": "Revenue: $1M, Cash Flow: $50K, Accounts Receivable increased 300% YoY, Inventory turnover decreased significantly",
            "analysis_type": "red_flags",
            "document_id": self.document_id
        }
        
        return self.run_test(
            "Red Flags Analysis",
            "POST",
            "analyze/red-flags",
            200,
            data=test_data
        )

    def test_kpi_analysis(self):
        """Test KPI analysis"""
        test_data = {
            "content": "Customer Acquisition Cost: $50, Lifetime Value: $500, Monthly Recurring Revenue: $100K, Churn Rate: 5%",
            "analysis_type": "kpi",
            "document_id": self.document_id
        }
        
        return self.run_test(
            "KPI Analysis",
            "POST",
            "analyze/kpi",
            200,
            data=test_data
        )

    def test_valuation_analysis(self):
        """Test valuation analysis"""
        test_data = {
            "content": "Apple Inc: Strong brand moat, consistent revenue growth, high margins, excellent capital allocation",
            "analysis_type": "valuation",
            "document_id": "buffett"  # Using style parameter
        }
        
        return self.run_test(
            "Valuation Analysis",
            "POST",
            "analyze/valuation",
            200,
            data=test_data
        )

    def test_business_simulation(self):
        """Test business model simulation"""
        test_data = {
            "company_name": "Test Company",
            "revenue_growth": 15.0,
            "gross_margin": 60.0,
            "operating_leverage": 2.0,
            "capex_intensity": 8.0
        }
        
        return self.run_test(
            "Business Simulation",
            "POST",
            "simulate",
            200,
            data=test_data
        )

    def test_portfolio_analysis(self):
        """Test portfolio analysis"""
        test_data = {
            "name": "Test Portfolio",
            "holdings": [
                {"ticker": "AAPL", "shares": 100, "price": 150.0, "value": 15000},
                {"ticker": "GOOGL", "shares": 50, "price": 2500.0, "value": 125000},
                {"ticker": "MSFT", "shares": 75, "price": 300.0, "value": 22500}
            ]
        }
        
        return self.run_test(
            "Portfolio Analysis",
            "POST",
            "portfolio/analyze",
            200,
            data=test_data
        )

    def test_get_documents(self):
        """Test get documents endpoint"""
        return self.run_test(
            "Get Documents",
            "GET",
            "documents",
            200
        )

    def test_get_analyses(self):
        """Test get analyses endpoint"""
        return self.run_test(
            "Get Analyses",
            "GET",
            "analyses",
            200
        )

    def test_get_portfolios(self):
        """Test get portfolios endpoint"""
        return self.run_test(
            "Get Portfolios",
            "GET",
            "portfolios",
            200
        )

    def test_create_company(self):
        """Test create company endpoint"""
        test_data = {
            "name": "Test Company Inc",
            "ticker": "TEST",
            "sector": "Technology",
            "industry": "Software",
            "notes": "Test company for API testing"
        }
        
        return self.run_test(
            "Create Company",
            "POST",
            "companies",
            200,
            data=test_data
        )

    def test_get_companies(self):
        """Test get companies endpoint"""
        return self.run_test(
            "Get Companies",
            "GET",
            "companies",
            200
        )

def main():
    print("🚀 Starting Financial Research AI Platform API Tests")
    print("=" * 60)
    
    tester = FinancialResearchAPITester()
    
    # Test sequence
    test_methods = [
        tester.test_root_endpoint,
        tester.test_file_upload,
        tester.test_financial_statement_analysis,
        tester.test_earnings_analysis,
        tester.test_industry_analysis,
        tester.test_red_flags_analysis,
        tester.test_kpi_analysis,
        tester.test_valuation_analysis,
        tester.test_business_simulation,
        tester.test_portfolio_analysis,
        tester.test_create_company,
        tester.test_get_documents,
        tester.test_get_analyses,
        tester.test_get_portfolios,
        tester.test_get_companies
    ]
    
    # Run all tests
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