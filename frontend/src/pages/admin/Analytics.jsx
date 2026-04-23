import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, TrendingUp, Landmark, BarChart3, Shield, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Analytics() {
  const { api } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/analytics').then(r => setAnalytics(r.data.analytics)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;

  const gradeData = analytics?.grade_distribution ? Object.entries(analytics.grade_distribution).map(([k, v]) => ({ name: k === 'Reject' ? 'Rejected' : `Grade ${k}`, value: v, grade: k })).filter(d => d.value > 0) : [];
  const COLORS = { A: '#10b981', B: '#14b8a6', C: '#f59e0b', Reject: '#ef4444' };

  const statusData = [
    { name: 'Pending', value: analytics?.pending_loans || 0 },
    { name: 'Approved', value: analytics?.approved_loans || 0 },
    { name: 'Completed', value: analytics?.completed_loans || 0 },
    { name: 'Rejected', value: analytics?.rejected_loans || 0 },
  ].filter(d => d.value > 0);
  const STATUS_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'];

  const reserve = analytics?.reserve_fund || {};
  const model = analytics?.credit_model || {};
  const defaultByGrade = model.default_rate_by_grade || {};
  const defaultByGradeData = Object.entries(defaultByGrade).map(([k, v]) => ({ name: `Grade ${k}`, rate: v, grade: k }));

  return (
    <div className="space-y-6" data-testid="admin-analytics-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-gray-500 text-sm">Platform health, reserve fund, and V2 credit model performance</p>
      </div>

      {/* Top metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <Landmark size={18} className="text-purple-500 mb-1" />
          <p className="text-2xl font-bold">${(analytics?.total_originated || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500">Total Originated</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <DollarSign size={18} className="text-teal-500 mb-1" />
          <p className="text-2xl font-bold">${(analytics?.total_investor_capital || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500">Investor Capital</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <TrendingUp size={18} className="text-emerald-500 mb-1" />
          <p className="text-2xl font-bold">${(analytics?.avg_loan_size || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-gray-500">Avg Loan Size</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <BarChart3 size={18} className="text-red-500 mb-1" />
          <p className="text-2xl font-bold">{analytics?.default_rate || 0}%</p>
          <p className="text-xs text-gray-500">Default Rate</p>
        </div>
      </div>

      {/* NEW: Investor Protection Fund + Credit Model Performance */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl border-2 border-purple-200 p-5" data-testid="reserve-fund-card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="text-purple-600" size={20} />
            <h3 className="font-bold text-gray-900">Investor Protection Fund</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Reserves</p>
              <p data-testid="reserve-total" className="text-2xl font-bold text-purple-700 tabular-nums">${(reserve.total_contributed || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Loans Contributing</p>
              <p data-testid="reserve-loans" className="text-2xl font-bold tabular-nums">{reserve.loans_contributing || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Outstanding Principal</p>
              <p data-testid="reserve-outstanding" className="text-lg font-bold tabular-nums">${(reserve.outstanding_principal || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Coverage Ratio</p>
              <p data-testid="reserve-coverage" className="text-lg font-bold text-purple-700 tabular-nums">{(reserve.coverage_ratio_pct || 0).toFixed(2)}%</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            3% of every approved loan is contributed to the reserve fund, which buffers investor losses on defaults.
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border-2 border-emerald-200 p-5" data-testid="credit-model-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-emerald-600" size={20} />
            <h3 className="font-bold text-gray-900">Credit Model Performance</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Avg Score</p>
              <p data-testid="model-avg-score" className="text-xl font-bold tabular-nums">{model.avg_composite_score ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Avg Data Quality</p>
              <p data-testid="model-avg-dq" className="text-xl font-bold tabular-nums">{model.avg_data_quality ?? 0}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Avg APR</p>
              <p data-testid="model-avg-apr" className="text-xl font-bold tabular-nums">{model.avg_apr ?? 0}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-2 font-semibold">Default Rate by Grade</p>
          {defaultByGradeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={defaultByGradeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {defaultByGradeData.map((entry, i) => <Cell key={i} fill={COLORS[entry.grade] || '#94a3b8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-gray-400 italic">No repayment data yet.</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          {gradeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={gradeData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {gradeData.map((entry, i) => <Cell key={i} fill={COLORS[entry.grade] || '#94a3b8'} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-12">No data</p>}
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Loan Status Overview</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-12">No data</p>}
        </div>
      </div>
    </div>
  );
}
