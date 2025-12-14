import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, AlertTriangle, CheckCircle2, AlertCircle, TrendingUp, Loader2, Award, Target } from 'lucide-react';
import { toast } from 'sonner';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EarningsQuality = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [useSampleData, setUseSampleData] = useState(false);

  useEffect(() => {
    performAnalysis();
  }, []);

  const getSampleData = () => {
    return {
      earnings_quality_score: 7,
      summary: "Earnings quality assessment reveals moderate concerns with a score of 7/10. While EPS growth of 15% outpaces cash flow growth of 12%, the divergence is not alarming. Margins are expanding sustainably through operational efficiency. Minor aggressive accounting patterns detected in revenue recognition timing.",
      score_justification: "Score of 7 reflects solid earnings quality with minor concerns. Strong cash conversion (105%) and sustainable margin expansion provide confidence. However, slight EPS-CFO divergence and moderately aggressive DSO management prevent a higher score. Overall, earnings appear largely real with some engineering at the edges.",
      eps_vs_cash_analysis: {
        eps_growth: "15% YoY",
        operating_cash_flow_growth: "12% YoY",
        divergence: "3 percentage points",
        assessment: "Modest divergence within acceptable range. EPS growth slightly ahead but not concerning.",
        concern_level: "Low"
      },
      margin_analysis: {
        gross_margin_trend: "Expanding",
        operating_margin_trend: "Expanding",
        margin_expansion_drivers: [
          "Operational efficiency improvements (+1.5%)",
          "Product mix shift toward higher-margin offerings (+0.8%)",
          "Scale economies from revenue growth (+0.5%)"
        ],
        sustainability_assessment: "Margins appear sustainable. Improvements driven by structural factors rather than one-time benefits.",
        red_flags: []
      },
      revenue_quality: {
        revenue_recognition_assessment: "Conservative to Normal",
        accounts_receivable_quality: {
          dso_trend: "Stable with slight deterioration",
          dso_value: "48 days (up from 45)",
          concern: "Minor increase in DSO suggests slightly more aggressive collections, but within industry norms"
        },
        revenue_concentration_risk: "Low",
        one_time_items: []
      },
      aggressive_accounting_indicators: [
        {
          indicator: "Revenue Recognition Timing",
          evidence: "Q4 revenue recognition accelerated by 2 days vs prior year",
          severity: "Low",
          impact_on_score: -0.5
        },
        {
          indicator: "Capitalized Software Costs",
          evidence: "R&D capitalization rate increased from 12% to 15%",
          severity: "Low",
          impact_on_score: -0.5
        }
      ],
      key_red_flags: [
        "DSO increased from 45 to 48 days - watch for further deterioration",
        "Minor revenue recognition timing acceleration in Q4"
      ],
      positive_signals: [
        "Cash conversion ratio consistently above 100%",
        "Operating cash flow growing in line with earnings",
        "Margin expansion from sustainable operational improvements",
        "Conservative accrual policies",
        "Low revenue concentration risk"
      ],
      earnings_trap_risk: {
        risk_level: "Low",
        probability: "15-20%",
        key_vulnerabilities: [
          "Further DSO deterioration could signal demand softness",
          "Margin sustainability if efficiency gains plateau"
        ],
        warning_signs: [
          "Watch for DSO exceeding 50 days",
          "Monitor for inventory buildup",
          "Track cash conversion falling below 100%"
        ]
      },
      quality_breakdown: {
        cash_conversion_quality: 8,
        margin_quality: 8,
        revenue_quality: 7,
        balance_sheet_quality: 7,
        accounting_conservatism: 6
      },
      comparison_chart_data: [
        { metric: "EPS Growth", value: 15, benchmark: 12, color: "#10b981" },
        { metric: "CFO Growth", value: 12, benchmark: 12, color: "#3b82f6" },
        { metric: "Gross Margin", value: 48, benchmark: 45, color: "#8b5cf6" },
        { metric: "Op Margin", value: 18, benchmark: 15, color: "#f59e0b" },
        { metric: "Cash Conversion", value: 105, benchmark: 100, color: "#10b981" }
      ],
      verdict: "Medium-High Quality - Earnings are largely real with minor engineering. No major red flags but some areas warrant monitoring. Company demonstrates solid operational performance with sustainable fundamentals.",
      investor_action: "HOLD/BUY - Earnings quality supports current valuation. Minor concerns don't warrant avoiding the stock. Monitor DSO and cash conversion trends going forward.",
      confidence_level: 82
    };
  };

  const performAnalysis = async () => {
    const content = sessionStorage.getItem('analysisContent');
    const documentId = sessionStorage.getItem('documentId');

    if (!content) {
      setUseSampleData(true);
      setAnalysis(getSampleData());
      toast.info('Displaying sample earnings quality analysis');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/analyze/earnings-quality`, {
        content,
        analysis_type: 'earnings_quality',
        document_id: documentId
      });
      setAnalysis(response.data.result);
      toast.success('Earnings quality analysis complete!');
    } catch (error) {
      toast.error('Using sample data due to: ' + (error.response?.data?.detail || error.message));
      setUseSampleData(true);
      setAnalysis(getSampleData());
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'from-green-500 to-emerald-500';
    if (score >= 6) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-orange-500';
  };

  const getScoreLabel = (score) => {
    if (score >= 8) return 'High Quality';
    if (score >= 6) return 'Medium Quality';
    if (score >= 4) return 'Low Quality';
    return 'Very Poor Quality';
  };

  const getRiskColor = (risk) => {
    if (!risk) return 'text-gray-400';
    const r = risk.toLowerCase();
    if (r === 'high') return 'text-red-400';
    if (r === 'medium') return 'text-yellow-400';
    return 'text-green-400';
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

    const score = analysis.earnings_quality_score || 0;

    return (
      <div className="space-y-8">
        {useSampleData && (
          <Card className="glass-panel p-4 border-blue-500/30 bg-blue-500/5">
            <p className="text-sm text-blue-300 text-center">📊 Sample Earnings Quality Analysis - Upload earnings report for real assessment</p>
          </Card>
        )}

        {/* Main Score */}
        <Card className="glass-panel p-8 border-white/10">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Earnings Quality Score</h2>
            <p className="text-gray-400">Real earnings vs engineered results</p>
          </div>
          
          <div className="flex items-center justify-center mb-8">
            <div className="relative w-48 h-48">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="rgba(255,255,255,0.1)" strokeWidth="16" fill="none" />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="url(#gradient-score)"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 80}`}
                  strokeDashoffset={`${2 * Math.PI * 80 * (1 - score / 10)}`}
                />
                <defs>
                  <linearGradient id="gradient-score" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444'} />
                    <stop offset="100%" stopColor={score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444'} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-6xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>{score}</div>
                <div className="text-sm text-gray-400">/ 10</div>
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <div className={`inline-block px-6 py-2 rounded-full bg-gradient-to-r ${getScoreColor(score)} text-white font-semibold`}>
              {getScoreLabel(score)}
            </div>
          </div>

          {analysis.score_justification && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h4 className="font-semibold mb-3">Score Justification</h4>
              <p className="text-gray-300 leading-relaxed">{analysis.score_justification}</p>
            </div>
          )}
        </Card>

        {/* Summary */}
        {analysis.summary && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Executive Summary</h3>
            <p className="text-gray-300 leading-relaxed text-lg">{analysis.summary}</p>
          </Card>
        )}

        {/* Quality Breakdown Radar */}
        {analysis.quality_breakdown && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Quality Breakdown</h3>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={Object.entries(analysis.quality_breakdown).map(([key, value]) => ({
                category: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                score: value,
                fullMark: 10
              }))}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="category" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <PolarRadiusAxis angle={90} domain={[0, 10]} stroke="#9ca3af" />
                <Radar name="Quality Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} strokeWidth={2} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10,10,11,0.95)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '12px',
                    padding: '12px'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* EPS vs Cash Flow */}
        {analysis.eps_vs_cash_analysis && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>EPS vs Cash Flow Growth</h3>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">EPS Growth</div>
                <div className="text-2xl font-bold text-green-400">{analysis.eps_vs_cash_analysis.eps_growth}</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">CFO Growth</div>
                <div className="text-2xl font-bold text-blue-400">{analysis.eps_vs_cash_analysis.operating_cash_flow_growth}</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Divergence</div>
                <div className="text-2xl font-bold text-purple-400">{analysis.eps_vs_cash_analysis.divergence}</div>
              </div>
            </div>
            <div className={`p-4 rounded-lg border ${
              analysis.eps_vs_cash_analysis.concern_level === 'Low' ? 'bg-green-500/5 border-green-500/20' :
              analysis.eps_vs_cash_analysis.concern_level === 'Medium' ? 'bg-yellow-500/5 border-yellow-500/20' :
              'bg-red-500/5 border-red-500/20'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Assessment</h4>
                <span className={`text-sm font-medium ${getRiskColor(analysis.eps_vs_cash_analysis.concern_level)}`}>
                  {analysis.eps_vs_cash_analysis.concern_level} Concern
                </span>
              </div>
              <p className="text-sm text-gray-300">{analysis.eps_vs_cash_analysis.assessment}</p>
            </div>
          </Card>
        )}

        {/* Comparison Chart */}
        {analysis.comparison_chart_data && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Performance vs Benchmarks</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysis.comparison_chart_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="metric" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10,10,11,0.95)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '12px',
                    padding: '12px'
                  }}
                />
                <Legend />
                <Bar dataKey="value" name="Actual" radius={[8, 8, 0, 0]}>
                  {analysis.comparison_chart_data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                  ))}
                </Bar>
                <Bar dataKey="benchmark" fill="#6b7280" name="Benchmark" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Red Flags & Positive Signals */}
        <div className="grid md:grid-cols-2 gap-6">
          {analysis.key_red_flags && analysis.key_red_flags.length > 0 && (
            <Card className="glass-panel p-6 border-white/10 border-red-500/20">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-red-400" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                <AlertTriangle className="w-5 h-5 mr-2" />
                Key Red Flags
              </h3>
              <ul className="space-y-3">
                {analysis.key_red_flags.map((flag, i) => (
                  <li key={i} className="flex items-start space-x-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{flag}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {analysis.positive_signals && analysis.positive_signals.length > 0 && (
            <Card className="glass-panel p-6 border-white/10 border-green-500/20">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-green-400" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Positive Signals
              </h3>
              <ul className="space-y-3">
                {analysis.positive_signals.map((signal, i) => (
                  <li key={i} className="flex items-start space-x-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{signal}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Earnings Trap Risk */}
        {analysis.earnings_trap_risk && (
          <Card className="glass-panel p-6 border-white/10 border-orange-500/20 bg-orange-500/5">
            <h3 className="text-xl font-semibold mb-6 flex items-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <Target className="w-6 h-6 mr-2 text-orange-400" />
              <span className={getRiskColor(analysis.earnings_trap_risk.risk_level)}>
                Earnings Trap Risk: {analysis.earnings_trap_risk.risk_level}
              </span>
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-orange-400">Probability</h4>
                  <p className="text-2xl font-bold">{analysis.earnings_trap_risk.probability}</p>
                </div>
                {analysis.earnings_trap_risk.key_vulnerabilities && (
                  <div>
                    <h4 className="font-semibold mb-2 text-orange-400">Key Vulnerabilities</h4>
                    <ul className="space-y-2">
                      {analysis.earnings_trap_risk.key_vulnerabilities.map((vuln, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start space-x-2">
                          <span className="text-orange-400 mt-0.5">•</span>
                          <span>{vuln}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {analysis.earnings_trap_risk.warning_signs && (
                <div>
                  <h4 className="font-semibold mb-2 text-orange-400">Warning Signs to Monitor</h4>
                  <ul className="space-y-2">
                    {analysis.earnings_trap_risk.warning_signs.map((sign, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <span>{sign}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Verdict & Action */}
        <div className="grid md:grid-cols-2 gap-6">
          {analysis.verdict && (
            <Card className="glass-panel p-6 border-white/10 bg-blue-500/5">
              <h3 className="text-lg font-semibold mb-4 flex items-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                <Award className="w-5 h-5 mr-2 text-blue-400" />
                Final Verdict
              </h3>
              <p className="text-gray-300 leading-relaxed">{analysis.verdict}</p>
            </Card>
          )}

          {analysis.investor_action && (
            <Card className="glass-panel p-6 border-white/10 bg-green-500/5">
              <h3 className="text-lg font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Investor Action</h3>
              <p className="text-gray-300 leading-relaxed">{analysis.investor_action}</p>
            </Card>
          )}
        </div>

        {/* Confidence */}
        {analysis.confidence_level !== undefined && (
          <Card className="glass-panel p-6 border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Analysis Confidence</h3>
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>{analysis.confidence_level}%</div>
                <div className="w-32 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${analysis.confidence_level}%` }}
                  />
                </div>
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
              <div>
                <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Earnings Quality Score</h1>
                <p className="text-sm text-gray-400">Real earnings vs engineered results • Earnings trap detection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <Card className="glass-panel p-12 border-white/10 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-lg text-gray-400">Evaluating earnings quality...</p>
            <p className="text-sm text-gray-500 mt-2">Analyzing EPS, cash flows, margins, and accounting policies</p>
          </Card>
        ) : (
          renderAnalysis()
        )}
      </div>
    </div>
  );
};

export default EarningsQuality;
