import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import GradeBadge from '../../components/GradeBadge';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AllLoans() {
  const { api } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(null);
  const [simResult, setSimResult] = useState(null);

  const fetchLoans = () => {
    api.get('/api/admin/all-loans').then(r => setLoans(r.data.loans)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchLoans(); }, []);

  const simulateRepayment = async (loanId) => {
    setSimulating(loanId);
    setSimResult(null);
    try {
      const res = await api.post('/api/admin/simulate-repayment', { loan_id: loanId });
      setSimResult({ loanId, ...res.data });
      fetchLoans();
    } catch (err) {
      setSimResult({ loanId, error: err.response?.data?.detail || 'Failed' });
    } finally {
      setSimulating(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Loans</h1>
        <p className="text-gray-500 text-sm">Manage all platform loans and simulate repayments</p>
      </div>

      {simResult && (
        <div className={`p-3 rounded-lg text-sm ${simResult.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {simResult.error ? (
            <span className="flex items-center gap-1"><AlertCircle size={14} /> {simResult.error}</span>
          ) : (
            <div>
              <p className="font-semibold flex items-center gap-1"><CheckCircle2 size={14} /> Repayment Simulated!</p>
              <p className="text-xs mt-1">Amount: ${simResult.repayment_amount?.toFixed(2)} • {simResult.repayments_remaining} remaining • {simResult.distributions?.length} investors paid</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Business</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Grade</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">APR</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Funded</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loans.map(loan => (
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{loan.business_name}</p>
                    <p className="text-xs text-gray-400">{loan.industry}</p>
                  </td>
                  <td className="px-4 py-3"><GradeBadge grade={loan.grade} size="sm" /></td>
                  <td className="px-4 py-3 font-medium">${loan.loan_amount_approved?.toLocaleString()}</td>
                  <td className="px-4 py-3">{loan.interest_rate}%</td>
                  <td className="px-4 py-3">
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${loan.total_tokens > 0 ? (loan.tokens_sold / loan.total_tokens * 100) : 0}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{loan.tokens_sold}/{loan.total_tokens}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      loan.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      loan.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                      loan.status === 'funded' ? 'bg-purple-100 text-purple-700' :
                      loan.status === 'repaying' ? 'bg-teal-100 text-teal-700' :
                      loan.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      loan.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>{loan.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {['funded', 'repaying'].includes(loan.status) && (
                      <button onClick={() => simulateRepayment(loan.id)} disabled={simulating === loan.id}
                        className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1.5 rounded-lg font-semibold hover:bg-teal-100 disabled:opacity-50 flex items-center gap-1">
                        <Play size={12} /> {simulating === loan.id ? 'Processing...' : 'Simulate Payment'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
