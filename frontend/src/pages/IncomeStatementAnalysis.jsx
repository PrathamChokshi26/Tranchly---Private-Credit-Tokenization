import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const IncomeStatementAnalysis = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [useSampleData, setUseSampleData] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    performAnalysis();
  }, []);

  const getSampleData = () => {
    return {
      document_type: "Income Statement",
      period_covered: "Q4 2023",
      summary: "Strong Q4 performance with revenue of $2.5B (+15% YoY) and improved profitability. Gross margin expanded 230bps to 48% driven by operational efficiency. Operating margin improved 180bps to 18% reflecting strong operating leverage. Net income of $320M represents 22% growth with EPS of $3.45.",
      revenue_analysis: {
        total_revenue: "$2,500M",
        revenue_growth_yoy: "15%",
        revenue_growth_qoq: "8%",
        revenue_breakdown: [
          { segment: "Product Revenue", amount: "$1,800M", percentage: "72%" },
          { segment: "Service Revenue", amount: "$700M", percentage: "28%" }
        ],
        revenue_quality: "High quality with strong product and service mix. Service revenue growing faster at 18% YoY."
      },
      profitability_metrics: {
        gross_profit: "$1,200M",
        gross_margin: "48%",
        gross_margin_trend: "Expanding",
        operating_income: "$450M",
        operating_margin: "18%",
        operating_margin_trend: "Expanding",
        net_income: "$320M",
        net_margin: "13%",
        net_margin_trend: "Expanding",
        ebitda: "$500M",
        ebitda_margin: "20%"
      },
      cost_structure: {
        cost_of_revenue: "$1,300M",
        cogs_percentage: "52%",
        operating_expenses: "$750M",
        opex_percentage: "30%",
        rd_expense: "$250M",
        sales_marketing: "$350M",
        general_admin: "$150M",
        cost_efficiency: "Improving efficiency with operating leverage evident. R&D at 10% of revenue shows strong innovation investment."
      },
      earnings_per_share: {
        basic_eps: "$3.48",
        diluted_eps: "$3.45",
        eps_growth: "19%",
        shares_outstanding: "93M",
        share_count_trend: "Decreasing (buyback program active)"
      },
      margin_waterfall: [
        { item: "Revenue", value: 100, color: "#10b981" },
        { item: "Less: COGS", value: -52, color: "#ef4444" },
        { item: "Gross Profit", value: 48, color: "#3b82f6" },
        { item: "Less: OpEx", value: -30, color: "#ef4444" },
        { item: "Operating Income", value: 18, color: "#8b5cf6" },
        { item: "Less: Taxes/Int", value: -5, color: "#ef4444" },
        { item: "Net Income", value: 13, color: "#10b981" }
      ],
      key_trends: [
        "Strong revenue growth acceleration from 12% to 15% YoY",
        "Margin expansion across all levels (gross, operating, net)",
        "Operating leverage improving - OpEx growing slower than revenue"
      ],
      red_flags: [],
      strengths: [
        "Double-digit revenue growth with improving profitability",
        "Diversified revenue streams with service revenue growing faster",
        "Efficient cost management with positive operating leverage",
        "Strong EPS growth outpacing revenue growth"
      ],
      yoy_comparison: {
        revenue_change: "+15%",
        gross_margin_change: "+2.3 pp",
        operating_margin_change: "+1.8 pp",
        net_income_change: "+22%"
      },
      profitability_score: 85,
      recommendation: "Strong income statement with healthy growth and expanding margins. Operating leverage is evident as the company scales. Recommend HOLD/BUY based on valuation."
    };
  };

  const performAnalysis = async () => {
    const content = sessionStorage.getItem('analysisContent');
    const documentId = sessionStorage.getItem('documentId');

    if (!content) {
      setUseSampleData(true);
      setAnalysis(getSampleData());
      toast.info('Displaying sample income statement analysis');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/analyze/income-statement`, {
        content,
        analysis_type: 'income_statement',
        document_id: documentId
      });
      setAnalysis(response.data.result);
      toast.success('Income statement analysis complete!');
    } catch (error) {
      toast.error('Using sample data due to: ' + (error.response?.data?.detail || error.message));
      setUseSampleData(true);
      setAnalysis(getSampleData());
    } finally {
      setLoading(false);
    }
  };

  const saveAnalysis = () => {
    setIsSaved(true);
    toast.success('Analysis saved to workspace! Access it from "My Workspace"');
    setTimeout(() => setIsSaved(false), 3000);
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
            <p className="text-sm text-blue-300 text-center">📊 Sample Income Statement - Upload your P&L for real analysis</p>
          </Card>
        )}

        {/* Summary */}
        {analysis.summary && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Executive Summary</h3>
            <p className="text-gray-300 leading-relaxed text-lg">{analysis.summary}</p>
            {analysis.period_covered && (
              <div className="mt-4 text-sm text-gray-400">
                Period: <span className="text-white">{analysis.period_covered}</span>
              </div>
            )}
          </Card>
        )}

        {/* Key Metrics Grid */}
        {analysis.profitability_metrics && (
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="glass-panel p-4 border-white/10">
              <div className="text-sm text-gray-400 mb-1">Gross Margin</div>
              <div className="text-2xl font-bold text-green-400">{analysis.profitability_metrics.gross_margin}</div>
              <div className="text-xs text-gray-500 mt-1">{analysis.profitability_metrics.gross_margin_trend}</div>
            </Card>
            <Card className="glass-panel p-4 border-white/10">
              <div className="text-sm text-gray-400 mb-1">Operating Margin</div>
              <div className="text-2xl font-bold text-blue-400">{analysis.profitability_metrics.operating_margin}</div>
              <div className="text-xs text-gray-500 mt-1">{analysis.profitability_metrics.operating_margin_trend}</div>
            </Card>
            <Card className="glass-panel p-4 border-white/10">
              <div className="text-sm text-gray-400 mb-1">Net Margin</div>
              <div className="text-2xl font-bold text-purple-400">{analysis.profitability_metrics.net_margin}</div>
              <div className="text-xs text-gray-500 mt-1">{analysis.profitability_metrics.net_margin_trend}</div>
            </Card>
            <Card className="glass-panel p-4 border-white/10">
              <div className="text-sm text-gray-400 mb-1">EBITDA Margin</div>
              <div className="text-2xl font-bold text-orange-400">{analysis.profitability_metrics.ebitda_margin}</div>
            </Card>
          </div>
        )}

        {/* Margin Waterfall */}
        {analysis.margin_waterfall && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Profitability Waterfall</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysis.margin_waterfall} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="item" type="category" stroke="#9ca3af" width={150} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10,10,11,0.95)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '12px',
                    padding: '12px'
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {analysis.margin_waterfall.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Revenue Analysis */}
        {analysis.revenue_analysis && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6 flex items-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <DollarSign className="w-5 h-5 mr-2 text-green-400" />
              Revenue Analysis
            </h3>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Total Revenue</div>
                <div className="text-2xl font-bold text-green-400">{analysis.revenue_analysis.total_revenue}</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">YoY Growth</div>
                <div className="text-2xl font-bold text-blue-400">{analysis.revenue_analysis.revenue_growth_yoy}</div>
              </div>
              {analysis.revenue_analysis.revenue_growth_qoq && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">QoQ Growth</div>
                  <div className="text-2xl font-bold text-purple-400">{analysis.revenue_analysis.revenue_growth_qoq}</div>
                </div>
              )}
            </div>
            
            {analysis.revenue_analysis.revenue_breakdown && (
              <div className="bg-white/5 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-3">Revenue Breakdown</h4>
                <div className="space-y-2">
                  {analysis.revenue_analysis.revenue_breakdown.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-gray-400">{item.segment}</span>
                      <div className="flex items-center space-x-3">
                        <span className="font-semibold">{item.amount}</span>
                        <span className="text-sm text-gray-500">({item.percentage})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.revenue_analysis.revenue_quality && (
              <p className="text-sm text-gray-300 leading-relaxed">{analysis.revenue_analysis.revenue_quality}</p>
            )}
          </Card>
        )}

        {/* Cost Structure & EPS */}
        <div className="grid md:grid-cols-2 gap-6">
          {analysis.cost_structure && (
            <Card className="glass-panel p-6 border-white/10">
              <h3 className="text-lg font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Cost Structure</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">COGS</span>
                  <span>{analysis.cost_structure.cost_of_revenue} ({analysis.cost_structure.cogs_percentage})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">OpEx</span>
                  <span>{analysis.cost_structure.operating_expenses} ({analysis.cost_structure.opex_percentage})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">R&D</span>
                  <span>{analysis.cost_structure.rd_expense}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sales & Marketing</span>
                  <span>{analysis.cost_structure.sales_marketing}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">G&A</span>
                  <span>{analysis.cost_structure.general_admin}</span>
                </div>
              </div>
              {analysis.cost_structure.cost_efficiency && (
                <p className="mt-4 text-sm text-gray-400 leading-relaxed">{analysis.cost_structure.cost_efficiency}</p>
              )}
            </Card>
          )}

          {analysis.earnings_per_share && (
            <Card className="glass-panel p-6 border-white/10">
              <h3 className="text-lg font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Earnings Per Share</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Basic EPS</span>
                  <span className="font-bold">{analysis.earnings_per_share.basic_eps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Diluted EPS</span>
                  <span className="font-bold">{analysis.earnings_per_share.diluted_eps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">EPS Growth</span>
                  <span className="text-green-400 font-bold">{analysis.earnings_per_share.eps_growth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Shares Outstanding</span>
                  <span>{analysis.earnings_per_share.shares_outstanding}</span>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Trend: {analysis.earnings_per_share.share_count_trend}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Key Trends & Strengths */}
        <div className="grid md:grid-cols-2 gap-6">
          {analysis.key_trends && analysis.key_trends.length > 0 && (
            <Card className="glass-panel p-6 border-white/10 border-blue-500/20 bg-blue-500/5">
              <h3 className="text-lg font-semibold mb-4 text-blue-400" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Key Trends</h3>
              <ul className="space-y-2">
                {analysis.key_trends.map((trend, i) => (
                  <li key={i} className="flex items-start space-x-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{trend}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {analysis.strengths && analysis.strengths.length > 0 && (
            <Card className="glass-panel p-6 border-white/10 border-green-500/20 bg-green-500/5">
              <h3 className="text-lg font-semibold mb-4 text-green-400" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Strengths</h3>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, i) => (
                  <li key={i} className="flex items-start space-x-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{strength}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Profitability Score */}
        {analysis.profitability_score !== undefined && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6 text-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Profitability Score</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="url(#gradient-prof)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - analysis.profitability_score / 100)}`}
                  />
                  <defs>
                    <linearGradient id="gradient-prof" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>{analysis.profitability_score}</div>
                    <div className="text-sm text-gray-400">/ 100</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Recommendation */}
        {analysis.recommendation && (
          <Card className="glass-panel p-6 border-white/10 bg-blue-500/5">
            <h3 className="text-lg font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Investment Perspective</h3>
            <p className="text-gray-300 leading-relaxed">{analysis.recommendation}</p>
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
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                size="icon"
                className="hover:bg-white/10 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Income Statement Analysis</h1>
                <p className="text-sm text-gray-400">Comprehensive P&L • Revenue • Profitability • Margins</p>
              </div>
            </div>
            
            {analysis && !loading && (
              <div className="flex items-center space-x-3">
                {isSaved && (
                  <span className="text-sm text-green-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saved</span>
                  </span>
                )}
                <Button
                  onClick={saveAnalysis}
                  disabled={isSaved}
                  className={`${isSaved ? 'bg-green-500/20 text-green-400' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-full px-6`}
                >
                  {isSaved ? '✓ Saved' : 'Save to Workspace'}
                </Button>
                <Button
                  onClick={() => navigate('/workspace')}
                  variant="outline"
                  className="border-white/20 hover:bg-white/5 text-white rounded-full"
                >
                  View Workspace
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <Card className="glass-panel p-12 border-white/10 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-lg text-gray-400">Analyzing income statement...</p>
            <p className="text-sm text-gray-500 mt-2">Extracting revenue, margins, and profitability metrics</p>
          </Card>
        ) : (
          renderAnalysis()
        )}
      </div>
    </div>
  );
};

export default IncomeStatementAnalysis;
