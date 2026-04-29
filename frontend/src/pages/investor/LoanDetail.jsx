import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import GradeBadge from '../../components/GradeBadge';
import { ArrowLeft, DollarSign, Percent, Calendar, Users, CheckCircle2, Clock, AlertCircle, Zap, Shield, AlertTriangle, Info } from 'lucide-react';

export default function LoanDetail() {
  const { loanId } = useParams();
  const { api, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenCount, setTokenCount] = useState(1);
  const [investing, setInvesting] = useState(false);
  const [result, setResult] = useState(null);

  const fetchData = () => {
    api.get(`/api/loans/${loanId}`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [loanId]);

  const handleInvest = async () => {
    setInvesting(true);
    setResult(null);
    try {
      const res = await api.post('/api/marketplace/invest', { loan_id: loanId, token_count: tokenCount });
      setResult({ success: true, ...res.data });
      fetchData(); // Refresh
    } catch (err) {
      setResult({ success: false, error: err.response?.data?.detail || 'Investment failed' });
    } finally {
      setInvesting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;
  if (!data) return <div className="text-center py-12">Loan not found</div>;

  const { loan, repayments } = data;
  const tokensAvailable = loan.total_tokens - loan.tokens_sold;
  const fundingPct = loan.total_tokens > 0 ? Math.round(loan.tokens_sold / loan.total_tokens * 100) : 0;
  const projectedYield = (tokenCount * loan.token_price * loan.interest_rate / 100 * loan.term_months / 12);

  // V2 risk metrics
  const monthlyRate = (loan.interest_rate || 0) / 100 / 12;
  const term = loan.term_months || 12;
  const principal = loan.loan_amount_approved || 0;
  const monthlyPayment = monthlyRate > 0
    ? (principal * (monthlyRate * Math.pow(1 + monthlyRate, term))) / (Math.pow(1 + monthlyRate, term) - 1)
    : (principal / term);
  const dscr = monthlyPayment > 0 && loan.monthly_revenue ? (loan.monthly_revenue / monthlyPayment) : null;
  const fallbackRate = loan.grade === 'A' ? 0.025 : loan.grade === 'B' ? 0.05 : loan.grade === 'C' ? 0.08 : 0.03;
  const reserveContribution = loan.reserve_fund_contribution || (principal * fallbackRate);
  const reserveCoveragePct = principal > 0 ? (reserveContribution / principal * 100) : 0;

  return (
    <div className="space-y-6">
      <Link to="/investor/marketplace" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
        <ArrowLeft size={16} /> Back to Marketplace
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Loan Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{loan.business_name}</h1>
                <p className="text-gray-500">{loan.industry} • {loan.years_operating} years operating</p>
              </div>
              <GradeBadge grade={loan.grade} size="lg" />
            </div>

            <p className="text-gray-600 mb-4">{loan.loan_purpose}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <DollarSign size={16} className="text-purple-500 mb-1" />
                <p className="text-lg font-bold">${loan.loan_amount_approved?.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Loan Amount</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <Percent size={16} className="text-emerald-500 mb-1" />
                <p className="text-lg font-bold">{loan.interest_rate}%</p>
                <p className="text-xs text-gray-500">Target APR</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <Calendar size={16} className="text-blue-500 mb-1" />
                <p className="text-lg font-bold">{loan.term_months} mo</p>
                <p className="text-xs text-gray-500">Term</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <Users size={16} className="text-teal-500 mb-1" />
                <p className="text-lg font-bold">{loan.tokens_sold}</p>
                <p className="text-xs text-gray-500">Loan Shares Sold</p>
              </div>
            </div>
          </div>

          {/* V2 Risk Metrics */}
          <div className="bg-white rounded-xl border p-5" data-testid="loan-detail-risk-metrics">
            <h3 className="font-semibold mb-3">Risk Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Debt Service Coverage Ratio</p>
                <p className="text-lg font-bold tabular-nums">{dscr ? `${dscr.toFixed(2)}x` : '—'}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">monthly revenue ÷ monthly payment</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Reserve Coverage</p>
                <p className="text-lg font-bold text-purple-700 tabular-nums">{reserveCoveragePct.toFixed(1)}%</p>
                <p className="text-[10px] text-gray-400 mt-0.5">${reserveContribution.toLocaleString()} contributed</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Grade</p>
                <p className="text-lg font-bold tabular-nums">{loan.grade || '—'}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">credit grade</p>
              </div>
            </div>
            <p className="text-[11px] mt-3 text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 leading-snug">
              <strong>Risk Warning:</strong> Loan default may result in partial or total loss of invested capital. Returns are not guaranteed.
            </p>
          </div>

          {/* Risk Analysis — default scenario, diversification, lateness timeline */}
          <div className="bg-white rounded-xl border p-5 space-y-5" data-testid="risk-analysis-card">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <h3 className="font-bold text-gray-900">Risk Analysis</h3>
            </div>

            {/* 1. Default scenario (6 months in) */}
            {(() => {
              // Hypothetical default after 6 months: assume 50% of payments collected, reserve covers shortfall first
              const monthsCollected = 6;
              const totalPayments = monthlyPayment * term;
              const collected = monthlyPayment * monthsCollected;
              const remaining = Math.max(0, totalPayments - collected);
              const principalCollectedApprox = (principal / term) * monthsCollected;
              const principalOutstandingApprox = Math.max(0, principal - principalCollectedApprox);
              const recoveredFromReserve = Math.min(reserveContribution, principalOutstandingApprox);
              const lossPerLoan = Math.max(0, principalOutstandingApprox - recoveredFromReserve);
              const sharePrice = loan.token_price || 1;
              const totalShares = loan.total_tokens || 1;
              const lossPerShare = lossPerLoan / totalShares;
              const recoveryRate = principalOutstandingApprox > 0
                ? ((principalCollectedApprox + recoveredFromReserve) / principal) * 100
                : 100;
              return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4" data-testid="default-scenario-box">
                  <p className="text-sm font-semibold text-red-900 mb-2">If this loan defaults after 6 months:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Recovered from reserve</p>
                      <p className="text-lg font-bold text-purple-700 tabular-nums">${recoveredFromReserve.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Estimated loss per loan share</p>
                      <p className="text-lg font-bold text-red-700 tabular-nums">${lossPerShare.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400">of ${sharePrice} share price</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Recovery rate estimate</p>
                      <p className="text-lg font-bold text-emerald-700 tabular-nums">{recoveryRate.toFixed(1)}%</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">Hypothetical scenario for educational purposes. Actual recovery varies based on collections, asset sales, and reserve fund balance.</p>
                </div>
              );
            })()}

            {/* 2. Diversification recommendation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" data-testid="diversification-box">
              <div className="flex items-start gap-2">
                <Shield size={16} className="text-blue-700 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Diversify your portfolio</p>
                  <p className="text-xs text-gray-700 mt-1">
                    We recommend investing no more than <strong>10% of your portfolio</strong> in any single loan.
                    Spreading capital across grades, industries, and terms reduces concentration risk.
                  </p>
                  <a
                    href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/investor-2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-blue-700 font-semibold mt-2 hover:underline"
                  >
                    Learn about diversification →
                  </a>
                </div>
              </div>
            </div>

            {/* 3. Lateness timeline */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4" data-testid="lateness-timeline-box">
              <div className="flex items-center gap-2 mb-2">
                <Info size={16} className="text-amber-700" />
                <p className="text-sm font-semibold text-amber-900">What happens if a borrower is late</p>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-amber-800">If a payment is more than 15 days late:</p>
                  <ul className="text-xs text-gray-700 list-disc list-inside ml-1 mt-1 space-y-0.5">
                    <li>You will be notified immediately</li>
                    <li>A late fee is charged to the borrower</li>
                    <li>Loan enters monitoring status</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold text-red-800">If a payment is more than 60 days late:</p>
                  <ul className="text-xs text-gray-700 list-disc list-inside ml-1 mt-1 space-y-0.5">
                    <li>Loan enters default proceedings</li>
                    <li>Reserve fund is activated</li>
                    <li>Collections process initiated</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Funding Progress */}
          <div className="bg-white rounded-xl border p-5">
            <div className="flex justify-between mb-2">
              <h3 className="font-semibold">Funding Progress</h3>
              <span className="text-sm">{fundingPct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-teal-400" style={{ width: `${fundingPct}%` }} />
            </div>
            <p className="text-sm text-gray-500">{loan.tokens_sold} of {loan.total_tokens} loan shares sold • {tokensAvailable} remaining</p>
          </div>

          {/* Repayment Schedule */}
          {repayments && repayments.length > 0 && (
            <div className="bg-white rounded-xl border">
              <div className="px-5 py-4 border-b">
                <h3 className="font-semibold">Repayment Schedule</h3>
              </div>
              <div className="divide-y max-h-72 overflow-auto">
                {repayments.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    {r.status === 'paid' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Clock size={16} className="text-gray-300" />}
                    <span className="w-16">#{r.payment_number}</span>
                    <span className="flex-1 text-gray-500">{new Date(r.due_date).toLocaleDateString()}</span>
                    <span className="font-medium">${r.amount?.toFixed(2)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Invest Widget */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-6 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Zap size={18} className="text-purple-500" /> Invest in This Loan</h3>

            {tokensAvailable > 0 && user?.role === 'investor' ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Loan Shares</label>
                  <input type="number" min={1} max={tokensAvailable} value={tokenCount}
                    onChange={e => setTokenCount(Math.min(Math.max(1, parseInt(e.target.value) || 1), tokensAvailable))}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-lg font-bold" />
                  <p className="text-xs text-gray-400 mt-1">Max: {tokensAvailable} shares @ ${loan.token_price} each</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Cost</span>
                    <span className="font-bold">${(tokenCount * loan.token_price).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Target Return</span>
                    <span className="font-bold text-emerald-600">${projectedYield.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Target APR</span>
                    <span className="font-bold">{loan.interest_rate}%</span>
                  </div>
                </div>

                <button onClick={handleInvest} disabled={investing}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition-all">
                  {investing ? 'Processing...' : `Invest $${(tokenCount * loan.token_price).toLocaleString()}`}
                </button>

                <p className="text-[10px] text-gray-400 mt-2 leading-snug">
                  Returns are not guaranteed. Principal is at risk. Past performance does not predict future results.
                </p>

                {result && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {result.success ? (
                      <div>
                        <p className="font-semibold flex items-center gap-1"><CheckCircle2 size={14} /> Investment Successful!</p>
                        <p className="text-xs mt-1 font-mono">Verified TX: {result.tx_hash?.slice(0, 20)}...</p>
                      </div>
                    ) : (
                      <p className="flex items-center gap-1"><AlertCircle size={14} /> {result.error}</p>
                    )}
                  </div>
                )}
              </>
            ) : tokensAvailable === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                <p className="font-semibold text-emerald-700">Fully Funded</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Sign in as an investor to invest</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
