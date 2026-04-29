import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, TrendingUp, Landmark, BarChart3, Shield, Sparkles, Database } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

export default function Analytics() {
  const { api } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/analytics').then(r => setAnalytics(r.data.analytics)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;

  const COLORS = { A: '#10b981', B: '#14b8a6', C: '#f59e0b', Reject: '#ef4444' };

  const gradeData = analytics?.grade_distribution
    ? Object.entries(analytics.grade_distribution).map(([k, v]) => ({ name: k === 'Reject' ? 'Rejected' : `Grade ${k}`, value: v, grade: k })).filter(d => d.value > 0)
    : [];

  const statusData = [
    { name: 'Pending', value: analytics?.pending_loans || 0 },
    { name: 'Approved', value: analytics?.approved_loans || 0 },
    { name: 'Completed', value: analytics?.completed_loans || 0 },
    { name: 'Rejected', value: analytics?.rejected_loans || 0 },
  ].filter(d => d.value > 0);
  const STATUS_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'];

  const reserve = analytics?.reserve_fund || {};
  const model = analytics?.credit_model || {};
  const adoption = analytics?.data_source_adoption || {};

  const adoptionData = [
    { name: 'Plaid', pct: adoption.plaid_pct || 0, fill: '#10b981' },
    { name: 'Stripe', pct: adoption.stripe_pct || 0, fill: '#a855f7' },
    { name: 'Manual', pct: adoption.manual_pct || 0, fill: '#6b7280' },
  ];

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

      {/* ─── V2 METRIC CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1) Investor Protection Fund — total balance + by grade */}
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl border-2 border-purple-200 p-5" data-testid="ipf-total-card">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="text-purple-600" size={20} />
            <h3 className="font-bold text-gray-900">Investor Protection Fund</h3>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Balance</p>
          <p data-testid="ipf-total-balance" className="text-4xl font-black text-purple-700 tabular-nums mt-1">${(reserve.total_contributed || 0).toLocaleString()}</p>

          {/* By grade pools */}
          <div className="mt-4 pt-4 border-t border-purple-100">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2 font-semibold">Pools by Grade</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2" data-testid="reserve-pool-a">
                <p className="text-[10px] text-emerald-700 font-bold">A · 2.5%</p>
                <p className="text-sm font-bold text-emerald-700 tabular-nums">${(reserve.by_grade?.A || 0).toLocaleString()}</p>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-2" data-testid="reserve-pool-b">
                <p className="text-[10px] text-teal-700 font-bold">B · 5%</p>
                <p className="text-sm font-bold text-teal-700 tabular-nums">${(reserve.by_grade?.B || 0).toLocaleString()}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2" data-testid="reserve-pool-c">
                <p className="text-[10px] text-amber-700 font-bold">C · 8%</p>
                <p className="text-sm font-bold text-amber-700 tabular-nums">${(reserve.by_grade?.C || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-purple-100">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Loans</p>
              <p data-testid="ipf-loans" className="font-bold tabular-nums text-sm">{reserve.loans_contributing || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Coverage</p>
              <p data-testid="ipf-coverage" className="font-bold tabular-nums text-sm text-purple-700">{(reserve.coverage_ratio_pct || 0).toFixed(2)}%</p>
            </div>
            <div title="Weighted by outstanding principal across all active loans">
              <p className="text-[10px] text-gray-500 uppercase">Weighted Rate</p>
              <p data-testid="ipf-weighted-rate" className="font-bold tabular-nums text-sm text-purple-700">{(reserve.weighted_avg_rate_pct || 0).toFixed(2)}%</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">Risk-based reserves: A=2.5%, B=5%, C=8% of loan amount.</p>
        </div>

        {/* 2) Grade Distribution — donut chart */}
        <div className="bg-white rounded-xl border-2 border-gray-100 p-5" data-testid="grade-donut-card">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-emerald-600" size={20} />
            <h3 className="font-bold text-gray-900">Grade Distribution</h3>
          </div>
          {gradeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={gradeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {gradeData.map((entry, i) => <Cell key={i} fill={COLORS[entry.grade] || '#94a3b8'} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-12 text-sm">No graded loans yet.</p>}
        </div>

        {/* 3) Data Source Adoption — horizontal bars */}
        <div className="bg-white rounded-xl border-2 border-gray-100 p-5" data-testid="data-source-adoption-card">
          <div className="flex items-center gap-2 mb-3">
            <Database className="text-teal-600" size={20} />
            <h3 className="font-bold text-gray-900">Data Source Adoption</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={adoptionData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} width={60} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
                {adoptionData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-3 text-[11px] text-gray-500 mt-1">
            <span data-testid="adoption-plaid">Plaid: <strong className="text-emerald-600">{adoption.plaid_pct || 0}%</strong></span>
            <span data-testid="adoption-stripe">Stripe: <strong className="text-purple-600">{adoption.stripe_pct || 0}%</strong></span>
            <span data-testid="adoption-manual">Manual: <strong className="text-gray-600">{adoption.manual_pct || 0}%</strong></span>
          </div>
        </div>
      </div>

      {/* Credit Model Performance (existing V2 card) */}
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

      {/* Loan Status Overview (existing) */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Loan Status Overview</h3>
        {statusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Loans" radius={[4, 4, 0, 0]}>
                {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-gray-400 text-center py-12">No data</p>}
      </div>
    </div>
  );
}
