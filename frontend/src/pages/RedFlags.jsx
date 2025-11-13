import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RedFlags = () => {
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
      const response = await axios.post(`${API}/analyze/red-flags`, {
        content,
        analysis_type: 'red_flags',
        document_id: documentId
      });
      setAnalysis(response.data.result);
      toast.success('Red flag analysis complete!');
    } catch (error) {
      toast.error('Analysis failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    if (!severity) return 'text-gray-400';
    const s = severity.toLowerCase();
    if (s === 'high') return 'text-red-400';
    if (s === 'medium') return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getSeverityIcon = (severity) => {
    if (!severity) return <Info className="w-5 h-5" />;
    const s = severity.toLowerCase();
    if (s === 'high') return <AlertTriangle className="w-5 h-5" />;
    if (s === 'medium') return <AlertCircle className="w-5 h-5" />;
    return <Info className="w-5 h-5" />;
  };

  const getRiskScoreColor = (score) => {
    if (score >= 70) return 'from-red-500 to-orange-500';
    if (score >= 40) return 'from-yellow-500 to-orange-500';
    return 'from-green-500 to-blue-500';
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
        {analysis.overall_risk_score !== undefined && (
          <Card className="glass-panel p-8 border-white/10" data-testid="risk-score-section">
            <h3 className="text-2xl font-semibold mb-6 text-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              Overall Risk Score
            </h3>
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center">
                <div className="text-6xl font-bold mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                  {analysis.overall_risk_score}
                </div>
                <p className="text-gray-400">out of 100</p>
              </div>
              <div className="flex-1 max-w-md">
                <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${getRiskScoreColor(analysis.overall_risk_score)}`}
                    style={{ width: `${analysis.overall_risk_score}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Low Risk</span>
                  <span>High Risk</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {analysis.summary && (
          <Card className="glass-panel p-6 border-white/10" data-testid="summary-section">
            <h3 className="text-lg font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Summary</h3>
            <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
          </Card>
        )}

        {analysis.red_flags && Array.isArray(analysis.red_flags) && analysis.red_flags.length > 0 && (
          <div className="space-y-4" data-testid="red-flags-list">
            <h3 className="text-xl font-semibold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Detected Red Flags</h3>
            {analysis.red_flags.map((flag, index) => (
              <Card
                key={index}
                className={`glass-panel p-6 border-white/10 ${
                  flag.severity?.toLowerCase() === 'high' ? 'border-red-500/30' :
                  flag.severity?.toLowerCase() === 'medium' ? 'border-yellow-500/30' :
                  'border-blue-500/30'
                }`}
                data-testid={`red-flag-${index}`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`mt-1 ${getSeverityColor(flag.severity)}`}>
                    {getSeverityIcon(flag.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-lg">{flag.name || flag.description?.split('.')[0] || `Red Flag ${index + 1}`}</h4>
                      {flag.severity && (
                        <span className={`text-sm font-medium ${getSeverityColor(flag.severity)} uppercase tracking-wide`}>
                          {flag.severity}
                        </span>
                      )}
                    </div>
                    {flag.description && (
                      <p className="text-gray-300 mb-3 leading-relaxed">{flag.description}</p>
                    )}
                    {flag.impact && (
                      <div className="bg-white/5 rounded-lg p-3 mt-3">
                        <p className="text-sm text-gray-400"><span className="font-semibold">Impact:</span> {flag.impact}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {analysis.red_flags && typeof analysis.red_flags === 'string' && (
          <Card className="glass-panel p-6 border-white/10">
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{analysis.red_flags}</p>
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
              <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Red Flag Radar</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <Card className="glass-panel p-12 border-white/10 text-center" data-testid="loading-indicator">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-red-400" />
            <p className="text-lg text-gray-400">Scanning for red flags...</p>
            <p className="text-sm text-gray-500 mt-2">Detecting accounting anomalies and risks</p>
          </Card>
        ) : (
          renderAnalysis()
        )}
      </div>
    </div>
  );
};

export default RedFlags;