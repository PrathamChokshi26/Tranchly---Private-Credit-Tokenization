import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import GradeBadge from '../../components/GradeBadge';
import { Search, Filter, ArrowRight, TrendingUp } from 'lucide-react';

export default function Marketplace() {
  const { api } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState('');

  const fetchLoans = () => {
    setLoading(true);
    const params = gradeFilter ? `?grade=${gradeFilter}` : '';
    api.get(`/api/marketplace/loans${params}`)
      .then(r => setLoans(r.data.loans))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLoans(); }, [gradeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loan Marketplace</h1>
        <p className="text-gray-500 text-sm">Browse vetted SME loans and invest in fractional loan shares</p>
      </div>

      {/* Investor disclaimer banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800" data-testid="marketplace-disclaimer-banner">
        <strong>Important:</strong> Tranchly loan investments are not FDIC insured and may result in loss of principal.
        Returns are not guaranteed. Past performance does not predict future results.
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-sm text-gray-500"><Filter size={14} /> Grade:</div>
        {['', 'A', 'B', 'C'].map(g => (
          <button key={g} onClick={() => setGradeFilter(g)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              gradeFilter === g ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {g || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>
      ) : loans.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No loans available</h3>
          <p className="text-gray-500 mt-1">Check back soon for new investment opportunities</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loans.map(loan => {
            const pct = loan.percent_funded || 0;
            // Compute DSCR (monthly_revenue / monthly_payment) and Reserve Coverage (%)
            const monthlyRate = (loan.interest_rate || 0) / 100 / 12;
            const term = loan.term_months || 12;
            const principal = loan.loan_amount_approved || 0;
            const monthlyPayment = monthlyRate > 0
              ? (principal * (monthlyRate * Math.pow(1 + monthlyRate, term))) / (Math.pow(1 + monthlyRate, term) - 1)
              : (principal / term);
            const dscr = monthlyPayment > 0 && loan.monthly_revenue ? (loan.monthly_revenue / monthlyPayment) : null;
            // Grade-based fallback if loan predates risk-based reserves
            const fallbackRate = loan.grade === 'A' ? 0.025 : loan.grade === 'B' ? 0.05 : loan.grade === 'C' ? 0.08 : 0.03;
            const reserveContribution = loan.reserve_fund_contribution || (principal * fallbackRate);
            const reserveCoveragePct = principal > 0 ? (reserveContribution / principal * 100) : 0;
            const reserveRatePct = (loan.reserve_rate ? loan.reserve_rate * 100 : reserveCoveragePct);
            const dscrColor = dscr === null ? 'text-gray-500' : dscr > 1.25 ? 'text-emerald-600' : dscr >= 1.0 ? 'text-amber-600' : 'text-red-600';
            return (
              <Link key={loan.id} to={`/investor/marketplace/${loan.id}`}
                className="bg-white rounded-xl border p-5 hover:shadow-lg hover:border-purple-200 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-purple-700">{loan.business_name}</p>
                    <p className="text-sm text-gray-500">{loan.industry}</p>
                  </div>
                  <GradeBadge grade={loan.grade} />
                </div>

                {/* Row 1: Grade · APR · Term */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-400">Target APR</p>
                    <p className="font-bold text-emerald-600">{loan.interest_rate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Term</p>
                    <p className="font-bold">{loan.term_months}mo</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Share Price</p>
                    <p className="font-bold">${loan.token_price}</p>
                  </div>
                </div>

                {/* Row 2: DSCR (color-coded) */}
                <div className="mb-3 p-2.5 bg-gray-50 rounded-lg" data-testid={`row-dscr-${loan.id}`}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Debt Service Coverage</span>
                    <span className={`text-base font-bold tabular-nums ${dscrColor}`}>{dscr ? `${dscr.toFixed(2)}x` : '—'}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">monthly revenue ÷ monthly payment</p>
                </div>

                {/* Row 3: Reserve · Industry · Years */}
                <div className="grid grid-cols-3 gap-2 mb-3" data-testid={`row-meta-${loan.id}`}>
                  <div
                    title="Tranchly's Investor Protection Fund holds a reserve for each loan. In case of default, the reserve is used to partially offset investor losses. Reserve does not guarantee full principal recovery."
                  >
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Reserve</p>
                    <p className="text-sm font-bold text-purple-700 tabular-nums">{reserveRatePct.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Industry</p>
                    <p className="text-sm font-semibold text-gray-700 truncate">{loan.industry || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Business age</p>
                    <p className="text-sm font-semibold text-gray-700">{loan.years_operating ? `${loan.years_operating} yr` : '—'}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{pct}% funded</span>
                    <span className="text-gray-500">{loan.tokens_available} loan shares left</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${
                      pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-teal-500' : 'bg-purple-500'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">${loan.loan_amount_approved?.toLocaleString()}</p>
                  <span className="text-sm text-purple-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    View <ArrowRight size={14} />
                  </span>
                </div>

                {/* Row 4: persistent risk warning */}
                <p className="text-[10px] text-gray-500" data-testid={`row-risk-${loan.id}`}>
                  ⚠️ Principal at risk · Not FDIC insured
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
