import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, FileText, Building2, PieChart, Clock } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ResearchWorkspace = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docsRes, companiesRes, portfoliosRes, analysesRes] = await Promise.all([
        axios.get(`${API}/documents`),
        axios.get(`${API}/companies`),
        axios.get(`${API}/portfolios`),
        axios.get(`${API}/analyses`)
      ]);
      
      setDocuments(docsRes.data.documents || []);
      setCompanies(companiesRes.data.companies || []);
      setPortfolios(portfoliosRes.data.portfolios || []);
      setAnalyses(analysesRes.data.analyses || []);
    } catch (error) {
      toast.error('Failed to load workspace data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const openDocument = (doc) => {
    // Store document content and navigate to dashboard for analysis
    sessionStorage.setItem('analysisContent', doc.content || 'Document content');
    sessionStorage.setItem('documentId', doc.id);
    toast.success(`Opening ${doc.filename}`);
    navigate('/dashboard');
  };

  const openAnalysis = (analysis) => {
    // Store analysis data and navigate to appropriate page
    sessionStorage.setItem('analysisContent', analysis.content || '');
    sessionStorage.setItem('documentId', analysis.document_id || '');
    
    const typeRoutes = {
      'statement': '/analysis',
      'earnings': '/earnings',
      'industry': '/industry',
      'red_flags': '/red-flags',
      'kpi': '/kpi',
      'valuation': '/analysis'
    };
    
    const route = typeRoutes[analysis.analysis_type] || '/analysis';
    toast.success('Opening analysis...');
    navigate(route);
  };

  const viewCompany = (company) => {
    toast.info(`Viewing ${company.name}`);
    // Could navigate to a detailed company view page
  };

  const viewPortfolio = (portfolio) => {
    toast.info(`Viewing ${portfolio.name}`);
    // Could navigate to portfolio detail page
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0b] via-[#121214] to-[#0a0a0b] text-white">
      <div className="border-b border-white/10 backdrop-blur-xl bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                data-testid="back-btn"
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                size="icon"
                className="hover:bg-white/10 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Research Workspace</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl mb-8">
            <TabsTrigger
              data-testid="documents-tab"
              value="documents"
              className="flex items-center space-x-2 data-[state=active]:bg-white/10 rounded-lg px-6"
            >
              <FileText className="w-4 h-4" />
              <span>Documents ({documents.length})</span>
            </TabsTrigger>
            <TabsTrigger
              data-testid="companies-tab"
              value="companies"
              className="flex items-center space-x-2 data-[state=active]:bg-white/10 rounded-lg px-6"
            >
              <Building2 className="w-4 h-4" />
              <span>Companies ({companies.length})</span>
            </TabsTrigger>
            <TabsTrigger
              data-testid="portfolios-tab"
              value="portfolios"
              className="flex items-center space-x-2 data-[state=active]:bg-white/10 rounded-lg px-6"
            >
              <PieChart className="w-4 h-4" />
              <span>Portfolios ({portfolios.length})</span>
            </TabsTrigger>
            <TabsTrigger
              data-testid="history-tab"
              value="history"
              className="flex items-center space-x-2 data-[state=active]:bg-white/10 rounded-lg px-6"
            >
              <Clock className="w-4 h-4" />
              <span>History ({analyses.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" data-testid="documents-content">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.length === 0 ? (
                <Card className="glass-panel p-12 border-white/10 col-span-full text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No documents uploaded yet</p>
                  <p className="text-sm text-gray-500 mt-2">Upload documents from the dashboard to start analyzing</p>
                </Card>
              ) : (
                documents.map((doc, index) => (
                  <Card 
                    key={doc.id || index} 
                    onClick={() => openDocument(doc)}
                    className="glass-panel p-6 border-white/10 hover-lift cursor-pointer transition-all hover:border-blue-500/30" 
                    data-testid={`document-${index}`}
                  >
                    <div className="flex items-start space-x-3 mb-4">
                      <FileText className="w-5 h-5 text-blue-400 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate mb-1">{doc.filename}</h3>
                        <p className="text-sm text-gray-400">{doc.file_type?.toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {formatDate(doc.upload_date)}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        Open →
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="companies" data-testid="companies-content">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.length === 0 ? (
                <Card className="glass-panel p-12 border-white/10 col-span-full text-center">
                  <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No companies tracked yet</p>
                </Card>
              ) : (
                companies.map((company, index) => (
                  <Card key={company.id || index} className="glass-panel p-6 border-white/10 hover-lift" data-testid={`company-${index}`}>
                    <div className="flex items-start space-x-3 mb-4">
                      <Building2 className="w-5 h-5 text-green-400 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">{company.name}</h3>
                        {company.ticker && (
                          <p className="text-sm text-gray-400">{company.ticker}</p>
                        )}
                      </div>
                    </div>
                    {company.sector && (
                      <div className="text-xs text-gray-500">{company.sector}</div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="portfolios" data-testid="portfolios-content">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolios.length === 0 ? (
                <Card className="glass-panel p-12 border-white/10 col-span-full text-center">
                  <PieChart className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No portfolios created yet</p>
                </Card>
              ) : (
                portfolios.map((portfolio, index) => (
                  <Card key={portfolio.id || index} className="glass-panel p-6 border-white/10 hover-lift" data-testid={`portfolio-${index}`}>
                    <div className="flex items-start space-x-3 mb-4">
                      <PieChart className="w-5 h-5 text-purple-400 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">{portfolio.name}</h3>
                        <p className="text-sm text-gray-400">
                          {portfolio.holdings?.length || 0} holdings
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(portfolio.created_at)}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" data-testid="history-content">
            <div className="space-y-4">
              {analyses.length === 0 ? (
                <Card className="glass-panel p-12 border-white/10 text-center">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No analysis history yet</p>
                  <p className="text-sm text-gray-500 mt-2">Start analyzing documents to build your research history</p>
                </Card>
              ) : (
                analyses.map((analysis, index) => (
                  <Card key={analysis.id || index} className="glass-panel p-6 border-white/10 hover-lift cursor-pointer" data-testid={`analysis-${index}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full uppercase">
                            {analysis.analysis_type?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(analysis.created_at)}
                          </span>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-300 mb-2">Input Content:</p>
                          <p className="text-sm text-gray-400 line-clamp-2 bg-white/5 p-3 rounded-lg">
                            {analysis.content?.substring(0, 200)}{analysis.content?.length > 200 ? '...' : ''}
                          </p>
                        </div>
                        {analysis.result && (
                          <div>
                            <p className="text-sm font-medium text-gray-300 mb-2">Analysis Result:</p>
                            <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
                              {typeof analysis.result === 'object' ? (
                                <div className="space-y-2">
                                  {analysis.result.summary && (
                                    <p className="text-sm text-gray-300">{analysis.result.summary.substring(0, 200)}...</p>
                                  )}
                                  {analysis.result.analysis && (
                                    <p className="text-sm text-gray-300">{analysis.result.analysis.substring(0, 200)}...</p>
                                  )}
                                  {analysis.result.health_score !== undefined && (
                                    <div className="flex items-center space-x-2 mt-2">
                                      <span className="text-xs text-gray-400">Health Score:</span>
                                      <span className="text-sm font-semibold text-blue-400">{analysis.result.health_score}/100</span>
                                    </div>
                                  )}
                                  {analysis.result.sentiment && (
                                    <div className="flex items-center space-x-2 mt-2">
                                      <span className="text-xs text-gray-400">Sentiment:</span>
                                      <span className="text-sm font-semibold text-green-400">{analysis.result.sentiment}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-300 line-clamp-3">{String(analysis.result).substring(0, 200)}...</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ResearchWorkspace;