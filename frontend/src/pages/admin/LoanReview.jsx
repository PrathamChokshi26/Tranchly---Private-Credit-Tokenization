import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import GradeBadge from '../../components/GradeBadge';
import {
  CheckCircle2, XCircle, MessageCircle, AlertTriangle,
  Shield, TrendingUp, Zap, Info, Lightbulb, ArrowLeft,
} from 'lucide-react';

// Source colour mapping — Plaid=green, Stripe=purple, Manual=gray, Platform=teal
const SOURCE_COLORS = {
  Plaid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Stripe: 'bg-purple-100 text-purple-700 border-purple-200',
  Manual: 'bg-gray-100 text-gray-700 border-gray-200',
  Platform: 'bg-teal-100 text-teal-700 border-teal-200',
};

const SOURCE_FOR_SIGNAL = {
  avg_monthly_revenue: 'Plaid',
  revenue_trend: 'Plaid',
  cash_buffer_days: 'Plaid',
  nsf_count: 'Plaid',
  payroll_detected: 'Plaid',
  existing_loan_payments: 'Plaid',
  refund_rate: 'Stripe',
  revenue_concentration: 'Stripe',
  personal_fico: 'Manual',
  personal_guarantee: 'Manual',
  years_operating: 'Manual',
  industry: 'Manual',
  ltr_ratio: 'Manual',
  business_assets: 'Manual',
  platform_loans: 'Platform',
};

function LayerBar({ label, weight, score, icon: Icon, colorText, colorBar }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div data-testid={`review-layer-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon size={14} className={colorText} />
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          <span className="text-xs text-gray-400">({weight})</span>
        </div>
        <span className="text-sm font-bold tabular-nums text-gray-900">{pct.toFixed(1)}<span className="text-gray-400 text-xs">/100</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${colorBar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatSignal(k, v) {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number' && (k.includes('rate') || k.includes('trend') || k.includes('ratio') || k.includes('concentration'))) {
    return v.toFixed(3);
  }
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
}

export default function LoanReview() {
  const { loanId } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [creditScore, setCreditScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/loans/${loanId}`);
      setLoan(r.data.loan);
      setCreditScore(r.data.credit_score);
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.detail || 'Failed to load loan' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [loanId]);

  const cs = creditScore || loan || {};
  const compositeScore = cs.score ?? loan?.credit_score ?? null;
  const grade = cs.grade || loan?.grade;
  const aprRange = cs.apr_range || loan?.apr_range;
  const aprMid = cs.apr_mid ?? loan?.apr_mid ?? loan?.interest_rate;
  const maxLoan = cs.max_loan_amount ?? loan?.max_loan_amount;
  const layerScores = cs.layer_scores || loan?.layer_scores || {};
  const signalBreakdown = cs.signal_breakdown || loan?.signal_breakdown || {};
  const explanation = cs.explanation || loan?.explanation || {};
  const dataQuality = cs.data_quality_score ?? loan?.data_quality_score ?? 0;
  const dataSources = cs.data_sources || loan?.data_sources || {};
  const autoRejectFlags = cs.auto_reject_flags || loan?.auto_reject_flags || [];
  const reserveContribution = cs.reserve_fund_contribution ?? loan?.reserve_fund_contribution ?? 0;

  // Override source mapping: if plaid or stripe not connected, those signals are Manual
  const resolveSource = (signalKey) => {
    const defaultSrc = SOURCE_FOR_SIGNAL[signalKey] || 'Manual';
    if (defaultSrc === 'Plaid' && !dataSources.plaid_connected) return 'Manual';
    if (defaultSrc === 'Stripe' && !dataSources.stripe_connected) return 'Manual';
    return defaultSrc;
  };

  const handleAction = async (action) => {
    if (!loan) return;
    setActionLoading(action);
    try {
      if (action === 'approve') {
        const res = await api.post(`/api/admin/loans/${loan.id}/approve`, { term_months: 12 });
        setMessage({ type: 'success', text: `Loan approved. ${res.data.tokens_minted || 0} tokens minted.` });
      } else if (action === 'reject') {
        await api.post(`/api/admin/loans/${loan.id}/reject`, { note });
        setMessage({ type: 'success', text: 'Loan rejected.' });
      } else if (action === 'info') {
        await api.post(`/api/admin/loans/${loan.id}/request-info`, { note });
        setMessage({ type: 'success', text: 'Information requested from borrower.' });
      }
      fetchData();
      setNote('');
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.detail || 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;
  }
  if (!loan) {
    return <div className="p-6 text-center text-gray-500">Loan not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5" data-testid="admin-loan-review-page">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700" data-testid="btn-back">
        <ArrowLeft size={14} /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{loan.business_name}</h1>
        <p className="text-gray-500 text-sm">{loan.industry} • {loan.years_operating} years operating • Status: <span className="font-semibold capitalize">{loan.status}</span></p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} data-testid="review-message">
          {message.text}
        </div>
      )}

      {/* A) Scoring Summary */}
      <div className="bg-white rounded-xl border p-6 space-y-5" data-testid="scoring-summary-card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Scoring Summary</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-4xl font-black tabular-nums text-gray-900" data-testid="review-composite-score">{compositeScore ?? '—'}</span>
              <span className="text-gray-400 text-lg">/100</span>
              <GradeBadge grade={grade} />
            </div>
            <p className="text-sm text-gray-500 mt-1">APR: <span className="font-semibold text-gray-700">{aprRange || `${aprMid}%`}</span> · Max Loan: <span className="font-semibold text-gray-700">${(maxLoan || 0).toLocaleString()}</span> · Requested: <span className="font-semibold text-gray-700">${(loan.loan_amount_requested || 0).toLocaleString()}</span></p>
          </div>
        </div>

        <div className="space-y-3">
          <LayerBar label="L1 Ability" weight={layerScores.layer1_weight} score={layerScores.layer1_ability} icon={TrendingUp}
            colorText="text-emerald-600" colorBar="bg-emerald-500" />
          <LayerBar label="L2 Willingness" weight={layerScores.layer2_weight} score={layerScores.layer2_willingness} icon={Zap}
            colorText="text-purple-600" colorBar="bg-purple-500" />
          <LayerBar label="L3 Protection" weight={layerScores.layer3_weight} score={layerScores.layer3_protection} icon={Shield}
            colorText="text-teal-600" colorBar="bg-teal-500" />
        </div>
      </div>

      {/* B) Signals Table */}
      {Object.keys(signalBreakdown).length > 0 && (
        <div className="bg-white rounded-xl border p-6" data-testid="signals-table-card">
          <h3 className="font-bold text-gray-900 mb-3">15 Signals</h3>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Signal</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Value</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Source</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(signalBreakdown).map(([k, v]) => {
                  const src = resolveSource(k);
                  return (
                    <tr key={k} className="border-t" data-testid={`signal-row-${k}`}>
                      <td className="py-2 px-3 capitalize text-gray-600">{k.replace(/_/g, ' ')}</td>
                      <td className="py-2 px-3 font-semibold text-gray-800 tabular-nums">{formatSignal(k, v)}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${SOURCE_COLORS[src]}`} data-testid={`source-badge-${src.toLowerCase()}-${k}`}>{src}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
            <span>Data quality: <span className="font-semibold text-gray-700">{dataQuality}%</span></span>
            <span>·</span>
            <span>{dataSources.live_signals ?? 0}/{dataSources.total_signals ?? 12} live signals</span>
          </div>
        </div>
      )}

      {/* C) Explainability */}
      <div className="bg-white rounded-xl border p-6 space-y-4" data-testid="explainability-card">
        <h3 className="font-bold text-gray-900">Explainability</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3" data-testid="review-positive-factors">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 size={14} className="text-emerald-700" />
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Positive</p>
            </div>
            {explanation.positive_factors?.length ? (
              <ul className="space-y-1.5">
                {explanation.positive_factors.map((f, i) => <li key={i} className="text-xs text-gray-700">{f}</li>)}
              </ul>
            ) : <p className="text-xs text-gray-400 italic">None.</p>}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="review-negative-factors">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle size={14} className="text-amber-700" />
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Negative</p>
            </div>
            {explanation.negative_factors?.length ? (
              <ul className="space-y-1.5">
                {explanation.negative_factors.map((f, i) => <li key={i} className="text-xs text-gray-700">{f}</li>)}
              </ul>
            ) : <p className="text-xs text-gray-400 italic">None.</p>}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3" data-testid="review-improvements">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb size={14} className="text-blue-700" />
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Improvements</p>
            </div>
            {explanation.improvements?.length ? (
              <ul className="space-y-1.5">
                {explanation.improvements.map((f, i) => <li key={i} className="text-xs text-gray-700">{f}</li>)}
              </ul>
            ) : <p className="text-xs text-gray-400 italic">None.</p>}
          </div>
        </div>

        {autoRejectFlags.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="review-auto-reject">
            <div className="flex items-center gap-1.5 mb-2">
              <XCircle size={14} className="text-red-700" />
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Auto-Reject Flags</p>
            </div>
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
      </div>

      {/* D) Reserve Fund Contribution */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3" data-testid="review-reserve-fund">
        <Shield className="text-purple-600" size={20} />
        <div>
          <p className="text-sm font-semibold text-gray-900">Reserve Fund Contribution</p>
          <p className="text-xs text-gray-600">
            <span className="font-bold text-purple-700 tabular-nums">${(reserveContribution || 0).toLocaleString()}</span> (3% of loan amount) will be contributed to the Investor Protection Fund upon approval.
          </p>
        </div>
      </div>

      {/* E) Admin Actions */}
      <div className="bg-white rounded-xl border p-6 space-y-4" data-testid="admin-actions-card">
        <h3 className="font-bold text-gray-900">Admin Actions</h3>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Override Note (optional)</label>
          <textarea
            data-testid="override-note-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
            placeholder="Add a note explaining your decision or information request..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            data-testid="btn-approve"
            onClick={() => handleAction('approve')}
            disabled={loan.status !== 'pending' || actionLoading !== null}
            className="bg-emerald-500 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} /> Approve
          </button>
          <button
            data-testid="btn-reject"
            onClick={() => handleAction('reject')}
            disabled={loan.status !== 'pending' || actionLoading !== null}
            className="bg-red-500 text-white py-2.5 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <XCircle size={16} /> Reject
          </button>
          <button
            data-testid="btn-request-info"
            onClick={() => handleAction('info')}
            disabled={loan.status !== 'pending' || actionLoading !== null}
            className="bg-gray-500 text-white py-2.5 rounded-lg font-semibold hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <MessageCircle size={16} /> Request More Info
          </button>
        </div>

        {loan.admin_note && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm" data-testid="existing-admin-note">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Last admin note</p>
            <p className="text-gray-700">{loan.admin_note}</p>
          </div>
        )}

        {loan.status !== 'pending' && (
          <p className="text-xs text-gray-500 flex items-center gap-1"><Info size={12} /> Actions are disabled — loan status is <span className="font-semibold capitalize">{loan.status}</span>.</p>
        )}
      </div>
    </div>
  );
}
