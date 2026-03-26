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
        <p className="text-gray-500 text-sm">Browse vetted SME loans and invest in fractional tokens</p>
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

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div>
                    <p className="text-xs text-gray-400">APR</p>
                    <p className="font-bold text-emerald-600">{loan.interest_rate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Term</p>
                    <p className="font-bold">{loan.term_months}mo</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Token</p>
                    <p className="font-bold">${loan.token_price}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{pct}% funded</span>
                    <span className="text-gray-500">{loan.tokens_available} tokens left</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${
                      pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-teal-500' : 'bg-purple-500'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">${loan.loan_amount_approved?.toLocaleString()}</p>
                  <span className="text-sm text-purple-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    View <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
