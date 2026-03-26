import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function YieldHistory() {
  const { api } = useAuth();
  const [yields, setYields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/portfolio/yield-history').then(r => setYields(r.data.yield_history)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;

  const totalYield = yields.reduce((s, y) => s + y.amount, 0);

  // Group by date
  const dailyYields = yields.reduce((acc, y) => {
    const date = new Date(y.created_at).toLocaleDateString();
    const existing = acc.find(d => d.date === date);
    if (existing) existing.amount += y.amount;
    else acc.push({ date, amount: Math.round(y.amount * 100) / 100 });
    return acc;
  }, []).reverse();

  let cumulative = 0;
  const cumulativeData = dailyYields.map(d => { cumulative += d.amount; return { ...d, cumulative: Math.round(cumulative * 100) / 100 }; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yield History</h1>
        <p className="text-gray-500 text-sm">Track your earnings from loan repayments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2"><DollarSign size={18} className="text-emerald-500" /> <span className="text-sm text-gray-500">Total Yield</span></div>
          <p className="text-3xl font-bold text-emerald-600">${totalYield.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-purple-500" /> <span className="text-sm text-gray-500">Payments Received</span></div>
          <p className="text-3xl font-bold">{yields.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2"><Calendar size={18} className="text-blue-500" /> <span className="text-sm text-gray-500">Avg per Payment</span></div>
          <p className="text-3xl font-bold">${yields.length > 0 ? (totalYield / yields.length).toFixed(2) : '0.00'}</p>
        </div>
      </div>

      {cumulativeData.length > 0 ? (
        <>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Cumulative Yield</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="yg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="cumulative" stroke="#10b981" fill="url(#yg)" name="Total ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Daily Payments</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyYields}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Yield ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border p-12 text-center">
          <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No yield received yet. Invest in loans to start earning!</p>
        </div>
      )}

      {/* Transaction List */}
      {yields.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-900">All Yield Payments</h3>
          </div>
          <div className="divide-y max-h-96 overflow-auto">
            {yields.map(y => (
              <div key={y.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><DollarSign size={14} /></div>
                <div className="flex-1">
                  <p className="font-medium">${y.amount.toFixed(2)} USDC</p>
                  <p className="text-xs text-gray-400">{y.token_count} tokens • {new Date(y.created_at).toLocaleString()}</p>
                </div>
                <span className="text-xs font-mono text-gray-400">{y.tx_hash?.slice(0, 16)}...</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
