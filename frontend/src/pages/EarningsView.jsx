import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, Smile, Meh, Frown, TrendingUp, AlertTriangle, Target, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const EarningsView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [useSampleData, setUseSampleData] = useState(false);

  useEffect(() => {
    performAnalysis();
  }, []);

  const getSampleData = () => {
    return {
      summary: "Strong Q4 2023 performance with revenue beating consensus by 4%. Management expressed confidence in 2024 outlook driven by new product launches and market expansion. Raised full-year guidance by 5%.",
      sentiment: "Positive",
      sentiment_score: 78,
      guidance: {
        q1_2024: { revenue: "$650-670M", growth: "8-12%" },
        fy_2024: { revenue: "$2.8-2.9B", growth: "12-16%" }
      },
      key_metrics: [
        { metric: 'Revenue Beat', value: 4, benchmark: 0 },
        { metric: 'EPS Beat', value: 8, benchmark: 0 },
        { metric: 'Guidance Raise', value: 5, benchmark: 0 }
      ],
      risks: [
        "Supply chain constraints in Asia-Pacific region",
        "Foreign exchange headwinds estimated at $15-20M",
        "Increased competition in core markets"
      ],
      opportunities: [
        "New product line launching Q2 with $100M+ revenue potential",
        "Strategic partnership with Fortune 500 company",
        "Expansion into 3 new geographic markets",
        "AI-powered features driving 15% price premium"
      ],
      investor_takeaways: [
        "Solid execution with consensus-beating results",
        "Management credibility enhanced with guidance raise",
        "Multiple growth drivers de-risk near-term outlook",
        "Margin expansion story intact despite macro headwinds"
      ],
      sentiment_breakdown: [
        { category: 'Revenue Performance', score: 85 },
        { category: 'Profitability', score: 78 },
        { category: 'Guidance', score: 82 },
        { category: 'Strategic Initiatives', score: 75 },
        { category: 'Market Position', score: 70 }
      ]
    };
  };

  const performAnalysis = async () => {
    const content = sessionStorage.getItem('analysisContent');
    const documentId = sessionStorage.getItem('documentId');

    if (!content) {
      setUseSampleData(true);
      setAnalysis(getSampleData());
      toast.info('Displaying sample earnings data');
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
      toast.error('Using sample data due to: ' + (error.response?.data?.detail || error.message));
      setUseSampleData(true);
      setAnalysis(getSampleData());
    } finally {
      setLoading(false);
    }
  };

  const getSentimentIcon = (sentiment) => {
    if (!sentiment) return <Meh className="w-8 h-8" />;
    const s = sentiment.toLowerCase();
    if (s.includes('positive')) return <Smile className="w-8 h-8 text-green-400" />;
    if (s.includes('negative')) return <Frown className="w-8 h-8 text-red-400" />;
    return <Meh className="w-8 h-8 text-yellow-400" />;
  };

  const getSentimentColor = (sentiment) => {
    if (!sentiment) return 'text-yellow-400';
    const s = sentiment.toLowerCase();
    if (s.includes('positive')) return 'text-green-400';
    if (s.includes('negative')) return 'text-red-400';
    return 'text-yellow-400';
  };

  const renderAnalysis = () => {
    if (!analysis) return null;

    if (analysis.analysis && typeof analysis.analysis === 'string') {
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
        {useSampleData && (
          <Card className="glass-panel p-4 border-blue-500/30 bg-blue-500/5">
            <p className="text-sm text-blue-300 text-center">📊 Sample Earnings Data - Upload earnings transcript to see real analysis</p>
          </Card>
        )}

        {/* Summary */}
        {analysis.summary && (
          <Card className="glass-panel p-6 border-white/10" data-testid="summary-section">
            <h3 className="text-xl font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Executive Summary</h3>
            <p className="text-gray-300 leading-relaxed text-lg">{analysis.summary}</p>
          </Card>
        )}

        {/* Sentiment Analysis */}
        <div className="grid md:grid-cols-2 gap-6">
          {analysis.sentiment && (
            <Card className="glass-panel p-6 border-white/10" data-testid="sentiment-section">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Management Sentiment</h3>
                {getSentimentIcon(analysis.sentiment)}
              </div>
              <div className="text-center mb-6">
                <div className={`text-5xl font-bold mb-2 ${getSentimentColor(analysis.sentiment)}`} style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                  {analysis.sentiment}
                </div>
                {analysis.sentiment_score && (
                  <div className="text-sm text-gray-400">Confidence: {analysis.sentiment_score}%</div>
                )}
              </div>
              {analysis.sentiment_score && (
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                    style={{ width: `${analysis.sentiment_score}%` }}
                  />
                </div>
              )}
            </Card>
          )}

          {analysis.guidance && (
            <Card className="glass-panel p-6 border-white/10" data-testid="guidance-section">
              <div className="flex items-center space-x-3 mb-6">
                <Target className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Forward Guidance</h3>
              </div>
              <div className="space-y-4">
                {typeof analysis.guidance === 'object' && Object.entries(analysis.guidance).map(([period, data], i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">{period.replace(/_/g, ' ').toUpperCase()}</div>
                    {typeof data === 'object' ? (
                      Object.entries(data).map(([key, value], j) => (
                        <div key={j} className="flex justify-between items-center mt-1">
                          <span className="text-gray-300 capitalize">{key}</span>
                          <span className="font-semibold">{value}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-300">{data}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Key Metrics Chart */}
        {analysis.key_metrics && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Performance vs Expectations</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysis.key_metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="metric" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} name="Beat/Miss (%)" />
                <Bar dataKey="benchmark" fill="#6b7280" radius={[8, 8, 0, 0]} name="Consensus" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Sentiment Breakdown */}
        {analysis.sentiment_breakdown && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Sentiment Breakdown by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysis.sentiment_breakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" />
                <YAxis dataKey="category" type="category" stroke="#9ca3af" width={150} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="score" fill="#3b82f6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Risks & Opportunities */}
        <div className="grid md:grid-cols-2 gap-6">
          {analysis.risks && (
            <Card className="glass-panel p-6 border-white/10 border-red-500/20" data-testid="risks-section">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h3 className="text-lg font-semibold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Key Risks</h3>
              </div>
              <div className="text-gray-300 leading-relaxed">
                {Array.isArray(analysis.risks) ? (
                  <ul className="space-y-3">
                    {analysis.risks.map((risk, i) => (
                      <li key={i} className="flex items-start space-x-2 bg-red-500/5 p-3 rounded-lg">
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
                  <ul className="space-y-3">
                    {analysis.opportunities.map((opp, i) => (
                      <li key={i} className="flex items-start space-x-2 bg-green-500/5 p-3 rounded-lg">
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
        </div>

        {/* Investor Takeaways */}
        {analysis.investor_takeaways && (
          <Card className="glass-panel p-6 border-white/10 bg-blue-500/5" data-testid="takeaways-section">
            <h3 className="text-xl font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>What Investors Need to Know</h3>
            <div className="text-gray-300 leading-relaxed">
              {Array.isArray(analysis.investor_takeaways) ? (
                <ul className="space-y-3">
                  {analysis.investor_takeaways.map((takeaway, i) => (
                    <li key={i} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-semibold text-blue-400">{i + 1}</span>
                      </div>
                      <span className="flex-1 pt-1">{takeaway}</span>
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