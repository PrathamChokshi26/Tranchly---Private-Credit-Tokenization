import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import GradeBadge from '../../components/GradeBadge';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Shield, TrendingUp, Zap, Info } from 'lucide-react';

// Source chip (Plaid / Stripe / Manual)
const SourceChip = ({ label, active }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
    active ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
  }`}>
    {active && <CheckCircle2 size={10} />} {label}
  </span>
);

// Per-layer mini bar
const LayerMini = ({ label, score, weight, icon: Icon, colorText, colorBar }) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-1.5">
        <Icon size={14} className={colorText} />
        <span className="text-xs font-semibold text-gray-800">{label}</span>
      </div>
      <span className="text-xs text-gray-500">{weight}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-white rounded-full h-2 overflow-hidden border">
        <div className={`h-2 rounded-full ${colorBar}`} style={{ width: `${Math.max(0, Math.min(100, score || 0))}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-10 text-right">{(score || 0).toFixed(1)}</span>
    </div>
  </div>
);

export default function ApplicationsQueue() {
  const { api } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchApps = () => {
    setLoading(true);
    api.get('/api/admin/applications').then(r => setApplications(r.data.applications)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchApps(); }, []);

  const handleAction = async (loanId, action) => {
    setActionLoading(loanId);
    try {
      if (action === 'approve') {
        const res = await api.post(`/api/admin/loans/${loanId}/approve`, { term_months: 12 });
        setMessage({ type: 'success', text: `Loan approved! ${res.data.tokens_minted} tokens minted.` });
      } else {
        await api.post(`/api/admin/loans/${loanId}/reject`);
        setMessage({ type: 'success', text: 'Loan rejected.' });
      }
      fetchApps();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6" data-testid="admin-applications-queue-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
        <p className="text-gray-500 text-sm">Review V2 credit scoring — Plaid / Stripe / Manual signals with explainability</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} data-testid="action-message">
          {message.text}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">All caught up!</h3>
          <p className="text-gray-500 mt-1">No pending applications to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => {
            const isExpanded = expanded === app.id;
            // Pull V2 data from the credit_scores document OR from the loan doc itself
            const cs = app.credit_score || {};
            const compositeScore = cs.score ?? app.credit_score_value ?? app.credit_score_id ?? '—';
            const grade = cs.grade || app.grade;
            const aprRange = cs.apr_range || app.apr_range;
            const aprMid = cs.apr_mid ?? app.apr_mid ?? app.interest_rate;
            const maxLoan = cs.max_loan_amount ?? app.max_loan_amount;
            const layerScores = cs.layer_scores || app.layer_scores || {};
            const signalBreakdown = cs.signal_breakdown || app.signal_breakdown || {};
            const explanation = cs.explanation || app.explanation || {};
            const dataQuality = cs.data_quality_score ?? app.data_quality_score ?? 0;
            const dataSources = cs.data_sources || app.data_sources || {};
            const autoRejectFlags = cs.auto_reject_flags || app.auto_reject_flags || [];
            const reserveContribution = cs.reserve_fund_contribution ?? app.reserve_fund_contribution ?? 0;

            return (
              <div key={app.id} className="bg-white rounded-xl border" data-testid={`app-row-${app.id}`}>
                {/* Header */}
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : app.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{app.business_name}</p>
                      <GradeBadge grade={grade} size="sm" />
                      <SourceChip label="Plaid" active={!!dataSources.plaid_connected} />
                      <SourceChip label="Stripe" active={!!dataSources.stripe_connected} />
                    </div>
                    <p className="text-sm text-gray-500">{app.borrower?.full_name} • {app.industry} • {app.years_operating}yr</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${app.loan_amount_requested?.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Score: <span className="font-semibold text-gray-700">{typeof compositeScore === 'number' ? compositeScore : '—'}</span> • DQ {dataQuality}%</p>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t px-5 py-5 space-y-5 bg-gray-50/30" data-testid={`app-expanded-${app.id}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 uppercase">Monthly Revenue</p>
                        <p className="font-bold">${(app.monthly_revenue || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase">Approved</p>
                        <p className="font-bold">${(app.loan_amount_approved || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase">APR</p>
                        <p className="font-bold">{aprRange || `${aprMid}%`}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase">Max Loan</p>
                        <p className="font-bold">${(maxLoan || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 uppercase mb-1">Purpose</p>
                      <p className="text-sm text-gray-700">{app.loan_purpose}</p>
                    </div>

                    {/* Three Layer Scores */}
                    {Object.keys(layerScores).length > 0 && (
                      <div data-testid="admin-layer-scores">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Three-Layer Risk Model</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <LayerMini label="Ability" weight={layerScores.layer1_weight} score={layerScores.layer1_ability} icon={TrendingUp}
                            colorText="text-emerald-600" colorBar="bg-emerald-500" />
                          <LayerMini label="Willingness" weight={layerScores.layer2_weight} score={layerScores.layer2_willingness} icon={Zap}
                            colorText="text-purple-600" colorBar="bg-purple-500" />
                          <LayerMini label="Protection" weight={layerScores.layer3_weight} score={layerScores.layer3_protection} icon={Shield}
                            colorText="text-teal-600" colorBar="bg-teal-500" />
                        </div>
                      </div>
                    )}

                    {/* 15-Signal Table */}
                    {Object.keys(signalBreakdown).length > 0 && (
                      <div data-testid="admin-signal-breakdown">
                        <p className="text-sm font-semibold text-gray-700 mb-2">15-Signal Breakdown</p>
                        <div className="bg-white rounded-lg border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="text-left py-2 px-3 font-semibold text-gray-600">Signal</th>
                                <th className="text-left py-2 px-3 font-semibold text-gray-600">Value</th>
                                <th className="text-left py-2 px-3 font-semibold text-gray-600">Source</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(signalBreakdown).map(([k, v]) => {
                                const plaidOwned = ['avg_monthly_revenue', 'revenue_trend', 'cash_buffer_days', 'nsf_count', 'payroll_detected', 'existing_loan_payments'];
                                const stripeOwned = ['refund_rate', 'revenue_concentration'];
                                const source = plaidOwned.includes(k) && dataSources.plaid_connected ? 'Plaid'
                                  : stripeOwned.includes(k) && dataSources.stripe_connected ? 'Stripe'
                                  : 'Manual';
                                const sourceColor = source === 'Plaid' ? 'bg-emerald-100 text-emerald-700'
                                  : source === 'Stripe' ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-600';
                                const formatted = typeof v === 'boolean' ? (v ? 'Yes' : 'No')
                                  : typeof v === 'number' && (k.includes('rate') || k.includes('trend') || k.includes('ratio') || k.includes('concentration')) ? v.toFixed(3)
                                  : typeof v === 'number' ? v.toLocaleString()
                                  : String(v);
                                return (
                                  <tr key={k} className="border-t">
                                    <td className="py-1.5 px-3 capitalize text-gray-600">{k.replace(/_/g, ' ')}</td>
                                    <td className="py-1.5 px-3 font-semibold text-gray-800">{formatted}</td>
                                    <td className="py-1.5 px-3"><span className={`px-2 py-0.5 rounded-full font-semibold ${sourceColor}`}>{source}</span></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    {(explanation.positive_factors?.length > 0 || explanation.negative_factors?.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="admin-explanation">
                        {explanation.positive_factors?.length > 0 && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-emerald-700 mb-1.5">Positive Factors</p>
                            <ul className="space-y-1">
                              {explanation.positive_factors.map((f, i) => (
                                <li key={i} className="text-xs text-gray-700 flex gap-1.5"><CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0 mt-0.5" />{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {explanation.negative_factors?.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-red-700 mb-1.5">Negative Factors</p>
                            <ul className="space-y-1">
                              {explanation.negative_factors.map((f, i) => (
                                <li key={i} className="text-xs text-gray-700 flex gap-1.5"><Info size={12} className="text-red-600 flex-shrink-0 mt-0.5" />{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Auto-Reject Flags */}
                    {autoRejectFlags.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="admin-auto-reject-flags">
                        <p className="text-sm font-semibold text-red-700 flex items-center gap-1 mb-2"><AlertTriangle size={14} /> Auto-Reject Flags</p>
                        <ul className="space-y-1.5">
                          {autoRejectFlags.map((f, i) => (
                            <li key={i} className="text-xs text-gray-700">
                              <span className="font-semibold">{f.message || f}</span>
                              {f.improvement && <span className="text-gray-500"> — {f.improvement}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Reserve Fund Contribution */}
                    {reserveContribution > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-2" data-testid="admin-reserve-fund">
                        <Shield size={16} className="text-purple-600" />
                        <p className="text-xs text-gray-700">
                          Reserve Fund contribution: <span className="font-bold text-purple-700">${reserveContribution.toLocaleString()}</span> (3% of loan)
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                      <button data-testid={`btn-approve-${app.id}`} onClick={() => handleAction(app.id, 'approve')} disabled={actionLoading === app.id}
                        className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} /> Approve Loan
                      </button>
                      <button data-testid={`btn-reject-${app.id}`} onClick={() => handleAction(app.id, 'reject')} disabled={actionLoading === app.id}
                        className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
