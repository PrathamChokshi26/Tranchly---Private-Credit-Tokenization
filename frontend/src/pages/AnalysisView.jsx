import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AnalysisView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    performAnalysis();
  }, []);

  const performAnalysis = async () => {
    const content = sessionStorage.getItem('analysisContent');
    const documentId = sessionStorage.getItem('documentId');

    if (!content) {
      toast.error('No content to analyze');
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/analyze/statement`, {
        content,
        analysis_type: 'statement',
        document_id: documentId
      });
      setAnalysis(response.data.result);
      toast.success('Analysis complete!');
    } catch (error) {
      toast.error('Analysis failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const renderAnalysis = () => {
    if (!analysis) return null;

    if (analysis.analysis) {
      return (
        <div className="prose prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
            {analysis.analysis}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {analysis.summary && (
          <Card className="glass-panel p-6 border-white/10" data-testid="summary-section">
            <h3 className="text-xl font-semibold mb-4 flex items-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <CheckCircle2 className="w-5 h-5 mr-2 text-green-400" />
              Summary
            </h3>
            <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
          </Card>
        )}

        {analysis.line_items && (
          <Card className="glass-panel p-6 border-white/10" data-testid="line-items-section">
            <h3 className="text-xl font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Key Line Items</h3>
            <div className="space-y-3">
              {Object.entries(analysis.line_items).map(([key, value], index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-400">{key}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {analysis.trends && (
          <Card className="glass-panel p-6 border-white/10" data-testid="trends-section">
            <h3 className="text-xl font-semibold mb-4 flex items-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
              Trends
            </h3>
            <p className="text-gray-300 leading-relaxed">{typeof analysis.trends === 'string' ? analysis.trends : JSON.stringify(analysis.trends, null, 2)}</p>
          </Card>
        )}

        {analysis.margins && (
          <Card className="glass-panel p-6 border-white/10" data-testid="margins-section">
            <h3 className="text-xl font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Margin Analysis</h3>
            <p className="text-gray-300 leading-relaxed">{typeof analysis.margins === 'string' ? analysis.margins : JSON.stringify(analysis.margins, null, 2)}</p>
          </Card>
        )}

        {analysis.red_flags && (
          <Card className="glass-panel p-6 border-white/10 border-red-500/20" data-testid="red-flags-section">
            <h3 className="text-xl font-semibold mb-4 flex items-center text-red-400" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <AlertCircle className="w-5 h-5 mr-2" />
              Red Flags
            </h3>
            <p className="text-gray-300 leading-relaxed">{typeof analysis.red_flags === 'string' ? analysis.red_flags : JSON.stringify(analysis.red_flags, null, 2)}</p>
          </Card>
        )}

        {analysis.health_score !== undefined && (
          <Card className="glass-panel p-6 border-white/10" data-testid="health-score-section">
            <h3 className="text-xl font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Financial Health Score</h3>
            <div className="flex items-center space-x-4">
              <div className="text-5xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                {analysis.health_score}
              </div>
              <div className="flex-1">
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                    style={{ width: `${analysis.health_score}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-2">Out of 100</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0b] via-[#121214] to-[#0a0a0b] text-white">
      <div className="border-b border-white/10 backdrop-blur-xl bg-black/20">
        <div className="max-w-6xl mx-auto px-6 py-4">
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
              <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Financial Statement Analysis</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <Card className="glass-panel p-12 border-white/10 text-center" data-testid="loading-indicator">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-lg text-gray-400">Analyzing financial statement...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
          </Card>
        ) : (
          renderAnalysis()
        )}
      </div>
    </div>
  );
};

export default AnalysisView;