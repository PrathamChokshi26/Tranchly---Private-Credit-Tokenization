import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/StatCard';
import GradeBadge from '../../components/GradeBadge';
import { Wallet, TrendingUp, BarChart3, Store, DollarSign, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function InvestorDashboard() {
  const { api, user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [yields, setYields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/portfolio').then(r => setPortfolio(r.data.portfolio)),
      api.get('/api/portfolio/yield-history').then(r => setYields(r.data.yield_history)),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;

  // Aggregate yield data for chart
  const yieldChartData = yields.reduce((acc, y) => {
    const date = new Date(y.created_at).toLocaleDateString();
    const existing = acc.find(d => d.date === date);
    if (existing) existing.amount += y.amount;
    else acc.push({ date, amount: y.amount });
    return acc;
  }, []);

  // Cumulative
  let cumulative = 0;
  const cumulativeData = yieldChartData.map(d => { cumulative += d.amount; return { ...d, cumulative: Math.round(cumulative * 100) / 100 }; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investor Dashboard</h1>
          <p className="text-gray-500 text-sm">Track your investments and repayment distributions</p>
        </div>
        <Link to="/investor/marketplace" className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-purple-800 flex items-center gap-2">
          <Store size={16} /> Browse Marketplace
        </Link>
      </div>

      {/* Investor disclaimer banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800" data-testid="investor-disclaimer-banner">
        <strong>Important:</strong> Tranchly loan investments are not FDIC insured and may result in loss of principal.
        Returns are not guaranteed. Past performance does not predict future results.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Invested" value={`$${(portfolio?.total_invested || 0).toLocaleString()}`} color="purple" />
        <StatCard icon={TrendingUp} label="Distributions Received" value={`$${(portfolio?.total_yield_earned || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} color="emerald" />
        <StatCard icon={BarChart3} label="Active Positions" value={portfolio?.active_positions || 0} color="teal" />
        <StatCard icon={Wallet} label="USDC Balance" value={`$${(portfolio?.usdc_balance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} color="blue" />
      </div>

      {/* Yield Chart */}
      {cumulativeData.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Cumulative Repayment Distributions</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={cumulativeData}>
              <defs>
                <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="cumulative" stroke="#8b5cf6" fill="url(#yieldGrad)" name="Total Distributions ($)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Active Investments */}
      <div className="bg-white rounded-xl border">
        <div className="px-5 py-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Active Investments</h3>
          <span className="text-sm text-gray-400">{portfolio?.investments?.length || 0} positions</span>
        </div>
        {portfolio?.investments?.length ? (
          <div className="divide-y">
            {portfolio.investments.map(inv => (
              <Link key={inv.id} to={`/investor/marketplace/${inv.loan_id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{inv.loan?.business_name}</p>
                  <p className="text-sm text-gray-500">{inv.token_count} loan shares • {inv.loan?.industry}</p>
                </div>
                <GradeBadge grade={inv.loan?.grade} size="sm" />
                <div className="text-right">
                  <p className="font-medium">${inv.amount_invested?.toLocaleString()}</p>
                  <p className="text-xs text-emerald-600">+${(inv.yield_earned || 0).toFixed(2)} received</p>
                </div>
                <ArrowRight size={16} className="text-gray-400" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Store size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No investments yet</p>
            <Link to="/investor/marketplace" className="text-purple-600 text-sm font-semibold hover:underline">Browse marketplace</Link>
          </div>
        )}
      </div>
    </div>
  );
}
