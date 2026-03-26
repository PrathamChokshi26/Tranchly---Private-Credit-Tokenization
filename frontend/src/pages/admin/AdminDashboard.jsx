import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/StatCard';
import { BarChart3, Users, Landmark, FileText, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function AdminDashboard() {
  const { api } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/analytics').then(r => setAnalytics(r.data.analytics)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;

  const gradeData = analytics?.grade_distribution ? Object.entries(analytics.grade_distribution).map(([k, v]) => ({ name: k, value: v })).filter(d => d.value > 0) : [];
  const COLORS = { A: '#10b981', B: '#14b8a6', C: '#f59e0b', Reject: '#ef4444' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">Platform overview and management</p>
        </div>
        <Link to="/admin/applications" className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 flex items-center gap-2">
          <FileText size={16} /> Review Applications ({analytics?.pending_loans || 0})
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Landmark} label="Total Originated" value={`$${(analytics?.total_originated || 0).toLocaleString()}`} color="purple" />
        <StatCard icon={DollarSign} label="Investor Capital" value={`$${(analytics?.total_investor_capital || 0).toLocaleString()}`} color="teal" />
        <StatCard icon={Users} label="Total Users" value={`${(analytics?.total_investors || 0) + (analytics?.total_borrowers || 0)}`} sub={`${analytics?.total_investors || 0} investors • ${analytics?.total_borrowers || 0} borrowers`} color="blue" />
        <StatCard icon={AlertTriangle} label="Default Rate" value={`${analytics?.default_rate || 0}%`} color="amber" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Loan Status */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Loan Pipeline</h3>
          <div className="space-y-3">
            {[
              { label: 'Pending Review', value: analytics?.pending_loans || 0, color: 'bg-yellow-500' },
              { label: 'Approved', value: analytics?.approved_loans || 0, color: 'bg-blue-500' },
              { label: 'Completed', value: analytics?.completed_loans || 0, color: 'bg-emerald-500' },
              { label: 'Rejected', value: analytics?.rejected_loans || 0, color: 'bg-red-500' },
              { label: 'Defaulted', value: analytics?.defaulted_loans || 0, color: 'bg-gray-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                <span className="text-sm font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          {gradeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={gradeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {gradeData.map((entry, i) => <Cell key={i} fill={COLORS[entry.name] || '#94a3b8'} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">No loan data yet</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-2">Key Metrics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Avg Loan Size</p>
            <p className="text-lg font-bold">${(analytics?.avg_loan_size || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Total Loans</p>
            <p className="text-lg font-bold">{analytics?.total_loans || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Investors</p>
            <p className="text-lg font-bold">{analytics?.total_investors || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Borrowers</p>
            <p className="text-lg font-bold">{analytics?.total_borrowers || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
