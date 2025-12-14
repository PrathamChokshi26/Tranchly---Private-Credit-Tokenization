import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AnalysisView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [useSampleData, setUseSampleData] = useState(false);

  useEffect(() => {
    performAnalysis();
  }, []);

  const getSampleData = () => {
    return {
      summary: "Strong financial performance with revenue growth of 15% YoY. Gross margins improved by 2.3 percentage points driven by operational efficiency. Working capital management shows improvement with DSO reduced by 5 days.",
      line_items: {
        "Revenue": "$2.5B (+15% YoY)",
        "Gross Profit": "$1.2B (+18% YoY)",
        "Operating Income": "$450M (+22% YoY)",
        "Net Income": "$320M (+20% YoY)",
        "EPS": "$3.45 (+19% YoY)"
      },
      trends: {
        revenue: [
          { period: 'Q1 2023', value: 550 },
          { period: 'Q2 2023', value: 580 },
          { period: 'Q3 2023', value: 610 },
          { period: 'Q4 2023', value: 760 }
        ],
        growth: [
          { metric: 'Revenue Growth', value: 15 },
          { metric: 'Gross Margin', value: 48 },
          { metric: 'Operating Margin', value: 18 },
          { metric: 'Net Margin', value: 13 },
          { metric: 'ROE', value: 22 }
        ]
      },
      margins: {
        data: [
          { name: 'Gross Margin', current: 48, previous: 45.7, industry: 42 },
          { name: 'Operating Margin', current: 18, previous: 16.5, industry: 15 },
          { name: 'Net Margin', current: 13, previous: 11.8, industry: 10 }
        ]
      },
      red_flags: "Minor concern: Accounts receivable increased faster than revenue. Monitor collections process.",
      health_score: 82,
      financial_ratios: [
        { category: 'Liquidity', score: 85 },
        { category: 'Profitability', score: 90 },
        { category: 'Efficiency', score: 78 },
        { category: 'Leverage', score: 75 },
        { category: 'Growth', score: 88 }
      ]
    };
  };

  const performAnalysis = async () => {
    const content = sessionStorage.getItem('analysisContent');
    const documentId = sessionStorage.getItem('documentId');

    if (!content) {
      setUseSampleData(true);
      setAnalysis(getSampleData());
      toast.info('Displaying sample analysis data');
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
      toast.error('Using sample data due to: ' + (error.response?.data?.detail || error.message));
      setUseSampleData(true);
      setAnalysis(getSampleData());
    } finally {
      setLoading(false);
    }
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
      <div className="space-y-8">
        {useSampleData && (
          <Card className="glass-panel p-4 border-blue-500/30 bg-blue-500/5">
            <p className="text-sm text-blue-300 text-center">📊 Sample Analysis Data - Upload your document to see real analysis</p>
          </Card>
        )}

        {/* Summary */}
        {analysis.summary && (
          <Card className="glass-panel p-6 border-white/10" data-testid="summary-section">
            <h3 className="text-xl font-semibold mb-4 flex items-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <CheckCircle2 className="w-5 h-5 mr-2 text-green-400" />
              Executive Summary
            </h3>
            <p className="text-gray-300 leading-relaxed text-lg">{analysis.summary}</p>
          </Card>
        )}

        {/* Health Score with Radar Chart */}
        <div className="grid md:grid-cols-2 gap-6">
          {analysis.health_score !== undefined && (
            <Card className="glass-panel p-6 border-white/10" data-testid="health-score-section">
              <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Financial Health Score</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="url(#gradient)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - analysis.health_score / 100)}`}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>{analysis.health_score}</div>
                      <div className="text-sm text-gray-400">/ 100</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {analysis.financial_ratios && (
            <Card className="glass-panel p-6 border-white/10">
              <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Financial Ratios</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={analysis.financial_ratios}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="category" stroke="#9ca3af" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9ca3af" />
                  <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* Key Line Items */}
        {analysis.line_items && (
          <Card className="glass-panel p-6 border-white/10" data-testid="line-items-section">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Key Financial Metrics</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Metric</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analysis.line_items).map(([key, value], index) => (
                    <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 text-gray-300">{key}</td>
                      <td className="py-4 px-4 text-right font-semibold">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Revenue Trends */}
        {analysis.trends?.revenue && (
          <Card className="glass-panel p-6 border-white/10" data-testid="trends-section">
            <h3 className="text-xl font-semibold mb-6 flex items-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
              Revenue Trends
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analysis.trends.revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="period" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} name="Revenue ($M)" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Growth Metrics */}
        {analysis.trends?.growth && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Key Growth Metrics</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysis.trends.growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="metric" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} name="Percentage (%)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Margin Comparison */}
        {analysis.margins?.data && (
          <Card className="glass-panel p-6 border-white/10" data-testid="margins-section">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Margin Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysis.margins.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="current" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Current" />
                <Bar dataKey="previous" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Previous" />
                <Bar dataKey="industry" fill="#6b7280" radius={[8, 8, 0, 0]} name="Industry Avg" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Red Flags */}
        {analysis.red_flags && (
          <Card className="glass-panel p-6 border-white/10 border-red-500/20" data-testid="red-flags-section">
            <h3 className="text-xl font-semibold mb-4 flex items-center text-red-400" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <AlertCircle className="w-5 h-5 mr-2" />
              Areas of Concern
            </h3>
            <p className="text-gray-300 leading-relaxed">{typeof analysis.red_flags === 'string' ? analysis.red_flags : JSON.stringify(analysis.red_flags, null, 2)}</p>
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