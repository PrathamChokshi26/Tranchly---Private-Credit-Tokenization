import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import GradeBadge from '../../components/GradeBadge';
import { CheckCircle2, XCircle, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export default function ApplicationsQueue() {
  const { api } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchApps = () => {
    setLoading(true);
    api.get('/api/admin/applications').then(r => setApplications(r.data.applications)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchApps(); }, []);

  const handleAction = async (loanId, action) => {
    setActionLoading(loanId);
    try {
      if (action === 'approve') {
        const res = await api.post(`/api/admin/loans/${loanId}/approve`, { term_months: 12 });
        setMessage({ type: 'success', text: `Loan approved! ${res.data.tokens_minted} tokens minted. TX: ${res.data.mint_tx_hash?.slice(0, 20)}...` });
      } else {
        await api.post(`/api/admin/loans/${loanId}/reject`);
        setMessage({ type: 'success', text: 'Loan rejected.' });
      }
      fetchApps();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
        <p className="text-gray-500 text-sm">Review and approve pending applications</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">All caught up!</h3>
          <p className="text-gray-500 mt-1">No pending applications to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => {
            const isExpanded = expanded === app.id;
            const cs = app.credit_score;

            return (
              <div key={app.id} className="bg-white rounded-xl border">
                {/* Header */}
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : app.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{app.business_name}</p>
                      <GradeBadge grade={app.grade} size="sm" />
                    </div>
                    <p className="text-sm text-gray-500">{app.borrower?.full_name} • {app.industry} • {app.years_operating}yr</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${app.loan_amount_requested?.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Score: {cs?.composite_score}</p>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t px-5 py-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Monthly Revenue</p>
                        <p className="font-bold">${app.monthly_revenue?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Approved Amount</p>
                        <p className="font-bold">${app.loan_amount_approved?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Suggested APR</p>
                        <p className="font-bold">{app.interest_rate}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Tokens</p>
                        <p className="font-bold">{app.total_tokens} @ ${app.token_price}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 mb-1">Purpose</p>
                      <p className="text-sm text-gray-700">{app.loan_purpose}</p>
                    </div>

                    {/* Credit Signal Breakdown */}
                    {cs?.signals && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Credit Signals</p>
                        <div className="space-y-2">
                          {Object.entries(cs.signals).map(([key, sig]) => (
                            <div key={key}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="capitalize text-gray-600">{key.replace(/_/g, ' ')}</span>
                                <span className="font-bold">{sig.score}/100 ({sig.weight}%)</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${sig.score >= 70 ? 'bg-emerald-500' : sig.score >= 50 ? 'bg-teal-500' : sig.score >= 30 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${sig.score}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {cs?.auto_reject_flags?.length > 0 && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-red-700 flex items-center gap-1"><AlertTriangle size={14} /> Auto-Reject Flags</p>
                        <ul className="text-sm text-red-600 list-disc ml-5">
                          {cs.auto_reject_flags.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => handleAction(app.id, 'approve')} disabled={actionLoading === app.id}
                        className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} /> Approve Loan
                      </button>
                      <button onClick={() => handleAction(app.id, 'reject')} disabled={actionLoading === app.id}
                        className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
