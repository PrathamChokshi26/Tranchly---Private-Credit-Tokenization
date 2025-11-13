import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const KPIDashboard = () => {
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
      const response = await axios.post(`${API}/analyze/kpi`, {
        content,
        analysis_type: 'kpi',
        document_id: documentId
      });
      setAnalysis(response.data.result);
      toast.success('KPI analysis complete!');
    } catch (error) {
      toast.error('Analysis failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend) => {
    if (!trend) return <Minus className="w-5 h-5 text-gray-400" />;
    const t = trend.toLowerCase();
    if (t.includes('up') || t.includes('positive') || t.includes('growing')) {
      return <TrendingUp className="w-5 h-5 text-green-400" />;
    }
    if (t.includes('down') || t.includes('negative') || t.includes('declining')) {
      return <TrendingDown className="w-5 h-5 text-red-400" />;
    }
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  const renderAnalysis = () => {
    if (!analysis) return null;

    if (analysis.analysis) {
      return (
        <Card className="glass-panel p-8 border-white/10">
          <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
            {analysis.analysis}
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {analysis.kpis && Array.isArray(analysis.kpis) && analysis.kpis.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6" data-testid="kpis-grid">
            {analysis.kpis.map((kpi, index) => (
              <Card key={index} className="glass-panel p-6 border-white/10" data-testid={`kpi-card-${index}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                      {kpi.name || `KPI ${index + 1}`}
                    </h3>
                    {kpi.value && (
                      <div className="text-3xl font-bold text-blue-400" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                        {kpi.value}
                      </div>
                    )}
                  </div>
                  {kpi.trend && (
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(kpi.trend)}
                    </div>
                  )}
                </div>
                {kpi.trend && (
                  <p className="text-sm text-gray-400 mb-3">
                    <span className="font-medium">Trend:</span> {kpi.trend}
                  </p>
                )}
                {kpi.drivers && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-sm text-gray-400">
                      <span className="font-medium">Drivers:</span> {typeof kpi.drivers === 'string' ? kpi.drivers : JSON.stringify(kpi.drivers)}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {analysis.strengths && (
          <Card className="glass-panel p-6 border-white/10 border-green-500/20" data-testid="strengths-section">
            <h3 className="text-xl font-semibold mb-4 flex items-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <TrendingUp className="w-6 h-6 mr-2 text-green-400" />
              Strengths
            </h3>
            <div className="text-gray-300 leading-relaxed">
              {Array.isArray(analysis.strengths) ? (
                <ul className="space-y-2">
                  {analysis.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{typeof analysis.strengths === 'string' ? analysis.strengths : JSON.stringify(analysis.strengths, null, 2)}</p>
              )}
            </div>
          </Card>
        )}

        {analysis.concerns && (
          <Card className="glass-panel p-6 border-white/10 border-red-500/20" data-testid="concerns-section">
            <h3 className="text-xl font-semibold mb-4 flex items-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <TrendingDown className="w-6 h-6 mr-2 text-red-400" />
              Concerns
            </h3>
            <div className="text-gray-300 leading-relaxed">
              {Array.isArray(analysis.concerns) ? (
                <ul className="space-y-2">
                  {analysis.concerns.map((concern, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{typeof analysis.concerns === 'string' ? analysis.concerns : JSON.stringify(analysis.concerns, null, 2)}</p>
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
              <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>KPI Intelligence</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <Card className="glass-panel p-12 border-white/10 text-center" data-testid="loading-indicator">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-lg text-gray-400">Analyzing KPIs...</p>
            <p className="text-sm text-gray-500 mt-2">Extracting key performance indicators</p>
          </Card>
        ) : (
          renderAnalysis()
        )}
      </div>
    </div>
  );
};

export default KPIDashboard;