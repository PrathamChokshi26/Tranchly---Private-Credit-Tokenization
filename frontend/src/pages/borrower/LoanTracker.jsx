import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import GradeBadge from '../../components/GradeBadge';
import { ArrowLeft, Calendar, DollarSign, Percent, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoanTracker() {
  const { loanId } = useParams();
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/loans/${loanId}`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [api, loanId]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;
  if (!data) return <div className="text-center py-12">Loan not found</div>;

  const { loan, repayments } = data;
  const paidCount = repayments?.filter(r => r.status === 'paid').length || 0;
  const totalRepayments = repayments?.length || 0;
  const totalPaid = repayments?.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0) || 0;
  const fundingPct = loan.total_tokens > 0 ? Math.round(loan.tokens_sold / loan.total_tokens * 100) : 0;

  return (
    <div className="space-y-6">
      <Link to="/borrower" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{loan.business_name}</h1>
          <p className="text-gray-500">{loan.industry} • {loan.loan_purpose}</p>
        </div>
        <GradeBadge grade={loan.grade} size="lg" />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <DollarSign size={18} className="text-teal-500 mb-1" />
          <p className="text-2xl font-bold">${loan.loan_amount_approved?.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Approved Amount</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <Percent size={18} className="text-purple-500 mb-1" />
          <p className="text-2xl font-bold">{loan.interest_rate}%</p>
          <p className="text-xs text-gray-500">APR</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <Calendar size={18} className="text-blue-500 mb-1" />
          <p className="text-2xl font-bold">{loan.term_months} mo</p>
          <p className="text-xs text-gray-500">Loan Term</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <Clock size={18} className="text-amber-500 mb-1" />
          <p className="text-2xl font-bold">{paidCount}/{totalRepayments}</p>
          <p className="text-xs text-gray-500">Payments Made</p>
        </div>
      </div>

      {/* Funding Progress */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-gray-900">Funding Progress</h3>
          <span className="text-sm font-medium">{fundingPct}% • {loan.tokens_sold}/{loan.total_tokens} tokens</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-teal-400 transition-all" style={{ width: `${fundingPct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">${(loan.tokens_sold * loan.token_price).toLocaleString()} of ${loan.loan_amount_approved?.toLocaleString()} funded</p>
      </div>

      {/* Repayment Schedule */}
      {repayments && repayments.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-4 border-b flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Repayment Schedule</h3>
            <span className="text-sm text-gray-500">${totalPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })} paid</span>
          </div>
          <div className="divide-y max-h-96 overflow-auto">
            {repayments.map(r => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <div className="flex-shrink-0">
                  {r.status === 'paid' ? <CheckCircle2 size={18} className="text-emerald-500" /> :
                   r.status === 'overdue' ? <AlertCircle size={18} className="text-red-500" /> :
                   <Clock size={18} className="text-gray-300" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Payment #{r.payment_number}</p>
                  <p className="text-gray-400 text-xs">{new Date(r.due_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${r.amount?.toFixed(2)}</p>
                  <p className="text-gray-400 text-xs">P: ${r.principal?.toFixed(2)} • I: ${r.interest?.toFixed(2)}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : r.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
