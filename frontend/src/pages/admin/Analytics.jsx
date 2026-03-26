import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import GradeBadge from '../../components/GradeBadge';
import { DollarSign, TrendingUp, Landmark, BarChart3 } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-gray-500 text-sm">Deep dive into platform metrics</p>
      </div>

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
