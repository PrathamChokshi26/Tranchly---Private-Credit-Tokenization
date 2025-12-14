import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, AlertTriangle, CheckCircle2, AlertCircle, TrendingDown, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ConsistencyEngine = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [useSampleData, setUseSampleData] = useState(false);

  useEffect(() => {
    performAnalysis();
  }, []);

  const getSampleData = () => {
    return {
      summary: "Cross-statement analysis reveals strong financial consistency with operating cash flow of $300M closely matching net income of $320M. The $20M divergence is primarily driven by normal working capital adjustments and non-cash expenses. No significant red flags detected in earnings quality.",
      reconciliation: {
        net_income: "$320M",
        operating_cash_flow: "$300M",
        difference: "$20M",
        difference_percentage: "6.25%"
      },
      divergence_drivers: [
        {
          factor: "Depreciation & Amortization",
          impact: "+$50M",
          direction: "Add back",
          explanation: "Non-cash expense added back to net income",
          normal: true
        },
        {
          factor: "Working Capital Increase",
          impact: "-$80M",
          direction: "Decrease",
          explanation: "Growth in receivables and inventory",
          normal: true
        },
        {
          factor: "Accounts Receivable Growth",
          impact: "-$45M",
          direction: "Decrease",
          explanation: "AR increased with revenue growth",
          normal: true
        },
        {
          factor: "Inventory Build",
          impact: "-$35M",
          direction: "Decrease",
          explanation: "Inventory buildup for new product launch",
          normal: true
        },
        {
          factor: "Stock-Based Compensation",
          impact: "+$25M",
          direction: "Add back",
          explanation: "Non-cash compensation expense",
          normal: true
        }
      ],
      working_capital_analysis: {
        accounts_receivable: {
          change: "+$45M",
          days_sales_outstanding: "42 days",
          concern_level: "Low"
        },
        inventory: {
          change: "+$35M",
          days_inventory: "38 days",
          concern_level: "Low"
        },
        accounts_payable: {
          change: "+$15M",
          days_payable: "35 days",
          concern_level: "Low"
        }
      },
      balance_sheet_pressure: {
        debt_increase: "+$50M",
        equity_changes: "+$280M",
        asset_quality: "Strong - liquid assets comprise 65% of total assets",
        concerns: []
      },
      manipulation_indicators: [
        {
          indicator: "Revenue Recognition Timing",
          evidence: "No unusual patterns detected",
          severity: "Low"
        },
        {
          indicator: "Expense Capitalization",
          evidence: "Capex-to-revenue ratio stable at 5%",
          severity: "Low"
        }
      ],
      cash_quality_score: 85,
      risk_assessment: {
        overall_risk: "Low",
        primary_concerns: [
          "Working capital growth consuming cash",
          "Moderate increase in debt levels"
        ],
        mitigating_factors: [
          "Strong cash generation from operations",
          "Healthy DSO and inventory turnover",
          "Conservative accounting policies"
        ],
        recommendation: "Financial statements show high integrity. Minor working capital management attention needed."
      },
      confidence_score: 88,
      key_findings: [
        "Operating cash flow closely tracks earnings - indicates high earnings quality",
        "Working capital growth is proportional to revenue growth",
        "No evidence of aggressive accounting or earnings manipulation",
        "Balance sheet remains healthy with strong liquidity position"
      ],
      reconciliation_chart_data: [
        { item: "Net Income", value: 320, color: "#10b981" },
        { item: "Add: D&A", value: 50, color: "#3b82f6" },
        { item: "Add: SBC", value: 25, color: "#3b82f6" },
        { item: "Less: WC", value: -80, color: "#ef4444" },
        { item: "Adjustments", value: -15, color: "#f59e0b" },
        { item: "Op Cash Flow", value: 300, color: "#10b981" }
      ]
    };
  };

  const performAnalysis = async () => {
    const content = sessionStorage.getItem('analysisContent');
    const documentId = sessionStorage.getItem('documentId');

    if (!content) {
      setUseSampleData(true);
      setAnalysis(getSampleData());
      toast.info('Displaying sample consistency analysis');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/analyze/consistency`, {
        content,
        analysis_type: 'consistency',
        document_id: documentId
      });
      setAnalysis(response.data.result);
      toast.success('Consistency analysis complete!');
    } catch (error) {
      toast.error('Using sample data due to: ' + (error.response?.data?.detail || error.message));
      setUseSampleData(true);
      setAnalysis(getSampleData());
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    if (!risk) return 'text-gray-400';
    const r = risk.toLowerCase();
    if (r === 'high') return 'text-red-400';
    if (r === 'medium') return 'text-yellow-400';
    return 'text-green-400';
  };

  const getRiskIcon = (risk) => {
    if (!risk) return <AlertCircle className="w-5 h-5" />;
    const r = risk.toLowerCase();
    if (r === 'high') return <AlertTriangle className="w-5 h-5" />;
    if (r === 'medium') return <AlertCircle className="w-5 h-5" />;
    return <CheckCircle2 className="w-5 h-5" />;
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
            <p className="text-sm text-blue-300 text-center">📊 Sample Consistency Analysis - Upload financial statements for real forensic analysis</p>
          </Card>
        )}

        {/* Summary */}
        {analysis.summary && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-4 flex items-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <Shield className="w-5 h-5 mr-2 text-blue-400" />
              Forensic Analysis Summary
            </h3>
            <p className="text-gray-300 leading-relaxed text-lg">{analysis.summary}</p>
          </Card>
        )}

        {/* Scores */}
        <div className="grid md:grid-cols-2 gap-6">
          {analysis.cash_quality_score !== undefined && (
            <Card className="glass-panel p-6 border-white/10">
              <h3 className="text-lg font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Cash Quality Score</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="url(#gradient-quality)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - analysis.cash_quality_score / 100)}`}
                    />
                    <defs>
                      <linearGradient id="gradient-quality" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>{analysis.cash_quality_score}</div>
                      <div className="text-sm text-gray-400">/ 100</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {analysis.confidence_score !== undefined && (
            <Card className="glass-panel p-6 border-white/10">
              <h3 className="text-lg font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Confidence Score</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="url(#gradient-confidence)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - analysis.confidence_score / 100)}`}
                    />
                    <defs>
                      <linearGradient id="gradient-confidence" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>{analysis.confidence_score}</div>
                      <div className="text-sm text-gray-400">/ 100</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Reconciliation */}
        {analysis.reconciliation && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Income vs Cash Flow Reconciliation</h3>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Net Income</div>
                <div className="text-2xl font-bold text-green-400">{analysis.reconciliation.net_income}</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Operating Cash Flow</div>
                <div className="text-2xl font-bold text-blue-400">{analysis.reconciliation.operating_cash_flow}</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Difference</div>
                <div className="text-2xl font-bold text-purple-400">{analysis.reconciliation.difference}</div>
              </div>
              <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Divergence %</div>
                <div className="text-2xl font-bold text-gray-400">{analysis.reconciliation.difference_percentage}</div>
              </div>
            </div>

            {analysis.reconciliation_chart_data && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analysis.reconciliation_chart_data} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="item" type="category" stroke="#9ca3af" width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10,10,11,0.95)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      borderRadius: '12px',
                      padding: '12px'
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {analysis.reconciliation_chart_data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}

        {/* Divergence Drivers */}
        {analysis.divergence_drivers && Array.isArray(analysis.divergence_drivers) && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Divergence Drivers</h3>
            <div className="space-y-4">
              {analysis.divergence_drivers.map((driver, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    driver.normal
                      ? 'bg-blue-500/5 border-blue-500/20'
                      : 'bg-yellow-500/5 border-yellow-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {driver.normal ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                      )}
                      <h4 className="font-semibold">{driver.factor}</h4>
                    </div>
                    <span className={`text-lg font-bold ${driver.impact?.startsWith('-') ? 'text-red-400' : 'text-green-400'}`}>
                      {driver.impact}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 pl-8">{driver.explanation}</p>
                  <div className="flex items-center space-x-2 mt-2 pl-8">
                    <span className="text-xs px-2 py-1 bg-white/5 rounded">{driver.direction}</span>
                    <span className="text-xs text-gray-500">
                      {driver.normal ? 'Normal business activity' : 'Requires attention'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Working Capital Analysis */}
        {analysis.working_capital_analysis && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Working Capital Analysis</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(analysis.working_capital_analysis).map(([key, data], i) => (
                <div key={i} className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 capitalize">{key.replace(/_/g, ' ')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Change:</span>
                      <span className={data.change?.startsWith('+') ? 'text-green-400' : 'text-red-400'}>
                        {data.change}
                      </span>
                    </div>
                    {data.days_sales_outstanding && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">DSO:</span>
                        <span>{data.days_sales_outstanding}</span>
                      </div>
                    )}
                    {data.days_inventory && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">DIO:</span>
                        <span>{data.days_inventory}</span>
                      </div>
                    )}
                    {data.days_payable && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">DPO:</span>
                        <span>{data.days_payable}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-white/10">
                      <span className={`text-xs font-medium ${getRiskColor(data.concern_level)}`}>
                        {data.concern_level} Concern
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Manipulation Indicators */}
        {analysis.manipulation_indicators && Array.isArray(analysis.manipulation_indicators) && (
          <Card className="glass-panel p-6 border-white/10 border-red-500/20">
            <h3 className="text-xl font-semibold mb-6 flex items-center text-red-400" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <AlertTriangle className="w-5 h-5 mr-2" />
              Manipulation Risk Indicators
            </h3>
            <div className="space-y-4">
              {analysis.manipulation_indicators.map((indicator, i) => (
                <div key={i} className={`p-4 rounded-lg border ${
                  indicator.severity === 'High' ? 'bg-red-500/10 border-red-500/30' :
                  indicator.severity === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-green-500/10 border-green-500/30'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{indicator.indicator}</h4>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      indicator.severity === 'High' ? 'bg-red-500/20 text-red-400' :
                      indicator.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {indicator.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{indicator.evidence}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Risk Assessment */}
        {analysis.risk_assessment && (
          <Card className="glass-panel p-6 border-white/10">
            <h3 className="text-xl font-semibold mb-6 flex items-center" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              {getRiskIcon(analysis.risk_assessment.overall_risk)}
              <span className={`ml-2 ${getRiskColor(analysis.risk_assessment.overall_risk)}`}>
                Overall Risk: {analysis.risk_assessment.overall_risk}
              </span>
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {analysis.risk_assessment.primary_concerns && (
                <div>
                  <h4 className="font-semibold mb-3 text-red-400">Primary Concerns</h4>
                  <ul className="space-y-2">
                    {analysis.risk_assessment.primary_concerns.map((concern, i) => (
                      <li key={i} className="flex items-start space-x-2 text-sm text-gray-300">
                        <TrendingDown className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.risk_assessment.mitigating_factors && (
                <div>
                  <h4 className="font-semibold mb-3 text-green-400">Mitigating Factors</h4>
                  <ul className="space-y-2">
                    {analysis.risk_assessment.mitigating_factors.map((factor, i) => (
                      <li key={i} className="flex items-start space-x-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {analysis.risk_assessment.recommendation && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-400">Recommendation</h4>
                <p className="text-sm text-gray-300">{analysis.risk_assessment.recommendation}</p>
              </div>
            )}
          </Card>
        )}

        {/* Key Findings */}
        {analysis.key_findings && Array.isArray(analysis.key_findings) && (
          <Card className="glass-panel p-6 border-white/10 bg-blue-500/5">
            <h3 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Key Findings</h3>
            <div className="space-y-3">
              {analysis.key_findings.map((finding, i) => (
                <div key={i} className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-400">{i + 1}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{finding}</p>
                </div>
              ))}
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
                <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Financial Consistency Engine</h1>
                <p className="text-sm text-gray-400">Forensic cross-statement analysis & earnings quality assessment</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <Card className="glass-panel p-12 border-white/10 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-lg text-gray-400">Performing forensic analysis...</p>
            <p className="text-sm text-gray-500 mt-2">Reconciling income, cash flow, and balance sheet</p>
          </Card>
        ) : (
          renderAnalysis()
        )}
      </div>
    </div>
  );
};

export default ConsistencyEngine;
