import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Star, CheckCircle2, Clock, Landmark } from 'lucide-react';

export default function CapitalPassport() {
  const { api, user } = useAuth();
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/borrower/passport').then(r => setPassport(r.data.passport)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;

  const gradeColors = { A: 'from-emerald-400 to-emerald-600', B: 'from-teal-400 to-teal-600', C: 'from-amber-400 to-amber-600', 'N/A': 'from-gray-400 to-gray-600' };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your Business Credit Profile</h1>
        <p className="text-gray-500 text-sm">
          Every loan you repay on Tranchly builds your verified credit profile. A stronger profile means better rates and higher loan limits over time.
        </p>
      </div>

      {/* Verified Credit Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-teal-500/20 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield size={24} className="text-purple-400" />
              <span className="text-sm font-bold tracking-wider text-purple-300">VERIFIED CREDIT PROFILE</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">ID</span>
              <span className="text-xs font-mono text-slate-300">{passport?.wallet_address?.slice(0, 10)}...</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1">{passport?.borrower_name || user?.full_name}</h2>
          <p className="text-sm text-slate-400 font-mono mb-6">{passport?.wallet_address}</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-xs text-slate-400">Best Grade</p>
              <p className={`text-3xl font-black bg-gradient-to-r ${gradeColors[passport?.best_grade || 'N/A']} bg-clip-text text-transparent`}>
                {passport?.best_grade || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Repayment Rate</p>
              <p className="text-3xl font-black text-emerald-400">{passport?.repayment_rate || 100}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Loans</p>
              <p className="text-3xl font-black">{passport?.total_loans || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-600">
            <div>
              <p className="text-xs text-slate-400">Total Borrowed</p>
              <p className="font-semibold">${(passport?.total_borrowed || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Repaid</p>
              <p className="font-semibold">${(passport?.total_repaid || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-600 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <Star size={12} className="text-amber-400" /> Verified Borrower
            </div>
            <div>Member since {passport?.member_since ? new Date(passport.member_since).toLocaleDateString() : 'Today'}</div>
            <div className="ml-auto">Verified Identity</div>
          </div>
        </div>
      </div>

      {/* Loan History */}
      {passport?.loan_history?.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-900">Loan History</h3>
          </div>
          <div className="divide-y">
            {passport.loan_history.map(loan => (
              <div key={loan.id} className="flex items-center gap-4 px-5 py-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  loan.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : loan.status === 'repaying' ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {loan.status === 'completed' ? <CheckCircle2 size={16} /> : loan.status === 'repaying' ? <Clock size={16} /> : <Landmark size={16} />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{loan.business_name}</p>
                  <p className="text-xs text-gray-400">${loan.amount?.toLocaleString()} • {new Date(loan.date).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  loan.grade === 'A' ? 'bg-emerald-100 text-emerald-700' : loan.grade === 'B' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
                }`}>{loan.grade}</span>
                <span className={`text-xs capitalize ${loan.status === 'completed' ? 'text-emerald-600' : 'text-gray-500'}`}>{loan.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
