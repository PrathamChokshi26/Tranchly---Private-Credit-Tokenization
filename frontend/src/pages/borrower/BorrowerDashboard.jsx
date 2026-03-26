import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/StatCard';
import GradeBadge from '../../components/GradeBadge';
import { Landmark, Clock, CheckCircle2, FileText, ArrowRight, AlertCircle } from 'lucide-react';

export default function BorrowerDashboard() {
  const { api } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/loans/my-loans').then(r => setLoans(r.data.loans)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  const active = loans.filter(l => ['approved', 'funded', 'repaying'].includes(l.status));
  const totalBorrowed = loans.reduce((s, l) => s + (l.loan_amount_approved || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Borrower Dashboard</h1>
          <p className="text-gray-500 text-sm">Manage your loans and track repayments</p>
        </div>
        <Link to="/borrower/apply" className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-teal-600 hover:to-teal-700 flex items-center gap-2">
          <FileText size={16} /> Apply for Loan
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Landmark} label="Total Borrowed" value={`$${totalBorrowed.toLocaleString()}`} color="teal" />
        <StatCard icon={Clock} label="Active Loans" value={active.length} color="purple" />
        <StatCard icon={CheckCircle2} label="Completed" value={loans.filter(l => l.status === 'completed').length} color="emerald" />
        <StatCard icon={FileText} label="Applications" value={loans.length} color="blue" />
      </div>

      {loans.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Landmark size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No loans yet</h3>
          <p className="text-gray-500 mt-1 mb-4">Apply for your first loan to get started</p>
          <Link to="/borrower/apply" className="inline-flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Apply Now <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Your Loans</h2>
          </div>
          <div className="divide-y">
            {loans.map(loan => (
              <Link key={loan.id} to={`/borrower/loans/${loan.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{loan.business_name}</p>
                  <p className="text-sm text-gray-500">${loan.loan_amount_requested?.toLocaleString()} requested • {loan.industry}</p>
                </div>
                <GradeBadge grade={loan.grade} />
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  loan.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  loan.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                  loan.status === 'funded' ? 'bg-purple-100 text-purple-700' :
                  loan.status === 'repaying' ? 'bg-teal-100 text-teal-700' :
                  loan.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  loan.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                </span>
                <ArrowRight size={16} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
