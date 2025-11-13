import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, Smile, Meh, Frown, TrendingUp, AlertTriangle, Target, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EarningsView = () => {
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
      const response = await axios.post(`${API}/analyze/earnings`, {
        content,
        analysis_type: 'earnings',
        document_id: documentId
      });
      setAnalysis(response.data.result);
      toast.success('Earnings analysis complete!');
    } catch (error) {
      toast.error('Analysis failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getSentimentIcon = (sentiment) => {
    if (!sentiment) return <Meh className="w-6 h-6" />;
    const s = sentiment.toLowerCase();
    if (s.includes('positive')) return <Smile className="w-6 h-6 text-green-400" />;
    if (s.includes('negative')) return <Frown className="w-6 h-6 text-red-400" />;
    return <Meh className="w-6 h-6 text-yellow-400" />;
  };

  const renderAnalysis = () => {
    if (!analysis) return null;

    if (analysis.analysis) {
      return (
        <div className="prose prose-invert max-w-none">
          <Card className="glass-panel p-8 border-white/10">
            <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
              {analysis.analysis}
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {analysis.summary && (
          <Card className="glass-panel p-6 border-white/10" data-testid="summary-section">
            <h3 className="text-xl font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Executive Summary</h3>
            <p className="text-gray-300 leading-relaxed text-lg">{analysis.summary}</p>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {analysis.sentiment && (
            <Card className="glass-panel p-6 border-white/10" data-testid="sentiment-section">
              <div className="flex items-center space-x-3 mb-4">
                {getSentimentIcon(analysis.sentiment)}
                <h3 className="text-lg font-semibold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Management Sentiment</h3>
              </div>
              <p className="text-gray-300">{analysis.sentiment}</p>
            </Card>
          )}

          {analysis.guidance && (
            <Card className="glass-panel p-6 border-white/10" data-testid="guidance-section">
              <div className="flex items-center space-x-3 mb-4">
                <Target className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Forward Guidance</h3>
              </div>
              <p className="text-gray-300">{typeof analysis.guidance === 'string' ? analysis.guidance : JSON.stringify(analysis.guidance, null, 2)}</p>
            </Card>
          )}
        </div>

        {analysis.risks && (
          <Card className="glass-panel p-6 border-white/10 border-red-500/20" data-testid="risks-section">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-semibold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Key Risks</h3>
            </div>
            <div className="text-gray-300 leading-relaxed">
              {Array.isArray(analysis.risks) ? (
                <ul className="space-y-2">
                  {analysis.risks.map((risk, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{typeof analysis.risks === 'string' ? analysis.risks : JSON.stringify(analysis.risks, null, 2)}</p>
              )}
            </div>
          </Card>
        )}

        {analysis.opportunities && (
          <Card className="glass-panel p-6 border-white/10 border-green-500/20" data-testid="opportunities-section">
            <div className="flex items-center space-x-3 mb-4">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Key Opportunities</h3>
            </div>
            <div className="text-gray-300 leading-relaxed">
              {Array.isArray(analysis.opportunities) ? (
                <ul className="space-y-2">
                  {analysis.opportunities.map((opp, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span>{opp}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{typeof analysis.opportunities === 'string' ? analysis.opportunities : JSON.stringify(analysis.opportunities, null, 2)}</p>
              )}
            </div>
          </Card>
        )}

        {analysis.investor_takeaways && (
          <Card className="glass-panel p-6 border-white/10 bg-blue-500/5" data-testid="takeaways-section">
            <h3 className="text-xl font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>What Investors Need to Know</h3>
            <div className="text-gray-300 leading-relaxed">
              {Array.isArray(analysis.investor_takeaways) ? (
                <ul className="space-y-3">
                  {analysis.investor_takeaways.map((takeaway, i) => (
                    <li key={i} className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-semibold text-blue-400">{i + 1}</span>
                      </div>
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{typeof analysis.investor_takeaways === 'string' ? analysis.investor_takeaways : JSON.stringify(analysis.investor_takeaways, null, 2)}</p>
              )}
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
              <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Earnings Intelligence</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <Card className="glass-panel p-12 border-white/10 text-center" data-testid="loading-indicator">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-lg text-gray-400">Analyzing earnings call...</p>
            <p className="text-sm text-gray-500 mt-2">Extracting insights and sentiment</p>
          </Card>
        ) : (
          renderAnalysis()
        )}
      </div>
    </div>
  );
};

export default EarningsView;