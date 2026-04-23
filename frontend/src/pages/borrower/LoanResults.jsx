import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Shield, TrendingUp, Zap, Info, Sparkles } from 'lucide-react';

// ─── Small presentational helpers ────────────────────────────────────────

function LayerBar({ label, weight, score, icon: Icon, color }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div data-testid={`layer-bar-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon size={16} className={color.text} />
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          <span className="text-xs text-gray-400">({weight})</span>
        </div>
        <span className="text-sm font-bold text-gray-900 tabular-nums">{pct.toFixed(1)}<span className="text-gray-400">/100</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-2.5 rounded-full ${color.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SourceBadge({ label, connected }) {
  return (
    <span
      data-testid={`source-badge-${label.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        connected ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
      }`}
    >
      {connected ? <CheckCircle2 size={12} /> : <span className="w-2 h-2 rounded-full bg-gray-300" />}
      {label}
    </span>
  );
}

function Signal({ name, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 capitalize">{name.replace(/_/g, ' ')}</span>
      <span className="text-xs font-semibold text-gray-800 tabular-nums">{value}</span>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────

export default function LoanResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;

  // If user lands here without a result in state (e.g. page refresh), redirect back to apply
  if (!result || !result.credit_score) {
    return <Navigate to="/borrower/apply" replace />;
  }

  const cs = result.credit_score;
  const gradeColor = { A: 'text-emerald-600', B: 'text-teal-600', C: 'text-amber-600', Reject: 'text-red-600' };
  const gradeBg = { A: 'bg-emerald-50 border-emerald-300', B: 'bg-teal-50 border-teal-300', C: 'bg-amber-50 border-amber-300', Reject: 'bg-red-50 border-red-300' };

  return (
    <div className="max-w-3xl mx-auto space-y-5" data-testid="loan-results-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Credit Score Result</h1>
        <p className="text-gray-500 text-sm">Tranchly V2 — three-layer predictive model</p>
      </div>

      {/* Grade / APR / Max Loan */}
      <div className={`rounded-2xl border-2 p-6 ${gradeBg[cs.grade] || 'bg-gray-50 border-gray-200'}`} data-testid="result-grade-card">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Credit Score Result</p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">Grade {cs.grade}</h2>
            <p className="text-sm text-gray-600 mt-0.5">{cs.explanation?.summary}</p>
          </div>
          <span data-testid="result-grade-letter" className={`text-6xl font-black leading-none ${gradeColor[cs.grade] || 'text-gray-500'}`}>{cs.grade}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Composite Score</p>
            <p data-testid="result-composite-score" className="text-3xl font-bold text-gray-900 tabular-nums">{cs.score}<span className="text-lg text-gray-400">/100</span></p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">APR Range</p>
            <p data-testid="result-apr-range" className="text-3xl font-bold text-gray-900">{cs.apr_range || '—'}</p>
            {cs.apr_mid > 0 && <p className="text-xs text-gray-500">mid {cs.apr_mid}%</p>}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Max Loan</p>
            <p data-testid="result-max-loan" className="text-3xl font-bold text-gray-900">${(cs.max_loan_amount || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
            <p data-testid="result-status" className="text-2xl font-bold capitalize text-gray-900">{result.status}</p>
            {cs.approved_amount > 0 && <p className="text-xs text-gray-500">approved ${cs.approved_amount.toLocaleString()}</p>}
          </div>
        </div>
      </div>

      {/* Auto-Reject Flags */}
      {cs.auto_reject && cs.auto_reject_flags?.length > 0 && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5" data-testid="auto-reject-flags-card">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-red-600" size={20} />
            <h3 className="font-bold text-red-900">Application Auto-Rejected ({cs.auto_reject_flags.length} issue{cs.auto_reject_flags.length > 1 ? 's' : ''})</h3>
          </div>
          <div className="space-y-3">
            {cs.auto_reject_flags.map((f, i) => (
              <div key={i} className="bg-white rounded-lg border border-red-200 p-3" data-testid={`auto-reject-flag-${i}`}>
                <p className="text-sm font-semibold text-red-800">{f.message}</p>
                <p className="text-xs text-gray-700 mt-1"><span className="font-semibold">Fix:</span> {f.improvement}</p>
                <p className="text-xs text-gray-500 mt-0.5"><span className="font-semibold">Timeline:</span> {f.timeline}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 Layer Score Breakdown */}
      {cs.layer_scores && Object.keys(cs.layer_scores).length > 0 && (
        <div className="bg-white rounded-xl border p-6 space-y-5" data-testid="layer-scores-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Three-Layer Risk Model</h3>
              <p className="text-xs text-gray-500 mt-0.5">Predictive • Explainable • Defensible</p>
            </div>
            <Sparkles className="text-purple-500" size={18} />
          </div>
          <LayerBar label="Layer 1 — Ability to Repay" weight={cs.layer_scores.layer1_weight} score={cs.layer_scores.layer1_ability} icon={TrendingUp}
            color={{ text: 'text-emerald-600', bar: 'bg-gradient-to-r from-emerald-500 to-emerald-400' }} />
          <LayerBar label="Layer 2 — Willingness to Repay" weight={cs.layer_scores.layer2_weight} score={cs.layer_scores.layer2_willingness} icon={Zap}
            color={{ text: 'text-purple-600', bar: 'bg-gradient-to-r from-purple-500 to-purple-400' }} />
          <LayerBar label="Layer 3 — Downside Protection" weight={cs.layer_scores.layer3_weight} score={cs.layer_scores.layer3_protection} icon={Shield}
            color={{ text: 'text-teal-600', bar: 'bg-gradient-to-r from-teal-500 to-teal-400' }} />
        </div>
      )}

      {/* Explainability (SHAP-style) */}
      {cs.explanation && (
        <div className="bg-white rounded-xl border p-6" data-testid="explanation-card">
          <h3 className="font-bold text-gray-900 mb-4">Why You Got This Grade</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4" data-testid="positive-factors-panel">
              <p className="text-xs uppercase tracking-wide text-emerald-700 font-bold mb-2">Positive Factors</p>
              {cs.explanation.positive_factors?.length ? (
                <ul className="space-y-2">
                  {cs.explanation.positive_factors.map((f, i) => (
                    <li key={i} className="text-xs text-gray-700 flex gap-1.5"><CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" /> {f}</li>
                  ))}
                </ul>
              ) : <p className="text-xs text-gray-400 italic">None highlighted.</p>}
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4" data-testid="negative-factors-panel">
              <p className="text-xs uppercase tracking-wide text-red-700 font-bold mb-2">Negative Factors</p>
              {cs.explanation.negative_factors?.length ? (
                <ul className="space-y-2">
                  {cs.explanation.negative_factors.map((f, i) => (
                    <li key={i} className="text-xs text-gray-700 flex gap-1.5"><AlertTriangle size={14} className="text-red-600 flex-shrink-0 mt-0.5" /> {f}</li>
                  ))}
                </ul>
              ) : <p className="text-xs text-gray-400 italic">None detected.</p>}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4" data-testid="improvements-panel">
              <p className="text-xs uppercase tracking-wide text-amber-700 font-bold mb-2">How to Improve</p>
              {cs.explanation.improvements?.length ? (
                <ul className="space-y-2">
                  {cs.explanation.improvements.map((f, i) => (
                    <li key={i} className="text-xs text-gray-700 flex gap-1.5"><Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" /> {f}</li>
                  ))}
                </ul>
              ) : <p className="text-xs text-gray-400 italic">You're in great shape.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Data Quality + Sources */}
      {cs.data_sources && (
        <div className="bg-gradient-to-r from-emerald-50 to-purple-50 rounded-xl border-2 border-emerald-200 p-6" data-testid="data-quality-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-900">Data Quality</h3>
              <p className="text-xs text-gray-500">Live signals = higher confidence = better pricing</p>
            </div>
            <div className="text-right">
              <p data-testid="data-quality-score" className="text-3xl font-bold text-emerald-700 tabular-nums">{cs.data_quality_score}<span className="text-base text-emerald-400">%</span></p>
              <p className="text-xs text-gray-500">{cs.data_sources.live_signals}/{cs.data_sources.total_signals} live signals</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <SourceBadge label="Plaid" connected={cs.data_sources.plaid_connected} />
            <SourceBadge label="Stripe" connected={cs.data_sources.stripe_connected} />
            <SourceBadge label="Manual" connected={!cs.data_sources.plaid_connected && !cs.data_sources.stripe_connected} />
          </div>
        </div>
      )}

      {/* Signal Breakdown */}
      {cs.signal_breakdown && (
        <div className="bg-white rounded-xl border p-6" data-testid="signal-breakdown-card">
          <h3 className="font-bold text-gray-900 mb-3">Signal Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {Object.entries(cs.signal_breakdown).map(([k, v]) => (
              <Signal key={k} name={k} value={
                typeof v === 'boolean' ? (v ? 'Yes' : 'No') :
                typeof v === 'number' && (k.includes('rate') || k.includes('trend') || k.includes('ratio') || k.includes('concentration')) ? v.toFixed(2) :
                typeof v === 'number' ? v.toLocaleString() :
                String(v)
              } />
            ))}
          </div>
        </div>
      )}

      {/* Reserve Fund Contribution */}
      {cs.reserve_fund_contribution > 0 && !cs.auto_reject && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-5" data-testid="reserve-fund-card">
          <div className="flex items-start gap-3">
            <Shield className="text-purple-600 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-gray-900">Investor Protection Fund</p>
              <p className="text-xs text-gray-600 mt-0.5">
                <span className="font-bold text-purple-700">${cs.reserve_fund_contribution.toLocaleString()}</span> (3% of loan amount) will be contributed to a platform-wide reserve that buffers investor losses on defaults.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button data-testid="btn-go-to-dashboard" onClick={() => navigate('/borrower')} className="bg-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-purple-700">
          Go to Dashboard
        </button>
        {result.status !== 'rejected' && (
          <button data-testid="btn-view-loan-details" onClick={() => navigate(`/borrower/loans/${result.loan_id}`)} className="bg-white border text-gray-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-50">
            View Loan Details
          </button>
        )}
      </div>
    </div>
  );
}
