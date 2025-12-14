from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import json
import io
import PyPDF2
import openpyxl
from docx import Document
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# LLM API Key
LLM_API_KEY = os.environ.get('EMERGENT_LLM_KEY')

# ============= MODELS =============

class FinancialDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    filename: str
    file_type: str
    content: str
    upload_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = {}

class Analysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: Optional[str] = None
    analysis_type: str
    content: str
    result: Dict[str, Any]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Portfolio(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    name: str
    holdings: List[Dict[str, Any]]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    ticker: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    tracked: bool = False
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnalysisRequest(BaseModel):
    content: str
    analysis_type: str
    document_id: Optional[str] = None

class SimulationRequest(BaseModel):
    company_name: str
    revenue_growth: float
    gross_margin: float
    operating_leverage: float
    capex_intensity: float

class PortfolioCreate(BaseModel):
    name: str
    holdings: List[Dict[str, Any]]

class CompanyCreate(BaseModel):
    name: str
    ticker: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    notes: str = ""

# ============= HELPER FUNCTIONS =============

async def get_llm_analysis(prompt: str, context: str = "") -> str:
    """Get AI analysis using emergentintegrations"""
    try:
        chat = LlmChat(
            api_key=LLM_API_KEY,
            session_id=str(uuid.uuid4()),
            system_message="You are a financial analysis expert with deep knowledge of financial statements, accounting, valuation, and investment analysis. Provide clear, insightful analysis."
        ).with_model("openai", "gpt-5")
        
        full_prompt = f"{context}\n\n{prompt}" if context else prompt
        message = UserMessage(text=full_prompt)
        response = await chat.send_message(message)
        return response
    except Exception as e:
        logging.error(f"LLM analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF parsing error: {str(e)}")

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX"""
    try:
        doc = Document(io.BytesIO(file_bytes))
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DOCX parsing error: {str(e)}")

def extract_text_from_excel(file_bytes: bytes) -> str:
    """Extract text from Excel"""
    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes))
        text = ""
        for sheet in wb.worksheets:
            text += f"\n=== Sheet: {sheet.title} ===\n"
            for row in sheet.iter_rows(values_only=True):
                text += " | ".join([str(cell) if cell else "" for cell in row]) + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Excel parsing error: {str(e)}")

# ============= ROUTES =============

@api_router.get("/")
async def root():
    return {"message": "Financial Research AI Platform API"}

@api_router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process financial document"""
    try:
        file_bytes = await file.read()
        filename = file.filename
        file_ext = filename.split('.')[-1].lower()
        
        logger.info(f"Processing file: {filename}, size: {len(file_bytes)} bytes")
        
        # Extract text based on file type
        if file_ext == 'pdf':
            content = extract_text_from_pdf(file_bytes)
            file_type = 'pdf'
        elif file_ext in ['xlsx', 'xls']:
            content = extract_text_from_excel(file_bytes)
            file_type = 'excel'
        elif file_ext in ['docx', 'doc']:
            content = extract_text_from_docx(file_bytes)
            file_type = 'docx'
        elif file_ext == 'txt':
            content = file_bytes.decode('utf-8')
            file_type = 'txt'
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        logger.info(f"Extracted {len(content)} characters from {filename}")
        
        # Save to database
        doc = FinancialDocument(
            filename=filename,
            file_type=file_type,
            content=content
        )
        
        doc_dict = doc.model_dump()
        doc_dict['upload_date'] = doc_dict['upload_date'].isoformat()
        
        result = await db.documents.insert_one(doc_dict)
        logger.info(f"Document saved to DB with ID: {doc.id}")
        
        return {
            "success": True,
            "document_id": doc.id,
            "filename": filename,
            "content_length": len(content),
            "content_preview": content[:500] if len(content) > 500 else content
        }
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/analyze/statement")
async def analyze_statement(request: AnalysisRequest):
    """Analyze financial statement"""
    prompt = f"""Analyze this financial statement in detail:

{request.content}

Provide:
1. Key line items explanation
2. Year-over-year trends
3. Margin analysis
4. Unusual movements or red flags
5. Overall financial health assessment

Format as JSON with sections: summary, line_items, trends, margins, red_flags, health_score (0-100)"""
    
    result_text = await get_llm_analysis(prompt)
    
    # Try to parse as JSON, fallback to structured text
    try:
        result = json.loads(result_text)
    except:
        result = {"analysis": result_text}
    
    # Save analysis
    analysis = Analysis(
        document_id=request.document_id,
        analysis_type="statement",
        content=request.content,
        result=result
    )
    
    analysis_dict = analysis.model_dump()
    analysis_dict['created_at'] = analysis_dict['created_at'].isoformat()
    await db.analyses.insert_one(analysis_dict)
    
    return {"success": True, "analysis_id": analysis.id, "result": result}

@api_router.post("/analyze/earnings")
async def analyze_earnings(request: AnalysisRequest):
    """Analyze earnings call transcript"""
    prompt = f"""Analyze this earnings call transcript:

{request.content}

Provide:
1. Quarterly performance summary
2. Management tone and sentiment (positive/neutral/negative)
3. Forward guidance analysis
4. Key risks mentioned
5. Key opportunities mentioned
6. What investors need to know

Format as JSON with: summary, sentiment, guidance, risks, opportunities, investor_takeaways"""
    
    result_text = await get_llm_analysis(prompt)
    
    try:
        result = json.loads(result_text)
    except:
        result = {"analysis": result_text}
    
    analysis = Analysis(
        document_id=request.document_id,
        analysis_type="earnings",
        content=request.content,
        result=result
    )
    
    analysis_dict = analysis.model_dump()
    analysis_dict['created_at'] = analysis_dict['created_at'].isoformat()
    await db.analyses.insert_one(analysis_dict)
    
    return {"success": True, "analysis_id": analysis.id, "result": result}

@api_router.post("/analyze/industry")
async def analyze_industry(request: AnalysisRequest):
    """Analyze industry dynamics"""
    prompt = f"""Analyze this industry: {request.content}

Provide comprehensive analysis:
1. Industry overview and value chain
2. Key drivers (macro, supply/demand, costs)
3. Competitive landscape
4. Top players and market share
5. Margin trends and profit pools
6. Growth opportunities
7. Key risks and challenges

Format as JSON with: overview, value_chain, drivers, competitive_landscape, top_players, margin_trends, growth_opportunities, risks"""
    
    result_text = await get_llm_analysis(prompt)
    
    try:
        result = json.loads(result_text)
    except:
        result = {"analysis": result_text}
    
    analysis = Analysis(
        analysis_type="industry",
        content=request.content,
        result=result
    )
    
    analysis_dict = analysis.model_dump()
    analysis_dict['created_at'] = analysis_dict['created_at'].isoformat()
    await db.analyses.insert_one(analysis_dict)
    
    return {"success": True, "analysis_id": analysis.id, "result": result}

@api_router.post("/analyze/red-flags")
async def analyze_red_flags(request: AnalysisRequest):
    """Detect accounting red flags"""
    prompt = f"""Analyze this financial data for red flags:

{request.content}

Detect and explain:
1. Revenue recognition anomalies
2. Working capital issues
3. Cash flow vs earnings mismatches
4. Aggressive expense capitalization
5. Margin compression patterns
6. Poor cash quality indicators
7. Off-balance-sheet liabilities
8. Interest coverage concerns

For each red flag found, provide:
- Severity (high/medium/low)
- Description
- Impact assessment

Also provide an overall risk score (0-100, higher = more risk)

Format as JSON with: red_flags (array), overall_risk_score, summary"""
    
    result_text = await get_llm_analysis(prompt)
    
    try:
        result = json.loads(result_text)
    except:
        result = {"analysis": result_text, "overall_risk_score": 50}
    
    analysis = Analysis(
        document_id=request.document_id,
        analysis_type="red_flags",
        content=request.content,
        result=result
    )
    
    analysis_dict = analysis.model_dump()
    analysis_dict['created_at'] = analysis_dict['created_at'].isoformat()
    await db.analyses.insert_one(analysis_dict)
    
    return {"success": True, "analysis_id": analysis.id, "result": result}

@api_router.post("/analyze/kpi")
async def analyze_kpis(request: AnalysisRequest):
    """Analyze business KPIs"""
    prompt = f"""Analyze these business KPIs:

{request.content}

Identify and analyze:
1. Key performance indicators relevant to this business
2. Trends (YoY, QoQ) for each KPI
3. What drives each KPI
4. Industry benchmarks if applicable
5. Areas of strength and concern

Format as JSON with: kpis (array with name, value, trend, drivers), strengths, concerns"""
    
    result_text = await get_llm_analysis(prompt)
    
    try:
        result = json.loads(result_text)
    except:
        result = {"analysis": result_text}
    
    analysis = Analysis(
        document_id=request.document_id,
        analysis_type="kpi",
        content=request.content,
        result=result
    )
    
    analysis_dict = analysis.model_dump()
    analysis_dict['created_at'] = analysis_dict['created_at'].isoformat()
    await db.analyses.insert_one(analysis_dict)
    
    return {"success": True, "analysis_id": analysis.id, "result": result}

@api_router.post("/analyze/valuation")
async def analyze_valuation(request: AnalysisRequest):
    """Generate valuation narrative"""
    style = request.document_id or "default"  # Use document_id field to pass style
    
    style_prompts = {
        "buffett": "Analyze this investment like Warren Buffett would - focus on moat, management quality, and long-term value creation.",
        "burry": "Analyze this investment like Michael Burry would - focus on deep value, contrarian indicators, and market inefficiencies.",
        "cfa": "Analyze this investment like a CFA Level 3 candidate - comprehensive, structured, with proper valuation frameworks.",
        "default": "Provide comprehensive investment analysis."
    }
    
    style_instruction = style_prompts.get(style, style_prompts["default"])
    
    prompt = f"""{style_instruction}

{request.content}

Provide:
1. Investment thesis
2. Growth drivers analysis
3. Margin outlook
4. Competitive moat assessment
5. Management quality
6. Capital allocation track record
7. Bull case scenario
8. Bear case scenario
9. Fair value assessment (directional: undervalued/fairly valued/overvalued)
10. Key risks to the thesis

Format as JSON with these sections."""
    
    result_text = await get_llm_analysis(prompt)
    
    try:
        result = json.loads(result_text)
    except:
        result = {"analysis": result_text}
    
    analysis = Analysis(
        analysis_type="valuation",
        content=request.content,
        result=result
    )
    
    analysis_dict = analysis.model_dump()
    analysis_dict['created_at'] = analysis_dict['created_at'].isoformat()
    await db.analyses.insert_one(analysis_dict)
    
    return {"success": True, "analysis_id": analysis.id, "result": result}

@api_router.post("/simulate")
async def simulate_business(request: SimulationRequest):
    """Simulate business model with different parameters"""
    prompt = f"""Run a business model simulation for {request.company_name} with these parameters:

- Revenue Growth: {request.revenue_growth}%
- Gross Margin: {request.gross_margin}%
- Operating Leverage: {request.operating_leverage}
- CapEx Intensity: {request.capex_intensity}%

Provide analysis of:
1. Impact on profitability
2. Impact on cash flows
3. Impact on valuation
4. Key risks in this scenario
5. Sensitivity analysis (what if one parameter changes by ±20%)

Format as JSON with: profitability_impact, cash_flow_impact, valuation_impact, risks, sensitivity_analysis"""
    
    result_text = await get_llm_analysis(prompt)
    
    try:
        result = json.loads(result_text)
    except:
        result = {"analysis": result_text}
    
    return {"success": True, "result": result}

@api_router.post("/portfolio/analyze")
async def analyze_portfolio(portfolio: PortfolioCreate):
    """Analyze portfolio composition and risk"""
    holdings_text = json.dumps(portfolio.holdings, indent=2)
    
    prompt = f"""Analyze this investment portfolio:

{holdings_text}

Provide:
1. Diversification score (0-100)
2. Sector breakdown
3. Risk concentration analysis
4. Correlation risk
5. Factor exposure (growth, value, quality, etc.)
6. Recession sensitivity
7. Recommendations for improvement
8. Overall portfolio health score (0-100)

Format as JSON with these sections."""
    
    result_text = await get_llm_analysis(prompt)
    
    try:
        result = json.loads(result_text)
    except:
        result = {"analysis": result_text}
    
    # Save portfolio
    portfolio_obj = Portfolio(
        name=portfolio.name,
        holdings=portfolio.holdings
    )
    
    portfolio_dict = portfolio_obj.model_dump()
    portfolio_dict['created_at'] = portfolio_dict['created_at'].isoformat()
    await db.portfolios.insert_one(portfolio_dict)
    
    return {"success": True, "portfolio_id": portfolio_obj.id, "analysis": result}

@api_router.get("/documents")
async def get_documents():
    """Get all uploaded documents"""
    docs = await db.documents.find({}, {"_id": 0, "content": 0}).to_list(100)
    return {"documents": docs}

@api_router.get("/analyses")
async def get_analyses():
    """Get all analyses"""
    analyses = await db.analyses.find({}, {"_id": 0}).to_list(100)
    return {"analyses": analyses}

@api_router.get("/portfolios")
async def get_portfolios():
    """Get all portfolios"""
    portfolios = await db.portfolios.find({}, {"_id": 0}).to_list(100)
    return {"portfolios": portfolios}

@api_router.post("/companies")
async def create_company(company: CompanyCreate):
    """Create/track a company"""
    company_obj = Company(**company.model_dump(), tracked=True)
    
    company_dict = company_obj.model_dump()
    company_dict['created_at'] = company_dict['created_at'].isoformat()
    await db.companies.insert_one(company_dict)
    
    return {"success": True, "company_id": company_obj.id}

@api_router.get("/companies")
async def get_companies():
    """Get all tracked companies"""
    companies = await db.companies.find({"tracked": True}, {"_id": 0}).to_list(100)
    return {"companies": companies}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()