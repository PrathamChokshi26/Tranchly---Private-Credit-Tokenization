import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Shield, CheckCircle2, Clock, XCircle, Copy } from 'lucide-react';

export default function AdminUsers() {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/users').then(r => setUsers(r.data.users)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  const kycBadge = (status) => {
    switch (status) {
      case 'verified':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><CheckCircle2 size={12} /> Verified</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full"><XCircle size={12} /> Rejected</span>;
      case 'expired':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"><Clock size={12} /> Expired</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><Clock size={12} /> Pending</span>;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users & KYC Status</h1>
        <p className="text-gray-500 text-sm">View all platform users and their verification status</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold">{users.length}</p>
          <p className="text-xs text-gray-500">Total Users</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-emerald-600">{users.filter(u => u.kyc_status === 'verified').length}</p>
          <p className="text-xs text-gray-500">Verified</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-amber-600">{users.filter(u => !u.kyc_status || u.kyc_status === 'pending').length}</p>
          <p className="text-xs text-gray-500">Pending KYC</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-red-600">{users.filter(u => u.kyc_status === 'rejected').length}</p>
          <p className="text-xs text-gray-500">Rejected</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">KYC Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">ERC-725 Identity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Wallet</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.full_name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'investor' ? 'bg-blue-100 text-blue-700' :
                      'bg-teal-100 text-teal-700'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">{kycBadge(u.kyc_status)}</td>
                  <td className="px-4 py-3">
                    {u.identity_token ? (
                      <button onClick={() => copyToClipboard(u.identity_token)}
                        className="flex items-center gap-1 text-xs font-mono text-gray-500 hover:text-gray-700" title="Click to copy">
                        {u.identity_token.slice(0, 12)}...
                        <Copy size={11} />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-gray-400">{u.wallet_address?.slice(0, 10)}...</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
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
